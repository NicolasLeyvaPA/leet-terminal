/**
 * API Service
 * Centralized API client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class APIService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Scraper endpoints
  async initiateScrape(url, options = {}) {
    return this.request('/scrape', {
      method: 'POST',
      body: JSON.stringify({ url, ...options }),
    });
  }

  async getScrapeStatus(jobId) {
    return this.request(`/scrape/${jobId}`);
  }

  // Articles endpoints
  async getArticles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/articles${query ? `?${query}` : ''}`);
  }

  async getArticle(id) {
    return this.request(`/articles/${id}`);
  }

  // Analysis endpoints
  async analyzeArticle(articleId, analysisType = 'full') {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, type: analysisType }),
    });
  }

  async getAnalysis(analysisId) {
    return this.request(`/analysis/${analysisId}`);
  }

  // Predictions endpoints
  async generatePredictions(datasetId, model = 'markov') {
    return this.request('/predict', {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, model }),
    });
  }

  async getPredictions(predictionId) {
    return this.request(`/predictions/${predictionId}`);
  }

  // System stats
  async getStats() {
    return this.request('/stats');
  }

  // Jobs management
  async getJobs(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/jobs${query}`);
  }

  async cancelJob(jobId) {
    return this.request(`/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  async retryJob(jobId) {
    return this.request(`/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const api = new APIService();
export default api;
