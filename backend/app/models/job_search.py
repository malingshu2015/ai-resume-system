from sqlalchemy import Column, String, JSON, DateTime, Text, Integer, Boolean
import uuid
from datetime import datetime
from app.db.session import Base

class JobSearchTask(Base):
    """职位搜索任务模型"""
    __tablename__ = "job_search_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    keyword = Column(String, index=True)  # 搜索关键词
    location = Column(String)  # 搜索地点
    
    status = Column(String, default="pending")  # pending, running, completed, failed
    total_found = Column(Integer, default=0)  # 找到的职位总数
    total_saved = Column(Integer, default=0)  # 成功保存的职位数
    
    error_message = Column(Text, nullable=True)  # 错误信息
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class CrawledJob(Base):
    """采集的职位模型"""
    __tablename__ = "crawled_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, index=True)  # 关联的搜索任务ID
    
    # 基本信息
    title = Column(String, index=True)
    company = Column(String, index=True)
    location = Column(String)
    salary_range = Column(String, nullable=True)
    
    # 详细信息
    description = Column(Text)
    source_url = Column(String, nullable=True)  # 原始职位链接
    source_platform = Column(String, nullable=True)  # 来源平台（Boss、拉勾等）
    
    # AI 解析结果
    parsed_data = Column(JSON, nullable=True)
    parse_status = Column(String, default="pending")  # pending, parsed, failed
    
    # 去重标识
    job_hash = Column(String, unique=True, index=True)  # 用于去重
    
    # 是否已转为正式职位
    is_imported = Column(Boolean, default=False)
    imported_job_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
