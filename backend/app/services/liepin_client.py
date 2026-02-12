import httpx
import logging
import re
import json
from typing import List, Dict, Optional
from datetime import datetime

class LiepinClient:
    """
    专门负责采集猎聘的高质量最新岗位
    """
    def __init__(self):
        self.base_url = "https://www.liepin.com/zhaopin/"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.liepin.com/"
        }

    async def search_jobs(self, query: str, location: str = "深圳", limit: int = 10) -> List[Dict]:
        """
        通过猎聘搜索最新的职位信息
        """
        city_codes = {"深圳": "050090", "北京": "010000", "上海": "020000", "广州": "050020"}
        dq = city_codes.get(location, "050090") # 默认深圳
        
        # 猎聘搜索 URL
        url = f"https://www.liepin.com/zhaopin/?key={query}&dq={dq}"

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code != 200:
                    return []
                return self._parse_html_results(response.text)
        except Exception as e:
            logging.error(f"猎聘捕获错误: {e}")
            return []

    def _parse_html_results(self, html: str) -> List[Dict]:
        jobs = []
        try:
            # 猎聘的数据现在通常存在于 window.__DATA__ 或者类似的结构中
            # 这里的正则需要非常鲁棒
            # 尝试直接抓取职位卡片（最稳定）
            titles = re.findall(r'class="job-title-box".*?title="([^"]+)"', html, re.S)
            companies = re.findall(r'class="company-name".*?title="([^"]+)"', html, re.S)
            salaries = re.findall(r'class="job-salary">([^<]+)<', html, re.S)
            
            # 如果主要选择器失败，尝试搜索结果 JSON
            if not titles:
                # 针对新版猎聘的 JSON 提取
                data_match = re.search(r'"jobList":\s*(\[.*?\])\s*,\s*"count"', html, re.DOTALL)
                if data_match:
                    job_data = json.loads(data_match.group(1))
                    for item in job_data:
                        jobs.append({
                            "title": item.get("jobName"),
                            "company": item.get("compName"),
                            "location": item.get("cityName"),
                            "salary_range": item.get("salary"),
                            "source_platform": "猎聘",
                            "publish_date": "最新",
                            "source_url": f"https://www.liepin.com/job/{item.get('jobId')}.shtml"
                        })
                    return jobs

            for i in range(min(len(titles), len(companies), len(salaries))):
                jobs.append({
                    "title": titles[i].strip(),
                    "company": companies[i].strip(),
                    "location": "深圳",
                    "salary_range": salaries[i].strip(),
                    "source_platform": "猎聘",
                    "publish_date": "最新",
                    "source_url": "https://www.liepin.com/zhaopin/"
                })
        except Exception as e:
            logging.error(f"解析猎聘详情出错: {e}")
        return jobs


liepin_client = LiepinClient()
