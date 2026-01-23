import { api } from './api';

/**
 * Terminal Commands Service
 * Handles terminal command parsing and execution
 */

const COMMANDS = {
  // Scraping commands
  scrape: async (args) => {
    if (args.length === 0) {
      return { output: 'Usage: scrape <url>', type: 'error' };
    }
    const url = args[0];
    try {
      const result = await api.initiateScrape(url);
      return { 
        output: `Scrape job initiated: ${result.job_id}\nStatus: ${result.status}`,
        type: 'success'
      };
    } catch (error) {
      return { output: `Scrape failed: ${error.message}`, type: 'error' };
    }
  },

  // Analysis commands
  analyze: async (args) => {
    if (args.length === 0) {
      return { output: 'Usage: analyze <article_id> [type]', type: 'error' };
    }
    const [articleId, analysisType = 'full'] = args;
    try {
      const result = await api.analyzeArticle(articleId, analysisType);
      return { 
        output: `Analysis job initiated: ${result.job_id}\nType: ${analysisType}`,
        type: 'success'
      };
    } catch (error) {
      return { output: `Analysis failed: ${error.message}`, type: 'error' };
    }
  },

  // Prediction commands
  predict: async (args) => {
    if (args.length === 0) {
      return { output: 'Usage: predict <dataset_id> [model]', type: 'error' };
    }
    const [datasetId, model = 'markov'] = args;
    try {
      const result = await api.generatePredictions(datasetId, model);
      return { 
        output: `Prediction job initiated: ${result.job_id}\nModel: ${model}`,
        type: 'success'
      };
    } catch (error) {
      return { output: `Prediction failed: ${error.message}`, type: 'error' };
    }
  },

  // List commands
  list: async (args) => {
    const [resource = 'articles'] = args;
    try {
      let result;
      switch (resource) {
        case 'articles':
          result = await api.getArticles({ limit: 10 });
          break;
        case 'jobs':
          result = await api.getJobs();
          break;
        default:
          return { output: `Unknown resource: ${resource}`, type: 'error' };
      }
      return { 
        output: JSON.stringify(result, null, 2),
        type: 'info'
      };
    } catch (error) {
      return { output: `List failed: ${error.message}`, type: 'error' };
    }
  },

  // Stats command
  stats: async () => {
    try {
      const stats = await api.getStats();
      return { 
        output: JSON.stringify(stats, null, 2),
        type: 'info'
      };
    } catch (error) {
      return { output: `Failed to fetch stats: ${error.message}`, type: 'error' };
    }
  },

  // Help command
  help: () => {
    const helpText = `
Available Commands:
  scrape <url>              - Scrape a webpage
  analyze <id> [type]       - Analyze an article (types: full, sentiment, entities)
  predict <id> [model]      - Generate predictions (models: markov, timeseries)
  list <resource>           - List resources (articles, jobs)
  stats                     - Show system statistics
  clear                     - Clear terminal
  help                      - Show this help message
    `.trim();
    return { output: helpText, type: 'info' };
  },

  // Clear command (handled by terminal component)
  clear: () => {
    return { output: '', type: 'clear' };
  },
};

/**
 * Execute a terminal command
 */
export async function executeTerminalCommand(commandString, context = {}) {
  const parts = commandString.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (!command) {
    return { output: '', type: 'info' };
  }

  if (command in COMMANDS) {
    return await COMMANDS[command](args, context);
  }

  return { 
    output: `Command not found: ${command}\nType 'help' for available commands.`,
    type: 'error'
  };
}

export default executeTerminalCommand;
