from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.services.job_search_service import job_search_service

router = APIRouter()


class JobSearchRequest(BaseModel):
    """职位搜索请求"""
    keyword: str
    location: str
    max_results: int = 20
    salary_min: Optional[int] = None  # 最低薪资（单位：k）
    salary_max: Optional[int] = None  # 最高薪资（单位：k）
    experience_years: Optional[str] = None  # 经验要求：1-3年、3-5年、5-10年、10年以上


class JobSearchResponse(BaseModel):
    """职位搜索响应"""
    task_id: str
    message: str


class BatchImportRequest(BaseModel):
    """批量导入请求"""
    job_ids: List[str]


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest):
    """
    创建职位搜索任务（支持高级筛选）
    
    - **keyword**: 搜索关键词（如"安全"、"大模型"）
    - **location**: 搜索地点（如"深圳"、"上海"）
    - **max_results**: 最大结果数量（默认20）
    - **salary_min**: 最低薪资（k），如 20 表示 20k
    - **salary_max**: 最高薪资（k），如 50 表示 50k
    - **experience_years**: 经验要求（1-3年、3-5年、5-10年、10年以上）
    """
    try:
        task_id = await job_search_service.create_search_task(
            keyword=request.keyword,
            location=request.location,
            max_results=request.max_results,
            salary_min=request.salary_min,
            salary_max=request.salary_max,
            experience_years=request.experience_years
        )
        
        filter_desc = []
        if request.salary_min or request.salary_max:
            salary_range = f"{request.salary_min or 0}k-{request.salary_max or '不限'}k"
            filter_desc.append(f"薪资{salary_range}")
        if request.experience_years:
            filter_desc.append(f"经验{request.experience_years}")
        
        filter_text = f"（筛选条件：{', '.join(filter_desc)}）" if filter_desc else ""
        
        return JobSearchResponse(
            task_id=task_id,
            message=f"搜索任务已创建，正在采集 {request.keyword} 相关职位{filter_text}..."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建搜索任务失败: {str(e)}")


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """获取搜索任务状态"""
    task = job_search_service.get_task_status(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return task


@router.get("/tasks")
async def list_tasks():
    """获取所有搜索任务列表"""
    from app.db.session import SessionLocal
    from app.models.job_search import JobSearchTask
    
    db = SessionLocal()
    try:
        tasks = db.query(JobSearchTask).order_by(
            JobSearchTask.created_at.desc()
        ).limit(50).all()
        
        return [
            {
                "id": task.id,
                "keyword": task.keyword,
                "location": task.location,
                "status": task.status,
                "total_found": task.total_found,
                "total_saved": task.total_saved,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None
            }
            for task in tasks
        ]
    finally:
        db.close()


@router.get("/crawled-jobs")
async def get_crawled_jobs(
    task_id: Optional[str] = Query(None, description="任务ID"),
    keyword: Optional[str] = Query(None, description="关键词筛选"),
    location: Optional[str] = Query(None, description="地点筛选"),
    limit: int = Query(50, description="返回数量")
):
    """
    获取采集的职位列表
    
    支持按任务ID、关键词、地点筛选
    """
    jobs = job_search_service.get_crawled_jobs(
        task_id=task_id,
        keyword=keyword,
        location=location,
        limit=limit
    )
    
    return jobs


@router.post("/crawled-jobs/{job_id}/import")
async def import_crawled_job(job_id: str):
    """将采集的职位导入到正式职位库"""
    from app.db.session import SessionLocal
    from app.models.job_search import CrawledJob
    from app.models.job import Job
    
    db = SessionLocal()
    try:
        crawled_job = db.query(CrawledJob).filter(CrawledJob.id == job_id).first()
        
        if not crawled_job:
            raise HTTPException(status_code=404, detail="职位不存在")
        
        if crawled_job.is_imported:
            raise HTTPException(status_code=400, detail="该职位已导入")
        
        # 创建正式职位
        job = Job(
            title=crawled_job.title,
            company=crawled_job.company,
            description=crawled_job.description,
            parsed_data=crawled_job.parsed_data,
            status="parsed" if crawled_job.parse_status == "parsed" else "pending"
        )
        
        db.add(job)
        db.flush()
        
        # 标记为已导入
        crawled_job.is_imported = True
        crawled_job.imported_job_id = job.id
        
        db.commit()
        
        return {
            "message": "职位导入成功",
            "job_id": job.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")
    finally:
        db.close()


@router.post("/crawled-jobs/batch-import")
async def batch_import_jobs(request: BatchImportRequest):
    """
    批量导入职位到正式库
    
    - **job_ids**: 要导入的职位ID列表
    """
    try:
        result = await job_search_service.batch_import_jobs(request.job_ids)
        
        return {
            "message": f"批量导入完成：成功 {result['success_count']} 个，失败 {result['failed_count']} 个",
            "success_count": result["success_count"],
            "failed_count": result["failed_count"],
            "total": result["total"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量导入失败: {str(e)}")


@router.get("/recommend/{resume_id}")
async def recommend_jobs(
    resume_id: str,
    limit: int = Query(10, description="推荐数量")
):
    """
    为指定简历智能推荐匹配的职位
    
    - **resume_id**: 简历ID
    - **limit**: 推荐数量（默认10）
    
    返回按匹配度排序的职位列表，包含匹配分数
    """
    try:
        recommendations = await job_search_service.recommend_jobs_for_resume(
            resume_id=resume_id,
            limit=limit
        )
        
        return {
            "resume_id": resume_id,
            "total": len(recommendations),
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推荐失败: {str(e)}")


@router.delete("/crawled-jobs/{job_id}")
async def delete_crawled_job(job_id: str):
    """删除采集的职位"""
    from app.db.session import SessionLocal
    from app.models.job_search import CrawledJob
    
    db = SessionLocal()
    try:
        job = db.query(CrawledJob).filter(CrawledJob.id == job_id).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="职位不存在")
        
        db.delete(job)
        db.commit()
        
        return {"message": "删除成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
    finally:
        db.close()
