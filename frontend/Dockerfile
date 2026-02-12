# 使用轻量级 Node 镜像进行构建
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# 这里的环境变量会被编译进前端代码
RUN npm run build

# 使用 Nginx 作为静态资源服务器
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置（处理 React Router 路由）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
