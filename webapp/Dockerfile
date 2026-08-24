FROM node:18-alpine
WORKDIR /app
ENV PORT=8080
# 复制后端代码（连依赖）
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server ./server
# 复制前端构建产物
COPY client/dist ./client/dist
EXPOSE 8080
CMD ["sh", "-c", "cd server && node index.js"]
