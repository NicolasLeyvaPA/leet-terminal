package db

import (
	"context"
	"database/sql"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
	_ "github.com/jackc/pgx/v4/stdlib"
)

type TimescaleRepo struct {
	DB *sql.DB
}

func NewTimescaleRepo(db *sql.DB) *TimescaleRepo {
	return &TimescaleRepo{DB: db}
}

// News
func (r *TimescaleRepo) CreateNews(ctx context.Context, n *storage.NewsArticle) error {
	q := `INSERT INTO news_articles (title, content, source, published_at) VALUES ($1, $2, $3, $4) RETURNING id, inserted_at`
	return r.DB.QueryRowContext(ctx, q, n.Title, n.Content, n.Source, n.PublishedAt).Scan(&n.ID, &n.InsertedAt)
}

func (r *TimescaleRepo) GetNewsByID(ctx context.Context, id int) (*storage.NewsArticle, error) {
	q := `SELECT id, title, content, source, published_at, inserted_at FROM news_articles WHERE id = $1`
	n := &storage.NewsArticle{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&n.ID, &n.Title, &n.Content, &n.Source, &n.PublishedAt, &n.InsertedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *TimescaleRepo) UpdateNews(ctx context.Context, n *storage.NewsArticle) error {
	q := `UPDATE news_articles SET title=$1, content=$2, source=$3, published_at=$4 WHERE id=$5`
	_, err := r.DB.ExecContext(ctx, q, n.Title, n.Content, n.Source, n.PublishedAt, n.ID)
	return err
}

func (r *TimescaleRepo) DeleteNews(ctx context.Context, id int) error {
	q := `DELETE FROM news_articles WHERE id=$1`
	_, err := r.DB.ExecContext(ctx, q, id)
	return err
}

// Bet
func (r *TimescaleRepo) CreateBet(ctx context.Context, b *storage.Bet) error {
	q := `INSERT INTO bets (user_id, article_id, amount, placed_at, wallet_address) VALUES ($1, $2, $3, $4, $5) RETURNING id, inserted_at`
	return r.DB.QueryRowContext(ctx, q, b.UserID, b.ArticleID, b.Amount, b.PlacedAt, b.WalletAddress).Scan(&b.ID, &b.InsertedAt)
}

func (r *TimescaleRepo) GetBetByID(ctx context.Context, id int) (*storage.Bet, error) {
	q := `SELECT id, user_id, article_id, amount, placed_at, wallet_address, inserted_at FROM bets WHERE id = $1`
	b := &storage.Bet{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&b.ID, &b.UserID, &b.ArticleID, &b.Amount, &b.PlacedAt, &b.WalletAddress, &b.InsertedAt)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (r *TimescaleRepo) UpdateBet(ctx context.Context, b *storage.Bet) error {
	q := `UPDATE bets SET user_id=$1, article_id=$2, amount=$3, placed_at=$4, wallet_address=$5 WHERE id=$6`
	_, err := r.DB.ExecContext(ctx, q, b.UserID, b.ArticleID, b.Amount, b.PlacedAt, b.WalletAddress, b.ID)
	return err
}

func (r *TimescaleRepo) DeleteBet(ctx context.Context, id int) error {
	q := `DELETE FROM bets WHERE id=$1`
	_, err := r.DB.ExecContext(ctx, q, id)
	return err
}

// Wallet
func (r *TimescaleRepo) CreateWallet(ctx context.Context, w *storage.Wallet) error {
	q := `INSERT INTO wallets (user_id, address) VALUES ($1, $2) RETURNING id, created_at`
	return r.DB.QueryRowContext(ctx, q, w.UserID, w.Address).Scan(&w.ID, &w.CreatedAt)
}

func (r *TimescaleRepo) GetWalletByID(ctx context.Context, id int) (*storage.Wallet, error) {
	q := `SELECT id, user_id, address, created_at FROM wallets WHERE id = $1`
	w := &storage.Wallet{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&w.ID, &w.UserID, &w.Address, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *TimescaleRepo) UpdateWallet(ctx context.Context, w *storage.Wallet) error {
	q := `UPDATE wallets SET user_id=$1, address=$2 WHERE id=$3`
	_, err := r.DB.ExecContext(ctx, q, w.UserID, w.Address, w.ID)
	return err
}

func (r *TimescaleRepo) DeleteWallet(ctx context.Context, id int) error {
	q := `DELETE FROM wallets WHERE id=$1`
	_, err := r.DB.ExecContext(ctx, q, id)
	return err
}
