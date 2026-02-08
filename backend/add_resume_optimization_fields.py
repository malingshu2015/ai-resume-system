"""
数据库迁移脚本：为 Resume 表添加 AI 优化版简历的关联字段
运行方式：python add_resume_optimization_fields.py
"""

import sqlite3
import os

def migrate():
    # 获取数据库路径
    db_path = os.path.join(os.path.dirname(__file__), 'sql_app.db')
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        print("请先运行应用以创建数据库。")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 需要添加的新字段
    new_columns = [
        ("is_optimized", "BOOLEAN DEFAULT 0"),
        ("parent_resume_id", "VARCHAR(255)"),
        ("target_job_id", "VARCHAR(255)"),
        ("target_job_title", "VARCHAR(255)"),
        ("target_job_company", "VARCHAR(255)"),
        ("optimization_notes", "TEXT"),
    ]
    
    # 检查并添加字段
    for column_name, column_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE resumes ADD COLUMN {column_name} {column_type}")
            print(f"✅ 成功添加字段: {column_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"⏭️  字段已存在，跳过: {column_name}")
            else:
                print(f"❌ 添加字段失败: {column_name} - {e}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ 数据库迁移完成！")

if __name__ == "__main__":
    migrate()
