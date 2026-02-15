package db

import (
	"context"
	"database/sql"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
	"github.com/lib/pq"
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

// CreateNewsMetadataOnly inserts news article with metadata only (no full content)
func (r *TimescaleRepo) CreateNewsMetadataOnly(ctx context.Context, n *storage.NewsArticle) error {
	// Generate URL hash for deduplication
	if n.URL != "" && n.URLHash == "" {
		n.URLHash = hashURL(n.URL)
	}

	q := `INSERT INTO news_articles (title, content, source, url, url_hash, author, published_at, fetched_at)
	      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	      ON CONFLICT (url_hash) DO NOTHING
	      RETURNING id, inserted_at`

	err := r.DB.QueryRowContext(ctx, q,
		n.Title,
		sql.NullString{String: n.Content, Valid: n.Content != ""},
		n.Source,
		n.URL,
		n.URLHash,
		n.Author,
		n.PublishedAt,
		time.Now(),
	).Scan(&n.ID, &n.InsertedAt)

	if err == sql.ErrNoRows {
		// Duplicate entry, silently skip
		return nil
	}
	return err
}

func (r *TimescaleRepo) GetNewsByID(ctx context.Context, id int) (*storage.NewsArticle, error) {
	q := `SELECT id, title, COALESCE(content, ''), source, COALESCE(url, ''), COALESCE(url_hash, ''),
	             COALESCE(author, ''), published_at, COALESCE(fetched_at, inserted_at), inserted_at
	      FROM news_articles WHERE id = $1`
	n := &storage.NewsArticle{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(
		&n.ID, &n.Title, &n.Content, &n.Source, &n.URL, &n.URLHash,
		&n.Author, &n.PublishedAt, &n.FetchedAt, &n.InsertedAt,
	)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *TimescaleRepo) GetNewsByURLHash(ctx context.Context, urlHash string) (*storage.NewsArticle, error) {
	q := `SELECT id, title, COALESCE(content, ''), source, COALESCE(url, ''), COALESCE(url_hash, ''),
	             COALESCE(author, ''), published_at, COALESCE(fetched_at, inserted_at), inserted_at
	      FROM news_articles WHERE url_hash = $1 LIMIT 1`
	n := &storage.NewsArticle{}
	err := r.DB.QueryRowContext(ctx, q, urlHash).Scan(
		&n.ID, &n.Title, &n.Content, &n.Source, &n.URL, &n.URLHash,
		&n.Author, &n.PublishedAt, &n.FetchedAt, &n.InsertedAt,
	)
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

// DeleteOldNews removes news articles older than the specified time (for retention policy)
func (r *TimescaleRepo) DeleteOldNews(ctx context.Context, olderThan time.Time) (int64, error) {
	q := `DELETE FROM news_articles WHERE fetched_at < $1`
	res, err := r.DB.ExecContext(ctx, q, olderThan)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// Market methods
func (r *TimescaleRepo) CreateMarket(ctx context.Context, m *storage.Market) error {
	q := `INSERT INTO markets
	      (external_id, source, title, description, category, status, close_time, resolve_time,
	       yes_price, no_price, last_trade_price, volume, liquidity, open_interest,
	       tags, created_at, updated_at, fetched_at, raw_data)
	      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
	      RETURNING id`

	return r.DB.QueryRowContext(ctx, q,
		m.ExternalID, m.Source, m.Title, m.Description, m.Category, m.Status,
		m.CloseTime, m.ResolveTime, m.YesPrice, m.NoPrice, m.LastTradePrice,
		m.Volume, m.Liquidity, m.OpenInterest, pq.Array(m.Tags),
		m.CreatedAt, m.UpdatedAt, m.FetchedAt, m.RawData,
	).Scan(&m.ID)
}

func (r *TimescaleRepo) GetMarketByID(ctx context.Context, id int) (*storage.Market, error) {
	q := `SELECT id, external_id, source, title, COALESCE(description, ''), COALESCE(category, ''),
	             status, close_time, resolve_time, yes_price, no_price, last_trade_price,
	             volume, liquidity, open_interest, tags, created_at, updated_at, fetched_at, raw_data
	      FROM markets WHERE id = $1`

	m := &storage.Market{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(
		&m.ID, &m.ExternalID, &m.Source, &m.Title, &m.Description, &m.Category,
		&m.Status, &m.CloseTime, &m.ResolveTime, &m.YesPrice, &m.NoPrice, &m.LastTradePrice,
		&m.Volume, &m.Liquidity, &m.OpenInterest, pq.Array(&m.Tags),
		&m.CreatedAt, &m.UpdatedAt, &m.FetchedAt, &m.RawData,
	)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *TimescaleRepo) GetLatestMarketByExternalID(ctx context.Context, externalID, source string) (*storage.Market, error) {
	q := `SELECT id, external_id, source, title, COALESCE(description, ''), COALESCE(category, ''),
	             status, close_time, resolve_time, yes_price, no_price, last_trade_price,
	             volume, liquidity, open_interest, tags, created_at, updated_at, fetched_at, raw_data
	      FROM markets
	      WHERE external_id = $1 AND source = $2
	      ORDER BY fetched_at DESC
	      LIMIT 1`

	m := &storage.Market{}
	err := r.DB.QueryRowContext(ctx, q, externalID, source).Scan(
		&m.ID, &m.ExternalID, &m.Source, &m.Title, &m.Description, &m.Category,
		&m.Status, &m.CloseTime, &m.ResolveTime, &m.YesPrice, &m.NoPrice, &m.LastTradePrice,
		&m.Volume, &m.Liquidity, &m.OpenInterest, pq.Array(&m.Tags),
		&m.CreatedAt, &m.UpdatedAt, &m.FetchedAt, &m.RawData,
	)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *TimescaleRepo) ListMarkets(ctx context.Context, source string, limit int) ([]*storage.Market, error) {
	q := `SELECT DISTINCT ON (external_id)
	             id, external_id, source, title, COALESCE(description, ''), COALESCE(category, ''),
	             status, close_time, resolve_time, yes_price, no_price, last_trade_price,
	             volume, liquidity, open_interest, tags, created_at, updated_at, fetched_at, raw_data
	      FROM markets
	      WHERE source = $1
	      ORDER BY external_id, fetched_at DESC
	      LIMIT $2`

	rows, err := r.DB.QueryContext(ctx, q, source, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var markets []*storage.Market
	for rows.Next() {
		m := &storage.Market{}
		err := rows.Scan(
			&m.ID, &m.ExternalID, &m.Source, &m.Title, &m.Description, &m.Category,
			&m.Status, &m.CloseTime, &m.ResolveTime, &m.YesPrice, &m.NoPrice, &m.LastTradePrice,
			&m.Volume, &m.Liquidity, &m.OpenInterest, pq.Array(&m.Tags),
			&m.CreatedAt, &m.UpdatedAt, &m.FetchedAt, &m.RawData,
		)
		if err != nil {
			return nil, err
		}
		markets = append(markets, m)
	}
	return markets, rows.Err()
}

func (r *TimescaleRepo) UpdateMarket(ctx context.Context, m *storage.Market) error {
	q := `UPDATE markets SET
	      title=$1, description=$2, category=$3, status=$4, close_time=$5, resolve_time=$6,
	      yes_price=$7, no_price=$8, last_trade_price=$9, volume=$10, liquidity=$11,
	      open_interest=$12, tags=$13, updated_at=$14, raw_data=$15
	      WHERE id=$16`

	_, err := r.DB.ExecContext(ctx, q,
		m.Title, m.Description, m.Category, m.Status, m.CloseTime, m.ResolveTime,
		m.YesPrice, m.NoPrice, m.LastTradePrice, m.Volume, m.Liquidity, m.OpenInterest,
		pq.Array(m.Tags), m.UpdatedAt, m.RawData, m.ID,
	)
	return err
}

func (r *TimescaleRepo) DeleteMarket(ctx context.Context, id int) error {
	q := `DELETE FROM markets WHERE id=$1`
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

// Helper function to hash URLs for deduplication
func hashURL(url string) string {
	h := sha256.New()
	h.Write([]byte(url))
	return hex.EncodeToString(h.Sum(nil))
}
