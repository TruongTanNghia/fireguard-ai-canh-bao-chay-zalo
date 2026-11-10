import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"Khởi động máy chủ {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"👉 API Docs: http://localhost:{settings.PORT}/docs")
    print(f"👉 Backend:  http://localhost:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
