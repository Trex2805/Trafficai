from fastapi import FastAPI

from backend.core.config import settings
from backend.api.routes.health import router as health_router
from backend.api.routes.inference import router as inference_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Traffic violation detection and evidence management API",
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(inference_router, prefix=settings.api_prefix)


@app.get("/")
def root():
    return {
        "application": settings.app_name,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
