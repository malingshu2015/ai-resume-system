import httpx
import json
import asyncio

async def test_export():
    url = "http://127.0.0.1:8000/api/v1/resume-generator/export"
    payload = {
        "resume_data": {
            "content": {"personal_info": {"name": "Test User"}},
            "template": "modern"
        },
        "format": "pdf"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
            print(f"Status: {response.status_code}")
            if response.status_code == 422:
                print("Validation Error Detail:")
                print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            else:
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_export())
