from app.db.session import SessionLocal
from app.models.resume import Resume

def check_resumes():
    db = SessionLocal()
    resumes = db.query(Resume).all()
    print(f"Total resumes: {len(resumes)}")
    for r in resumes:
        print(f"ID: {r.id}, Filename: {r.filename}, Status: {r.status}, Created: {r.created_at}")
    db.close()

if __name__ == "__main__":
    check_resumes()
