from app.db.session import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT count(*) FROM resumes')).scalar()
        print(f"Total resumes: {result}")
except Exception as e:
    print(f"Error: {e}")
