import asyncio
import json
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.resume import Resume
from app.services.resume_generator import resume_generator

async def reproduce_export_error(resume_id):
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            print(f"Resume {resume_id} not found")
            return
        
        data = resume.parsed_data
        if isinstance(data, str):
            data = json.loads(data)
        
        resume_data = {
            "content": data,
            "template": "modern"
        }
        
        print(f"Attempting to export resume: {resume.filename} ({resume_id})")
        
        try:
            output_path = f"repro_export_{resume_id}.pdf"
            file_path = await resume_generator.export_resume(
                resume_data=resume_data,
                format="pdf",
                output_path=output_path
            )
            print(f"Success! File saved to: {file_path}")
        except Exception as e:
            import traceback
            print("Export failed with error:")
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    # Test with the one that supposedly failed or showed issues
    # c8000a1c-93c1-4ba5-8cf9-8d2b539e1115 (original)
    # 94dc3ab9-93c6-49a5-bcde-7479cdb982a2 (optimized)
    
    resume_id = "c8000a1c-93c1-4ba5-8cf9-8d2b539e1115"
    asyncio.run(reproduce_export_error(resume_id))
    
    print("\n" + "="*50 + "\n")
    
    resume_id = "94dc3ab9-93c6-49a5-bcde-7479cdb982a2"
    asyncio.run(reproduce_export_error(resume_id))
