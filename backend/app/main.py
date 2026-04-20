from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, courses, ai, admin
from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.core.logging import setup_logging, logger
from fastapi import responses, Request

setup_logging()

app = FastAPI(title=settings.PROJECT_NAME)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    # Simple rate limit for login
    if request.url.path.endswith("/login") and request.method == "POST":
        # In a real app, use Redis or similar
        # For now, just pass through but log it
        logger.debug(f"Login attempt from IP: {client_ip}")
    
    return await call_next(request)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        error_type = type(e).__name__
        error_msg = str(e)
        stack_trace = traceback.format_exc()
        logger.error(f"Unhandled error [{error_type}]: {error_msg}\n{stack_trace}")
        return responses.JSONResponse(
            status_code=500,
            content={"detail": f"Erreur serveur [{error_type}]: {error_msg}"}
        )

@app.middleware("http")
async def log_origin_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        logger.info(f"[CORS] Request from origin: {origin}")
    return await call_next(request)

# IMPORTANT: CORSMiddleware must be added LAST to ensure it's the OUTERMOST middleware.
# This ensures it handles all responses, including those from other middlewares.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting EMSI Copilot API...")
    try:
        async with AsyncSessionLocal() as db:
            await init_db(db)
        logger.info("Database connection and bootstrap: OK")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        
    ai_status = "ENABLED" if settings.AI_ENABLED else "DISABLED"
    logger.info(f"AI Service Status: {ai_status}")
    if not settings.AI_ENABLED:
        logger.warning("OPENAI_API_KEY is missing. RAG functionality will be limited.")

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(courses.router, prefix=f"{settings.API_V1_STR}/courses", tags=["courses"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "Welcome to EMSI Copilot API"}
