from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    users = relationship("User", back_populates="role")

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, nullable=False)
    year = Column(Integer, nullable=False, default=1) # 1 to 5
    subjects = relationship("Subject", back_populates="semester")
    courses = relationship("Course", back_populates="semester")
    chats = relationship("ChatHistory", back_populates="semester")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    
    semester = relationship("Semester", back_populates="subjects")
    courses = relationship("Course", back_populates="subject")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Integer, default=1) # 1: active, 0: deactivated
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    role = relationship("Role", back_populates="users")
    courses = relationship("Course", back_populates="professor")
    chats = relationship("ChatHistory", back_populates="user")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    professor_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    semester = relationship("Semester", back_populates="courses")
    subject = relationship("Subject", back_populates="courses")
    professor = relationship("User", back_populates="courses")
    documents = relationship("Document", back_populates="course")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    raw_text = Column(Text)
    uploaded_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    course = relationship("Course", back_populates="documents")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    timestamp = Column(TIMESTAMP, default=datetime.utcnow)
    
    user = relationship("User", back_populates="chats")
    semester = relationship("Semester", back_populates="chats")
