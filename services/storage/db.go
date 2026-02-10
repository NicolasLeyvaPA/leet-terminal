package storage

import "context"

// DB is a high-level database adapter used by application code.
// It exposes repository interfaces and basic lifecycle operations.
type DB interface {
	UserRepo() UserRepo
	NewsRepo() NewsRepo
	BetRepo() BetRepo
	WalletRepo() WalletRepo

	// Ping checks availability of the underlying databases.
	Ping(ctx context.Context) error
	// Close releases resources (connection pools).
	Close() error
}
