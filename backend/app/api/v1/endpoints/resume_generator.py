from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import os

from app.services.resume_generator import resume_generator

router = APIRouter()


class GenerateResumeRequest(BaseModel):
    """生成简历请求"""
    resume_id: str
    job_id: Optional[str] = None  # 目标职位ID，用于定向优化
    template: str = "modern"  # modern, professional, creative, minimal
    optimization_suggestions: Optional[Dict] = None


class ExportResumeRequest(BaseModel):
    """导出简历请求"""
    resume_data: Dict
    format: str = "pdf"  # pdf, docx, markdown, html, json
    filename: Optional[str] = None


@router.post("/generate")
async def generate_optimized_resume(request: GenerateResumeRequest):
    """
    生成优化后的简历
    """
    try:
        generated_resume = await resume_generator.generate_optimized_resume(
            resume_id=request.resume_id,
            job_id=request.job_id,
            optimization_suggestions=request.optimization_suggestions,
            template=request.template
        )
        
        return {
            "success": True,
            "message": "简历生成成功",
            "data": generated_resume
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
        file_path = resume_generator.export_resume(
            resume_data=request.resume_data,
            format=request.format,
            output_path=f"exports/{request.filename}"
        )
        
        return {
            "success": True,
            "message": "简历导出成功",
            "file_path": file_path,
            "download_url": f"/resume-generator/download/{os.path.basename(file_path)}"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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
        'json': 'application/json'
    }
    
    media_type = media_types.get(ext, 'application/octet-stream')
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
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
