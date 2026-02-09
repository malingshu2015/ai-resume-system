try:
    import aiosmtplib
    AIOSMTPLIB_AVAILABLE = True
except ImportError:
    AIOSMTPLIB_AVAILABLE = False
    import logging
    logging.warning("aiosmtplib 未安装，邮件发送功能将不可用")

from email.message import EmailMessage
import os
import logging
from typing import List, Optional

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.qq.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "465"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.use_tls = os.getenv("SMTP_TLS", "True") == "True"

    async def send_resume_email(
        self, 
        to_email: str, 
        subject: str, 
        content: str, 
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        异步发送带有附件的邮件
        """
        if not AIOSMTPLIB_AVAILABLE:
            logging.error("aiosmtplib 未安装，无法发送邮件")
            return False
            
        if not self.smtp_user or not self.smtp_password:
            logging.error("邮件服务未配置：SMTP_USER 或 SMTP_PASSWORD 为空")
            return False

        message = EmailMessage()
        message["From"] = self.smtp_user
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(content)

        # 添加附件
        if attachments:
            for file_path in attachments:
                if os.path.exists(file_path):
                    file_name = os.path.basename(file_path)
                    with open(file_path, "rb") as f:
                        file_data = f.read()
                        # 根据扩展名判断类型（简单起见）
                        maintype = "application"
                        subtype = "octet-stream"
                        if file_name.endswith(".pdf"):
                            subtype = "pdf"
                        elif file_name.endswith(".png"):
                            maintype = "image"
                            subtype = "png"
                        
                        message.add_attachment(
                            file_data,
                            maintype=maintype,
                            subtype=subtype,
                            filename=file_name
                        )

        try:
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=self.use_tls
            )
            logging.info(f"邮件已成功发送至: {to_email}")
            return True
        except Exception as e:
            logging.error(f"发送邮件失败: {str(e)}")
            return False

# 全局实例
email_service = EmailService()
