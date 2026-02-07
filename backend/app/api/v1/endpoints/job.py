from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.models.job import Job
from app.services.ai_service import ai_service
from app.services.scraper_service import scraper_service

router = APIRouter()

class JobCreate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None # 用于截图解析后的内容填充

@router.post("/analyze-screenshot")
async def analyze_screenshot(payload: dict):
    """分析职位截图并提取文本信息"""
    image_base64 = payload.get("image")
    if not image_base64:
        raise HTTPException(status_code=400, detail="未提供图片数据")
    
    # 去除 base64 前缀
    if "base64," in image_base64:
        image_base64 = image_base64.split("base64,")[1]
    
    result = await ai_service.analyze_job_screenshot(image_base64)
    if not result:
        raise HTTPException(status_code=500, detail="图片解析失败，请确保图片清晰且包含职位信息")
    
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

async def process_job_parsing(job_id: str, db: Session):
    """后台任务：解析职位 JD (支持从 URL 抓取)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return
    
    try:
        job.status = "parsing"
        db.commit()
        
        # 如果有 URL 但没有描述，先抓取内容
        if job.description == "FROM_URL" and hasattr(job, 'url') or (not job.description and hasattr(job, 'url')):
            # 这里我们需要在模型中增加 url 字段，或者临时存储
            # 为了简单，我们假设如果提供了 URL，前端会传原始 URL
            # 实际上我们需要修改模型来存储 URL
            pass

        # 检查是否需要更新描述
        content = job.description
        
        parsed_result = await ai_service.parse_job_description(content)
        
        if parsed_result:
            job.parsed_data = parsed_result
            job.status = "parsed"
            # 如果标题或公司是占位符，由解析结果更新
            if job.title == "自动获取中...":
                job.title = parsed_result.get("job_title", "未命名职位")
            if job.company == "自动获取中...":
                job.company = parsed_result.get("company", "未知公司")
        else:
            job.status = "failed"
        
        db.commit()
    except Exception as e:
        print(f"JD 解析失败: {str(e)}")
        job.status = "failed"
        db.commit()

@router.post("/")
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """创建职位并触发 AI 解析 (支持 URL)"""
    
    final_description = job_data.description
    final_title = job_data.title or "自动获取中..."
    final_company = job_data.company or "自动获取中..."

    # 如果提供了 URL，先同步获取内容（或者放入后台，这里为了用户反馈，我们同步获取前段内容，AI 解析放后台）
    if job_data.url:
        try:
            # 同步抓取内容（仅抓取 HTML->TEXT），确保 AI 有内容可解
            final_description = await scraper_service.fetch_job_content(job_data.url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"无法抓取链接内容: {str(e)}")

    if not final_description:
        raise HTTPException(status_code=400, detail="职位描述或 URL 链接必填其一")

    db_job = Job(
        title=final_title,
        company=final_company,
        description=final_description,
        status="parsing"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    background_tasks.add_task(process_job_parsing, db_job.id, db)
    
    return {
        "id": db_job.id,
        "title": db_job.title,
        "status": "parsing",
        "message": "职位已创建，正在通过链接同步并智能解析..." if job_data.url else "职位已创建，正在智能解析..."
    }

@router.get("/", response_model=List[dict])
async def list_jobs(db: Session = Depends(get_db)):
    """获取职位列表"""
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "status": j.status,
            "created_at": j.created_at.isoformat()
        } for j in jobs
    ]

@router.get("/{job_id}")
async def get_job(job_id: str, db: Session = Depends(get_db)):
    """获取职位详情"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="职位不存在")
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "parsed_data": job.parsed_data,
        "status": job.status,
        "created_at": job.created_at.isoformat()
    }

@router.delete("/{job_id}")
async def delete_job(job_id: str, db: Session = Depends(get_db)):
    """删除职位"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="职位不存在")
    db.delete(job)
    db.commit()
    return {"message": "职位已删除"}
