import os
import boto3
import requests
import re
import json
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from werkzeug.utils import secure_filename
from datetime import datetime
from uuid import UUID
from huggingface_hub import InferenceClient


# Load env
load_dotenv()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

# Flask App Setup
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

CORS(app, supports_credentials=True, resources={r"/*": {"origins": [
    "http://localhost:3000",
    "http://35.175.218.182:3000",
    "https://careervaultapp.com"
]}}, allow_headers=["Content-Type", "Authorization", "X-User-Email"])

HF_TOKEN = os.environ.get("API_TOKEN")
HF_CHAT_MODEL = "meta-llama/Llama-3.1-8B-Instruct"  # use latest model name!
HF_CLIENT = InferenceClient(provider="hf-inference", api_key=HF_TOKEN)

print("HF chat client ready:", bool(HF_TOKEN))

# DB Setup
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

from models import User, JobApplication, Resume


def extract_job_posting_fields(text: str) -> dict:
    """Send job post text to LLaMA 3 chat model and extract structured fields."""
    try:
        prompt = f"""
        You are a job posting parser.

        Extract the following fields from this job post and RETURN THEM AS VALID JSON ONLY:

        - title
        - company
        - location (if multiple return as single string)
        - job_type (Full-Time, Part-Time, Contract, Internship)
        - description (as a single string — include Responsibilities, Requirements, Qualifications as separate, organized sections in the text)

        RULES:

        - DO NOT return any explanations.
        - DO NOT write any code.
        - DO NOT wrap in triple backticks.
        - JUST return the JSON object.

        ### Example Outputs:

        {{
            "title": "Software Engineer",
            "company": "Amazon",
            "location": "San Francisco, CA, USA; Bellevue, WA, USA; San Diego, CA, USA",
            "job_type": "Full-Time",
            "description": "Responsibilities:\\n- Develop and maintain web applications\\n- Collaborate with cross-functional teams\\n\\nRequirements:\\n- 3+ years experience in software development\\n- Proficiency in Python and JavaScript\\n\\nQualifications:\\n- Bachelor's degree in Computer Science or related field"
        }}
        
        {{
            "title": "Software Developer",
            "company": "CompanyName",
            "location": "San Diego, CA, USA",
            "job_type": "Internship",
            "description": "Responsibilities:\\n- Develop and maintain web applications\\n- Collaborate with cross-functional teams\\n\\nRequirements:\\n- 3+ years experience in software development\\n- Proficiency in Python and JavaScript\\n\\nQualifications:\\n- Bachelor's degree in Computer Science or related field"
        }}

        Now here is the job post text to parse:

        ---
        {text}
        ---
        """

        completion = HF_CLIENT.chat.completions.create(
            model=HF_CHAT_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
        )

        response_text = completion.choices[0].message.content
        print("LLAMA-3 raw response:", response_text)

        # Extract JSON block safely (handle ```json or plain)
        json_match = re.search(r"```json\s*(\{.*?\})\s*```", response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # fallback: try to parse entire response if no code block
            json_str = response_text.strip()

        print("Extracted JSON string:", json_str)

        # Parse JSON
        parsed = json.loads(json_str)
        return parsed

    except Exception as e:
        print("LLaMA extraction error:", e)
        return {
            "title": None,
            "company": None,
            "location": None,
            "job_type": None,
            "description": None,
        }


def clean_text(text):
    return ' '.join(text.split())


# Helpers

def get_user_by_email(email):
    return User.query.filter_by(email=email).first()


def get_or_create_user_by_email(email, name=None, profile_pic=None):
    user = User.query.filter_by(email=email).first()
    if not user and name:
        user = User(email=email, name=name, profile_pic=profile_pic)
        db.session.add(user)
        db.session.commit()
    return user


def get_current_user():
    user_email = request.headers.get("X-User-Email")
    if not user_email:
        return None, jsonify({"error": "Missing X-User-Email header"}), 400

    user = get_user_by_email(user_email)
    if not user:
        return None, jsonify({"error": "User not found"}), 401

    return user, None, None


# Routes

# Load AWS keys from .env
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET = os.environ.get("AWS_S3_BUCKET")

s3_client = boto3.client("s3",
                         aws_access_key_id=AWS_ACCESS_KEY_ID,
                         aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                         )


@app.route("/api/resumes", methods=["POST"])
def upload_resume_to_s3():
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Only PDF files allowed"}), 400

    filename = secure_filename(f"{user.id}_{datetime.utcnow().timestamp()}_{file.filename}")
    s3_key = f"resumes/{filename}"

    try:
        s3_client.upload_fileobj(
            file,
            AWS_S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": "application/pdf"}
        )
        file_url = f"https://{AWS_S3_BUCKET}.s3.amazonaws.com/{s3_key}"

        # Save to database
        resume = Resume(user_id=user.id, filename=file.filename, s3_key=s3_key, file_url=file_url)
        db.session.add(resume)
        db.session.commit()

        return jsonify({
            "message": "Resume uploaded",
            "resume": {
                "filename": resume.filename,
                "file_url": resume.file_url,
                "uploaded_at": resume.uploaded_at.isoformat() + "Z",
            }
        })

    except Exception as e:
        print("S3 upload error:", e)
        return jsonify({"error": "Failed to upload to S3"}), 500


@app.route("/api/resumes", methods=["GET"])
def get_resumes():
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    resumes = Resume.query.filter_by(user_id=user.id).order_by(Resume.uploaded_at.desc()).all()
    return jsonify([
        {
            "id": r.id,
            "filename": r.filename,
            "file_url": r.file_url,
            "uploaded_at": r.uploaded_at.isoformat() + "Z"
        }
        for r in resumes
    ])


@app.route("/api/resumes/<uuid:resume_id>", methods=["DELETE"])
def delete_resume(resume_id):
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    resume = Resume.query.get_or_404(resume_id)
    if resume.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=resume.s3_key)
    except Exception as e:
        print("S3 delete error:", e)

    db.session.delete(resume)
    db.session.commit()
    return jsonify({"message": "Resume deleted successfully."})


@app.route("/api/resumes/<uuid:resume_id>/signed-url", methods=["GET"])
def get_signed_resume_url(resume_id):
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    resume = Resume.query.get_or_404(resume_id)
    if resume.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    s3_key = resume.file_url.split(f"{AWS_S3_BUCKET}.s3.amazonaws.com/")[-1]

    signed_url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": AWS_S3_BUCKET, "Key": s3_key},
        ExpiresIn=300  # 5 minutes
    )

    return jsonify({"signed_url": signed_url})


@app.route("/uploads/<path:filename>")
def serve_uploaded_file(filename):
    return send_from_directory("uploads", filename)


@app.route('/api/verify-google-token', methods=['POST'])
def verify_google_token():
    data = request.get_json()
    token = data.get('token')
    print("Received token from frontend:", token)

    if not token:
        return jsonify({'status': 'error', 'message': 'Missing token'}), 400

    try:

        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        print("Token decoded:", idinfo)

        user = get_or_create_user_by_email(
            email=idinfo['email'],
            name=idinfo.get('name'),
            profile_pic=idinfo.get('picture')
        )
        return jsonify({
            'status': 'success',
            'user': {
                'email': idinfo['email'],
                'name': idinfo.get('name'),
                'picture': idinfo.get('picture')
            }
        })
    except Exception as e:
        print("Google token validation error:", e)
        return jsonify({'status': 'error', 'message': str(e)}), 401


@app.route('/api/applications', methods=['GET', 'POST'])
def handle_applications():
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    if request.method == 'GET':
        apps = JobApplication.query.filter_by(user_id=user.id).all()
        return jsonify([{
            "id": app.id,
            "title": app.title,
            "company": app.company_name,
            "job_type": app.job_type,
            "location": app.location,
            "status": app.status,
            "applied_at": app.applied_at.isoformat() + "Z",
            "application_url": app.application_url,
            "resume_used": str(app.resume_used) if app.resume_used else None,
            "application_method": app.application_method
        } for app in apps])

    elif request.method == 'POST':
        data = request.json
        app_entry = JobApplication(
            user_id=user.id,
            company_name=data.get("company") or data.get("company_name"),
            title=data.get("title"),
            job_type=data.get("job_type"),
            location=data.get("location"),
            application_url=data.get("application_url"),
            description=data.get("description"),
            status=data.get("status", "Applied"),
            resume_used=data.get("resume_used"),
            application_method=data.get("application_method")
        )
        db.session.add(app_entry)
        db.session.commit()
        return jsonify({"message": "Application added successfully."}), 201


@app.route('/api/applications/<uuid:app_id>', methods=['GET', 'PATCH', 'DELETE'])
def handle_application_by_id(app_id: UUID):
    user, error, status_code = get_current_user()
    if error:
        return error, status_code

    app = JobApplication.query.get_or_404(app_id)
    if app.user_id != user.id:
        return jsonify({"error": "Unauthorized access."}), 403

    if request.method == 'GET':
        return jsonify({
            "id": str(app.id),
            "title": app.title,
            "company": app.company_name,
            "job_type": app.job_type,
            "location": app.location,
            "application_url": app.application_url,
            "description": app.description,
            "status": app.status,
            "resume_used": str(app.resume_used) if app.resume_used else None,
            "application_method": app.application_method
        })

    elif request.method == 'PATCH':
        data = request.json
        app.title = data.get("title", app.title)
        app.company_name = data.get("company") or data.get("company_name") or app.company_name
        app.job_type = data.get("job_type", app.job_type)
        app.location = data.get("location", app.location)
        app.application_url = data.get("application_url", app.application_url)
        app.description = data.get("description", app.description)
        app.status = data.get("status", app.status)
        app.resume_used = data.get("resume_used", app.resume_used)
        app.application_method = data.get("application_method", app.application_method)
        db.session.commit()
        return jsonify({"message": "Application updated successfully."})

    elif request.method == 'DELETE':
        db.session.delete(app)
        db.session.commit()
        return jsonify({"message": "Application deleted."})


@app.route("/api/parse-url", methods=["POST"])
def parse_job_url():
    url = request.json.get("url")
    if not url:
        return jsonify({"error": "No URL provided."}), 400

    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return jsonify({"error": f"Failed to fetch URL: status {response.status_code}"}), 400

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract title
        title = soup.find("h1") or soup.find("title")
        title_text = title.get_text(strip=True) if title else "Job Title Not Found"

        # Extract company
        company = (
            soup.find("meta", {"property": "og:site_name"}) or
            soup.find("meta", {"name": "author"}) or
            soup.find("header")
        )
        company_text = company.get("content", "Unknown Company") if company and company.has_attr("content") else (
            company.get_text(strip=True) if company else "Company Not Found"
        )

        # Extract all visible paragraphs
        all_paragraphs = soup.find_all(["p", "li"])
        paragraph_texts = [p.get_text(strip=True) for p in all_paragraphs]
        full_visible_text = "\n".join(paragraph_texts)
        full_visible_text = clean_text(full_visible_text)

        # Section targeting and keyword scoring

        KEYWORDS = [
            "responsibilities", "requirements", "qualifications", "skills", "experience",
            "job", "position", "team", "opportunity", "expectations", "tasks", "desired"
        ]

        candidate_sections = []
        for tag in ["section", "article", "div", "main"]:
            containers = soup.find_all(tag)
            for container in containers:
                section_text = " ".join(p.get_text(strip=True) for p in container.find_all(["p", "li"]))
                word_count = len(section_text.split())
                keyword_hits = sum(1 for kw in KEYWORDS if kw in section_text.lower())

                if word_count >= 100 and keyword_hits > 0:
                    candidate_sections.append((keyword_hits, section_text))

        # Pick best section
        candidate_sections.sort(reverse=True, key=lambda x: x[0])
        best_section_text = candidate_sections[0][1] if candidate_sections else ""

        # Build prioritized text

        MAX_VISIBLE_CHARS = 6000
        prioritized_text = ""

        if best_section_text:
            print(f"Using best section (keyword hits: {candidate_sections[0][0]})")
            prioritized_text = best_section_text
        else:
            print("No strong section found — prioritizing keyword paragraphs")
            # Rank paragraphs by keyword hits
            ranked_paragraphs = sorted(
                paragraph_texts,
                key=lambda para: sum(1 for kw in KEYWORDS if kw in para.lower()),
                reverse=True
            )
            # Add paragraphs until we hit char limit
            selected_paragraphs = []
            current_length = 0
            for para in ranked_paragraphs:
                para_length = len(para)
                if current_length + para_length + 1 > MAX_VISIBLE_CHARS:
                    break
                selected_paragraphs.append(para)
                current_length += para_length + 1  # +1 for newline
            prioritized_text = "\n".join(selected_paragraphs)

        # Truncate if still too long
        if len(prioritized_text) > MAX_VISIBLE_CHARS:
            prioritized_text = prioritized_text[:MAX_VISIBLE_CHARS]

        final_char_count = len(prioritized_text)
        print(f"Final selected text char count: {final_char_count}")

        # If too small, fallback
        if len(prioritized_text.split()) < 50:
            return jsonify({
                "title": title_text,
                "company": company_text,
                "job_type": "Unknown",
                "location": "Unknown",
                "description": "Couldn't extract content (too small)"
            })

        # Run extraction with LLaMa

        extracted_fields = extract_job_posting_fields(prioritized_text)

        # Fallbacks for title & company
        extracted_fields["title"] = extracted_fields.get("title") or title_text
        extracted_fields["company"] = extracted_fields.get("company") or company_text

        return jsonify(extracted_fields)

    except Exception as e:
        print("URL parsing error:", e)
        return jsonify({"error": f"Failed to parse job URL: {str(e)}"}), 500







if __name__ == "__main__":
    app.run(debug=True)
