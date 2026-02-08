import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

class ScraperService:
    def __init__(self):
        # 模拟移动端浏览器，Boss 直聘等 H5 页面对移动端 UA 兼容性更好
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "Referer": "https://www.google.com/",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

    async def fetch_job_content(self, url: str) -> str:
        """
        抓取 URL 内容并提取核心文本
        """
        try:
            async with httpx.AsyncClient(
                timeout=20.0, 
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            ) as client:
                response = await client.get(url, headers=self.headers)
                
                # 处理 Boss 直聘等页面的 403/302 或验证页
                if response.status_code == 403 or "security-check" in response.text:
                    logger.warning(f"检测到反爬限制 (Status: {response.status_code})")
                    raise Exception("目标网站开启了反爬验证，无法直接抓取。建议直接复制职位描述手动录入。")

                response.raise_for_status()
                
                # 使用 BeautifulSoup 清洗 HTML
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 针对常见招聘网站的优化：移除干扰元素
                for element in soup(["script", "style", "header", "footer", "nav", "aside", "iframe"]):
                    element.decompose()

                # 获取文本
                text = soup.get_text(separator='\n')
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                clean_text = '\n'.join(lines)
                
                if len(clean_text) < 100:
                    # 文本太短通常意味着未能正确抓取动态内容
                    if "zhipin.com" in url or "boss" in url.lower():
                        raise Exception("Boss直聘内容受保护，无法通过链接直接抓取全量信息。请复制职位描述直接输入。")
                    else:
                        logger.warning(f"抓取内容过短: {len(clean_text)} bytes")

                logger.info(f"成功抓取 URL: {url}，有效文本长度: {len(clean_text)}")
                return clean_text[:20000] # 适当扩大容量
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP 错误: {e.response.status_code} for {url}")
            if e.response.status_code == 403:
                raise Exception("目标网站禁止了自动访问，请尝试手动复制职位描述。")
            raise Exception(f"网站返回错误: {e.response.status_code}")
        except Exception as e:
            logger.error(f"抓取报错: {str(e)}")
            raise e

scraper_service = ScraperService()
