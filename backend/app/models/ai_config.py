from sqlalchemy import Column, String, Boolean, DateTime
import uuid
from datetime import datetime
from app.db.session import Base

class AIConfig(Base):
    """AI 模型配置模型"""
    __tablename__ = "ai_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider = Column(String, nullable=False)  # 供应商名称: DeepSeek, Claude, OpenAI, Kimi 等
    model_name = Column(String, nullable=False) # 具体模型名: deepseek-chat, gpt-4o 等
    api_key = Column(String, nullable=False)
    api_base = Column(String, nullable=True)    # API 基础路径
    is_active = Column(Boolean, default=False)  # 是否为当前使用的模型
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
