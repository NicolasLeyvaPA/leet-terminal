package storage

import "context"

// PostgresUserHandler is a small adapter around a concrete implementation of UserRepo.
type PostgresUserHandler struct {
	Repo UserRepo
}

func NewPostgresUserHandler(repo UserRepo) *PostgresUserHandler {
	return &PostgresUserHandler{Repo: repo}
}

func (h *PostgresUserHandler) CreateUser(ctx context.Context, u *User) error {
	return h.Repo.CreateUser(ctx, u)
}

func (h *PostgresUserHandler) GetUserByID(ctx context.Context, id int) (*User, error) {
	return h.Repo.GetUserByID(ctx, id)
}

func (h *PostgresUserHandler) UpdateUser(ctx context.Context, u *User) error {
	return h.Repo.UpdateUser(ctx, u)
}

func (h *PostgresUserHandler) DeleteUser(ctx context.Context, id int) error {
	return h.Repo.DeleteUser(ctx, id)
}

