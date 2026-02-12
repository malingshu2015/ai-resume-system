from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models import resume, job, match, ai_config, job_search  # 导入模型进行表创建

# 创建数据库表
# Base.metadata.create_all(bind=engine) # create_all 不会自动处理新增列

# 手动添加缺失的列（采用更稳健的连接方式）
from sqlalchemy import text, inspect
try:
    # 1. 先检查列（在事务外进行探测）
    inspector = inspect(engine)
    if 'resumes' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('resumes')]
        
        # 2. 如果有缺失字段，再开启事务执行 ALTER
        missing_cols = []
        if 'avatar_url' not in columns:
            missing_cols.append(("avatar_url", "VARCHAR"))
            
        optimization_cols = [
            ('is_optimized', 'VARCHAR'), 
            ('parent_resume_id', 'VARCHAR'), 
            ('target_job_id', 'VARCHAR'), 
            ('target_job_title', 'VARCHAR'), 
            ('target_job_company', 'VARCHAR'), 
            ('optimization_notes', 'VARCHAR'),
            ('share_token', 'VARCHAR'),
            ('share_expires_at', 'TIMESTAMP')
        ]
        
        for col_name, col_type in optimization_cols:
            if col_name not in columns:
                missing_cols.append((col_name, col_type))
        
        if missing_cols:
            with engine.begin() as conn:
                for col_name, col_type in missing_cols:
                    conn.execute(text(f"ALTER TABLE resumes ADD COLUMN {col_name} {col_type};"))
                    print(f"Successfully added {col_name} column to resumes table.")

    # 3. 检查 match_results 表
    if 'match_results' in inspector.get_table_names():
        match_cols = [c['name'] for c in inspector.get_columns('match_results')]
        if 'learning_path' not in match_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE match_results ADD COLUMN learning_path JSON;"))
                print("Successfully added learning_path column to match_results table.")
        if 'skill_mastery_blueprints' not in match_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE match_results ADD COLUMN skill_mastery_blueprints JSON;"))
                print("Successfully added skill_mastery_blueprints column to match_results table.")
except Exception as e:
    print(f"Migration error: {e}")

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 确保 uploads 和 exports 目录存在
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

if not os.path.exists("exports"):
    os.makedirs("exports")

# 挂载静态文件目录
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

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
