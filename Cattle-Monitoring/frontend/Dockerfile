# 构建阶段
FROM node:18-alpine as build-stage

WORKDIR /app

# 复制所有文件
COPY . .

# 安装依赖并构建
RUN npm install && \
    npm install terser && \
    node node_modules/vite/bin/vite.js build

# 生产阶段
FROM nginx:alpine as production-stage

# 复制构建结果到nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]