import sys
import os
sys.path.append(os.getcwd())

from app.db.session import engine
from sqlalchemy import inspect, text

def diagnose():
    print("--- 数据库诊断 ---")
    try:
        with engine.connect() as conn:
            # 检查连接
            res = conn.execute(text("SELECT 1")).fetchone()
            print(f"数据库连接成功: {res}")
            
            # 检查列
            inspector = inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('resumes')]
            print(f"resumes 表的当前列: {columns}")
            
            if 'avatar_url' in columns:
                print("✅ avatar_url 字段已存在")
            else:
                print("❌ avatar_url 字段缺失!")
                
    except Exception as e:
        print(f"诊断失败: {e}")

if __name__ == "__main__":
    diagnose()
