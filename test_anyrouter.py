import asyncio
from openai import OpenAI

async def test():
    api_key = "sk-WsjM9pfRvDw0FtUhfMAA4GTHB57GpXujZgZLaPnOHXgQFsLO"
    base_url = "https://anyrouter.top/v1"
    
    # 尝试常见的模型名称
    models = [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-sonnet-latest",
        "gpt-4o",
        "claude-3-opus-latest"
    ]
    
    client = OpenAI(api_key=api_key, base_url=base_url)
    
    for model in models:
        print(f"Testing model: {model}")
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=5
            )
            print(f" ✅ Success with {model}: {response.choices[0].message.content}")
            return model
        except Exception as e:
            print(f" ❌ Failed {model}")
    
asyncio.run(test())
