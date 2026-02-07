import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

class ScraperService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

    async def fetch_job_content(self, url: str) -> str:
        """
        抓取 URL 内容并提取核心文本
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                # 使用 BeautifulSoup 清洗 HTML
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 移除脚本和样式
                for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
                    script_or_style.decompose()

                # 获取文本并按行清理
                text = soup.get_text(separator='\n')
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                clean_text = '\n'.join(lines)
                
                # 记录抓取预览（前 500 字）
                logger.info(f"成功抓取 URL: {url}，长度: {len(clean_text)}")
                return clean_text[:15000]  # 防止由于页面过大导致 Token 溢出
                
        except Exception as e:
            logger.error(f"抓取 URL 失败: {str(e)}")
            raise Exception(f"无法获取页面内容: {str(e)}")

scraper_service = ScraperService()
