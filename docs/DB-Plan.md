Short DB notes

- Postgres (users): migrations in `services/db/migrations/postgres_users_migration_001.sql`.
- TimescaleDB (news, bets, wallets): migrations in `services/db/migrations/timescaledb_migration_001.sql`.

Quick start (local):

1. Start DB containers:

```bash
docker-compose -f deploy/docker-compose.db.yml up -d
```

2. Run migrations (example using Go helper):

```go
// in your app init
db, _ := db.ConnectToPostgres("postgres://user:pass@localhost:5434/users_db")
_ = dbhandler.RunSQLFile(ctx, db, "services/db/migrations/postgres_users_migration_001.sql")

db2, _ := db.ConnectToPostgres("postgres://timescale_user:timescale_pass@localhost:5433/news_bets_db")
_ = dbhandler.RunSQLFile(ctx, db2, "services/db/migrations/timescaledb_migration_001.sql")
```

CRUD notes:
- Implementations of repository interfaces (`UserRepo`, `NewsRepo`, `BetRepo`, `WalletRepo`) live in `services/db` (SQL). Use these via the `storage` interfaces/types.
Databases

This folder contains initial SQL inits and migrations and a small DB handler.

Quick start

- Start DBs with Docker Compose (from repo root):

```bash
docker-compose -f deploy/docker-compose.db.yml up -d
```

- Postgres DSN example: `postgres://user_admin:user_pass@localhost:5434/users_db`
- Timescale DSN example: `postgres://timescale_user:timescale_pass@localhost:5433/news_bets_db`

Migrations

- `services/db/migrations/postgres_users_migration_001.sql` — creates `users` table
- `services/db/migrations/timescaledb_migration_001.sql` — creates timescaledb tables/hypertables

Basic CRUD examples

- Create user (Postgres):

```sql
INSERT INTO users (username, email, password_hash) VALUES ('alice', 'a@example.com', 'hashed');
```

- Create wallet (Timescale):

```sql
INSERT INTO wallets (user_id, address) VALUES (1, '0x...');
```

Handler

- Use `services/db/handler.go` functions to connect and run SQL files programmatically.

*** End Patch