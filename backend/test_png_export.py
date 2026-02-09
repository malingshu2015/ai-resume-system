import asyncio
import json
from app.db.session import SessionLocal
from app.models.resume import Resume
from app.services.resume_generator import resume_generator

async def test_png_export():
    """测试 PNG 长图导出功能"""
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == "c8000a1c-93c1-4ba5-8cf9-8d2b539e1115").first()
        if not resume:
            print("Resume not found")
            return
        
        data = resume.parsed_data
        if isinstance(data, str):
            data = json.loads(data)
        
        resume_data = {
            "content": data,
            "template": "modern"
        }
        
        print("开始生成 PNG 长图...")
        
        try:
            output_path = "test_resume_image.png"
            file_path = await resume_generator.export_resume(
                resume_data=resume_data,
                format="png",
                output_path=output_path
            )
            print(f"✅ PNG 长图生成成功！")
            print(f"文件路径: {file_path}")
            
            # 检查文件是否存在
            import os
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"文件大小: {file_size} bytes ({file_size/1024:.2f} KB)")
            else:
                print("❌ 文件不存在！")
                
        except Exception as e:
            import traceback
            print("❌ PNG 导出失败:")
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_png_export())
