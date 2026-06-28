# AiGovOps Gate service — zero runtime dependencies, so no install step.
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=8930
EXPOSE 8930
USER node
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8930/healthz || exit 1
CMD ["node", "packages/server/src/cli.mjs"]
