from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models import resume, job, match, ai_config, job_search  # 导入模型进行表创建

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI Resume Optimizer API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# 注册路由
from app.api.v1.endpoints import resume as resume_router
from app.api.v1.endpoints import job as job_router
from app.api.v1.endpoints import match as match_router
from app.api.v1.endpoints import dashboard as dashboard_router
from app.api.v1.endpoints import config as config_router
from app.api.v1.endpoints import job_search as job_search_router
from app.api.v1.endpoints import resume_generator as resume_generator_router

app.include_router(resume_router.router, prefix=f"{settings.API_V1_STR}/resumes", tags=["resumes"])
app.include_router(job_router.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(match_router.router, prefix=f"{settings.API_V1_STR}/match", tags=["match"])
app.include_router(dashboard_router.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(config_router.router, prefix=f"{settings.API_V1_STR}/config", tags=["config"])
app.include_router(job_search_router.router, prefix=f"{settings.API_V1_STR}/job-search", tags=["job-search"])
app.include_router(resume_generator_router.router, prefix=f"{settings.API_V1_STR}/resume-generator", tags=["resume-generator"])
