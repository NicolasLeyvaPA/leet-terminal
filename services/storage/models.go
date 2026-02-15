package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// Domain models
type User struct {
	ID           int
	Username     string
	Email        string
	PasswordHash string
	CreatedAt    string
}

type NewsArticle struct {
	ID          int
	Title       string
	Content     string  // Nullable for metadata-only records
	Source      string
	URL         string  // Added for news ingestion
	URLHash     string  // For deduplication
	Author      string  // Added for news ingestion
	PublishedAt string
	FetchedAt   string  // Added for news ingestion
	InsertedAt  string
}

// Market represents a prediction market from Kalshi or Polymarket
type Market struct {
	ID             int
	ExternalID     string          // Platform-specific ID
	Source         string          // 'kalshi' or 'polymarket'
	Title          string
	Description    string
	Category       string
	Status         string          // 'open', 'closed', 'resolved', 'settled'
	CloseTime      sql.NullTime
	ResolveTime    sql.NullTime
	YesPrice       sql.NullFloat64 // Current yes price
	NoPrice        sql.NullFloat64
	LastTradePrice sql.NullFloat64
	Volume         sql.NullFloat64
	Liquidity      sql.NullFloat64
	OpenInterest   sql.NullFloat64
	Tags           []string        // Category tags
	CreatedAt      time.Time       // Market creation on platform
	UpdatedAt      time.Time       // Last update
	FetchedAt      time.Time       // When we fetched this
	RawData        json.RawMessage // Original JSON payload
}

// MarketNewsLink represents a relationship between a market and news article
type MarketNewsLink struct {
	ID             int
	MarketID       int
	NewsID         int
	RelevanceScore sql.NullFloat64 // 0.00 to 1.00
	MatchedAt      time.Time
	MatchMethod    string // 'keyword', 'semantic', 'manual'
}

type Bet struct {
	ID            int
	UserID        int
	ArticleID     sql.NullInt64
	Amount        float64
	PlacedAt      string
	WalletAddress sql.NullString
	InsertedAt    string
}

type Wallet struct {
	ID        int
	UserID    int
	Address   string
	CreatedAt string
}

// Repository interfaces (declared where consumed)
type UserRepo interface {
	CreateUser(ctx context.Context, u *User) error
	GetUserByID(ctx context.Context, id int) (*User, error)
	UpdateUser(ctx context.Context, u *User) error
	DeleteUser(ctx context.Context, id int) error
}

type NewsRepo interface {
	CreateNews(ctx context.Context, n *NewsArticle) error
	CreateNewsMetadataOnly(ctx context.Context, n *NewsArticle) error // New: for legal ingestion
	GetNewsByID(ctx context.Context, id int) (*NewsArticle, error)
	GetNewsByURLHash(ctx context.Context, urlHash string) (*NewsArticle, error) // New: for deduplication
	UpdateNews(ctx context.Context, n *NewsArticle) error
	DeleteNews(ctx context.Context, id int) error
	DeleteOldNews(ctx context.Context, olderThan time.Time) (int64, error) // New: for retention
}

type MarketRepo interface {
	CreateMarket(ctx context.Context, m *Market) error
	GetMarketByID(ctx context.Context, id int) (*Market, error)
	GetLatestMarketByExternalID(ctx context.Context, externalID, source string) (*Market, error)
	ListMarkets(ctx context.Context, source string, limit int) ([]*Market, error)
	UpdateMarket(ctx context.Context, m *Market) error
	DeleteMarket(ctx context.Context, id int) error
}

type BetRepo interface {
	CreateBet(ctx context.Context, b *Bet) error
	GetBetByID(ctx context.Context, id int) (*Bet, error)
	UpdateBet(ctx context.Context, b *Bet) error
	DeleteBet(ctx context.Context, id int) error
}

type WalletRepo interface {
	CreateWallet(ctx context.Context, w *Wallet) error
	GetWalletByID(ctx context.Context, id int) (*Wallet, error)
	UpdateWallet(ctx context.Context, w *Wallet) error
	DeleteWallet(ctx context.Context, id int) error
}
