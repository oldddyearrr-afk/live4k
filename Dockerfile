FROM node:18-slim

# تثبيت FFmpeg الرسمي داخل السيرفر
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
