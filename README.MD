# 🎓 EMSI Copilot
## Institutional AI Academic Assistant for EMSI Engineering Students

![Hero Banner](/frontend/public/LOGO/logo.png) <!-- Placeholder -->

EMSI Copilot is a secure, role-based AI academic assistant engineered exclusively for EMSI engineering students and professors. It fundamentally solves the issue of AI hallucination in academia by employing a strict **Retrieval-Augmented Generation (RAG)** architecture. The system ensures that all AI responses are generated **only from official course materials uploaded by professors**.

This is not a generic chatbot. This is a controlled, fully-audited academic AI environment aligned with EMSI's rigorous curriculum structure.

---

## 🚀 Key Features

* **Strict Academic RAG:** Implements a closed-domain AI environment; the LLM explicitly refuses to answer questions outside the uploaded localized academic scope.
* **Role-Based Access Control (RBAC):** Distinct interfaces and administrative powers distributed systematically across `Administrators`, `Professors`, and `Students`.
* **Dynamic Semantic Search:** Empowers students to search across a persistent vector-indexed curriculum efficiently.
* **Course Flow Management:** Professors fully curate their knowledge scope assigning courses precisely by Year, Semester, and Subject.

---

## 🔐 Architecture & Flow

### Strict RAG Pipeline
To guarantee uncompromised academic integrity, the system implements a multi-stage NLP pipeline:
1. **Ingestion:** Professor uploads PDF course materials.
2. **Extraction & Chunking:** Semantic breakdown of text context using Python processing pipelines.
3. **Embedding Model:** Context encoded via HuggingFace `all-MiniLM-L6-v2` into dense vectors.
4. **Vector Database:** Local persistence in a highly-optimized **FAISS** vector store.
5. **Retrieval Search:** Student query is similarity matched strictly against the chosen Semester index.
6. **Generation:** OpenAI acts on a strict prompt guardrail to synthesize the answers exclusively using the FAISS-matched blocks.

### Flow Dynamics
* **Student Flow:** Selects semester -> Queries assistant -> Receives strictly RAG-validated context.
* **Professor Flow:** Uploads verified PDF/Slide materials -> Defines semester taxonomy -> Modifies vector index sources.

---

## ⚙️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js (App Router), TypeScript, React 19, TailwindCSS, Framer Motion |
| **Backend** | FastAPI (Python), SQLAlchemy, async flows |
| **Database** | MySQL (Relational), FAISS (Vector DB) |
| **AI/NLP** | OpenAI API, LangChain Pipeline, Sentence-Transformers |

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MySQL Server

### 1. Database Setup
Ensure MySQL is running locally or via Docker and create the default database schema.
```bash
mysql -u root -p < backend/app/db/schema.sql
```

### 2. Backend Setup
1. Navigate to the backend component:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```
2. Install dependencies:
```bash
pip install -r requirements.txt
```
3. Set up the environment variables by referring to `.env.example`.
4. Run the API:
```bash
uvicorn app.main:app --reload
```

### 3. Frontend Setup
1. Navigate to the frontend UI:
```bash
cd frontend
npm install
```
2. Set `.env` settings mirroring `.env.example`.
3. Launch development node:
```bash
npm run dev
```

---

## 📸 System Screenshots

### Professor Dashboard
![Professor Dashboard Placeholder](/frontend/public/PRF-PIC/Prof.png) <!-- Update later -->

### Student Interface
![Student Chat Interface Placeholder](/frontend/public/PRF-PIC/Student.webp) <!-- Update later -->

---

## 🏆 Project Status
**Current Version:** Demo (RAG-based secure academic assistant)  
**Future Scale:** Institutional Deployment Across EMSI Campuses.

### Development Team
**ISMEG ZAKARIA** / EMSI Engineering Architecture Project