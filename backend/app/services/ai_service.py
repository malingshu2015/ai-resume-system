import json
import logging
import re
import time
from openai import OpenAI
from app.core.config import settings
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
        
        # 判断是否为 AnyRouter (通常使用 OpenAI 协议)
        is_anyrouter = "anyrouter" in config.get("api_base", "").lower() or "anyrouter" in config.get("provider", "").lower()
        
        # 判断是否使用独立的 Anthropic SDK
        is_claude_sdk = not is_anyrouter and (
            "anthropic" in config.get("provider", "").lower() or
            "claude" in config.get("model", "").lower()
        )
        
        if is_claude_sdk and ANTHROPIC_AVAILABLE:
            self._client_type = "anthropic"
            self._client = Anthropic(
                api_key=config["api_key"],
                base_url=config["api_base"]
            )
            logging.info(f"使用 Anthropic SDK，模型: {config['model']}")
        else:
            self._client_type = "openai"
            # 修正 AnyRouter 的 base_url，确保包含 /v1
            base_url = config["api_base"]
            if is_anyrouter and base_url and not base_url.endswith("/v1"):
                base_url = f"{base_url.rstrip('/')}/v1"
                
            self._client = OpenAI(
                api_key=config["api_key"],
                base_url=base_url
            )
            logging.info(f"使用 OpenAI 兼容 SDK，提供商: {config['provider']}，模型: {config['model']}，地址: {base_url}")
        
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
            "personal_info": {{
                "name": "",
                "phone": "",
                "email": "",
                "location": "",
                "summary": "个人总结/评价"
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
                    "duration": "起止时间",
                    "description": "职责概况（一段话）",
                    "achievements": ["关键成就点1", "关键成就点2", "必须完整保留原简历中的所有细节工作内容"]
                }}
            ],
            "project_experience": [
                {{
                    "name": "项目名称",
                    "role": "项目岗位",
                    "duration": "起止时间",
                    "description": "项目面临的挑战与技术难度（背景）",
                    "actions": ["我采取的关键技术方案/行动1", "行动2", "必须全量提取，不能丢失任何技术动作"],
                    "results": "最终实现的业务价值 or 技术指标（必须包含原有的所有成果描述）"
                }}
            ],
            "skills_sections": [
                {{
                    "category": "技术领域",
                    "skills": ["实打实的技能1", "技能2"]
                }}
            ],
            "others": {{
                "certifications": ["证书1", "证书2", "如：PMP、CISSP、英语等级等"],
                "awards": ["奖项1", "奖项2"],
                "publications": ["论文/出版物1"]
            }}
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
        2. 提供**具体、可落地、带有专业话术**的改进建议。
        3. 输出一份“优化版简历预览内容”。**核心禁令：禁止概括！禁止浓缩！禁止删除！** 
        
        【批注式优化要求】
        - 你必须**完整复制**原简历中的每一段工作经历（包括所有 achievements）和项目描述（包括所有 actions 和 results）。
        - 你的优化必须是“增量式”或“抛光式”的：在保留原句的基础上，直接在合适的位置插入关键词、扩充量化成果、或润色表达。
        - 严禁对原始简历中的技术细节进行任何模糊化处理。
        - 必须使用 [[ADD]]新内容[[/ADD]] 标识**新增**的内容。
        - 必须使用 [[MOD]]优化后内容[[/MOD]] 标识对**原句**的润色（必须保留原意，严禁改变事实）。
        - 如果某段内容原本就很好，请原封不动地保留。
        - 最终输出的预览内容量级应与原简历对齐，且带有优化增量。

        【输出要求 - 非常重要】
        - 预览内容必须按照以下顺序逐一呈现，不得跳过其中任何一项：
          1. 【个人简介】
          2. 【工作经历】：请逐个列出原简历中的每一家公司及职位。如果在某一段经历中没有建议，请原样完整保留所有描述。
          3. 【项目经验】：请逐个列出原简历中的每一个项目，禁止合并！
          4. 【技能清单】：保留原有的所有技能点，并加入 [[ADD]] 补充项。
          5. 【教育背景】：确保学校、专业、学位信息完整，并根据职位需求 [[ADD]] 相关主修课程或奖学金。
          6. 【荣誉认证】：列出所有资质证书与奖项，针对职位需求 [[ADD]] 缺失但建议考取的证书。
        - 严禁使用诸如“...（其余内容同原简历）...”之类的缩略语。

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
            "skill_mastery_blueprints": [
                {{
                    "skill": "核心缺失技能名称",
                    "priority": "优先级(高/中/低)",
                    "gap_description": "明确指出 JD 中的具体要求 vs 你当前的差距",
                    "learning_path": {{
                        "stage1_theory": {{
                            "title": "原理研习：攻克知识盲区",
                            "points": ["核心考点1", "核心考点2"],
                            "resources": ["具体书名/文档章节/高质量课程名"]
                        }},
                        "stage2_practice": {{
                            "title": "实战动手：构建 Demo 验证",
                            "task": "描述一个具有技术含量的实验任务",
                            "tech_stack": ["推荐使用的技术栈"]
                        }},
                        "stage3_project": {{
                            "title": "项目升华：打造简历亮点",
                            "project_name": "建议的项目名称",
                            "implementation": "详细的项目实现思路，如何解决 JD 中的痛点",
                            "resume_bullet": "直接可用的简历描述话术（含量化指标）"
                        }}
                    }},
                    "interview_prep": {{
                        "critical_question": "针对该技能，面试官最可能问的深度问题",
                        "answer_strategy": "针对性回答思路和重点"
                    }}
                }}
            ],
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
        """统一的 AI 调用方法，带有深度监控与自动回退"""
        client, model = self._refresh_client()
        config = self._get_active_config()
        
        # 监控记录
        start_time = time.time()
        task_id = f"AI_{int(start_time)}"
        log_file = "app_ai_monitor.log"
        
        def monitor_log(msg):
            with open(log_file, "a", encoding="utf-8") as f:
                date_str = time.strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"[{date_str}] [{task_id}] [{model}] {msg}\n")
        
        monitor_log(f"开始 AI 请求 - 提示词长度: {len(prompt)}")
        
        try:
            if self._client_type == "anthropic":
                monitor_log("执行方式: Anthropic Native SDK")
                response = client.messages.create(
                    model=model,
                    max_tokens=8192,
                    system="你是一个专业的 HR 和职业规划专家。请严格按照要求的 JSON 格式输出。确保输出的是合法的 JSON 字符串，不要包含任何额外的解释文字。",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1
                )
                content = response.content[0].text
            else:
                monitor_log(f"执行方式: OpenAI Compatible SDK (Base: {client.base_url})")
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "你是一个专业的 HR 和职业规划专家。请严格按照要求的 JSON 格式输出。不要在 JSON 之外包含任何解释性文字。"},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=8192,
                    response_format={"type": "json_object"} if "vision" not in model.lower() else None
                )
                content = response.choices[0].message.content
            
            duration = time.time() - start_time
            monitor_log(f"请求成功 - 耗时: {duration:.2f}s，响应长度: {len(content)}")
            
            # 使用正则表达式更鲁棒地提取 JSON 内容
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            extracted_content = json_match.group(1) if json_match else content.strip()
            
            # 基础清理
            if extracted_content.startswith("```"):
                lines = extracted_content.split('\n')
                if lines[0].startswith("```"): lines = lines[1:]
                if lines[-1].strip() == "```": lines = lines[:-1]
                extracted_content = '\n'.join(lines).strip()
            
            try:
                result = json.loads(extracted_content)
                monitor_log("JSON 解析成功")
                return result
            except json.JSONDecodeError as je:
                monitor_log(f"JSON 解析失败: {str(je)}")
                # 尝试修复尾部
                last_brace = extracted_content.rfind('}')
                if last_brace != -1:
                    try:
                        result = json.loads(extracted_content[:last_brace+1])
                        monitor_log("JSON 尾部修复解析成功")
                        return result
                    except: pass
                
                # 保存错误样本
                with open(f"debug_error_{task_id}.txt", "w", encoding="utf-8") as f:
                    f.write(content)
                return None
                
        except Exception as e:
            error_msg = str(e)
            monitor_log(f"请求阶段异常: {error_msg}")
            
            # 如果是 AnyRouter 或 Claude 出错，且当前不是 DeepSeek，尝试回退到环境变量默认模型
            if config.get("provider") != "OpenAI" and model != settings.OPENAI_MODEL:
                monitor_log(f"触发自动回退 -> 使用默认模型: {settings.OPENAI_MODEL}")
                try:
                    # 使用默认配置回退
                    fallback_client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_API_BASE)
                    res = fallback_client.chat.completions.create(
                        model=settings.OPENAI_MODEL,
                        messages=[
                            {"role": "system", "content": "你是一个专业的 HR 和职业规划专家。请严格按照要求的 JSON 格式输出。"},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=4096,
                        response_format={"type": "json_object"}
                    )
                    content = res.choices[0].message.content
                    monitor_log("回退调用成功")
                    return json.loads(content)
                except Exception as err:
                    monitor_log(f"回退调用也失败了: {str(err)}")
            
            return None

ai_service = AIService()
