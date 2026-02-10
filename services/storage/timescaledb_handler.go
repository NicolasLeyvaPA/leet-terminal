package storage

import "context"

// Note: low-level SQL implementations live in `services/db`.
// `NewsRepo`, `BetRepo`, and `WalletRepo` are storage-facing interfaces; concrete SQL repos
// implement these interfaces in package `db`.

type TimescaleHandler struct {
	NewsRepo   NewsRepo
	BetRepo    BetRepo
	WalletRepo WalletRepo
}

func NewTimescaleHandler(n NewsRepo, b BetRepo, w WalletRepo) *TimescaleHandler {
	return &TimescaleHandler{NewsRepo: n, BetRepo: b, WalletRepo: w}
}

// News
func (h *TimescaleHandler) CreateNews(ctx context.Context, n *NewsArticle) error {
	return h.NewsRepo.CreateNews(ctx, n)
}

func (h *TimescaleHandler) GetNewsByID(ctx context.Context, id int) (*NewsArticle, error) {
	return h.NewsRepo.GetNewsByID(ctx, id)
}

func (h *TimescaleHandler) UpdateNews(ctx context.Context, n *NewsArticle) error {
	return h.NewsRepo.UpdateNews(ctx, n)
}

func (h *TimescaleHandler) DeleteNews(ctx context.Context, id int) error {
	return h.NewsRepo.DeleteNews(ctx, id)
}

// Bet
func (h *TimescaleHandler) CreateBet(ctx context.Context, b *Bet) error {
	return h.BetRepo.CreateBet(ctx, b)
}

func (h *TimescaleHandler) GetBetByID(ctx context.Context, id int) (*Bet, error) {
	return h.BetRepo.GetBetByID(ctx, id)
}

func (h *TimescaleHandler) UpdateBet(ctx context.Context, b *Bet) error {
	return h.BetRepo.UpdateBet(ctx, b)
}

func (h *TimescaleHandler) DeleteBet(ctx context.Context, id int) error {
	return h.BetRepo.DeleteBet(ctx, id)
}

// Wallet
func (h *TimescaleHandler) CreateWallet(ctx context.Context, w *Wallet) error {
	return h.WalletRepo.CreateWallet(ctx, w)
}

func (h *TimescaleHandler) GetWalletByID(ctx context.Context, id int) (*Wallet, error) {
	return h.WalletRepo.GetWalletByID(ctx, id)
}

func (h *TimescaleHandler) UpdateWallet(ctx context.Context, w *Wallet) error {
	return h.WalletRepo.UpdateWallet(ctx, w)
}

func (h *TimescaleHandler) DeleteWallet(ctx context.Context, id int) error {
	return h.WalletRepo.DeleteWallet(ctx, id)
}