from app.main import app

# Expose all top-level entrypoints required by Vercel Python runtime
application = app
handler = app


