import uuid
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app import db

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    profile_pic = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    applications = db.relationship("JobApplication", backref="user", lazy=True)


class JobApplication(db.Model):
    __tablename__ = "job_applications"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    resume_used = db.Column(UUID(as_uuid=True), db.ForeignKey("resumes.id"), nullable=True)

    company_name = db.Column(db.String(255), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    job_type = db.Column(db.String(50))
    location = db.Column(db.String(255))
    application_url = db.Column(db.String(1024), nullable=False)
    application_method = db.Column(db.String(50))
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default="Applied")
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resume = db.relationship("Resume", backref="applications_used", lazy=True)


class Resume(db.Model):
    __tablename__ = "resumes"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    s3_key = db.Column(db.String(1024), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(1024), nullable=False)  # public or internal path
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="resumes")