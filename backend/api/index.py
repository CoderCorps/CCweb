import sys
import os
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from app.main import app as main_app
    app = main_app
except Exception as e:
    err_traceback = traceback.format_exc()
    print(f"[VERCEL STARTUP ERROR]:\n{err_traceback}")
    
    app = FastAPI(title="CoderCorps Vercel Fallback")
    
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    async def boot_failure_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend server failed to start on Vercel",
                "detail": str(e),
                "traceback": err_traceback
            }
        )

application = app
handler = app


