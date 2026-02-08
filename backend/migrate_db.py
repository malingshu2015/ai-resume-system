import sys
import os

# 将当前目录添加到 PYTHONPATH
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine

def migrate():
    with engine.connect() as conn:
        print("正在检查并添加 avatar_url 列...")
        try:
            # PostgreSQL 语法
            conn.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"))
            conn.commit()
            print("成功检查/添加 avatar_url 列")
        except Exception as e:
            print(f"执行失败: {e}")

if __name__ == "__main__":
    migrate()
