package storage

import (
	"context"
	"database/sql"
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
	Content     string
	Source      string
	PublishedAt string
	InsertedAt  string
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
	GetNewsByID(ctx context.Context, id int) (*NewsArticle, error)
	UpdateNews(ctx context.Context, n *NewsArticle) error
	DeleteNews(ctx context.Context, id int) error
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
