import sys
import traceback

try:
    from app.main import app
except Exception as e:
    err_traceback = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse
    app = FastAPI()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def error_route(full_path: str):
        return PlainTextResponse(f"PYTHON MODULE IMPORT CRASH:\n\n{err_traceback}", status_code=500)

