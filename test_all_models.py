
import sqlite3
import json
import httpx
import asyncio
from openai import OpenAI
import os

async def test_model(provider, model_name, api_key, api_base):
    print(f"\n[测试开始] Provider: {provider}, Model: {model_name}")
    
    # 修正 AnyRouter 的 base_url
    is_anyrouter = "anyrouter" in api_base.lower() or "anyrouter" in provider.lower()
    base_url = api_base
    if is_anyrouter and base_url and not base_url.endswith("/v1"):
        base_url = f"{base_url.rstrip('/')}/v1"
    
    print(f"URL: {base_url}")
    
    client = OpenAI(api_key=api_key, base_url=base_url)
    
    try:
        start_time = asyncio.get_event_loop().time()
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Hello, respond with 'OK' and nothing else."}
            ],
            max_tokens=10
        )
        content = response.choices[0].message.content
        duration = asyncio.get_event_loop().time() - start_time
        print(f" ✅ 成功! 响应内容: {content.strip()} | 耗时: {duration:.2f}s")
        return True
    except Exception as e:
        print(f" ❌ 失败: {str(e)}")
        return False

async def main():
    conn = sqlite3.connect('backend/sql_app.db')
    cursor = conn.cursor()
    cursor.execute('SELECT provider, model_name, api_key, api_base FROM ai_configs')
    configs = cursor.fetchall()
    conn.close()
    
    print(f"共发现 {len(configs)} 个模型配置待测试...")
    
    results = []
    for provider, model, key, base in configs:
        success = await test_model(provider, model, key, base)
        results.append((provider, model, success))
    
    print("\n" + "="*50)
    print("最终测试报告汇总:")
    for p, m, s in results:
        status = "WORKING" if s else "FAILED"
        print(f"- {p} ({m}): {status}")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
