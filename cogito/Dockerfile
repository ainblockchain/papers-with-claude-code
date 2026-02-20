FROM node:20-slim

RUN apt-get update && apt-get install -y git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /cogito

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx tsc

EXPOSE 3402

CMD ["node", "dist/server.js"]
