package ingestion

import (
	"context"
	"log"
	"time"
)

// Scheduler runs the ingestion pipeline at regular intervals
type Scheduler struct {
	pipeline *Pipeline
	interval time.Duration
	stopCh   chan struct{}
}

// NewScheduler creates a new scheduler
func NewScheduler(pipeline *Pipeline, interval time.Duration) *Scheduler {
	return &Scheduler{
		pipeline: pipeline,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the scheduled ingestion loop
func (s *Scheduler) Start(ctx context.Context) error {
	log.Printf("Scheduler started: running every %v", s.interval)

	// Run immediately on start
	if err := s.pipeline.RunFullIngestion(ctx); err != nil {
		log.Printf("Initial ingestion failed: %v", err)
	}

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("=== Scheduled ingestion run ===")
			if err := s.pipeline.RunFullIngestion(ctx); err != nil {
				log.Printf("Scheduled ingestion failed: %v", err)
			}
		case <-s.stopCh:
			log.Println("Scheduler stopped")
			return nil
		case <-ctx.Done():
			log.Println("Scheduler cancelled by context")
			return ctx.Err()
		}
	}
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	close(s.stopCh)
}

