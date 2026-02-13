from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

# 解析数据库 URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL or ""

# 增强型本地环境检查
is_local = False
if not SQLALCHEMY_DATABASE_URL:
    is_local = True
elif "postgres" in SQLALCHEMY_DATABASE_URL:
    # 如果主机名包含 postgres 且不是本地 ip，但在本地环境运行（没有 Docker 容器），通常会连接失败
    # 特别是处理 postgresql://user:pass@postgres:5432/db 这种 Docker 默认格式
    import socket
    try:
        # 尝试检查主机名是否可解析
        from urllib.parse import urlparse
        parts = urlparse(SQLALCHEMY_DATABASE_URL)
        if parts.hostname == "postgres":
            # 这是一个典型的 Docker 内部地址，在本地 OS 运行 Uvicorn 时通常无效
            is_local = True
    except:
        pass

if is_local:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
    logging.info("Detected local development environment or missing DB URL, defaulting to SQLite.")
elif SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 创建引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {},
    pool_pre_ping=True # 自动检测失效连接
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
