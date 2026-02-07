"""
真实招聘API对接服务
支持 JSearch API (RapidAPI)
"""
import httpx
import logging
from typing import List, Dict, Optional
import asyncio


class JSearchAPIClient:
    """JSearch API 客户端（RapidAPI）"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or "YOUR_RAPIDAPI_KEY_HERE"
        self.base_url = "https://jsearch.p.rapidapi.com"
        self.headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
    
    async def search_jobs(
        self,
        query: str,
        location: str = "",
        num_pages: int = 1,
        date_posted: str = "all",  # all, today, 3days, week, month
        remote_jobs_only: bool = False,
        employment_types: Optional[str] = None  # FULLTIME, CONTRACTOR, PARTTIME, INTERN
    ) -> List[Dict]:
        """
        搜索职位
        
        参数：
        - query: 搜索关键词（如 "Python developer"）
        - location: 地点（如 "Shenzhen, China"）
        - num_pages: 页数（每页最多10个结果）
        - date_posted: 发布时间筛选
        - remote_jobs_only: 仅远程职位
        - employment_types: 雇佣类型
        """
        try:
            # 构建查询字符串
            search_query = f"{query} in {location}" if location else query
            
            params = {
                "query": search_query,
                "page": "1",
                "num_pages": str(num_pages),
                "date_posted": date_posted
            }
            
            if remote_jobs_only:
                params["remote_jobs_only"] = "true"
            
            if employment_types:
                params["employment_types"] = employment_types
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/search",
                    headers=self.headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    jobs = data.get("data", [])
                    logging.info(f"JSearch API 返回 {len(jobs)} 个职位")
                    return jobs
                elif response.status_code == 403:
                    logging.error("JSearch API 认证失败，请检查 API Key")
                    return []
                else:
                    logging.error(f"JSearch API 请求失败: {response.status_code}")
                    return []
                    
        except Exception as e:
            logging.error(f"JSearch API 调用异常: {e}")
            return []
    
    def parse_job_data(self, job: Dict) -> Dict:
        """
        解析 JSearch API 返回的职位数据
        
        JSearch 返回的数据结构：
        {
            "job_id": "...",
            "job_title": "...",
            "employer_name": "...",
            "employer_logo": "...",
            "job_employment_type": "FULLTIME",
            "job_city": "...",
            "job_state": "...",
            "job_country": "...",
            "job_description": "...",
            "job_apply_link": "...",
            "job_posted_at_datetime_utc": "...",
            "job_salary_currency": "USD",
            "job_salary_period": "YEAR",
            "job_min_salary": 100000,
            "job_max_salary": 150000,
            "job_required_experience": {...},
            "job_required_skills": [...],
            ...
        }
        """
        try:
            # 构建薪资范围字符串
            salary_range = None
            if job.get("job_min_salary") and job.get("job_max_salary"):
                min_sal = job["job_min_salary"]
                max_sal = job["job_max_salary"]
                currency = job.get("job_salary_currency", "USD")
                
                # 转换为 k 格式
                if currency == "USD":
                    min_k = int(min_sal / 1000)
                    max_k = int(max_sal / 1000)
                    salary_range = f"${min_k}k-${max_k}k"
                elif currency == "CNY":
                    min_k = int(min_sal / 1000)
                    max_k = int(max_sal / 1000)
                    salary_range = f"{min_k}k-{max_k}k"
            
            # 构建地点字符串
            location_parts = []
            if job.get("job_city"):
                location_parts.append(job["job_city"])
            if job.get("job_state"):
                location_parts.append(job["job_state"])
            if job.get("job_country"):
                location_parts.append(job["job_country"])
            location = ", ".join(location_parts) if location_parts else "未知"
            
            # 提取经验要求
            experience_required = None
            if job.get("job_required_experience"):
                exp_data = job["job_required_experience"]
                if exp_data.get("required_experience_in_months"):
                    months = exp_data["required_experience_in_months"]
                    years = months // 12
                    if years >= 10:
                        experience_required = "10年以上"
                    elif years >= 5:
                        experience_required = "5-10年"
                    elif years >= 3:
                        experience_required = "3-5年"
                    elif years >= 1:
                        experience_required = "1-3年"
            
            return {
                "title": job.get("job_title", "未知职位"),
                "company": job.get("employer_name", "未知公司"),
                "location": location,
                "salary_range": salary_range,
                "experience_required": experience_required,
                "description": job.get("job_description", ""),
                "source_url": job.get("job_apply_link") or job.get("job_google_link"),
                "source_platform": "JSearch (Google for Jobs)",
                "employment_type": job.get("job_employment_type"),
                "posted_date": job.get("job_posted_at_datetime_utc"),
                "raw_data": job  # 保存原始数据供后续使用
            }
            
        except Exception as e:
            logging.error(f"解析职位数据失败: {e}")
            return None


# 全局客户端实例
jsearch_client = None

def get_jsearch_client(api_key: Optional[str] = None) -> JSearchAPIClient:
    """获取 JSearch 客户端实例"""
    global jsearch_client
    if jsearch_client is None or api_key:
        jsearch_client = JSearchAPIClient(api_key)
    return jsearch_client
