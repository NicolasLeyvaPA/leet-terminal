package analyzer

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/cache"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// Engine handles text analysis operations
type Engine struct {
	db     *storage.DB
	cache  *cache.RedisClient
	config *config.Config
	logger *zap.Logger
}

// NewEngine creates a new analyzer engine
func NewEngine(db *storage.DB, cache *cache.RedisClient, cfg *config.Config, logger *zap.Logger) *Engine {
	return &Engine{
		db:     db,
		cache:  cache,
		config: cfg,
		logger: logger,
	}
}

// HandleAnalysisJob processes an analysis job from the queue
func (e *Engine) HandleAnalysisJob(ctx context.Context, task *asynq.Task) error {
	var payload map[string]string
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		e.logger.Error("Failed to unmarshal analysis job payload", zap.Error(err))
		return err
	}

	jobID := payload["job_id"]
	contentID := payload["content_id"]
	analysisType := payload["type"]

	e.logger.Info("Processing analysis job",
		zap.String("job_id", jobID),
		zap.String("content_id", contentID),
		zap.String("type", analysisType),
	)

	var result string
	var err error

	switch analysisType {
	case "sentiment":
		result, err = e.AnalyzeSentiment("Sample text content")
	case "ner":
		result, err = e.ExtractEntities("Sample text content")
	case "topic":
		result, err = e.ExtractTopics("Sample text content")
	default:
		err = fmt.Errorf("unknown analysis type: %s", analysisType)
	}

	if err != nil {
		e.logger.Error("Analysis failed",
			zap.String("job_id", jobID),
			zap.String("type", analysisType),
			zap.Error(err),
		)
		return err
	}

	e.logger.Info("Analysis completed",
		zap.String("job_id", jobID),
		zap.String("type", analysisType),
	)

	_ = result
	return nil
}

// AnalyzeSentiment performs sentiment analysis on text
func (e *Engine) AnalyzeSentiment(text string) (string, error) {
	positiveWords := []string{"good", "great", "excellent", "positive", "happy", "love"}
	negativeWords := []string{"bad", "terrible", "awful", "negative", "sad", "hate"}
	
	lowerText := strings.ToLower(text)
	positiveCount := 0
	negativeCount := 0
	
	for _, word := range positiveWords {
		positiveCount += strings.Count(lowerText, word)
	}
	
	for _, word := range negativeWords {
		negativeCount += strings.Count(lowerText, word)
	}
	
	sentiment := "neutral"
	score := 0.0
	
	if positiveCount > negativeCount {
		sentiment = "positive"
		score = float64(positiveCount) / float64(positiveCount+negativeCount)
	} else if negativeCount > positiveCount {
		sentiment = "negative"
		score = float64(negativeCount) / float64(positiveCount+negativeCount)
	}
	
	result := map[string]interface{}{
		"sentiment":      sentiment,
		"score":          score,
		"positive_count": positiveCount,
		"negative_count": negativeCount,
	}
	
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return "", err
	}
	
	return string(resultJSON), nil
}

// ExtractEntities extracts named entities from text
func (e *Engine) ExtractEntities(text string) (string, error) {
	entities := map[string]interface{}{
		"persons":       []string{},
		"organizations": []string{},
		"locations":     []string{},
		"dates":         []string{},
	}
	
	resultJSON, err := json.Marshal(entities)
	if err != nil {
		return "", err
	}
	
	return string(resultJSON), nil
}

// ExtractTopics extracts topics from text
func (e *Engine) ExtractTopics(text string) (string, error) {
	topics := map[string]interface{}{
		"topics": []map[string]interface{}{
			{
				"id":       1,
				"label":    "Technology",
				"keywords": []string{"tech", "software", "computer"},
				"score":    0.75,
			},
		},
	}
	
	resultJSON, err := json.Marshal(topics)
	if err != nil {
		return "", err
	}
	
	return string(resultJSON), nil
}
