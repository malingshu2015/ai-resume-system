import httpx
import logging
import re
from typing import List, Dict
from urllib.parse import quote

class SearchEngineClient:
    """
    搜索引擎辅助引擎：当常规招聘接口失效时，通过搜索结果抓取最新的招聘网页
    """
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    async def search_via_bing(self, query: str, location: str) -> List[Dict]:
        """通过 Bing 搜索招聘网页"""
        results = []
        search_q = f"{query} 招聘 {location} 2026"
        url = f"https://cn.bing.com/search?q={quote(search_q)}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code == 200:
                    # 匹配搜索结果中的标题和链接
                    matches = re.findall(r'<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', resp.text)
                    for link, title in matches[:10]:
                        clean_title = re.sub(r'<[^>]+>', '', title)
                        # 过滤掉非招聘类网页
                        if any(k in clean_title for k in ["招聘", "职位", "架构师", "专家", "工程师"]):
                            results.append({
                                "title": clean_title[:40].strip(),
                                "company": "点击查看 source",
                                "location": location,
                                "salary_range": "面议",
                                "source_platform": "网页快照",
                                "publish_date": "最新",
                                "source_url": link
                            })
        except Exception as e:
            logging.error(f"搜索引擎回退异常: {e}")
        return results

search_engine_client = SearchEngineClient()
