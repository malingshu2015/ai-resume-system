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
    """分析简历与职位的匹配度，并自动保存优化版简历到简历库"""
    
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
    
    # === 核心改进：自动保存优化版简历到简历库 ===
    # 重要：完整保留原始简历内容，仅增加 AI 优化建议，不删减任何原有内容
    saved_resume_id = None
    new_filename = None
    try:
        # 生成优化版简历的文件名
        original_name = resume.filename.rsplit('.', 1)[0] if resume.filename else "简历"
        new_filename = f"AI优化版_{original_name}_{job.title}"
        
        # 完整复制原始简历内容（深拷贝，确保不丢失任何数据）
        import copy
        optimized_content = copy.deepcopy(resume.parsed_data) if resume.parsed_data else {}
        
        # 添加 AI 优化元数据（新增字段，不覆盖原有内容）
        optimized_content["_ai_optimization"] = {
            "optimized_at": db_match.created_at.isoformat() if db_match.created_at else None,
            "target_job": {
                "title": job.title,
                "company": job.company,
                "id": job.id
            },
            "match_score": match_result.get("match_score", 0),
            "optimized_summary": match_result.get("optimized_summary", ""),
            "suggestions": match_result.get("suggestions", []),
            "analysis": match_result.get("analysis", "")
        }
        
        # 如果有优化摘要，增加到个人信息中（但保留原有摘要）
        if match_result.get("optimized_summary"):
            if "personal_info" not in optimized_content:
                optimized_content["personal_info"] = {}
            # 保留原有摘要，额外存储 AI 优化版摘要
            original_summary = optimized_content.get("personal_info", {}).get("summary", "")
            optimized_content["personal_info"]["_original_summary"] = original_summary
            optimized_content["personal_info"]["summary"] = match_result.get("optimized_summary")
        
        # 创建新的简历记录
        new_resume = Resume(
            filename=new_filename,
            file_path=None,
            file_type="ai_generated",
            parsed_data=optimized_content,
            status="optimized",
            is_optimized=True,
            parent_resume_id=request.resume_id,
            target_job_id=request.job_id,
            target_job_title=job.title,
            target_job_company=job.company,
            optimization_notes=f"针对【{job.company} - {job.title}】岗位深度优化，匹配度 {match_result.get('match_score', 0)}%"
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        saved_resume_id = new_resume.id
    except Exception as e:
        # 即使保存失败，也返回分析结果
        print(f"自动保存优化简历失败: {e}")

    
    return {
        "id": db_match.id,
        "match_score": match_result.get("match_score"),
        "analysis": match_result.get("analysis"),
        "suggestions": match_result.get("suggestions"),
        "optimized_resume": match_result.get("optimized_resume"),
        "optimized_summary": match_result.get("optimized_summary"),
        "resume_name": resume.filename,
        "job_title": job.title,
        "job_company": job.company,
        # 新增：返回保存的简历信息
        "saved_resume_id": saved_resume_id,
        "saved_resume_name": new_filename if saved_resume_id else None
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
