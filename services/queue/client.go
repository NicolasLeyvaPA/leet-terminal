package queue

import (
	"fmt"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Connect dials RabbitMQ using the centralized config; returns error if config missing.
func Connect() (*amqp.Connection, error) {
    cfg, err := config.Load()
    if err != nil {
        return nil, fmt.Errorf("load config: %w", err)
    }
    url := cfg.RabbitMQURL
    conn, err := amqp.DialConfig(url, amqp.Config{Heartbeat: 10 * time.Second})
    if err != nil {
        return nil, fmt.Errorf("rabbitmq dial: %w", err)
    }
    return conn, nil
}
