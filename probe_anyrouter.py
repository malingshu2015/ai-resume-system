import asyncio
from openai import OpenAI

async def test():
    api_key = "sk-WsjM9pfRvDw0FtUhfMAA4GTHB57GpXujZgZLaPnOHXgQFsLO"
    base_url = "https://anyrouter.top/v1"
    client = OpenAI(api_key=api_key, base_url=base_url)
    
    models_to_try = ["claude-3-sonnet-20240229", "claude-3-opus-20240229", "gpt-4-turbo", "gpt-3.5-turbo", "claude-3-5-sonnet-20240620"]
    
    for model in models_to_try:
        try:
            client.chat.completions.create(model=model, messages=[{"role":"user", "content":"hi"}], max_tokens=1)
            print(f"FOUND: {model}")
            return
        except Exception as e:
            print(f"FAILED {model}: {e}")

asyncio.run(test())
