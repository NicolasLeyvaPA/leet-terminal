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

type User struct {
	ID           int
	Username     string
	Email        string
	PasswordHash string
	CreatedAt    string
}



type PostgresUserHandler struct {
	DB DB
}

func NewPostgresUserHandler(dsn string) (*PostgresUserHandler, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	return &PostgresUserHandler{DB: db}, nil
}

// --- CRUD for User ---
func (h *PostgresUserHandler) CreateUser(ctx context.Context, u *User) error {
	q := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at`
	return h.DB.QueryRowContext(ctx, q, u.Username, u.Email, u.PasswordHash).Scan(&u.ID, &u.CreatedAt)
}

func (h *PostgresUserHandler) GetUserByID(ctx context.Context, id int) (*User, error) {
	q := `SELECT id, username, email, password_hash, created_at FROM users WHERE id = $1`
	u := &User{}
	err := h.DB.QueryRowContext(ctx, q, id).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (h *PostgresUserHandler) UpdateUser(ctx context.Context, u *User) error {
	q := `UPDATE users SET username=$1, email=$2, password_hash=$3 WHERE id=$4`
	_, err := h.DB.ExecContext(ctx, q, u.Username, u.Email, u.PasswordHash, u.ID)
	return err
}

func (h *PostgresUserHandler) DeleteUser(ctx context.Context, id int) error {
	q := `DELETE FROM users WHERE id=$1`
	_, err := h.DB.ExecContext(ctx, q, id)
	return err
}

