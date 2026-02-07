from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

# 如果是本地开发且没有启动 Docker Postgres，这里可以根据环境变量灵活切换
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if not SQLALCHEMY_DATABASE_URL or "@postgres" in SQLALCHEMY_DATABASE_URL:
    # 回退到本地 SQLite 以支持演示
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
    logging.warning("Using SQLite database for local development.")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
