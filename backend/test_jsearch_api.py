#!/usr/bin/env python3
"""
JSearch API 测试脚本
用于验证 API Key 是否配置正确
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.jsearch_client import get_jsearch_client


async def test_jsearch_api():
    """测试 JSearch API"""
    
    api_key = os.getenv("JSEARCH_API_KEY")
    
    if not api_key or api_key == "your-rapidapi-key-here":
        print("❌ 错误：未配置 JSEARCH_API_KEY")
        print("\n请按照以下步骤配置：")
        print("1. 访问 https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch")
        print("2. 注册并订阅免费套餐")
        print("3. 复制 API Key")
        print("4. 在 backend/.env 文件中设置：")
        print("   JSEARCH_API_KEY=你的API_KEY")
        print("\n详细说明请查看：backend/JSEARCH_API_GUIDE.md")
        return False
    
    print(f"✅ 已配置 API Key: {api_key[:10]}...")
    print("\n正在测试 JSearch API...")
    
    try:
        client = get_jsearch_client(api_key)
        
        # 测试搜索
        print("\n测试搜索：Python Developer in San Francisco")
        jobs = await client.search_jobs(
            query="Python Developer",
            location="San Francisco, CA",
            num_pages=1
        )
        
        if not jobs:
            print("❌ API 返回空结果，可能的原因：")
            print("   1. API Key 无效")
            print("   2. 已超出免费配额（每月 200 次）")
            print("   3. 网络连接问题")
            return False
        
        print(f"\n✅ 成功！找到 {len(jobs)} 个职位")
        print("\n前 3 个职位示例：")
        print("-" * 80)
        
        for i, job in enumerate(jobs[:3], 1):
            parsed = client.parse_job_data(job)
            if parsed:
                print(f"\n{i}. {parsed['title']}")
                print(f"   公司：{parsed['company']}")
                print(f"   地点：{parsed['location']}")
                if parsed.get('salary_range'):
                    print(f"   薪资：{parsed['salary_range']}")
                print(f"   来源：{parsed['source_platform']}")
        
        print("\n" + "-" * 80)
        print("\n🎉 JSearch API 配置成功！系统将使用真实职位数据。")
        return True
        
    except Exception as e:
        print(f"\n❌ API 调用失败：{e}")
        print("\n可能的原因：")
        print("1. API Key 无效")
        print("2. 网络连接问题")
        print("3. API 服务暂时不可用")
        return False


if __name__ == "__main__":
    print("=" * 80)
    print("JSearch API 测试工具")
    print("=" * 80)
    
    result = asyncio.run(test_jsearch_api())
    
    if result:
        print("\n✅ 测试通过！可以开始使用职位搜索功能。")
        sys.exit(0)
    else:
        print("\n⚠️  测试失败，系统将使用模拟数据。")
        print("如需使用真实数据，请配置 JSearch API Key。")
        sys.exit(1)
