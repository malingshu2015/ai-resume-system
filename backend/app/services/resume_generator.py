"""
简历生成服务
支持基于优化建议生成新简历，并提供多种模板和导出格式
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime
import json
from pathlib import Path

from app.services.ai_service import ai_service
from app.db.session import SessionLocal
from app.models.resume import Resume


class ResumeGenerator:
    """简历生成器"""
    
    # 支持的模板 - 精美设计
    TEMPLATES = {
        "modern": {
            "name": "🌐 科技蓝",
            "description": "现代科技感十足，蓝色渐变主题，适合IT/互联网/技术岗位",
            "color_scheme": "blue"
        },
        "professional": {
            "name": "🏆 商务金",
            "description": "深邃商务蓝搭配金色点缀，高端大气，适合管理层/金融/商务岗位",
            "color_scheme": "gold"
        },
        "creative": {
            "name": "🎨 创意紫",
            "description": "梦幻紫色渐变，带有动态效果，适合设计师/创意/市场岗位",
            "color_scheme": "purple"
        },
        "minimal": {
            "name": "⚫ 极简黑",
            "description": "黑白简约风格，高级留白设计，适合高端岗位/各类场合",
            "color_scheme": "black"
        }
    }
    
    # 支持的导出格式
    EXPORT_FORMATS = ["pdf", "docx", "markdown", "html", "json"]
    
    async def generate_optimized_resume(
        self,
        resume_id: str,
        job_id: Optional[str] = None,
        optimization_suggestions: Optional[Dict] = None,
        template: str = "modern"
    ) -> Dict:
        """
        基于优化建议和目标职位生成深度优化简历
        """
        db = SessionLocal()
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume or not resume.parsed_data:
                raise ValueError("简历不存在或未解析")
            
            job_data = None
            if job_id:
                from app.models.job import Job
                job = db.query(Job).filter(Job.id == job_id).first()
                if job:
                    job_data = job.parsed_data or {"title": job.title, "description": job.description}

            # 如果传入了建议，记录数量
            suggestions_count = 0
            if optimization_suggestions and "suggestions" in optimization_suggestions:
                suggestions_count = len(optimization_suggestions["suggestions"])
            elif not optimization_suggestions and job_data:
                # 如果没有显式传入建议但有目标职位，由 AI 判定为定向优化，设置一个虚拟计数或状态
                suggestions_count = 5 # 代表五大维度的标准深度优化

            # 调用更深度的 AI 内容生成
            optimized_content = await self._generate_resume_content_advanced(
                original_data=resume.parsed_data,
                job_data=job_data,
                suggestions=optimization_suggestions,
                template=template
            )
            
            # 生成纯文本版本供前端预览
            text_content = self._format_resume_as_text(optimized_content)
            
            return {
                "original_resume_id": resume_id,
                "target_job_id": job_id,
                "template": template,
                "template_info": self.TEMPLATES.get(template, self.TEMPLATES["modern"]),
                "content": optimized_content,
                "optimized_content": text_content,  # 新增：纯文本版本
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "optimization_applied": True,
                    "suggestions_count": suggestions_count,
                    "target_job_title": job_data.get("title") if job_data else None,
                    "optimization_type": "针对性改写" if job_id else "通用提升"
                }
            }
        finally:
            db.close()

    async def _generate_resume_content_advanced(
        self,
        original_data: Dict,
        job_data: Optional[Dict],
        suggestions: Optional[Dict],
        template: str
    ) -> Dict:
        """
        高级 AI 简历内容生成引擎
        """
        target_context = f"目标职位：{json.dumps(job_data, ensure_ascii=False)}" if job_data else "通用职业发展优化"
        suggestions_context = f"重点应用以下改写建议：{json.dumps(suggestions, ensure_ascii=False)}" if suggestions else "执行全方位的深度内容增强"
        
        prompt = f"""
你是一位拥有15年经验的明星猎头和职业发展专家。请基于以下原始简历数据，为用户生成一份【深度优化】的简历。

【原始简历数据】:
{json.dumps(original_data, ensure_ascii=False, indent=2)}

【优化上下文】:
{target_context}

【改写建议】:
{suggestions_context}

【优化核心指令】:
1. **内容吞噬与应用**：如果提供了具体的【改写建议】，请务必将其内容【无缝嵌入】到对应的项目或经历中，不要只是简单罗列。
2. **内容丰满化**：如果原简历描述过于简单（如“负责XX系统开发”），请基于职业常识和技术背景，将其扩展为包含“背景、具体行动、技术选型、量化结果”的深度描述。
3. **STAR法则应用**：所有工作经历和项目必须体现：情境(Situation)、任务(Task)、行动(Action)、结果(Result)。
4. **量化价值**：必须包含具体的百分比、金额、时间、规模等数据（如“提升效率30%”，“管理10人团队”，“处理千万级并发”）。
5. **亮点挖掘**：从平凡的工作中挖掘出不平凡的技术挑战或业务价值点。
6. **⚠️ 项目完整性（重要）**：必须保留原简历中的所有项目经验，不能删减、合并或省略！原简历有几个项目，输出就必须有几个项目。每个项目都要深度优化，actions 数组至少3-5条，results 必须量化。

请返回以下结构的 JSON 对象：
{{
    "personal_info": {{
        "name": "姓名",
        "title": "符合目标的专业职能头衔",
        "summary": "极具吸引力的职业概况，包含核心卖点和独特价值",
        "labels": ["高并发专家", "架构设计", "降本增效"],
        "contact": {{ "email": "...", "phone": "...", "location": "..." }},
        "links": []
    }},
    "work_experience": [
        {{
            "company": "...",
            "position": "...",
            "duration": "...",
            "description": "一段总结性的职责描述",
            "achievements": [
                "高度量化的具体成就1 (例如：主导XX系统重构，将响应延迟从200ms降低至50ms，支撑活跃用户翻倍)",
                "技术深度展示2 (例如：通过实现XX算法，解决了由于数据倾斜导致的频繁OOM问题，系统稳定性提升至99.99%)"
            ],
            "skills_used": ["技术A", "技术B"]
        }}
    ],
    "project_experience": [
        {{
            "name": "...",
            "role": "...",
            "duration": "...",
            "description": "项目背景和挑战",
            "actions": ["采取的行动1", "采取的行动2"],
            "results": "项目的最终量化成果"
        }}
    ],
    "skills_sections": [
        {{ "category": "硬核技术", "skills": ["Java", "Spring Cloud"] }},
        {{ "category": "工具/架构", "skills": ["Kubernetes", "Redis"] }}
    ],
    "education": [],
    "certifications": []
}}
"""
        # 使用更大的 AI 限制或更专业的模型
        result = await ai_service._call_ai(prompt)
        return result or original_data

    def _generate_html_content(self, content: Dict, template_info: Dict) -> str:
        """
        生成极具视觉美感的现代 HTML 模板 (内联 CSS，并解决中文字体问题)
        """
        personal = content.get("personal_info", {})
        work_exp = content.get("work_experience", [])
        projects = content.get("project_experience", [])
        skills_sections = content.get("skills_sections", [])
        education = content.get("education", [])
        
        color = template_info.get("color_scheme", "blue")
        theme_colors = {
            "blue": "#1890ff",
            "navy": "#001529",
            "purple": "#722ed1",
            "gray": "#262626"
        }
        primary_color = theme_colors.get(color, theme_colors["blue"])

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: a4; margin: 0; }}
        :root {{ --primary: {primary_color}; }}
        body {{ font-family: 'PingFang SC', 'STHeiti', 'SimSun', sans-serif; background: #fff; padding: 0; margin: 0; color: #333; }}
        .resume-card {{ background: #fff; width: 100%; min-height: 297mm; margin: 0; }}
        
        .header {{ background: {primary_color}; color: white; padding: 40px; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .header .title-badge {{ display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; margin-top: 10px; font-size: 14px; }}
        .header .summary {{ margin-top: 15px; font-size: 13px; line-height: 1.6; opacity: 0.9; }}
        .contact-bar {{ display: flex; gap: 15px; margin-top: 20px; font-size: 12px; opacity: 0.8; }}
        
        .main-content {{ display: flex; padding: 30px; }}
        .left-col {{ width: 65%; padding-right: 30px; }}
        .right-col {{ width: 35%; border-left: 1px solid #eee; padding-left: 30px; }}
        
        .section-title {{ font-size: 16px; font-weight: bold; color: {primary_color}; border-bottom: 2px solid {primary_color}; padding-bottom: 5px; margin: 25px 0 15px 0; }}
        
        .exp-item {{ margin-bottom: 20px; }}
        .exp-header {{ display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }}
        .exp-meta {{ font-size: 13px; color: {primary_color}; margin: 5px 0; }}
        .achievement-list {{ padding-left: 15px; margin: 5px 0; }}
        .achievement-list li {{ font-size: 13px; color: #444; margin-bottom: 5px; }}
        
        .skill-group { margin-bottom: 12px; }
        .skill-category { 
            font-size: 11px; 
            font-weight: 600; 
            color: #666; 
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .skill-tags { font-size: 11px; line-height: 1.6; }
        .skill-tag { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3px 8px; 
            border-radius: 12px; 
            margin-right: 4px; 
            margin-bottom: 4px;
            display: inline-block;
            font-weight: 500;
        }
        
        .label-tag { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="resume-card">
        <div class="header">
            <h1>{personal.get('name', '姓名')}</h1>
            <div class="title-badge">{personal.get('title', '技术专家')}</div>
            <div style="margin-top: 10px;">
                {" ".join([f'<span class="label-tag">{L}</span>' for L in personal.get('labels', [])])}
            </div>
            <div class="summary">{personal.get('summary', '')}</div>
            <div class="contact-bar">
                <span>📍 {personal.get('contact', {}).get('location', '城市')}</span>
                <span>📞 {personal.get('contact', {}).get('phone', '电话')}</span>
                <span>✉️ {personal.get('contact', {}).get('email', '邮箱')}</span>
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-col">
                <div class="section-title" style="margin-top: 0;">工作详细履历</div>
                {self._render_work_exp_html(work_exp)}
                
                <div class="section-title">核心项目经验</div>
                {self._render_projects_html(projects)}
            </div>
            
            <div class="right-col">
                <div class="section-title" style="margin-top: 0;">核心技能</div>
                {self._render_skills_html(skills_sections)}
                
                <div class="section-title">教育背景</div>
                {self._render_edu_html(education)}
            </div>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _render_work_exp_html(self, exps):
        html = ""
        for exp in exps:
            achievements = "".join([f"<li>{a}</li>" for a in exp.get("achievements", [])])
            html += f"""
            <div class="exp-item">
                <div class="exp-header">
                    <span style="float: left;">{exp.get('company')}</span>
                    <span style="float: right;">{exp.get('duration')}</span>
                    <div style="clear: both;"></div>
                </div>
                <div class="exp-meta">{exp.get('position')}</div>
                <ul class="achievement-list">{achievements}</ul>
            </div>
            """
        return html

    def _render_projects_html(self, projects):
        html = ""
        for p in projects:
            html += f"""
            <div class="exp-item">
                <div class="exp-header">
                    <span style="float: left;">{p.get('name')}</span>
                    <span style="float: right;">{p.get('duration')}</span>
                    <div style="clear: both;"></div>
                </div>
                <div class="exp-meta">{p.get('role')}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;"><strong>产出：</strong>{p.get('results', '')}</div>
            </div>
            """
        return html

    def _render_skills_html(self, sections):
        html = ""
        for s in sections:
            tags = "".join([f'<span class="skill-tag">{tag}</span>' for tag in s.get("skills", [])])
            html += f"""
            <div class="skill-group">
                <div class="skill-category">{s.get('category')}</div>
                <div class="skill-tags">{tags}</div>
            </div>
            """
        return html

    def _render_edu_html(self, edu_list):
        html = ""
        for edu in edu_list:
            html += f"""
            <div class="exp-item">
                <div style="font-weight: bold; font-size: 13px;">{edu.get('school')}</div>
                <div style="font-size: 12px; color: #666;">{edu.get('degree')} · {edu.get('major')}</div>
                <div style="font-size: 11px; color: #999;">{edu.get('duration')}</div>
            </div>
            """
        return html
    def export_resume(
        self,
        resume_data: Dict,
        format: str = "pdf",
        output_path: Optional[str] = None
    ) -> str:
        """
        导出简历到指定格式
        """
        if format not in self.EXPORT_FORMATS:
            raise ValueError(f"不支持的格式: {format}")
        
        # 生成默认输出路径
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"exports/resume_{timestamp}.{format}"
        
        # 确保输出目录存在
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # 根据格式调用相应的导出方法
        if format == "json":
            return self._export_json(resume_data, output_path)
        elif format == "markdown":
            return self._export_markdown(resume_data, output_path)
        elif format == "html":
            return self._export_html(resume_data, output_path)
        elif format == "docx":
            return self._export_docx(resume_data, output_path)
        elif format == "pdf":
            return self._export_pdf(resume_data, output_path)
        
        raise ValueError(f"格式 {format} 的导出功能尚未实现")

    def _export_json(self, resume_data: Dict, output_path: str) -> str:
        """导出为JSON格式"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(resume_data, f, ensure_ascii=False, indent=2)
        return output_path

    def _export_markdown(self, resume_data: Dict, output_path: str) -> str:
        """导出为Markdown格式"""
        content = resume_data.get("content", {})
        personal = content.get("personal_info", {})
        
        md = f"# {personal.get('name', '姓名')}\n\n"
        md += f"## {personal.get('title', '职位标题')}\n\n"
        md += f"{personal.get('summary', '')}\n\n"
        
        work_exp = content.get("work_experience", [])
        if work_exp:
            md += "## 工作经历\n\n"
            for exp in work_exp:
                md += f"### {exp.get('position')} @ {exp.get('company')}\n"
                md += f"*{exp.get('duration')}*\n\n"
                md += f"{exp.get('description', '')}\n\n"
                for ach in exp.get("achievements", []):
                    md += f"- {ach}\n"
                md += "\n"

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md)
        return output_path

    def _export_html(self, resume_data: Dict, output_path: str) -> str:
        """导出为HTML格式"""
        content = resume_data.get("content", {})
        template = resume_data.get("template", "modern")
        template_info = self.TEMPLATES.get(template, self.TEMPLATES["modern"])
        
        html_content = self._generate_html_content(content, template_info)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        return output_path
    def _export_docx(self, resume_data: Dict, output_path: str) -> str:
        """导出为Word格式"""
        try:
            from docx import Document
            from docx.shared import Pt, RGBColor, Inches
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            
            content = resume_data.get("content", {})
            personal = content.get("personal_info", {})
            
            doc = Document()
            
            # 设置页边距
            sections = doc.sections
            for section in sections:
                section.top_margin = Inches(0.5)
                section.bottom_margin = Inches(0.5)
                section.left_margin = Inches(0.75)
                section.right_margin = Inches(0.75)
            
            # 标题
            title = doc.add_heading(personal.get('name', '姓名'), 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 副标题
            subtitle = doc.add_paragraph(personal.get('title', '职位标题'))
            subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
            subtitle_run = subtitle.runs[0]
            subtitle_run.font.size = Pt(14)
            subtitle_run.font.color.rgb = RGBColor(100, 100, 100)
            
            # 个人简介
            if personal.get('summary'):
                summary = doc.add_paragraph(personal['summary'])
                summary.alignment = WD_ALIGN_PARAGRAPH.CENTER
                summary_run = summary.runs[0]
                summary_run.font.size = Pt(11)
                summary_run.font.italic = True
            
            # 联系方式
            contact = personal.get("contact", {})
            contact_info = []
            if contact.get("email"):
                contact_info.append(f"📧 {contact['email']}")
            if contact.get("phone"):
                contact_info.append(f"📱 {contact['phone']}")
            if contact.get("location"):
                contact_info.append(f"📍 {contact['location']}")
            
            if contact_info:
                contact_para = doc.add_paragraph(" | ".join(contact_info))
                contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                contact_run = contact_para.runs[0]
                contact_run.font.size = Pt(10)
            
            doc.add_paragraph()  # 空行
            
            # 工作经历
            work_exp = content.get("work_experience", [])
            if work_exp:
                doc.add_heading('💼 工作经历', 1)
                
                for exp in work_exp:
                    # 职位和公司
                    position_para = doc.add_paragraph()
                    position_run = position_para.add_run(f"{exp.get('position', '职位')} @ {exp.get('company', '公司')}")
                    position_run.bold = True
                    position_run.font.size = Pt(12)
                    
                    # 时间
                    duration_para = doc.add_paragraph(exp.get('duration', '时间'))
                    duration_run = duration_para.runs[0]
                    duration_run.font.size = Pt(10)
                    duration_run.font.color.rgb = RGBColor(100, 100, 100)
                    
                    # 描述
                    if exp.get('description'):
                        doc.add_paragraph(exp['description'])
                    
                    # 亮点
                    highlights = exp.get("highlights", [])
                    if highlights:
                        for highlight in highlights:
                            doc.add_paragraph(highlight, style='List Bullet')
                    
                    doc.add_paragraph()  # 空行
            
            # 教育背景
            education = content.get("education", [])
            if education:
                doc.add_heading('🎓 教育背景', 1)
                
                for edu in education:
                    edu_para = doc.add_paragraph()
                    edu_run = edu_para.add_run(f"{edu.get('degree', '学位')} - {edu.get('major', '专业')}")
                    edu_run.bold = True
                    edu_run.font.size = Pt(12)
                    
                    school_para = doc.add_paragraph(f"{edu.get('school', '学校')} | {edu.get('duration', '时间')}")
                    school_run = school_para.runs[0]
                    school_run.font.size = Pt(10)
                    
                    doc.add_paragraph()  # 空行
            
            # 技能
            skills = content.get("skills", {})
            if skills:
                doc.add_heading('🛠️ 技能', 1)
                
                tech_skills = skills.get("technical", [])
                if tech_skills:
                    tech_para = doc.add_paragraph()
                    tech_para.add_run("技术技能：").bold = True
                    tech_para.add_run(", ".join(tech_skills))
                
                soft_skills = skills.get("soft", [])
                if soft_skills:
                    soft_para = doc.add_paragraph()
                    soft_para.add_run("软技能：").bold = True
                    soft_para.add_run(", ".join(soft_skills))
            
            # 保存文档
            doc.save(output_path)
            
            logging.info(f"简历已导出为Word: {output_path}")
            return output_path
            
        except ImportError:
            logging.error("python-docx 未安装，无法导出Word格式")
            raise ValueError("Word导出功能需要安装 python-docx 库")
    
    def _export_pdf(self, resume_data: Dict, output_path: str) -> str:
        """导出为PDF格式"""
        from xhtml2pdf import pisa
        
        content = resume_data.get("content", {})
        template = resume_data.get("template", "modern")
        template_info = self.TEMPLATES.get(template, self.TEMPLATES["modern"])
        
        html_content = self._generate_html_content(content, template_info)
        
        with open(output_path, "w+b") as result_file:
            # pisa 能够处理中文字体，但需要 html 中指定兼容字体
            pisa_status = pisa.CreatePDF(html_content, dest=result_file)
            
        if pisa_status.err:
            logging.error(f"PDF生成失败: {pisa_status.err}")
            # 如果失败，作为备选生成 HTML
            html_path = output_path.replace('.pdf', '.html')
            self._export_html(resume_data, html_path)
            return html_path
            
        return output_path
    
    def _format_resume_as_text(self, content: Dict) -> str:
        """
        将结构化简历数据格式化为易读的纯文本格式
        """
        lines = []
        
        # 个人信息
        personal = content.get("personal_info", {})
        if personal:
            lines.append("=" * 60)
            lines.append(f"  {personal.get('name', '未知姓名')}")
            if personal.get('title'):
                lines.append(f"  {personal.get('title')}")
            lines.append("=" * 60)
            lines.append("")
            
            # 联系方式
            contact = personal.get('contact', {})
            contact_info = []
            if contact.get('email'):
                contact_info.append(f"邮箱: {contact['email']}")
            if contact.get('phone'):
                contact_info.append(f"电话: {contact['phone']}")
            if contact.get('location'):
                contact_info.append(f"地址: {contact['location']}")
            if contact_info:
                lines.append(" | ".join(contact_info))
                lines.append("")
            
            # 职业概况
            if personal.get('summary'):
                lines.append("【职业概况】")
                lines.append(personal['summary'])
                lines.append("")
        
        # 工作经历
        work_exp = content.get("work_experience", [])
        if work_exp:
            lines.append("【工作经历】")
            lines.append("")
            for exp in work_exp:
                lines.append(f"▪ {exp.get('company', '未知公司')} | {exp.get('position', '未知职位')}")
                lines.append(f"  {exp.get('duration', '')}")
                if exp.get('description'):
                    lines.append(f"  {exp['description']}")
                
                achievements = exp.get('achievements', [])
                if achievements:
                    for achievement in achievements:
                        lines.append(f"  • {achievement}")
                lines.append("")
        
        # 项目经验
        projects = content.get("project_experience", [])
        if projects:
            lines.append("【项目经验】")
            lines.append("")
            for proj in projects:
                lines.append(f"▪ {proj.get('name', '未知项目')} | {proj.get('role', '未知角色')}")
                lines.append(f"  {proj.get('duration', '')}")
                if proj.get('description'):
                    lines.append(f"  {proj['description']}")
                
                actions = proj.get('actions', [])
                if actions:
                    for action in actions:
                        lines.append(f"  • {action}")
                
                if proj.get('results'):
                    lines.append(f"  成果: {proj['results']}")
                lines.append("")
        
        # 技能
        skills_sections = content.get("skills_sections", [])
        if skills_sections:
            lines.append("【专业技能】")
            lines.append("")
            for section in skills_sections:
                category = section.get('category', '技能')
                skills = section.get('skills', [])
                if skills:
                    lines.append(f"▪ {category}: {', '.join(skills)}")
            lines.append("")
        
        # 教育背景
        education = content.get("education", [])
        if education:
            lines.append("【教育背景】")
            lines.append("")
            for edu in education:
                school = edu.get('school', '未知学校')
                degree = edu.get('degree', '')
                major = edu.get('major', '')
                duration = edu.get('duration', '')
                lines.append(f"▪ {school} | {degree} {major}")
                if duration:
                    lines.append(f"  {duration}")
            lines.append("")
        
        # 证书
        certifications = content.get("certifications", [])
        if certifications:
            lines.append("【资格证书】")
            lines.append("")
            for cert in certifications:
                if isinstance(cert, str):
                    lines.append(f"▪ {cert}")
                elif isinstance(cert, dict):
                    name = cert.get('name', '未知证书')
                    issuer = cert.get('issuer', '')
                    date = cert.get('date', '')
                    cert_line = f"▪ {name}"
                    if issuer:
                        cert_line += f" ({issuer})"
                    if date:
                        cert_line += f" - {date}"
                    lines.append(cert_line)
            lines.append("")
        
        return "\n".join(lines)


# 全局实例
resume_generator = ResumeGenerator()
