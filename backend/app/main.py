from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
import os
import logging

# 初始化 FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    redirect_slashes=True  # 恢复自动重定向，防止 404
)

# 自动创建数据库表 (如果不存在)
try:
    from app.models import resume, job, match, ai_config, job_search
    Base.metadata.create_all(bind=engine)
    logging.info("Database tables verified/created successfully.")
except Exception as e:
    logging.error(f"Table creation skip: {e}")

# 确保文件夹存在
for d in [settings.UPLOAD_DIR, "exports"]:
    if not os.path.exists(d):
        os.makedirs(d)

# 跨域配置逻辑 - 更加智能的解析（支持逗号分割或 JSON 列表格式）
raw_origins = settings.ALLOWED_ORIGINS
# 如果看起来像 JSON 列表，去掉括号和引号
if raw_origins.startswith("[") and raw_origins.endswith("]"):
    raw_origins = raw_origins[1:-1].replace('"', '').replace("'", "")

origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

if "http://localhost:5173" not in origins:
    origins.append("http://localhost:5173")
if "http://127.0.0.1:5173" not in origins:
    origins.append("http://127.0.0.1:5173")
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all, # * 时必须为 False
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 终极防御：全局异常处理器，确保 500 报错时也能返回跨域头
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global error: {exc}", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )
    # 手动添加跨域头，防止浏览器拦截 500 详情
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# 挂载静态文件
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

# 注册健康检查（最简单路径）
@app.get("/health")
async def health(): 
    from app.db.session import SQLALCHEMY_DATABASE_URL
    db_type = "sqlite" if "sqlite" in SQLALCHEMY_DATABASE_URL else "postgresql"
    return {"status": "ok", "db_type": db_type}

@app.get("/")
async def root(): return {"message": "API is Live"}

# 兼容性路由：如果前端请求了错误的路径，转发到正确的 API
@app.get("/jobs")
@app.get("/jobs/")
async def redirect_jobs():
    """兼容性端点，将来自前端的错误请求转发到正确的 API"""
    from sqlalchemy.orm import Session
    from app.db.session import SessionLocal
    from app.api.v1.endpoints.job import list_jobs

    db = SessionLocal()
    try:
        return await list_jobs(db=db)
    except Exception as e:
        logging.error(f"Compatibility route error: {e}")
        raise
    finally:
        db.close()

# 注册路由
from app.api.v1.endpoints import resume, job, match, dashboard, config, job_search, resume_generator
app.include_router(resume.router, prefix=f"{settings.API_V1_STR}/resumes", tags=["resumes"])
app.include_router(job.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(match.router, prefix=f"{settings.API_V1_STR}/match", tags=["match"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(config.router, prefix=f"{settings.API_V1_STR}/config", tags=["config"])
app.include_router(job_search.router, prefix=f"{settings.API_V1_STR}/job-search", tags=["job-search"])
app.include_router(resume_generator.router, prefix=f"{settings.API_V1_STR}/resume-generator", tags=["resume-generator"])
