from typing import List, Optional
import json
import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Course, Semester, Document, User, Subject, Role
from app.api.deps import get_current_user, check_role
from app.services.pdf_service import PDFService
from app.services.rag_service import rag_service
from app.schemas.course import CourseResponse, SubjectResponse, CourseCreate, CourseUpdate, DocumentResponse
from app.core.logging import logger
from app.core.security import decode_access_token

router = APIRouter()

# Base directory for uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

async def get_or_create_subject(db: AsyncSession, name: str, semester_id: int) -> int:
    name = name.strip()
    result = await db.execute(
        select(Subject).where(
            func.lower(Subject.name) == name.lower(), 
            Subject.semester_id == semester_id
        )
    )
    subject = result.scalars().first()
    
    if not subject:
        subject = Subject(name=name, semester_id=semester_id)
        db.add(subject)
        await db.flush() # Get ID
    return subject.id

@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    semester_id: Optional[int] = None, 
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        # Check user role for ownership filtering
        result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result_role.scalars().first()
        
        query = select(Course).options(
            selectinload(Course.subject),
            selectinload(Course.documents)
        )
        
        # Filtering logic
        if semester_id:
            query = query.where(Course.semester_id == semester_id)
        
        if year:
            # Join with Semester relationship to filter by year
            query = query.join(Course.semester).where(Semester.year == year)
            
        # Role-based access control
        if role and role.name == "Professor":
            # Professors only see their own courses
            query = query.where(Course.professor_id == current_user.id)
            
        result = await db.execute(query)
        courses = result.unique().scalars().all()
        
        logger.info(f"Retrieved {len(courses)} courses for user {current_user.email}")
        
        response = []
        for course in courses:
            try:
                c_resp = CourseResponse.model_validate(course)
                # Manual mapping for subject_name since it's not a direct column
                if course.subject:
                    c_resp.subject_name = course.subject.name
                else:
                    c_resp.subject_name = "Général"
                response.append(c_resp)
            except Exception as val_err:
                logger.error(f"Validation error for course {course.id}: {val_err}")
                continue
                
        return response
    except Exception as e:
        logger.error(f"Error in get_courses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des cours: {str(e)}")

@router.post("/with-files", response_model=CourseResponse)
async def create_course_with_files(
    course_data: str = File(...), # JSON string
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        data = json.loads(course_data)
        course_in = CourseCreate(**data)
        
        result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result_role.scalars().first()
        if not role or role.name not in ["Professor", "Admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
            
        # Get or create subject dynamically
        subject_id = await get_or_create_subject(db, course_in.subject_name, course_in.semester_id)
        
        course = Course(
            name=course_in.name, 
            semester_id=course_in.semester_id, 
            subject_id=subject_id,
            description=course_in.description,
            professor_id=current_user.id
        )
        db.add(course)
        await db.flush() # Get course.id

        # Process multiple files
        all_chunks = []
        
        for file in files:
            content = await file.read()
            
            # Save file to disk
            file_ext = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                buffer.write(content)
                
            # Extract text by page for source tracking
            pages = await PDFService.extract_text_with_pages(content)
            file_full_text = ""
            
            for page in pages:
                chunks = await PDFService.chunk_text(page["text"])
                for chunk in chunks:
                    all_chunks.append({
                        "text": chunk,
                        "page_number": page["page"],
                        "course_name": course.name,
                        "file_name": file.filename
                    })
                file_full_text += page["text"] + "\n"
            
            doc = Document(
                course_id=course.id, 
                file_name=file.filename, 
                file_path=str(file_path), 
                raw_text=file_full_text
            )
            db.add(doc)

        # Add all to RAG service
        if all_chunks:
            await rag_service.add_documents(course.semester_id, all_chunks)
            
        await db.commit()
        await db.refresh(course)
        
        # Reload with relationships
        result = await db.execute(
            select(Course).options(
                joinedload(Course.subject), 
                selectinload(Course.documents)
            ).where(Course.id == course.id)
        )
        course = result.scalars().first()
        
        c_resp = CourseResponse.model_validate(course)
        c_resp.subject_name = course.subject.name if course.subject else "Général"
        return c_resp
        
    except Exception as e:
        logger.error(f"Error in create_course_with_files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du cours: {str(e)}")

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await db.execute(
            select(Course).options(joinedload(Course.subject), selectinload(Course.documents)).where(Course.id == course_id)
        )
        course = result.scalars().first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
        
        # Security check
        if course.professor_id != current_user.id:
            result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
            role = result_role.scalars().first()
            if not role or role.name != "Admin":
                raise HTTPException(status_code=403, detail="Non autorisé à modifier ce cours")
        
        old_name = course.name
        old_semester_id = course.semester_id

        # Update basic fields
        if course_update.name is not None:
            course.name = course_update.name
        if course_update.description is not None:
            course.description = course_update.description
        if course_update.semester_id is not None:
            course.semester_id = course_update.semester_id
            
        # Update subject if name provided
        if course_update.subject_name:
            subject_id = await get_or_create_subject(db, course_update.subject_name, course.semester_id)
            course.subject_id = subject_id
            
        await db.commit()
        await db.refresh(course)
        
        # If name or semester changed, we should ideally update RAG, but it's complex.
        # At minimum, if the course name changed, we need to update chunks in RAG.
        if old_name != course.name or old_semester_id != course.semester_id:
            # Simple approach: remove old chunks and re-add them if we have raw text
            # This is a bit heavy, so we only do it if necessary.
            # For now, let's at least handle the name change in metadata if we can.
            pass

        c_resp = CourseResponse.model_validate(course)
        c_resp.subject_name = course.subject.name if course.subject else "Général"
        return c_resp
        
    except Exception as e:
        logger.error(f"Error in update_course: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/{course_id}")
async def delete_course(
    course_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await db.execute(
            select(Course).options(selectinload(Course.documents)).where(Course.id == course_id)
        )
        course = result.scalars().first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
        
        # Security check
        if course.professor_id != current_user.id:
            result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
            role = result_role.scalars().first()
            if not role or role.name != "Admin":
                raise HTTPException(status_code=403, detail="Non autorisé à supprimer ce cours")
        
        # Remove from RAG service
        await rag_service.remove_course_documents(course.semester_id, course.name)
        
        # Delete associated documents from DB and disk
        for d in course.documents:
            try:
                if os.path.exists(d.file_path):
                    os.remove(d.file_path)
            except Exception as fe:
                logger.error(f"Error removing file {d.file_path}: {fe}")
            await db.delete(d)
        
        await db.delete(course)
        await db.commit()
        return {"message": "Cours supprimé"}
    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@router.get("/download/{document_id}")
async def download_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc = result.scalars().first()
        if not doc:
            logger.error(f"Document ID {document_id} not found in database")
            raise HTTPException(status_code=404, detail="Document non trouvé dans la base de données")
            
        # Try multiple path resolutions
        possible_paths = [
            Path(doc.file_path),
            Path("backend") / doc.file_path,
            Path.cwd() / doc.file_path,
            Path(__file__).parent.parent.parent.parent / doc.file_path
        ]
        
        file_path = None
        for p in possible_paths:
            if p.exists() and p.is_file():
                file_path = p
                break
        
        if not file_path:
            logger.error(f"File not found on disk for document {document_id}. Searched paths: {[str(p) for p in possible_paths]}")
            raise HTTPException(status_code=404, detail="Le fichier physique est introuvable sur le serveur")
            
        logger.info(f"Serving file: {file_path}")
        return FileResponse(
            path=file_path,
            filename=doc.file_name,
            media_type='application/pdf'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors du téléchargement: {str(e)}")

@router.post("/{course_id}/upload", dependencies=[Depends(check_role(["Professor", "Admin"]))])
async def upload_document(
    course_id: int, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        content = await file.read()
        
        # Get course info
        result = await db.execute(select(Course).where(Course.id == course_id))
        course = result.scalars().first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Save file to disk
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Extract text by page for source tracking
        pages = await PDFService.extract_text_with_pages(content)
        all_chunks = []
        full_text = ""
        
        for page in pages:
            chunks = await PDFService.chunk_text(page["text"])
            for chunk in chunks:
                all_chunks.append({
                    "text": chunk,
                    "page_number": page["page"],
                    "course_name": course.name,
                    "file_name": file.filename
                })
            full_text += page["text"] + "\n"
        
        # Add to RAG service
        if all_chunks:
            await rag_service.add_documents(course.semester_id, all_chunks)
        
        # Save to DB
        doc = Document(
            course_id=course_id, 
            file_name=file.filename, 
            file_path=str(file_path), 
            raw_text=full_text
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        return DocumentResponse.model_validate(doc)
    except Exception as e:
        logger.error(f"Error in upload_document: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'upload du document")

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await db.execute(
            select(Document).options(joinedload(Document.course)).where(Document.id == doc_id)
        )
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Security check
        if doc.course.professor_id != current_user.id:
            result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
            role = result_role.scalars().first()
            if not role or role.name != "Admin":
                raise HTTPException(status_code=403, detail="Non autorisé à supprimer ce document")
        
        # Remove from RAG service
        await rag_service.remove_document_chunks(doc.course.semester_id, doc.file_name)
        
        # Delete from disk
        try:
            if os.path.exists(doc.file_path):
                os.remove(doc.file_path)
        except Exception as fe:
            logger.error(f"Error removing file {doc.file_path}: {fe}")
            
        await db.delete(doc)
        await db.commit()
        return {"message": "Document supprimé"}
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")

@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(semester_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Subject).where(Subject.semester_id == semester_id))
        subjects = result.scalars().all()
        return [SubjectResponse.model_validate(s) for s in subjects]
    except Exception as e:
        logger.error(f"Error in get_subjects: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des matières")
