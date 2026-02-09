from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
import sys

# 设置路径
DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def inspect_resume(resume_id):
    db = SessionLocal()
    try:
        from app.models.resume import Resume
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            print(f"Resume {resume_id} not found")
            return
        
        print(f"Resume ID: {resume.id}")
        # print("Parsed Data Structure:")
        data = resume.parsed_data
        if isinstance(data, str):
            data = json.loads(data)
        
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_resume(sys.argv[1])
    else:
        print("Please provide a resume ID")
