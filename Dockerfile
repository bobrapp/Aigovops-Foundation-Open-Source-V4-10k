# AiGovOps Gate service — zero runtime dependencies, so no install step.
FROM node:20-alpine
WORKDIR /app
COPY . .
# No ENV PORT — the host (Render/Fly) injects $PORT and the server binds process.env.PORT
# (defaulting to 8930 only when nothing is set, e.g. local `docker run`). Hard-coding it
# made the app bind 8930 while the host routed to a different port → no-server.
EXPOSE 8930
USER node
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- "http://localhost:${PORT:-8930}/healthz" || exit 1
CMD ["node", "packages/server/src/cli.mjs"]
