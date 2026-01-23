package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PolymarketProxyHandler proxies requests to Polymarket Gamma API
func (h *Handler) PolymarketProxyHandler(c *gin.Context) {
	// Build Polymarket API URL with query parameters
	baseURL := h.config.PolymarketAPIURL + "/events"
	
	// Forward query parameters
	queryParams := c.Request.URL.Query()
	if len(queryParams) > 0 {
		baseURL += "?" + queryParams.Encode()
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make request to Polymarket
	resp, err := client.Get(baseURL)
	if err != nil {
		h.logger.Error("Failed to fetch from Polymarket API", 
			zap.Error(err),
			zap.String("url", baseURL),
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "Failed to fetch from Polymarket API",
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		h.logger.Error("Failed to read Polymarket response",
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read response",
		})
		return
	}

	// Parse JSON to validate it
	var markets []map[string]interface{}
	if err := json.Unmarshal(body, &markets); err != nil {
		bodyPreview := string(body)
		if len(bodyPreview) > 100 {
			bodyPreview = bodyPreview[:100]
		}
		h.logger.Error("Failed to parse Polymarket response",
			zap.Error(err),
			zap.String("body", bodyPreview),
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "Invalid response from Polymarket API",
		})
		return
	}

	// Cache the response
	if h.cache != nil {
		cacheKey := fmt.Sprintf("polymarket:events:%s", queryParams.Encode())
		_ = h.cache.Set(c.Request.Context(), cacheKey, string(body), 5*time.Minute)
	}

	// Return the markets data
	c.JSON(http.StatusOK, markets)
}

// PolymarketEventHandler proxies request for a specific event
func (h *Handler) PolymarketEventHandler(c *gin.Context) {
	eventID := c.Param("id")
	
	url := fmt.Sprintf("%s/events/%s", h.config.PolymarketAPIURL, eventID)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		h.logger.Error("Failed to fetch event from Polymarket",
			zap.Error(err),
			zap.String("event_id", eventID),
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "Failed to fetch event",
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read response",
		})
		return
	}

	var event map[string]interface{}
	if err := json.Unmarshal(body, &event); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "Invalid response from Polymarket API",
		})
		return
	}

	c.JSON(http.StatusOK, event)
}
