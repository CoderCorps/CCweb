from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.db.session import SessionLocal
from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User

# tokenUrl must point to our login route
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    
    return user

def get_current_mentor(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in ["mentor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires mentor or admin role",
        )
    return current_user

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires admin role",
        )
    return current_user
