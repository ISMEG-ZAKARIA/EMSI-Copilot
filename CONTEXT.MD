🎓 EMSI COPILOT — SYSTEM CONTEXT BRIEF (AI READY)
🧠 Project Overview

EMSI Copilot is a role-based academic AI platform built for EMSI engineering students and professors.

It is a secure institutional system that uses a Retrieval-Augmented Generation (RAG) architecture to ensure AI responses are generated ONLY from official EMSI course materials uploaded by professors.

The system is NOT a generic chatbot — it is a controlled academic environment.

🏗️ Tech Stack
Frontend: Next.js (App Router), TypeScript, TailwindCSS
Backend: FastAPI (Python)
Database: MySQL
AI Layer: OpenAI API + RAG pipeline
Vector DB: FAISS
Auth: JWT-based authentication
Deployment: Local / Cloud (dev stage)
👥 Roles & Permissions
👑 Admin
Full system control
Manage users (students, professors)
Manage courses, semesters, academic structure
Monitor system usage
👨‍🏫 Professor
Create courses
Upload academic materials (PDF, PPT)
Assign:
Year (1–5)
Semester (1–10, dynamic based on year)
Matière (FREE TEXT INPUT, not static dropdown)
Update/delete ONLY their own content (ownership-based access)
🧑‍🎓 Student
Select Year → dynamically shows only 2 semesters:
Year 1 → S1, S2
Year 2 → S3, S4
Year 3 → S5, S6
Year 4 → S7, S8
Year 5 → S9, S10
Browse courses structured by:
Year → Semester → Matière → Courses
View and download course PDFs
Ask AI questions based ONLY on uploaded materials
Generate quizzes and summaries
🧠 AI / RAG SYSTEM
All AI answers MUST come only from retrieved course documents
No external knowledge allowed

If no context exists:

→ "The requested information is not available in the selected course materials."

Pipeline:

Document upload (professor)
Text extraction
Chunking
Embedding
FAISS storage
Retrieval based on student query
LLM response using only retrieved chunks
🏫 Academic Structure
5 Years (Engineering cycle)
Each year has 2 semesters
Each semester contains multiple courses
Each course belongs to a "Matière" (dynamic input, not predefined list)
⚙️ Core Functional Flows
👨‍🏫 Professor Flow
Login → Dashboard
Create course:
Year
Semester (dynamic based on year)
Matière (text input)
Upload documents (PDF/PPT)
Edit/Delete ONLY their own courses
🧑‍🎓 Student Flow
Login → Dashboard
Select Year
System shows ONLY 2 semesters
Select Semester
View courses grouped by Matière
Open/download PDFs
Ask AI questions with source references
🔐 Security Rules
JWT authentication required
Role-based access control (RBAC)
Professor can ONLY access their own data
Students cannot modify any data
No external internet access for AI
🚨 Current System Issues (Important for Debugging)

The system currently has instability issues:

API 401 authentication errors
API 500 backend crashes (undefined classes like DocumentResponse)
Courses not appearing after creation (frontend/backend sync issue)
Sidebar and UI desynchronization
Inconsistent state updates after DB writes
🎯 Current Development Goal

Stabilize and upgrade the platform to:

Fully synchronized frontend ↔ backend ↔ database system
Stable authentication flow (no 401 errors)
Real-time course visibility after creation
Clean academic navigation (year → semester → matière → courses)
Premium UI/UX (smooth, animated, SaaS-level interface)
Production-ready architecture
🧠 Engineering Constraints
Do NOT break existing architecture
Do NOT rebuild from scratch
Only FIX and EXTEND existing system
Maintain clean, scalable code
Ensure full data consistency across DB, API, and UI
🚀 Final Vision

A premium institutional AI platform that allows EMSI students to:

Study faster
Access structured course knowledge
Interact with AI tutor grounded only in official materials
Prepare exams efficiently