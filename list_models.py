import httpx
api_key = "sk-WsjM9pfRvDw0FtUhfMAA4GTHB57GpXujZgZLaPnOHXgQFsLO"
base_url = "https://anyrouter.top/v1"
try:
    response = httpx.get(f"{base_url}/models", headers={"Authorization": f"Bearer {api_key}"})
    if response.status_code == 200:
        models = response.json().get('data', [])
        for m in models:
            if 'claude' in m['id'].lower():
                print(m['id'])
    else:
        print(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Exception: {e}")
