from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.models import User, ChatHistory
from app.api.deps import get_current_user
from app.services.rag_service import rag_service

from app.core.config import settings

router = APIRouter()

@router.post("/quiz")
async def generate_quiz(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        # Fallback for query params if JSON fails
        data = {
            "course_name": request.query_params.get("course_name"),
            "semester_id": request.query_params.get("semester_id")
        }

    course_name = data.get("course_name")
    semester_id = data.get("semester_id")

    if not course_name or not semester_id:
         raise HTTPException(status_code=400, detail="course_name et semester_id sont requis")

    # Return structured fallback if AI is disabled or fails
    if not settings.AI_ENABLED:
        return [
            {
                "question": f"Qu'avez-vous appris dans le cours '{course_name}' ?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "Option A"
            }
        ]
        
    quiz = await rag_service.generate_quiz(semester_id, course_name)
    if not quiz:
        # Structured fallback instead of 404
        return [
            {
                "question": f"Révision du cours: {course_name}",
                "options": ["Vrai", "Faux", "Peut-être", "Non applicable"],
                "answer": "Vrai"
            }
        ]
    return quiz

@router.post("/chat")
async def chat(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Format JSON invalide")

    if not isinstance(data, dict):
         raise HTTPException(status_code=400, detail="Le corps de la requête doit être un objet JSON")

    query = data.get("query")
    semester_id = data.get("semester_id")

    if not settings.AI_ENABLED:
        return {
            "response": "L'assistant AI est en mode hors-ligne. Veuillez contacter l'administrateur pour activer la clé API OpenAI.", 
            "context_used": 0, 
            "sources": []
        }
        
    # 1. Search semantic chunks
    context = await rag_service.search(semester_id, query)
    
    # 2. Generate response with sources
    ai_response = await rag_service.generate_answer(query, context)
    
    if not isinstance(ai_response, dict):
        from app.core.logging import logger
        logger.error(f"rag_service.generate_answer returned non-dict: {type(ai_response)}")
        ai_response = {"answer": str(ai_response), "sources": []}

    # 3. Store history
    try:
        response_text = ai_response.get("answer") or ai_response.get("response") or str(ai_response)
        history = ChatHistory(user_id=current_user.id, query=query, response=response_text, semester_id=semester_id)
        db.add(history)
        await db.commit()
    except Exception as e:
        from app.core.logging import logger
        logger.error(f"Error storing chat history: {e}")
    
    return {
        "response": ai_response.get("answer") or ai_response.get("response") or "Désolé, je ne peux pas répondre pour le moment.", 
        "sources": ai_response.get("sources") or [],
        "context_used": len(context)
    }
