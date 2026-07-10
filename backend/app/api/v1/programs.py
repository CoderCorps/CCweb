from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_admin
from app.models.program import Program
from app.schemas.program import ProgramCreate, ProgramResponse
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ProgramResponse])
def get_programs(db: Session = Depends(get_db)):
    return db.query(Program).all()

@router.get("/{id}", response_model=ProgramResponse)
def get_program(id: int, db: Session = Depends(get_db)):
    program = db.query(Program).filter(Program.id == id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )
    return program

@router.post("/", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(
    program_in: ProgramCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    db_program = Program(
        title=program_in.title,
        description=program_in.description,
        track_type=program_in.track_type
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program
