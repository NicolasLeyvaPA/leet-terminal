type Wallet struct {
	ID        int
	UserID    int
	Address   string
	CreatedAt string
}

// --- CRUD for Wallet ---
func (h *TimescaleHandler) CreateWallet(ctx context.Context, w *Wallet) error {
	q := `INSERT INTO wallets (user_id, address) VALUES ($1, $2) RETURNING id, created_at`
	return h.DB.QueryRowContext(ctx, q, w.UserID, w.Address).Scan(&w.ID, &w.CreatedAt)
}

func (h *TimescaleHandler) GetWalletByID(ctx context.Context, id int) (*Wallet, error) {
	q := `SELECT id, user_id, address, created_at FROM wallets WHERE id = $1`
	w := &Wallet{}
	err := h.DB.QueryRowContext(ctx, q, id).Scan(&w.ID, &w.UserID, &w.Address, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (h *TimescaleHandler) UpdateWallet(ctx context.Context, w *Wallet) error {
	q := `UPDATE wallets SET user_id=$1, address=$2 WHERE id=$3`
	_, err := h.DB.ExecContext(ctx, q, w.UserID, w.Address, w.ID)
	return err
}

func (h *TimescaleHandler) DeleteWallet(ctx context.Context, id int) error {
	q := `DELETE FROM wallets WHERE id=$1`
	_, err := h.DB.ExecContext(ctx, q, id)
	return err
}
package storage

import (
	"context"
	"database/sql"

	_ "github.com/jackc/pgx/v4/stdlib"
)

// DB interface for abstraction and testability
type DB interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
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

type TimescaleHandler struct {
	DB DB
}

func NewTimescaleHandler(dsn string) (*TimescaleHandler, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	return &TimescaleHandler{DB: db}, nil
}

// --- CRUD for NewsArticle ---
func (h *TimescaleHandler) CreateNews(ctx context.Context, n *NewsArticle) error {
	q := `INSERT INTO news_articles (title, content, source, published_at) VALUES ($1, $2, $3, $4) RETURNING id, inserted_at`
	return h.DB.QueryRowContext(ctx, q, n.Title, n.Content, n.Source, n.PublishedAt).Scan(&n.ID, &n.InsertedAt)
}

func (h *TimescaleHandler) GetNewsByID(ctx context.Context, id int) (*NewsArticle, error) {
	q := `SELECT id, title, content, source, published_at, inserted_at FROM news_articles WHERE id = $1`
	n := &NewsArticle{}
	err := h.DB.QueryRowContext(ctx, q, id).Scan(&n.ID, &n.Title, &n.Content, &n.Source, &n.PublishedAt, &n.InsertedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (h *TimescaleHandler) UpdateNews(ctx context.Context, n *NewsArticle) error {
	q := `UPDATE news_articles SET title=$1, content=$2, source=$3, published_at=$4 WHERE id=$5`
	_, err := h.DB.ExecContext(ctx, q, n.Title, n.Content, n.Source, n.PublishedAt, n.ID)
	return err
}

func (h *TimescaleHandler) DeleteNews(ctx context.Context, id int) error {
	q := `DELETE FROM news_articles WHERE id=$1`
	_, err := h.DB.ExecContext(ctx, q, id)
	return err
}

// --- CRUD for Bet ---
func (h *TimescaleHandler) CreateBet(ctx context.Context, b *Bet) error {
	q := `INSERT INTO bets (user_id, article_id, amount, placed_at, wallet_address) VALUES ($1, $2, $3, $4, $5) RETURNING id, inserted_at`
	return h.DB.QueryRowContext(ctx, q, b.UserID, b.ArticleID, b.Amount, b.PlacedAt, b.WalletAddress).Scan(&b.ID, &b.InsertedAt)
}

func (h *TimescaleHandler) GetBetByID(ctx context.Context, id int) (*Bet, error) {
	q := `SELECT id, user_id, article_id, amount, placed_at, wallet_address, inserted_at FROM bets WHERE id = $1`
	b := &Bet{}
	err := h.DB.QueryRowContext(ctx, q, id).Scan(&b.ID, &b.UserID, &b.ArticleID, &b.Amount, &b.PlacedAt, &b.WalletAddress, &b.InsertedAt)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (h *TimescaleHandler) UpdateBet(ctx context.Context, b *Bet) error {
	q := `UPDATE bets SET user_id=$1, article_id=$2, amount=$3, placed_at=$4, wallet_address=$5 WHERE id=$6`
	_, err := h.DB.ExecContext(ctx, q, b.UserID, b.ArticleID, b.Amount, b.PlacedAt, b.WalletAddress, b.ID)
	return err
}

func (h *TimescaleHandler) DeleteBet(ctx context.Context, id int) error {
	q := `DELETE FROM bets WHERE id=$1`
	_, err := h.DB.ExecContext(ctx, q, id)
	return err
}