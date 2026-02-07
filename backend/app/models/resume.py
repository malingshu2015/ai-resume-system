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
    file_path = Column(String)
    file_type = Column(String)
    
    # 核心解析内容存为 JSONB 或 JSON
    parsed_data = Column(JSON, nullable=True)
    
    status = Column(String, default="uploaded") # uploaded, parsing, completed, failed
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
