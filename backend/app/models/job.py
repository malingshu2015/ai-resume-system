from sqlalchemy import Column, String, JSON, DateTime, Text
import uuid
from datetime import datetime
from app.db.session import Base

class Job(Base):
    """职位 JD 模型"""
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)  # 职位标题
    company = Column(String)  # 公司名称
    description = Column(Text)  # 原始 JD 文本
    
    # AI 解析后的结构化数据
    parsed_data = Column(JSON, nullable=True)
    
    status = Column(String, default="pending")  # pending, parsed, failed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
