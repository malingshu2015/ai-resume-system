import requests
import json

base_url = "http://localhost:8000/api/v1"

# 获取简历和职位 ID
resumes = requests.get(f"{base_url}/resumes/").json()
jobs = requests.get(f"{base_url}/jobs/").json()

if resumes and jobs:
    resume_id = resumes[0]['id']
    job_id = jobs[0]['id']
    print(f"Testing generate for Resume: {resume_id}, Job: {job_id}")
    
    payload = {
        "resume_id": resume_id,
        "job_id": job_id,
        "template": "modern",
        "refined_content": "这是一个测试修订内容",
        "save_to_library": True
    }
    
    response = requests.post(f"{base_url}/resume-generator/generate", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
else:
    print("No resumes or jobs found to test.")
