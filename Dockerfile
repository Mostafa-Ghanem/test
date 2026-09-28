# Development image for docker compose (Vercel builds natively and ignores this).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run dev -- -H 0.0.0.0"]
