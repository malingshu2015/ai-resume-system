from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.session import get_db
from app.models.resume import Resume
from app.models.job import Job
from app.models.match import MatchResult
from app.services.ai_service import ai_service

router = APIRouter()

class MatchRequest(BaseModel):
    resume_id: str
    job_id: str

@router.post("/analyze")
async def analyze_match(request: MatchRequest, db: Session = Depends(get_db)):
    """分析简历与职位的匹配度"""
    
    # 获取简历
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume or not resume.parsed_data:
        raise HTTPException(status_code=400, detail="简历不存在或尚未解析完成")
    
    # 获取职位
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job or not job.parsed_data:
        raise HTTPException(status_code=400, detail="职位不存在或尚未解析完成")
    
    # 调用 AI 进行匹配分析
    match_result = await ai_service.analyze_resume_job_match(
        resume.parsed_data,
        job.parsed_data,
        job.description
    )
    
    if not match_result:
        raise HTTPException(status_code=500, detail="匹配分析失败")
    
    # 保存匹配结果
    db_match = MatchResult(
        resume_id=request.resume_id,
        job_id=request.job_id,
        match_score=match_result.get("match_score", 0),
        analysis=match_result.get("analysis", {}),
        suggestions=match_result.get("suggestions", []),
        optimized_resume=match_result.get("optimized_resume"),
        optimized_summary=match_result.get("optimized_summary")
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    
    return {
        "id": db_match.id,
        "match_score": match_result.get("match_score"),
        "analysis": match_result.get("analysis"),
        "suggestions": match_result.get("suggestions"),
        "optimized_resume": match_result.get("optimized_resume"),
        "optimized_summary": match_result.get("optimized_summary"),
        "resume_name": resume.filename,
        "job_title": job.title
    }

@router.get("/history", response_model=List[dict])
async def get_match_history(db: Session = Depends(get_db)):
    """获取匹配历史记录"""
    results = db.query(MatchResult).order_by(MatchResult.created_at.desc()).limit(20).all()
    
    history = []
    for r in results:
        resume = db.query(Resume).filter(Resume.id == r.resume_id).first()
        job = db.query(Job).filter(Job.id == r.job_id).first()
        history.append({
            "id": r.id,
            "resume_name": resume.filename if resume else "未知",
            "job_title": job.title if job else "未知",
            "match_score": r.match_score,
            "created_at": r.created_at.isoformat()
        })
    
    return history

@router.get("/{match_id}")
async def get_match_detail(match_id: str, db: Session = Depends(get_db)):
    """获取匹配详情"""
    result = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="匹配记录不存在")
    
    resume = db.query(Resume).filter(Resume.id == result.resume_id).first()
    job = db.query(Job).filter(Job.id == result.job_id).first()
    
    return {
        "id": result.id,
        "match_score": result.match_score,
        "analysis": result.analysis,
        "suggestions": result.suggestions,
        "resume": {
            "id": resume.id if resume else None,
            "filename": resume.filename if resume else None,
            "parsed_data": resume.parsed_data if resume else None
        },
        "job": {
            "id": job.id if job else None,
            "title": job.title if job else None,
            "company": job.company if job else None,
            "parsed_data": job.parsed_data if job else None
        },
        "created_at": result.created_at.isoformat()
    }
