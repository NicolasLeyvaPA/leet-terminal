package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/db"
	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

func main() {
	ctx := context.Background()

	usersDSN := os.Getenv("USERS_DSN")
	if usersDSN == "" {
		usersDSN = "postgres://user_admin:user_pass@localhost:5434/users_db?sslmode=disable"
	}
	tsDSN := os.Getenv("TIMESCALE_DSN")
	if tsDSN == "" {
		tsDSN = "postgres://timescale_user:timescale_pass@localhost:5433/news_bets_db?sslmode=disable"
	}

	// connect
	pgDB, err := db.ConnectToPostgres(usersDSN)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pgDB.Close()

	tsDB, err := db.ConnectToPostgres(tsDSN)
	if err != nil {
		log.Fatalf("connect timescale: %v", err)
	}
	defer tsDB.Close()

	// wait briefly for containers in dev
	time.Sleep(200 * time.Millisecond)

	// run migrations if present (best-effort)
	_ = db.RunSQLFile(ctx, pgDB, "services/db/migrations/postgres_users_migration_001.sql")
	_ = db.RunSQLFile(ctx, tsDB, "services/db/migrations/timescaledb_migration_001.sql")

	// build adapter that implements storage.DB
	adapter := db.NewAdapter(pgDB, tsDB)

	userHandler := storage.NewPostgresUserHandler(adapter.UserRepo())
	_ = userHandler

	timescaleHandler := storage.NewTimescaleHandler(adapter.NewsRepo(), adapter.BetRepo(), adapter.WalletRepo())
	_ = timescaleHandler

	log.Println("DBs wired; ready")
	// block to keep process alive in dev (replace with real server start)
	select {}
}
