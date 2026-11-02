FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm test && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PERSONA_HOST=0.0.0.0 PERSONA_PORT=5000 PERSONA_DATA_DIR=/app/data
COPY --from=build /app/dist ./dist
COPY package.json server.mjs ./
COPY src/data.js ./src/data.js
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:5000/api/data').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
