from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
async def startup():
    import os
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

    try:
        from app.routers import auth, onboarding, chat, labs, dashboard
        from app import settings as settings_router
        from app.database import engine, Base

        app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
        app.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
        app.include_router(chat.router, prefix="/chat", tags=["Chat"])
        app.include_router(labs.router, prefix="/labs", tags=["Labs"])
        app.include_router(dashboard.router, tags=["Dashboard"])
        app.include_router(settings_router.router, tags=["Settings"])

        async with engine.begin() as conn:
            from app.database import Base
            await conn.run_sync(Base.metadata.create_all)

    except Exception as e:
        app.state.boot_error = str(e)

@app.get("/api/health")
@app.get("/health")
async def health():
    error = getattr(app.state, "boot_error", None)
    if error:
        return {"status": "degraded", "error": error}
    return {"status": "ok", "version": "1.0.0", "message": "ZORA AI is running"}