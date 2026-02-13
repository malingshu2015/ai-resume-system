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
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 确保文件夹存在
for d in [settings.UPLOAD_DIR, "exports"]:
    if not os.path.exists(d):
        os.makedirs(d)

# 跨域配置逻辑 - 动态识别或星号兼容
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
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
async def health(): return {"status": "ok"}

@app.get("/")
async def root(): return {"message": "API is Live"}

# 注册路由
from app.api.v1.endpoints import resume, job, match, dashboard, config, job_search, resume_generator
app.include_router(resume.router, prefix=f"{settings.API_V1_STR}/resumes", tags=["resumes"])
app.include_router(job.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(match.router, prefix=f"{settings.API_V1_STR}/match", tags=["match"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(config.router, prefix=f"{settings.API_V1_STR}/config", tags=["config"])
app.include_router(job_search.router, prefix=f"{settings.API_V1_STR}/job-search", tags=["job-search"])
app.include_router(resume_generator.router, prefix=f"{settings.API_V1_STR}/resume-generator", tags=["resume-generator"])
