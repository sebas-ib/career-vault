from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import requests
import os
from uuid import UUID
import boto3
from werkzeug.utils import secure_filename


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

API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"
HF_TOKEN = os.environ.get("API_TOKEN")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}
print("Token loaded:", bool(HF_TOKEN))


# DB Setup
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

from models import User, JobApplication, Resume


def clean_text(text):
    return ' '.join(text.split())


def summarize_text(text, max_length=130, min_length=30):
    cleaned = clean_text(text)
    payload = {
        "inputs": cleaned,
        "parameters": {
            "max_length": max_length,
            "min_length": min_length,
            "do_sample": False
        }
    }

    try:
        response = requests.post(API_URL, headers=HEADERS, json=payload)
        response.raise_for_status()
        result = response.json()
        return result[0].get("summary_text", "")
    except Exception as e:
        print("Summarizer API error:", e)
        return "Summary generation failed."


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

        # Keywords to search for
        keywords = [
            "responsibilities", "requirements", "qualifications", "job", "position",
            "expectations", "experience", "design", "description", "engineer",
            "develop", "skills", "team", "role", "tasks", "opportunity"
        ]

        # Search for text containers
        candidate_sections = []
        for tag in ["section", "article", "div", "main"]:
            containers = soup.find_all(tag)
            for container in containers:
                text = " ".join(p.get_text(strip=True) for p in container.find_all(["p", "li"]))
                word_count = len(text.split())
                if word_count >= 100:  # Skip tiny containers
                    keyword_hits = sum(1 for kw in keywords if kw in text.lower())
                    candidate_sections.append((keyword_hits, text[:10000]))  # Keep first 10k chars max

        # Pick the section with the most keyword hits
        candidate_sections.sort(reverse=True, key=lambda x: x[0])
        best_text = candidate_sections[0][1] if candidate_sections else ""

        # Fallback
        if not best_text:
            return jsonify({
                "title": title_text,
                "company": company_text,
                "job_type": "Unknown",
                "location": "Unknown",
                "description": "Couldn't summarize description"
            })

        if not best_text or len(best_text.split()) < 50:
            return jsonify({
                "title": title_text,
                "company": company_text,
                "job_type": "Unknown",
                "location": "Unknown",
                "description": "Couldn't summarize description"
            })

        # Summarize
        summary = summarize_text(best_text[:1500])
        if not summary or len(summary.strip()) < 40:
            summary = best_text[:1000]

        return jsonify({
            "title": title_text,
            "company": company_text,
            "job_type": "Unknown",
            "location": "Unknown",
            "description": summary
        })

    except Exception as e:
        print("URL parsing error:", e)
        return jsonify({"error": f"Failed to parse job URL: {str(e)}"}), 500





if __name__ == "__main__":
    app.run(debug=True)
