FROM node:18-alpine
WORKDIR /app
# 复制后端代码（连依赖）
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server ./server
# 复制前端构建产物
COPY client/dist ./client/dist
EXPOSE 3001
ENV PORT=3001
CMD ["sh", "-c", "cd server && node index.js"]
