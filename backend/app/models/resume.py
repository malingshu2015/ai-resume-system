from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.db.session import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # user_id = Column(String, index=True) # 暂时不加外链，保证 Demo 跑通
    filename = Column(String, index=True)
    file_path = Column(String, nullable=True)  # 优化版简历可能没有物理文件
    file_type = Column(String, nullable=True)
    
    # 核心解析内容存为 JSONB 或 JSON
    parsed_data = Column(JSON, nullable=True)
    
    status = Column(String, default="uploaded") # uploaded, parsing, parsed, optimized, failed
    is_default = Column(Boolean, default=False)
    
    # === 新增：AI 优化版简历的关联信息 ===
    is_optimized = Column(Boolean, default=False)  # 是否为 AI 优化版
    parent_resume_id = Column(String, nullable=True)  # 原始简历 ID（用于追溯）
    target_job_id = Column(String, nullable=True)  # 目标岗位 ID
    target_job_title = Column(String, nullable=True)  # 目标岗位名称（快照，防止岗位删除后丢失）
    target_job_company = Column(String, nullable=True)  # 目标公司名称（快照）
    optimization_notes = Column(String, nullable=True)  # 优化说明/特点概述
    avatar_url = Column(String, nullable=True)  # 应聘者头像 URL
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
