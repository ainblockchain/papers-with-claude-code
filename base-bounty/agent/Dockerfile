FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

EXPOSE 3402

CMD ["npx", "tsx", "src/index.ts"]
