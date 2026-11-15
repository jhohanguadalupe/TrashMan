FROM node:22-alpine

WORKDIR /app
COPY server/package*.json ./server/
RUN npm install --omit=dev --prefix ./server
COPY . .

ENV PORT=80
EXPOSE 80
CMD ["node", "server/room-server.js"]
