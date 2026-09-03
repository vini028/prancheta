# Estágio de planejamento
FROM rust:1.95-slim AS planner
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs

RUN cargo install cargo-chef
RUN cargo chef prepare --recipe-path recipe.json

# Estágio de build
FROM rust:1.95-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-chef

COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

# Estágio final (com libs do sistema)
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copia o executável gerado (nome do pacote: backend)
COPY --from=builder /app/target/release/backend /usr/local/bin/backend

EXPOSE 3000

CMD ["backend"]