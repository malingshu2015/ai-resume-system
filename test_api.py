from app.db.session import SessionLocal
from app.models.resume import Resume
import json

def test_api_response():
    db = SessionLocal()
    resumes = db.query(Resume).order_by(Resume.created_at.desc()).all()
    results = [
        {
            "id": r.id, 
            "filename": r.filename, 
            "status": r.status, 
            "is_optimized": getattr(r, 'is_optimized', False),
        } 
        for r in resumes
    ]
    print(json.dumps(results, indent=2))
    db.close()

if __name__ == "__main__":
    test_api_response()
