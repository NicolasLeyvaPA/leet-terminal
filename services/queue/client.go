package queue

import (
	"fmt"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Connect dials RabbitMQ using RABBITMQ_URL or the default service name.
func Connect() (*amqp.Connection, error) {
    url := os.Getenv("RABBITMQ_URL")
    if url == "" {
        url = "amqp://guest:guest@rabbitmq:5672/"
    }
    conn, err := amqp.DialConfig(url, amqp.Config{Heartbeat: 10 * time.Second})
    if err != nil {
        return nil, fmt.Errorf("rabbitmq dial: %w", err)
    }
    return conn, nil
}
