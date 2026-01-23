package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// Task types
const (
	TypeScrapeJob         = "scrape:job"
	TypeAnalysisJob       = "analysis:job"
	TypePredictionJob     = "prediction:job"
	TypeNewsSourceScrape  = "news:source:scrape"
)

// AsynqClient wraps the Asynq client for enqueuing tasks
type AsynqClient struct {
	client *asynq.Client
}

// NewAsynqClient creates a new Asynq client
func NewAsynqClient(cfg *config.Config) (*AsynqClient, error) {
	client := asynq.NewClient(asynq.RedisClientOpt{
		Addr: cfg.AsynqRedisAddr,
	})

	return &AsynqClient{client: client}, nil
}

// Close closes the Asynq client
func (c *AsynqClient) Close() error {
	return c.client.Close()
}

// EnqueueScrapeJob enqueues a scraping job
func (c *AsynqClient) EnqueueScrapeJob(jobID, url string) error {
	payload := map[string]string{
		"job_id": jobID,
		"url":    url,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeScrapeJob, data)
	_, err = c.client.Enqueue(task)
	return err
}

// EnqueueAnalysisJob enqueues an analysis job
func (c *AsynqClient) EnqueueAnalysisJob(jobID, contentID, analysisType string) error {
	payload := map[string]string{
		"job_id":     jobID,
		"content_id": contentID,
		"type":       analysisType,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeAnalysisJob, data)
	_, err = c.client.Enqueue(task)
	return err
}

// EnqueuePredictionJob enqueues a prediction job
func (c *AsynqClient) EnqueuePredictionJob(jobID, datasetID, modelType string) error {
	payload := map[string]string{
		"job_id":     jobID,
		"dataset_id": datasetID,
		"model_type": modelType,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypePredictionJob, data)
	_, err = c.client.Enqueue(task)
	return err
}

// EnqueueNewsSourceScrape enqueues a news source scraping job
func (c *AsynqClient) EnqueueNewsSourceScrape(sourceID, url, sourceType string, config map[string]interface{}) error {
	payload := map[string]interface{}{
		"source_id":   sourceID,
		"url":         url,
		"source_type": sourceType,
		"config":      config,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeNewsSourceScrape, data)
	_, err = c.client.Enqueue(task)
	return err
}

// AsynqServer wraps the Asynq server for processing tasks
type AsynqServer struct {
	server *asynq.Server
	logger *zap.Logger
}

// NewAsynqServer creates a new Asynq server
func NewAsynqServer(cfg *config.Config, logger *zap.Logger) *AsynqServer {
	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.AsynqRedisAddr},
		asynq.Config{
			Concurrency: cfg.AsynqConcurrency,
			Logger:      &asynqLogger{logger: logger},
		},
	)

	return &AsynqServer{
		server: server,
		logger: logger,
	}
}

// Mux returns the task handler multiplexer
func (s *AsynqServer) Mux() *asynq.ServeMux {
	return asynq.NewServeMux()
}

// Start starts the Asynq server
func (s *AsynqServer) Start(handler asynq.Handler) error {
	return s.server.Start(handler)
}

// Shutdown gracefully shuts down the server
func (s *AsynqServer) Shutdown(ctx context.Context) {
	s.server.Shutdown()
}

// asynqLogger adapts zap.Logger to asynq.Logger interface
type asynqLogger struct {
	logger *zap.Logger
}

func (l *asynqLogger) Debug(args ...interface{}) {
	l.logger.Sugar().Debug(args...)
}

func (l *asynqLogger) Info(args ...interface{}) {
	l.logger.Sugar().Info(args...)
}

func (l *asynqLogger) Warn(args ...interface{}) {
	l.logger.Sugar().Warn(args...)
}

func (l *asynqLogger) Error(args ...interface{}) {
	l.logger.Sugar().Error(args...)
}

func (l *asynqLogger) Fatal(args ...interface{}) {
	l.logger.Sugar().Fatal(args...)
}
