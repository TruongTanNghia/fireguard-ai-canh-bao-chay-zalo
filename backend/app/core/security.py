from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from app.core.config import settings

# Dùng thư viện bcrypt trực tiếp thay cho passlib: passlib 1.7.4 bị lỗi với bcrypt >= 4.1
# ("password cannot be longer than 72 bytes"), khiến không đăng nhập được khi máy cài bcrypt mới.
# Định dạng hash ($2b$...) giữ nguyên nên mật khẩu đã lưu trước đây vẫn dùng được.
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    return (password or "").encode("utf-8")[:_BCRYPT_MAX_BYTES]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain_password), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_to_bcrypt_bytes(password), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
