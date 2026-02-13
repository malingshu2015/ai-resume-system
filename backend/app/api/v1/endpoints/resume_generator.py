from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import os

from app.services.resume_generator import resume_generator
from app.services.email_service import email_service
from app.db.session import get_db
from app.models.resume import Resume
from app.models.job import Job
import uuid
from datetime import datetime, timedelta

router = APIRouter()


class SuggestionItem(BaseModel):
    """单条优化建议"""
    category: str
    content: str
    template: Optional[str] = None
    edited: bool = False


class GenerateResumeRequest(BaseModel):
    """生成简历请求"""
    resume_id: str
    job_id: Optional[str] = None  # 目标职位ID，用于定向优化
    template: str = "modern"  # modern, professional, creative, minimal
    suggestions: Optional[List[SuggestionItem]] = None  # 用户选择并可能编辑过的建议列表
    optimization_suggestions: Optional[Dict] = None  # 保留向后兼容
    save_to_library: bool = True  # 是否保存到简历库（默认是）
    refined_content: Optional[str] = None  # 用户编辑过的修订版内容


class ExportResumeRequest(BaseModel):
    """导出简历请求"""
    resume_data: Dict
    format: str = "pdf"  # pdf, docx, markdown, html, json, png
    filename: Optional[str] = None


class SendEmailRequest(BaseModel):
    """发送邮件请求"""
    resume_id: str
    to_email: str
    format: str = "pdf"
    subject: Optional[str] = None
    message: Optional[str] = None


class GenerateShareLinkRequest(BaseModel):
    """生成分享链接请求"""
    resume_id: str
    expire_days: int = 7


@router.post("/generate")
async def generate_optimized_resume(
    request: GenerateResumeRequest,
    db: Session = Depends(get_db)
):
    """
    生成优化后的简历，并自动保存到简历库
    """
    try:
        # 优先使用 suggestions 列表，如果没有则使用 optimization_suggestions
        optimization_data = None
        if request.suggestions:
            # 将建议列表转换为优化数据格式
            optimization_data = {
                "suggestions": [
                    {
                        "category": s.category,
                        "content": s.content,
                        "template": s.template,
                        "edited": s.edited
                    }
                    for s in request.suggestions
                ]
            }
        elif request.optimization_suggestions:
            optimization_data = request.optimization_suggestions
        
        # 调用 AI 生成优化简历
        generated_resume = await resume_generator.generate_optimized_resume(
            resume_id=request.resume_id,
            job_id=request.job_id,
            optimization_suggestions=optimization_data,
            template=request.template,
            refined_content=request.refined_content
        )
        
        # 获取原始简历和目标岗位信息
        original_resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        target_job = None
        if request.job_id:
            target_job = db.query(Job).filter(Job.id == request.job_id).first()
        
        saved_resume_id = None
        
        # 保存到简历库
        if request.save_to_library and original_resume:
            # 生成新简历的文件名
            original_name = original_resume.filename.rsplit('.', 1)[0] if original_resume.filename else "简历"
            job_suffix = f"_{target_job.title}" if target_job else "_优化版"
            new_filename = f"{original_name}{job_suffix}"
            
            # 生成优化说明
            optimization_notes = f"基于 AI 深度分析自动优化"
            if target_job:
                optimization_notes = f"针对【{target_job.company} - {target_job.title}】岗位深度优化"
            
            # 创建新的简历记录
            new_resume = Resume(
                filename=new_filename,
                file_path=None,  # AI 生成的简历暂无物理文件
                file_type="ai_generated",
                parsed_data=generated_resume.get("content", {}),
                status="optimized",
                is_optimized=True,
                parent_resume_id=request.resume_id,
                target_job_id=request.job_id,
                target_job_title=target_job.title if target_job else None,
                target_job_company=target_job.company if target_job else None,
                optimization_notes=optimization_notes
            )
            db.add(new_resume)
            db.commit()
            db.refresh(new_resume)
            saved_resume_id = new_resume.id
        
        return {
            "success": True,
            "message": "简历生成成功，已保存到简历库" if saved_resume_id else "简历生成成功",
            "data": generated_resume,
            "saved_resume_id": saved_resume_id,
            "target_job": {
                "id": target_job.id,
                "title": target_job.title,
                "company": target_job.company
            } if target_job else None,
            "optimized_resume": generated_resume.get("optimized_content", "")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成简历失败: {str(e)}")


@router.post("/export")
async def export_resume(request: ExportResumeRequest):
    """
    导出简历到指定格式
    
    - **resume_data**: 简历数据
    - **format**: 导出格式（pdf/docx/markdown/html/json）
    - **filename**: 文件名（可选）
    
    返回文件下载链接
    """
    try:
        # 生成文件名
        if not request.filename:
            personal = request.resume_data.get("content", {}).get("personal_info", {})
            name = personal.get("name", "resume")
            request.filename = f"{name}_optimized.{request.format}"
        
        # 导出文件
        file_path = await resume_generator.export_resume(
            resume_data=request.resume_data,
            format=request.format,
            output_path=f"exports/{request.filename}"
        )
        
        return {
            "success": True,
            "message": f"简历{request.format}导出成功",
            "file_path": file_path,
            "download_url": f"/resume-generator/download/{os.path.basename(file_path)}"
        }
        
    except ValueError as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"导出简历失败: {str(e)}")


@router.get("/download/{filename}")
async def download_resume(filename: str):
    """
    下载导出的简历文件
    
    - **filename**: 文件名
    """
    file_path = f"exports/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 根据文件扩展名设置MIME类型
    ext = filename.split('.')[-1].lower()
    media_types = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'html': 'text/html',
        'md': 'text/markdown',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg'
    }
    
    media_type = media_types.get(ext, 'application/octet-stream')
    
    # 对于图片格式，使用 attachment 强制下载；其他格式使用 inline 允许预览
    # NOTE: 使用 RFC 5987 格式编码中文文件名，避免 UnicodeEncodeError
    from urllib.parse import quote
    
    # 生成 ASCII 安全的文件名（用于不支持 RFC 5987 的旧客户端）
    ascii_filename = filename.encode('ascii', 'ignore').decode('ascii') or f"resume.{ext}"
    # UTF-8 编码的文件名（遵循 RFC 5987）
    encoded_filename = quote(filename, safe='')
    
    headers = {}
    if ext in ['png', 'jpg', 'jpeg']:
        # 使用双重格式：ASCII 回退 + UTF-8 编码的完整文件名
        headers['Content-Disposition'] = (
            f"attachment; filename=\"{ascii_filename}\"; "
            f"filename*=UTF-8''{encoded_filename}"
        )
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        # NOTE: 不传 filename 参数，因为我们已经在 headers 中手动设置了
        headers=headers
    )


@router.get("/templates")
async def list_templates():
    """
    获取所有可用的简历模板
    
    返回模板列表及其详细信息
    """
    templates = []
    for key, info in resume_generator.TEMPLATES.items():
        templates.append({
            "id": key,
            **info
        })
    
    return {
        "success": True,
        "templates": templates
    }


@router.get("/formats")
async def list_export_formats():
    """
    获取所有支持的导出格式
    
    返回格式列表
    """
    formats = [
        {
            "id": "pdf",
            "name": "PDF",
            "description": "便携式文档格式，适合打印和分享",
            "icon": "📄"
        },
        {
            "id": "docx",
            "name": "Word",
            "description": "Microsoft Word 文档，可编辑",
            "icon": "📝"
        },
        {
            "id": "markdown",
            "name": "Markdown",
            "description": "纯文本格式，适合技术人员",
            "icon": "📋"
        },
        {
            "id": "html",
            "name": "HTML",
            "description": "网页格式，可在浏览器中查看",
            "icon": "🌐"
        },
        {
            "id": "json",
            "name": "JSON",
            "description": "数据格式，适合程序处理",
            "icon": "💾"
        }
    ]
    
    return {
        "success": True,
        "formats": formats
    }


@router.post("/send-email")
async def send_resume_via_email(
    request: SendEmailRequest,
    db: Session = Depends(get_db)
):
    """
    通过邮件发送简历
    """
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 1. 先生成文件
    filename = f"{resume.filename or 'resume'}.{request.format}"
    file_path = await resume_generator.export_resume(
        resume_data={"content": resume.parsed_data, "template": "modern"}, # 默认模板
        format=request.format,
        output_path=f"exports/{filename}"
    )

    # 2. 发送邮件
    subject = request.subject or f"【AI 智能简历】您的优化简历已送达 - {resume.filename}"
    body = request.message or f"您好！这是 AI 智能简历为您优化后的简历文件（{request.format}格式），请查收。"
    
    success = await email_service.send_resume_email(
        to_email=request.to_email,
        subject=subject,
        content=body,
        attachments=[file_path]
    )

    if success:
        return {"success": True, "message": "邮件已成功发送"}
    else:
        raise HTTPException(status_code=500, detail="邮件发送失败，请检查 SMTP 配置")


@router.post("/share")
async def generate_share_link(
    request: GenerateShareLinkRequest,
    db: Session = Depends(get_db)
):
    """
    生成分享链接
    """
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 生成唯一的分享 token
    share_token = str(uuid.uuid4())
    resume.share_token = share_token
    resume.share_expires_at = datetime.utcnow() + timedelta(days=request.expire_days)
    
    db.commit()

    # 这里假设前端分享的基础路径，实际生产应从配置读取
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    share_url = f"{base_url}/share/{share_token}"

    return {
        "success": True,
        "share_url": share_url,
        "expires_at": resume.share_expires_at
    }


@router.get("/share/{token}")
async def get_shared_resume(
    token: str,
    db: Session = Depends(get_db)
):
    """
    通过分享链接获取简历内容
    """
    resume = db.query(Resume).filter(
        Resume.share_token == token,
        Resume.share_expires_at > datetime.utcnow()
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="分享链接已失效或不存在")

    return {
        "success": True,
        "data": {
            "content": resume.parsed_data,
            "filename": resume.filename,
            "target_job_title": resume.target_job_title,
            "is_optimized": resume.is_optimized
        }
    }


@router.post("/preview")
async def preview_resume(request: GenerateResumeRequest):
    """
    预览优化后的简历（不保存）
    """
    try:
        generated_resume = await resume_generator.generate_optimized_resume(
            resume_id=request.resume_id,
            job_id=request.job_id,
            optimization_suggestions=request.optimization_suggestions,
            template=request.template
        )
        
        # 生成HTML预览
        html_content = resume_generator._generate_html_content(
            content=generated_resume.get("content", {}),
            template_info=resume_generator.TEMPLATES.get(request.template, resume_generator.TEMPLATES["modern"])
        )
        
        return {
            "success": True,
            "message": "预览生成成功",
            "data": generated_resume,
            "html_preview": html_content
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成预览失败: {str(e)}")
