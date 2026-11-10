from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.core.security import get_password_hash
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    return db.query(models.SystemUser).order_by(models.SystemUser.id.asc()).all()


@router.post("", response_model=schemas.UserResponse)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    existing = db.query(models.SystemUser).filter_by(username=payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

    user = models.SystemUser(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        email=payload.email,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    user = db.query(models.SystemUser).filter(models.SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if payload.full_name is not None: user.full_name = payload.full_name
    if payload.email is not None: user.email = payload.email
    if payload.role is not None: user.role = payload.role
    if payload.is_active is not None: user.is_active = payload.is_active
    if payload.password: user.password_hash = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của chính mình")

    user = db.query(models.SystemUser).filter(models.SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    db.delete(user)
    db.commit()
    return {"message": "Đã xóa người dùng thành công"}
