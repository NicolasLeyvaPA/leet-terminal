package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v4/stdlib"
)

// ConnectToPostgres opens a connection to a Postgres-compatible database.
func ConnectToPostgres(dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	// sensible defaults for pool sizing; callers can tune if needed
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	return db, nil
}

// RunSQLFile executes the SQL file contents against the provided DB.
// The file may contain multiple statements; Exec will run them together.
func RunSQLFile(ctx context.Context, db *sql.DB, path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read sql file: %w", err)
	}
	_, err = db.ExecContext(ctx, string(b))
	if err != nil {
		return fmt.Errorf("exec sql file %s: %w", path, err)
	}
	return nil
}

// Ping verifies the DB is reachable.
func Ping(ctx context.Context, db *sql.DB) error {
	return db.PingContext(ctx)
}

// WithTx runs the provided function within a transaction and ensures proper commit/rollback.
func WithTx(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
