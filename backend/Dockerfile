FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖，包括解析 PDF 所需的库
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口 (Render 会自动覆盖这个值，但保留声明是好习惯)
EXPOSE 10000

# 运行应用，端口通过环境变量读取，默认为 10000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
