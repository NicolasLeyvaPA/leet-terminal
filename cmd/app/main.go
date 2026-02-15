package main

import (
	"context"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
	"github.com/NicolasLeyvaPA/leet-terminal/services/db"
	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

func main() {
	ctx := context.Background()

		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("load config: %v", err)
		}

	// connect
		pgDB, err := db.ConnectToPostgres(cfg.UsersDSN)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pgDB.Close()

		tsDB, err := db.ConnectToPostgres(cfg.TimescaleDSN)
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

	// Seed a local admin user if credentials are provided (development convenience).
	if cfg.WebAdminUsername != "" && cfg.WebAdminPassword != "" {
		pwHash, err := bcrypt.GenerateFromPassword([]byte(cfg.WebAdminPassword), 12)
		if err != nil {
			log.Printf("error hashing admin password: %v", err)
		} else {
			u := &storage.User{Username: cfg.WebAdminUsername, Email: cfg.WebAdminEmail, PasswordHash: string(pwHash)}
			// best-effort create; ignore errors (e.g., already exists)
			if err := userHandler.CreateUser(ctx, u); err != nil {
				log.Printf("admin user seed skipped or failed: %v", err)
			} else {
				log.Printf("seeded admin user: %s (email: %s)", cfg.WebAdminUsername, cfg.WebAdminEmail)
			}
		}
	}

	timescaleHandler := storage.NewTimescaleHandler(adapter.NewsRepo(), adapter.BetRepo(), adapter.WalletRepo())
	_ = timescaleHandler

	log.Println("DBs wired; ready")
	// block to keep process alive in dev (replace with real server start)
	select {}
}
