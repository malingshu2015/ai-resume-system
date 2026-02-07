from sqlalchemy import Column, String, JSON, DateTime, Integer, ForeignKey
import uuid
from datetime import datetime
from app.db.session import Base

class MatchResult(Base):
    """简历与职位匹配结果模型"""
    __tablename__ = "match_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id = Column(String, index=True)  # 关联的简历 ID
    job_id = Column(String, index=True)  # 关联的职位 ID
    
    # 匹配分析结果
    match_score = Column(Integer)  # 匹配度评分 (0-100)
    analysis = Column(JSON)  # 详细分析结果
    suggestions = Column(JSON)  # 优化建议列表
    optimized_resume = Column(String, nullable=True)  # 优化后的简历全文/片段
    optimized_summary = Column(String, nullable=True)  # 优化后的个人简介
    
    created_at = Column(DateTime, default=datetime.utcnow)
