from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.session import get_db
from app.models.ai_config import AIConfig

router = APIRouter()

class AIConfigCreate(BaseModel):
    provider: str
    model_name: str
    api_key: str
    api_base: str = None
    is_active: bool = False

class AIConfigUpdate(BaseModel):
    provider: str = None
    model_name: str = None
    api_key: str = None
    api_base: str = None
    is_active: bool = None

@router.get("/", response_model=List[dict])
async def get_configs(db: Session = Depends(get_db)):
    """获取所有模型配置"""
    configs = db.query(AIConfig).order_by(AIConfig.created_at.desc()).all()
    # 脱敏处理 API Key
    result = []
    for c in configs:
        result.append({
            "id": c.id,
            "provider": c.provider,
            "model_name": c.model_name,
            "api_key": f"{c.api_key[:6]}...{c.api_key[-4:]}" if len(c.api_key) > 10 else "******",
            "api_base": c.api_base,
            "is_active": c.is_active,
            "created_at": c.created_at
        })
    return result

@router.post("/")
async def create_config(config: AIConfigCreate, db: Session = Depends(get_db)):
    """创建新配置"""
    # 如果设置为激活，先取消其他激活状态
    if config.is_active:
        db.query(AIConfig).update({AIConfig.is_active: False})
    
    db_config = AIConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.put("/{config_id}")
async def update_config(config_id: str, config: AIConfigUpdate, db: Session = Depends(get_db)):
    """更新配置"""
    db_config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    update_data = config.model_dump(exclude_unset=True)
    
    if update_data.get("is_active"):
        db.query(AIConfig).update({AIConfig.is_active: False})
        
    for key, value in update_data.items():
        setattr(db_config, key, value)
        
    db.commit()
    db.refresh(db_config)
    return db_config

@router.delete("/{config_id}")
async def delete_config(config_id: str, db: Session = Depends(get_db)):
    """删除配置"""
    db_config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    db.delete(db_config)
    db.commit()
    return {"message": "配置已删除"}

@router.post("/{config_id}/activate")
async def activate_config(config_id: str, db: Session = Depends(get_db)):
    """激活特定配置"""
    db_config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    # 取消所有激活
    db.query(AIConfig).update({AIConfig.is_active: False})
    # 激活当前
    db_config.is_active = True
    db.commit()
    return {"message": f"已激活 {db_config.provider} - {db_config.model_name}"}
