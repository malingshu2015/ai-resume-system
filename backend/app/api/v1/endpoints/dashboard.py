from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.resume import Resume
from app.models.job import Job
from app.models.match import MatchResult
from sqlalchemy import func

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """获取仪表盘统计数据"""
    resume_count = db.query(Resume).count()
    job_count = db.query(Job).count()
    match_count = db.query(MatchResult).count()
    
    # 简单计算一个平均评分
    avg_score = db.query(func.avg(MatchResult.match_score)).scalar() or 0
    
    return {
        "resumes": resume_count,
        "jobs": job_count,
        "matches": match_count,
        "avg_score": round(avg_score, 1)
    }

@router.get("/recent")
async def get_recent_activities(db: Session = Depends(get_db), limit: int = 5):
    """获取最近动态"""
    # 1. 获取最近上传的简历
    recent_resumes = db.query(Resume).order_by(Resume.created_at.desc()).limit(limit).all()
    # 2. 获取最近创建的职位
    recent_jobs = db.query(Job).order_by(Job.created_at.desc()).limit(limit).all()
    # 3. 获取最近的匹配分析
    recent_matches = db.query(MatchResult).order_by(MatchResult.created_at.desc()).limit(limit).all()
    
    activities = []
    
    for r in recent_resumes:
        activities.append({
            "title": f"上传简历: {r.filename}",
            "time": r.created_at.isoformat(),
            "status": "解析中" if r.status == "parsing" else "已完成",
            "type": "upload"
        })
        
    for j in recent_jobs:
        activities.append({
            "title": f"录入职位: {j.title}",
            "time": j.created_at.isoformat(),
            "status": "已入库",
            "type": "job"
        })
        
    for m in recent_matches:
        resume = db.query(Resume).filter(Resume.id == m.resume_id).first()
        job = db.query(Job).filter(Job.id == m.job_id).first()
        activities.append({
            "title": f"匹配分析: {resume.filename if resume else '未知'} -> {job.title if job else '未知'}",
            "time": m.created_at.isoformat(),
            "status": f"评分 {m.match_score}",
            "type": "match"
        })
        
    # 按时间全局排序并返回
    activities.sort(key=lambda x: x["time"], reverse=True)
    return activities[:limit*2]
