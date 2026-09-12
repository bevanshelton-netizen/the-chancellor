FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S growthdesk && adduser -S growthdesk -G growthdesk
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=growthdesk:growthdesk . .
RUN mkdir -p /app/data/uploads /app/data/sessions && chown -R growthdesk:growthdesk /app/data
USER growthdesk
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
CMD ["node", "render-start.js"]
