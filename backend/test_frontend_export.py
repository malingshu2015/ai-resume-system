import httpx
import json
import asyncio
from app.db.session import SessionLocal
from app.models.resume import Resume

async def test_frontend_export():
    """模拟前端发送的导出请求"""
    
    # 从数据库获取真实简历数据
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == "c8000a1c-93c1-4ba5-8cf9-8d2b539e1115").first()
        if not resume:
            print("Resume not found")
            return
        
        resume_data = resume.parsed_data
        if isinstance(resume_data, str):
            resume_data = json.loads(resume_data)
        
        # 模拟前端发送的请求格式
        payload = {
            "resume_data": {
                "content": resume_data,  # 这里是完整的简历数据对象
                "template": "modern"
            },
            "format": "pdf"
        }
        
        print("发送的请求数据结构:")
        print(f"- resume_data 类型: {type(payload['resume_data'])}")
        print(f"- resume_data.content 类型: {type(payload['resume_data']['content'])}")
        print(f"- resume_data.template: {payload['resume_data']['template']}")
        print(f"- format: {payload['format']}")
        
        url = "http://127.0.0.1:8000/api/v1/resume-generator/export"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload)
                print(f"\n响应状态码: {response.status_code}")
                
                if response.status_code == 200:
                    print("✅ 导出成功!")
                    print(f"响应内容: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
                elif response.status_code == 422:
                    print("❌ 验证错误:")
                    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
                elif response.status_code == 500:
                    print("❌ 服务器错误:")
                    print(response.text)
                else:
                    print(f"响应: {response.text}")
                    
            except Exception as e:
                print(f"请求失败: {e}")
                import traceback
                traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_frontend_export())
