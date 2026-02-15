FROM golang:1.20-alpine AS builder
WORKDIR /src

# Cache modules
COPY go.mod go.sum ./
RUN go mod download

# Copy the source
COPY . .

# Build the app binary
WORKDIR /src/cmd/app
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/leet-terminal-app

FROM alpine:3.18 AS runner
WORKDIR /app
COPY --from=builder /app/leet-terminal-app /usr/local/bin/leet-terminal-app

ENV USERS_DSN="postgres://user_admin:user_pass@postgres:5432/users_db?sslmode=disable"
ENV TIMESCALE_DSN="postgres://timescale_user:timescale_pass@timescaledb:5432/news_bets_db?sslmode=disable"

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/leet-terminal-app"]
