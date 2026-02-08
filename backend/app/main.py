from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models import resume, job, match, ai_config, job_search  # 导入模型进行表创建

# 创建数据库表
# Base.metadata.create_all(bind=engine) # create_all 不会自动处理新增列

# 手动添加缺失的列（采用更稳健的连接方式）
from sqlalchemy import text, inspect
with engine.begin() as conn:
    try:
        # 使用 inspector 检查列是否存在，防止 ALTER TABLE 重复执行报错
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('resumes')]
        
        if 'avatar_url' not in columns:
            conn.execute(text("ALTER TABLE resumes ADD COLUMN avatar_url VARCHAR;"))
            print("Successfully added avatar_url column to resumes table.")
            
        # 同时检查其他可能缺失的优化版字段
        optimization_cols = ['is_optimized', 'parent_resume_id', 'target_job_id', 'target_job_title', 'target_job_company', 'optimization_notes']
        for col in optimization_cols:
            if col not in columns:
                conn.execute(text(f"ALTER TABLE resumes ADD COLUMN {col} VARCHAR;"))
        
    except Exception as e:
        print(f"Migration error: {e}")

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 确保 uploads 目录存在
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

# 挂载静态文件目录
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# CORS 配置 - 万能配置以确保调试通过
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
