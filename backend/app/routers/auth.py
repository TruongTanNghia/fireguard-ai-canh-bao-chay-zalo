from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.SystemUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = db.query(models.SystemUser).filter(models.SystemUser.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: models.SystemUser = Depends(get_current_user)) -> models.SystemUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị viên (Admin)",
        )
    return current_user


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.SystemUser).filter(models.SystemUser.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã bị khóa",
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # Ghi audit log
    audit = models.AuditLog(
        user_id=user.id,
        username=user.username,
        action="LOGIN",
        target_type="AUTH",
        details="Đăng nhập thành công",
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.SystemUser = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: schemas.PasswordChange,
    current_user: models.SystemUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự")

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}
