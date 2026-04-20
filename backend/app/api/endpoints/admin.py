from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.models import User, Role, Course, Document, ChatHistory
from app.api.deps import check_role, get_current_user
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check role manually if needed, or use check_role dependency
    result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
    role = result_role.scalars().first()
    if not role or role.name != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Total users
    res_users = await db.execute(select(func.count(User.id)))
    total_users = res_users.scalar()
    
    # Active Students
    res_students = await db.execute(select(func.count(User.id)).where(User.role_id == 3))
    active_students = res_students.scalar()
    
    # Total Courses
    res_courses = await db.execute(select(func.count(Course.id)))
    total_courses = res_courses.scalar()
    
    # Total Documents
    res_docs = await db.execute(select(func.count(Document.id)))
    total_docs = res_docs.scalar()
    
    # Total Chats
    res_chats = await db.execute(select(func.count(ChatHistory.id)))
    total_chats = res_chats.scalar()

    # Real Usage Stats (Last 7 days)
    usage_stats = []
    days_map = {0: "Lun", 1: "Mar", 2: "Mer", 3: "Jeu", 4: "Ven", 5: "Sam", 6: "Dim"}
    
    # We'll calculate the last 7 days including today
    today = datetime.now()
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_name = days_map[day_date.weekday()]
        
        # Start and end of that specific day
        start_of_day = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = day_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Count chats for this day
        res_day = await db.execute(
            select(func.count(ChatHistory.id))
            .where(ChatHistory.timestamp >= start_of_day)
            .where(ChatHistory.timestamp <= end_of_day)
        )
        count = res_day.scalar() or 0
        usage_stats.append({"name": day_name, "queries": count})

    return {
        "total_users": total_users,
        "active_students": active_students,
        "total_courses": total_courses,
        "total_documents": total_docs,
        "total_chats": total_chats,
        "usage_stats": usage_stats
    }

@router.get("/users", response_model=List[UserResponse])
async def get_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Safely check role
    result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
    role = result_role.scalars().first()
    if not role or role.name != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(User)
        .options(joinedload(User.role))
    )
    users = result.scalars().unique().all()
    
    # Use model_validate for Pydantic v2
    response = []
    for user in users:
        u_resp = UserResponse.model_validate(user)
        if user.role:
            u_resp.role_name = user.role.name
        response.append(u_resp)
        
    return response

@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: int, is_active: bool, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result_role = await db.execute(select(Role).where(Role.id == current_user.role_id))
    role = result_role.scalars().first()
    if not role or role.name != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = 1 if is_active else 0
    await db.commit()
    return {"status": "success"}
