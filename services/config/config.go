package config

import (
	"fmt"
	"os"
	"sync"
)

type Config struct {
    UsersDSN           string
    TimescaleDSN       string
    RabbitMQURL        string
    WebAdminUsername   string
    WebAdminPassword   string
    WebAdminEmail      string
    GFAdminPassword    string
    ReactAppGrafanaURL string
    DatabaseURL        string
}

var (
    cfg  *Config
    once sync.Once
    cErr error
)

// Load reads config from environment variables and validates presence of required values.
// It returns the loaded Config or an error listing missing required values.
func Load() (*Config, error) {
    once.Do(func() {
        c := &Config{
            UsersDSN:           os.Getenv("USERS_DSN"),
            TimescaleDSN:       os.Getenv("TIMESCALE_DSN"),
            RabbitMQURL:        os.Getenv("RABBITMQ_URL"),
            WebAdminUsername:   os.Getenv("WEB_ADMIN_USERNAME"),
            WebAdminPassword:   os.Getenv("WEB_ADMIN_PASSWORD"),
            WebAdminEmail:      os.Getenv("WEB_ADMIN_EMAIL"),
            GFAdminPassword:    os.Getenv("GF_SECURITY_ADMIN_PASSWORD"),
            ReactAppGrafanaURL: os.Getenv("REACT_APP_GRAFANA_URL"),
            DatabaseURL:        os.Getenv("DATABASE_URL"),
        }

        // Validate required keys for safety; only surface which are missing.
        var missing []string
        if c.UsersDSN == "" {
            missing = append(missing, "USERS_DSN")
        }
        if c.TimescaleDSN == "" {
            missing = append(missing, "TIMESCALE_DSN")
        }
        // RabbitMQ may be optional depending on services, but include it as recommended
        if c.RabbitMQURL == "" {
            missing = append(missing, "RABBITMQ_URL")
        }

        if len(missing) > 0 {
            cErr = fmt.Errorf("missing required environment variables: %v", missing)
            return
        }

        cfg = c
    })
    return cfg, cErr
}

// MustLoad panics on error — convenient for simple main functions that should fail fast.
func MustLoad() *Config {
    c, err := Load()
    if err != nil {
        panic(err)
    }
    return c
}
