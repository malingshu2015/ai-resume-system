from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models import resume, job, match, ai_config, job_search  # 导入模型进行表创建

# 创建数据库表
# Base.metadata.create_all(bind=engine) # create_all 不会自动处理新增列

# 尝试自动迁移数据库（不影响主程序启动）
try:
    from sqlalchemy import text, inspect
    inspector = inspect(engine)
    if 'resumes' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('resumes')]
        with engine.begin() as conn:
            # 只有在完全确定缺失时才执行 ALTER
            if 'avatar_url' not in columns:
                conn.execute(text("ALTER TABLE resumes ADD COLUMN avatar_url VARCHAR;"))
            
            # 简化的优化字段检查
            if 'is_optimized' not in columns:
                conn.execute(text("ALTER TABLE resumes ADD COLUMN is_optimized VARCHAR;"))
                conn.execute(text("ALTER TABLE resumes ADD COLUMN parent_resume_id VARCHAR;"))
                conn.execute(text("ALTER TABLE resumes ADD COLUMN target_job_id VARCHAR;"))
    
    if 'match_results' in inspector.get_table_names():
        match_cols = [c['name'] for c in inspector.get_columns('match_results')]
        if 'learning_path' not in match_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE match_results ADD COLUMN learning_path JSON;"))
except Exception as e:
    # 哪怕迁移失败，也要让 API 先跑起来，通过健康检查是第一优先级
    print(f"Non-fatal migration skip: {e}")

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 确保 uploads 和 exports 目录存在
for d in [settings.UPLOAD_DIR, "exports"]:
    if not os.path.exists(d):
        os.makedirs(d)

# 强制将 "*" 逻辑在代码层级处理，因为 allow_credentials=True 不支持 "*"
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=False if "*" in origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

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
