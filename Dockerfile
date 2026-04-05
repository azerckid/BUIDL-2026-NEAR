FROM node:20-slim AS base

# noirup 설치에 필요한 의존성
RUN apt-get update && apt-get install -y \
  curl \
  bash \
  git \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# nargo 설치 (Noir ZKP proof 생성용)
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
ENV PATH="/root/.nargo/bin:$PATH"
RUN noirup

# ── 의존성 설치 단계 ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── 빌드 단계 ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 필요한 더미 환경 변수 (실제 값은 런타임에 주입)
ENV TURSO_DATABASE_URL=file:dummy.db
ENV TURSO_AUTH_TOKEN=dummy

RUN npm run build

# ── 실행 단계 ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# nargo PATH 유지
ENV PATH="/root/.nargo/bin:$PATH"

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/circuits ./circuits

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
