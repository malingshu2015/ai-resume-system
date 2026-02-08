from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import shutil
import zipfile
import xml.etree.ElementTree as ET
import pdfplumber
import logging
from app.core.config import settings
from app.db.session import get_db
from app.models.resume import Resume
from app.services.ai_service import ai_service

router = APIRouter()
logger = logging.getLogger(__name__)

if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True)
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF 提取失败: {e}")
    return text

def extract_text_from_docx_xml(file_path: str) -> str:
    """
    使用底层 XML 解析方式提取 Word 全部文本内容，包括文本框和形状中的文字。
    """
    text_parts = []
    
    # Word 2007+ 的命名空间
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
        'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    }
    
    try:
        with zipfile.ZipFile(file_path) as zf:
            # 读取 document.xml（主体内容）
            if 'word/document.xml' in zf.namelist():
                with zf.open('word/document.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    
                    # 使用递归方式收集所有 w:t 节点的文本（涵盖文本框）
                    for elem in root.iter():
                        # 标准文本节点
                        if elem.tag.endswith('}t'):
                            if elem.text:
                                text_parts.append(elem.text)
                        # 处理换行/分段
                        if elem.tag.endswith('}p'):
                            text_parts.append('\n')
            
            # 读取页眉 header*.xml
            for name in zf.namelist():
                if name.startswith('word/header') and name.endswith('.xml'):
                    with zf.open(name) as f:
                        tree = ET.parse(f)
                        for elem in tree.getroot().iter():
                            if elem.tag.endswith('}t') and elem.text:
                                text_parts.append(elem.text)
                        text_parts.append('\n')
            
            # 读取页脚 footer*.xml
            for name in zf.namelist():
                if name.startswith('word/footer') and name.endswith('.xml'):
                    with zf.open(name) as f:
                        tree = ET.parse(f)
                        for elem in tree.getroot().iter():
                            if elem.tag.endswith('}t') and elem.text:
                                text_parts.append(elem.text)
                        text_parts.append('\n')
                        
    except Exception as e:
        logger.error(f"Word XML 提取失败: {e}")
    
    result = ''.join(text_parts)
    # 打印前800字符到日志，便于调试
    print(f"[DEBUG] 提取文本预览(前800字):\n{result[:800]}")
    return result

async def process_resume_parsing(resume_id: str, db: Session):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        return

    try:
        resume.status = "parsing"
        db.commit()

        content = ""
        file_ext = os.path.splitext(resume.file_path)[1].lower()

        if file_ext == ".pdf":
            content = extract_text_from_pdf(resume.file_path)
        elif file_ext in [".docx", ".doc"]:
            content = extract_text_from_docx_xml(resume.file_path)
        else:
            with open(resume.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(15000)
        
        if not content.strip():
            logger.warning(f"文件内容提取为空: {resume.filename}")
            resume.status = "failed"
            db.commit()
            return

        parsed_result = await ai_service.parse_resume_text(content)
        
        if parsed_result:
            resume.parsed_data = parsed_result
            resume.status = "parsed"
        else:
            resume.status = "failed"
            
        db.commit()
    except Exception as e:
        logger.error(f"解析过程报错: {str(e)}")
        resume.status = "failed"
        db.commit()

@router.post("/upload")
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    allowed_extensions = {".pdf", ".doc", ".docx", ".txt"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="不支持的格式")
    
    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    db_resume = Resume(
        filename=file.filename,
        file_path=file_path,
        file_type=file_ext,
        status="parsing"
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    background_tasks.add_task(process_resume_parsing, db_resume.id, db)
    
    return {"id": db_resume.id, "filename": file.filename, "status": "parsing"}

@router.get("/", response_model=List[dict])
async def list_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).order_by(Resume.created_at.desc()).all()
    return [
        {
            "id": r.id, 
            "filename": r.filename, 
            "status": r.status, 
            "created_at": r.created_at.isoformat(),
            "is_optimized": getattr(r, 'is_optimized', False),
            "target_job_title": getattr(r, 'target_job_title', None),
            "target_job_company": getattr(r, 'target_job_company', None),
            "optimization_notes": getattr(r, 'optimization_notes', None),
            "parent_resume_id": getattr(r, 'parent_resume_id', None),
            "avatar_url": getattr(r, 'avatar_url', None)
        } 
        for r in resumes
    ]

@router.post("/{resume_id}/avatar")
async def upload_avatar(
    resume_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传简历头像"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    allowed_image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_image_extensions:
        raise HTTPException(status_code=400, detail="不支持的图片格式")
    
    # 存放在 uploads/avatars 子目录
    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    if not os.path.exists(avatar_dir):
        os.makedirs(avatar_dir)
        
    new_filename = f"avatar_{resume_id}{file_ext}"
    file_path = os.path.join(avatar_dir, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 构建可访问的 URL
    avatar_url = f"/uploads/avatars/{new_filename}"
    resume.avatar_url = avatar_url
    db.commit()
    
    return {"avatar_url": avatar_url}

@router.get("/{resume_id}")
async def get_resume(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return {
        "id": resume.id,
        "filename": resume.filename,
        "status": resume.status,
        "parsed_data": resume.parsed_data,
        "created_at": resume.created_at.isoformat(),
        # AI 优化版简历的相关字段
        "is_optimized": getattr(resume, 'is_optimized', False),
        "target_job_title": getattr(resume, 'target_job_title', None),
        "target_job_company": getattr(resume, 'target_job_company', None),
        "optimization_notes": getattr(resume, 'optimization_notes', None),
        "parent_resume_id": getattr(resume, 'parent_resume_id', None),
        "avatar_url": getattr(resume, 'avatar_url', None)
    }

@router.put("/{resume_id}")
async def update_resume(resume_id: str, request: dict, db: Session = Depends(get_db)):
    """更新简历内容（支持用户编辑）"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    # 更新 parsed_data
    if "parsed_data" in request:
        resume.parsed_data = request["parsed_data"]
    
    # 更新文件名
    if "filename" in request:
        resume.filename = request["filename"]
    
    # 更新头像链接
    if "avatar_url" in request:
        resume.avatar_url = request["avatar_url"]
    
    db.commit()
    db.refresh(resume)
    
    return {
        "message": "简历已更新",
        "id": resume.id,
        "filename": resume.filename
    }

@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, db: Session = Depends(get_db)):
    """删除简历及其物理文件"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    # 删除物理文件
    try:
        if os.path.exists(resume.file_path):
            os.remove(resume.file_path)
    except Exception as e:
        logger.error(f"删除物理文件失败: {str(e)}")
        # 即使文件删除失败，也继续删除数据库记录，避免孤儿数据

    db.delete(resume)
    db.commit()
    return {"message": "简历已成功删除"}
