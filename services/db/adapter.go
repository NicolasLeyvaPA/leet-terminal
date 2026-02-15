package db

import (
	"context"
	"database/sql"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

// Adapter implements the high-level storage.DB interface using concrete SQL repos.
type Adapter struct {
	pgDB *sql.DB
	tsDB *sql.DB

	userRepo   *PostgresUserRepo
	newsRepo   *TimescaleRepo
	betRepo    *TimescaleRepo
	walletRepo *TimescaleRepo
	marketRepo *TimescaleRepo // Added for market data
}

// NewAdapter constructs an Adapter from raw DB connections.
func NewAdapter(pg *sql.DB, ts *sql.DB) *Adapter {
	// reuse a TimescaleRepo instance for news/bets/wallets/markets; it's safe because methods are stateless.
	tsRepo := NewTimescaleRepo(ts)
	return &Adapter{
		pgDB:       pg,
		tsDB:       ts,
		userRepo:   NewPostgresUserRepo(pg),
		newsRepo:   tsRepo,
		betRepo:    tsRepo,
		walletRepo: tsRepo,
		marketRepo: tsRepo, // Reuse for market methods
	}
}

func (a *Adapter) UserRepo() storage.UserRepo     { return a.userRepo }
func (a *Adapter) NewsRepo() storage.NewsRepo     { return a.newsRepo }
func (a *Adapter) BetRepo() storage.BetRepo       { return a.betRepo }
func (a *Adapter) WalletRepo() storage.WalletRepo { return a.walletRepo }
func (a *Adapter) MarketRepo() storage.MarketRepo { return a.marketRepo } // Added

func (a *Adapter) Ping(ctx context.Context) error {
	if a.pgDB != nil {
		if err := a.pgDB.PingContext(ctx); err != nil {
			return err
		}
	}
	if a.tsDB != nil {
		if err := a.tsDB.PingContext(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (a *Adapter) Close() error {
	var err error
	if a.pgDB != nil {
		if e := a.pgDB.Close(); e != nil {
			err = e
		}
	}
	if a.tsDB != nil {
		if e := a.tsDB.Close(); e != nil {
			err = e
		}
	}
	return err
}
