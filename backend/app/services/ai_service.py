import json
from openai import OpenAI
from app.core.config import settings
import logging

from app.db.session import SessionLocal
from app.models.ai_config import AIConfig

# 尝试导入 Anthropic，如果没有安装则跳过
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logging.warning("Anthropic SDK 未安装，Claude 模型将不可用")

class AIService:
    def __init__(self):
        self.default_api_key = settings.OPENAI_API_KEY
        self.default_api_base = settings.OPENAI_API_BASE
        self.default_model = settings.OPENAI_MODEL
        self._client = None
        self._current_model = None
        self._client_type = "openai"  # openai 或 anthropic

    def _get_active_config(self):
        """从数据库获取当前激活的配置"""
        db = SessionLocal()
        try:
            active_config = db.query(AIConfig).filter(AIConfig.is_active == True).first()
            if active_config:
                return {
                    "api_key": active_config.api_key,
                    "api_base": active_config.api_base or "https://api.openai.com/v1",
                    "model": active_config.model_name,
                    "provider": active_config.provider
                }
        except Exception as e:
            logging.error(f"从数据库获取 AI 配置失败: {e}")
        finally:
            db.close()
        
        # 回退到环境变量
        return {
            "api_key": self.default_api_key,
            "api_base": self.default_api_base,
            "model": self.default_model,
            "provider": "OpenAI"
        }

    def _refresh_client(self):
        """刷新 AI 客户端"""
        config = self._get_active_config()
        
        # 判断是否为 Claude/Anthropic 模型
        is_claude = (
            "anthropic" in config.get("provider", "").lower() or
            "claude" in config.get("model", "").lower() or
            "anyrouter" in config.get("api_base", "").lower()
        )
        
        if is_claude and ANTHROPIC_AVAILABLE:
            self._client_type = "anthropic"
            self._client = Anthropic(
                api_key=config["api_key"],
                base_url=config["api_base"]
            )
            logging.info(f"使用 Anthropic 客户端，模型: {config['model']}")
        else:
            self._client_type = "openai"
            self._client = OpenAI(
                api_key=config["api_key"],
                base_url=config["api_base"]
            )
            logging.info(f"使用 OpenAI 客户端，模型: {config['model']}")
        
        self._current_model = config["model"]
        return self._client, self._current_model

    async def analyze_job_screenshot(self, image_base64: str):
        """通过截图分析职位 JD 内容"""
        client, model = self._refresh_client()
        try:
            logging.info(f"开始分析截图，模型: {model}，客户端类型: {self._client_type}")
            
            if self._client_type == "anthropic":
                # Claude Vision API
                response = client.messages.create(
                    model=model,
                    max_tokens=8192,
                    system="你是一个专业的招聘专家和 OCR 助手。请从用户提供的图片（职位详情截图）中提取出完整的职位名称、公司名称、职位描述（包括职责、要求、薪资、地点等）。请务必以 JSON 格式输出，包含 job_title, company, description 三个核心字段。",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "请分析这张职位详情截图，并提取出详细的职位信息。请确保输出为 JSON 格式。"},
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/jpeg",
                                        "data": image_base64
                                    }
                                }
                            ]
                        }
                    ],
                    temperature=0.1
                )
                content = response.content[0].text
            else:
                # OpenAI Vision API
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system", 
                            "content": "你是一个专业的招聘专家和 OCR 助手。请从用户提供的图片（职位详情截图）中提取出完整的职位名称、公司名称、职位描述（包括职责、要求、薪资、地点等）。请务必以 JSON 格式输出，包含 job_title, company, description 三个核心字段。"
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "请分析这张职位详情截图，并提取出详细的职位信息。请确保输出为 JSON 格式。"},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            
            logging.info(f"AI 原始回复: {content}")
            
            # 处理可能存在的 markdown 代码块
            if "```" in content:
                content = content.split("```")[1].replace("json", "").strip()
            
            result = json.loads(content)
            
            # 字段映射增强，确保兼容不同 AI 的命名习惯
            title = result.get("job_title") or result.get("title") or result.get("职位名称") or "从截图解析的职位"
            company = result.get("company") or result.get("公司名称") or "未知公司"
            description = result.get("description") or result.get("职位描述") or result.get("content") or result.get("JD") or "未能提取出详细文本"
            
            return {
                "title": title,
                "company": company,
                "description": description
            }
        except Exception as e:
            error_msg = str(e)
            print(f"ERROR: 截图分析失败 - {error_msg}")
            logging.error(f"截图分析报错详情: {error_msg}")
            if "vision" in error_msg.lower() or "image" in error_msg.lower() or "compatible" in error_msg.lower():
                return {"error": "当前 AI 模型不支持图片分析（视觉功能），请检查 API 配置或手动粘贴文本。"}
            import traceback
            logging.error(traceback.format_exc())
            return None

    async def parse_resume_text(self, text: str):
        """解析简历文本"""
        prompt = f"""
        【任务指令】
        1. 请全面审视简历文本，特别是开头部分，寻找姓名、电话、邮箱和居住地。
        2. 电话通常是 11 位数字，邮箱包含 @ 符号，姓名通常在最前面。
        3. 请将提取的信息严格按照以下 JSON 格式输出。
        4. 如果某个字段确实无法在文中找到，请留空，但不能轻易放弃寻找。

        【简历文本内容】
        {text}

        【输出要求的 JSON 格式】
        {{
            "basic_info": {{
                "name": "",
                "phone": "",
                "email": "",
                "location": ""
            }},
            "education": [
                {{
                    "school": "",
                    "major": "",
                    "degree": "",
                    "start_date": "",
                    "end_date": ""
                }}
            ],
            "work_experience": [
                {{
                    "company": "",
                    "position": "",
                    "start_date": "",
                    "end_date": "",
                    "description": ""
                }}
            ],
            "skills": []
        }}
        """
        return await self._call_ai(prompt)

    async def parse_job_description(self, text: str):
        """解析职位 JD"""
        prompt = f"""
        【任务指令】
        请从以下职位描述中提取关键信息，并按 JSON 格式输出。

        【职位描述】
        {text}

        【输出要求的 JSON 格式】
        {{
            "job_title": "",
            "company": "",
            "location": "",
            "salary_range": "",
            "requirements": {{
                "education": "",
                "experience_years": "",
                "skills": [],
                "certifications": [],
                "other": []
            }},
            "responsibilities": [],
            "benefits": [],
            "keywords": []
        }}
        """
        return await self._call_ai(prompt)

    async def analyze_resume_job_match(self, resume_data: dict, job_data: dict, job_description: str):
        """分析简历与职位的匹配度"""
        prompt = f"""
        【任务指令】
        请作为一名资深 HR 和简历优化专家，深度分析以下简历与职位的匹配程度。
        
        你的目标是：
        1. 给出精准的匹配评分和多维度分析。
        2. 提供**具体、可落地、带有专业话术**的改进建议。不要只给提示（如“增加项目经验”），要给出具体的描述模板。
        3. 直接输出一份“优化版简历内容”。这份内容应该基于原简历，但在关键位置（如个人总结、项目描述、技能清单）针对职位要求进行优化。
        
        【标记规范】
        在“优化版简历内容”中，请使用以下标记来标识你的改动：
        - 使用 [[ADD]]内容[[/ADD]] 标识针对职位要求新增加的关键词、项目描述或技能。
        - 使用 [[MOD]]内容[[/MOD]] 标识对原有描述进行的专业化润色或重点突出。

        【简历信息】
        {json.dumps(resume_data, ensure_ascii=False, indent=2)}

        【职位要求】
        {json.dumps(job_data, ensure_ascii=False, indent=2)}

        【原始职位描述】
        {job_description[:2000]}

        【输出要求的 JSON 格式】
        {{
            "match_score": 85,
            "analysis": {{
                "strengths": ["优势1", "优势2"],
                "weaknesses": ["不足1", "不足2"],
                "skill_match": {{
                    "matched": ["技能1", "技能2"],
                    "missing": ["缺失技能1"]
                }},
                "experience_match": "针对职位的经验契合度深度点评",
                "education_match": "学历与背景匹配分析"
            }},
            "suggestions": [
                {{
                    "category": "分类（如：项目润色、技能补全）",
                    "content": "具体改进建议",
                    "template": "推荐使用的专业话术描述"
                }}
            ],
            "optimized_resume": "包含 [[ADD]] 和 [[MOD]] 标记的完整/核心段落优化版简历文本",
            "optimized_summary": "针对该职位优化后的个人简介（含标记）"
        }}
        """
        return await self._call_ai(prompt)

    async def _call_ai(self, prompt: str):
        """统一的 AI 调用方法"""
        client, model = self._refresh_client()
        try:
            if self._client_type == "anthropic":
                # Claude API 调用
                response = client.messages.create(
                    model=model,
                    max_tokens=8192,
                    system="你是一个专业的 HR 和职业规划专家。请严格按照要求的 JSON 格式输出。",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1
                )
                content = response.content[0].text
            else:
                # OpenAI API 调用
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "你是一个专业的 HR 和职业规划专家。请严格按照要求的 JSON 格式输出。"},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            
            # 清理 markdown 代码块
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "").strip()
                
            return json.loads(content)
        except Exception as e:
            logging.error(f"AI 调用失败: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            return None

ai_service = AIService()
