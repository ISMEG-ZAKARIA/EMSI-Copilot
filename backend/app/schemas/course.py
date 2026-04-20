from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SubjectBase(BaseModel):
    name: str

class SubjectCreate(SubjectBase):
    semester_id: Optional[int] = 1

class SubjectResponse(SubjectBase):
    id: int
    semester_id: int

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: int
    file_name: str
    uploaded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CourseBase(BaseModel):
    name: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    semester_id: Optional[int] = 1
    subject_name: Optional[str] = "Général" # New: dynamic input

class CourseUpdate(CourseBase):
    semester_id: Optional[int] = None
    subject_name: Optional[str] = None

class CourseResponse(CourseBase):
    id: int
    semester_id: Optional[int] = None
    subject_id: Optional[int] = None
    professor_id: Optional[int] = None
    subject_name: Optional[str] = None
    documents: List[DocumentResponse] = []
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
