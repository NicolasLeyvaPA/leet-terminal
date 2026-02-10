package db

import (
	"context"
	"database/sql"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
	_ "github.com/jackc/pgx/v4/stdlib"
)

type PostgresUserRepo struct {
	DB *sql.DB
}

func NewPostgresUserRepo(db *sql.DB) *PostgresUserRepo {
	return &PostgresUserRepo{DB: db}
}

func (r *PostgresUserRepo) CreateUser(ctx context.Context, u *storage.User) error {
	q := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at`
	return r.DB.QueryRowContext(ctx, q, u.Username, u.Email, u.PasswordHash).Scan(&u.ID, &u.CreatedAt)
}

func (r *PostgresUserRepo) GetUserByID(ctx context.Context, id int) (*storage.User, error) {
	q := `SELECT id, username, email, password_hash, created_at FROM users WHERE id = $1`
	u := &storage.User{}
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *PostgresUserRepo) UpdateUser(ctx context.Context, u *storage.User) error {
	q := `UPDATE users SET username=$1, email=$2, password_hash=$3 WHERE id=$4`
	_, err := r.DB.ExecContext(ctx, q, u.Username, u.Email, u.PasswordHash, u.ID)
	return err
}

func (r *PostgresUserRepo) DeleteUser(ctx context.Context, id int) error {
	q := `DELETE FROM users WHERE id=$1`
	_, err := r.DB.ExecContext(ctx, q, id)
	return err
}
