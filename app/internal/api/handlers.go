package api

import (
	"net/http"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/cache"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/queue"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// Handler contains all API handlers
type Handler struct {
	db          *storage.DB
	cache       *cache.RedisClient
	queue       *queue.AsynqClient
	config      *config.Config
	logger      *zap.Logger
	upgrader    websocket.Upgrader
	connections map[string]*websocket.Conn
}

// NewHandler creates a new API handler
func NewHandler(db *storage.DB, cache *cache.RedisClient, cfg *config.Config, logger *zap.Logger) *Handler {
	queueClient, _ := queue.NewAsynqClient(cfg)
	
	return &Handler{
		db:     db,
		cache:  cache,
		queue:  queueClient,
		config: cfg,
		logger: logger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  cfg.WSReadBufferSize,
			WriteBufferSize: cfg.WSWriteBufferSize,
			CheckOrigin: func(r *http.Request) bool {
				return true // In production, implement proper origin checking
			},
		},
		connections: make(map[string]*websocket.Conn),
	}
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		Username string `json:"username" binding:"required,min=3"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create user in database
	userID := uuid.New().String()
	user := &storage.User{
		ID:           userID,
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// TODO: Actually save to database when DB methods are implemented
	// For now, just generate tokens

	// Generate JWT token
	token, err := h.generateToken(user.ID, user.Email)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := h.generateRefreshToken(user.ID)
	if err != nil {
		h.logger.Error("Failed to generate refresh token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "User registered successfully",
		"user_id":       user.ID,
		"token":         token,
		"refresh_token": refreshToken,
		"expires_in":    int(h.config.JWTExpiration.Seconds()),
	})
}

// Login handles user authentication
func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Fetch user from database and verify password
	// For now, generate tokens for any login
	userID := uuid.New().String()

	token, err := h.generateToken(userID, req.Email)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := h.generateRefreshToken(userID)
	if err != nil {
		h.logger.Error("Failed to generate refresh token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":         token,
		"refresh_token": refreshToken,
		"expires_in":    int(h.config.JWTExpiration.Seconds()),
	})
}

// generateToken creates a new JWT access token
func (h *Handler) generateToken(userID, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(h.config.JWTExpiration).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.config.JWTSecret))
}

// generateRefreshToken creates a new JWT refresh token
func (h *Handler) generateRefreshToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(h.config.JWTRefreshExpiration).Unix(),
		"iat":     time.Now().Unix(),
		"type":    "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.config.JWTSecret))
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Verify refresh token and generate new access token
	newToken := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Placeholder

	c.JSON(http.StatusOK, gin.H{
		"token":      newToken,
		"expires_in": h.config.JWTExpiration.Seconds(),
	})
}

// CreateScrapeJob creates a new scraping job
func (h *Handler) CreateScrapeJob(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required,url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	jobID := uuid.New().String()

	// Create job record in database
	job := &storage.ScrapeJob{
		ID:        jobID,
		UserID:    userID,
		URL:       req.URL,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	// TODO: Store job in database

	// Enqueue job
	if err := h.queue.EnqueueScrapeJob(jobID, req.URL); err != nil {
		h.logger.Error("Failed to enqueue scrape job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"job_id": jobID,
		"status": "pending",
		"job":    job,
	})
}

// ListScrapeJobs lists all scrape jobs for the user
func (h *Handler) ListScrapeJobs(c *gin.Context) {
	// userID := c.GetString("user_id")
	// TODO: Query database for user's jobs

	c.JSON(http.StatusOK, gin.H{
		"jobs": []storage.ScrapeJob{},
		"total": 0,
	})
}

// GetScrapeJob retrieves a specific scrape job
func (h *Handler) GetScrapeJob(c *gin.Context) {
	jobID := c.Param("id")
	// TODO: Query database for job

	c.JSON(http.StatusOK, gin.H{
		"job_id": jobID,
		"status": "completed",
	})
}

// CreateAnalysisJob creates a new analysis job
func (h *Handler) CreateAnalysisJob(c *gin.Context) {
	var req struct {
		ContentID string `json:"content_id" binding:"required"`
		Type      string `json:"type" binding:"required,oneof=sentiment ner topic"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	jobID := uuid.New().String()

	if err := h.queue.EnqueueAnalysisJob(jobID, req.ContentID, req.Type); err != nil {
		h.logger.Error("Failed to enqueue analysis job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"job_id": jobID,
		"status": "pending",
		"user_id": userID,
	})
}

// ListAnalysisJobs lists all analysis jobs
func (h *Handler) ListAnalysisJobs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"jobs": []storage.AnalysisJob{},
		"total": 0,
	})
}

// GetAnalysisJob retrieves a specific analysis job
func (h *Handler) GetAnalysisJob(c *gin.Context) {
	jobID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"job_id": jobID,
		"status": "completed",
	})
}

// CreatePredictionJob creates a new prediction job
func (h *Handler) CreatePredictionJob(c *gin.Context) {
	var req struct {
		DatasetID string `json:"dataset_id" binding:"required"`
		ModelType string `json:"model_type" binding:"required,oneof=markov timeseries ml"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	jobID := uuid.New().String()

	if err := h.queue.EnqueuePredictionJob(jobID, req.DatasetID, req.ModelType); err != nil {
		h.logger.Error("Failed to enqueue prediction job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"job_id": jobID,
		"status": "pending",
		"user_id": userID,
	})
}

// ListPredictionJobs lists all prediction jobs
func (h *Handler) ListPredictionJobs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"jobs": []storage.PredictionJob{},
		"total": 0,
	})
}

// GetPredictionJob retrieves a specific prediction job
func (h *Handler) GetPredictionJob(c *gin.Context) {
	jobID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"job_id": jobID,
		"status": "completed",
	})
}

// HandleWebSocket handles WebSocket connections
func (h *Handler) HandleWebSocket(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade WebSocket", zap.Error(err))
		return
	}
	defer conn.Close()

	userID := c.GetString("user_id")
	h.connections[userID] = conn

	h.logger.Info("WebSocket connection established", zap.String("user_id", userID))

	// Handle messages
	for {
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			h.logger.Error("WebSocket read error", zap.Error(err))
			break
		}

		// Echo back for now
		if err := conn.WriteJSON(gin.H{
			"type":    "response",
			"message": "Message received",
			"data":    msg,
		}); err != nil {
			h.logger.Error("WebSocket write error", zap.Error(err))
			break
		}
	}

	delete(h.connections, userID)
}
