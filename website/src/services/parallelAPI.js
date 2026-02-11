/**
 * Leet Terminal — Deep Research Engine
 *
 * Proprietary research layer for prediction market intelligence.
 * Performs deep web research, fact-checking, and structured analysis.
 */

import { getCached, setCache, waitForRateLimit } from '../utils/apiCache';
import { sanitizeText } from '../utils/sanitize';

const RESEARCH_API = 'https://api.parallel.ai/v1';
const API_KEY = import.meta.env.VITE_RESEARCH_API_KEY || import.meta.env.VITE_PARALLEL_API_KEY || '';

// Cache TTLs
const CACHE_TTL = {
  RESEARCH: 10 * 60 * 1000,  // 10 minutes for research results
  QUICK: 5 * 60 * 1000,      // 5 minutes for quick queries
};

// Research depth levels
const DEPTH = {
  QUICK: 'base',
  STANDARD: 'standard',
  DEEP: 'deep',
};

/**
 * Check if the research engine is configured
 */
export function isResearchConfigured() {
  return !!API_KEY;
}

/**
 * Execute a research task
 * @param {string} input - The research query/task
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Research results with citations
 */
async function runTask(input, options = {}) {
  if (!API_KEY) {
    throw new Error('Research engine not configured. Add VITE_RESEARCH_API_KEY to .env');
  }

  const {
    processor = DEPTH.STANDARD,
    outputSchema = null,
    cacheKey = null,
    cacheTtl = CACHE_TTL.RESEARCH,
  } = options;

  // Check cache
  const fullCacheKey = cacheKey || `research:${processor}:${input.slice(0, 100)}`;
  const cached = getCached(fullCacheKey);
  if (cached !== null) {
    return { ...cached, _cached: true };
  }

  // Rate limit
  await waitForRateLimit('research', 1000);

  // Build request body
  const body = {
    processor,
    input,
  };

  if (outputSchema) {
    body.task_spec = {
      output_schema: {
        type: 'json',
        json_schema: outputSchema,
      },
    };
  }

  try {
    const response = await fetch(`${RESEARCH_API}/tasks/runs`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Research engine error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Transform response
    const result = {
      id: data.id,
      status: data.status,
      output: data.output,
      citations: data.citations || data.basis || [],
      confidence: data.confidence,
      processor,
      completedAt: new Date().toISOString(),
    };

    // Cache successful response
    setCache(fullCacheKey, result, cacheTtl);

    return result;
  } catch (error) {
    console.error('Research engine error:', error.message);
    throw error;
  }
}

/**
 * Research a prediction market topic
 * @param {object} market - Market object with question/title
 * @returns {Promise<object>} Research findings
 */
export async function researchMarket(market) {
  if (!market?.question && !market?.title) {
    throw new Error('Market must have a question or title');
  }

  const question = market.question || market.title;
  const category = market.category || 'general';

  const input = `
Research the following prediction market question and provide analysis:

QUESTION: ${question}

Please research and analyze:
1. Current factual status - What is the latest verified information about this topic?
2. Key factors - What events, decisions, or factors will determine the outcome?
3. Recent developments - Any news from the past 7 days relevant to this question?
4. Expert opinions - What do credible sources/experts say about the likely outcome?
5. Historical context - Similar past events and their outcomes
6. Risk factors - What could cause unexpected outcomes?

Category context: ${category}
${market.end_date ? `Resolution date: ${market.end_date}` : ''}
${market.resolution_source ? `Resolution source: ${market.resolution_source}` : ''}
  `.trim();

  const outputSchema = {
    type: 'object',
    properties: {
      current_status: {
        type: 'string',
        description: 'Current factual status and latest verified information',
      },
      key_factors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key factors that will determine the outcome',
      },
      recent_news: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            date: { type: 'string' },
            source: { type: 'string' },
            relevance: { type: 'string' },
          },
        },
        description: 'Recent relevant news items',
      },
      probability_assessment: {
        type: 'object',
        properties: {
          estimated_probability: { type: 'number', description: 'Estimated probability 0-1' },
          confidence: { type: 'string', description: 'low/medium/high' },
          reasoning: { type: 'string' },
        },
      },
      risk_factors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Factors that could cause unexpected outcomes',
      },
      summary: {
        type: 'string',
        description: 'Executive summary of the research findings',
      },
    },
    required: ['current_status', 'key_factors', 'summary'],
  };

  const result = await runTask(input, {
    processor: DEPTH.DEEP,
    outputSchema,
    cacheKey: `research:market:${market.id}`,
    cacheTtl: CACHE_TTL.RESEARCH,
  });

  return {
    ...result,
    marketId: market.id,
    marketTicker: market.ticker,
  };
}

/**
 * Quick fact-check a claim related to a market
 * @param {string} claim - The claim to verify
 * @returns {Promise<object>} Verification result
 */
export async function factCheck(claim) {
  const input = `
Fact-check the following claim. Determine if it is true, false, or unverifiable based on current available evidence.

CLAIM: ${claim}

Provide:
1. Verdict (true/false/partially true/unverifiable)
2. Evidence supporting or refuting the claim
3. Sources for the evidence
  `.trim();

  const outputSchema = {
    type: 'object',
    properties: {
      verdict: {
        type: 'string',
        enum: ['true', 'false', 'partially_true', 'unverifiable'],
        description: 'The fact-check verdict',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in verdict 0-1',
      },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fact: { type: 'string' },
            source: { type: 'string' },
            supports_claim: { type: 'boolean' },
          },
        },
      },
      explanation: {
        type: 'string',
        description: 'Explanation of the verdict',
      },
    },
    required: ['verdict', 'explanation'],
  };

  return runTask(input, {
    processor: DEPTH.STANDARD,
    outputSchema,
    cacheTtl: CACHE_TTL.QUICK,
  });
}

/**
 * Get latest news and developments for a topic
 * @param {string} topic - The topic to research
 * @param {number} days - Days to look back (default 7)
 * @returns {Promise<object>} News and developments
 */
export async function getLatestNews(topic, days = 7) {
  const input = `
Find the latest news and developments about: ${topic}

Time range: Past ${days} days
Focus on: Factual news from credible sources

For each news item provide:
- Headline
- Source name
- Publication date
- Brief summary
- Relevance to prediction markets (if applicable)
  `.trim();

  const outputSchema = {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      news_items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            source: { type: 'string' },
            date: { type: 'string' },
            summary: { type: 'string' },
            url: { type: 'string' },
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          },
        },
      },
      summary: {
        type: 'string',
        description: 'Overall summary of recent developments',
      },
    },
    required: ['news_items', 'summary'],
  };

  return runTask(input, {
    processor: DEPTH.STANDARD,
    outputSchema,
    cacheKey: `research:news:${topic.slice(0, 50)}:${days}d`,
    cacheTtl: CACHE_TTL.QUICK,
  });
}

/**
 * Research company/entity for market analysis
 * @param {string} entityName - Company or entity name
 * @returns {Promise<object>} Entity research
 */
export async function researchEntity(entityName) {
  const input = `
Research the following entity for prediction market analysis:

ENTITY: ${entityName}

Provide:
1. Overview - What is this entity and what do they do?
2. Recent news - Key developments in the past 30 days
3. Key metrics - Any relevant public metrics (stock price, market cap, user numbers, etc.)
4. Leadership - Key people and recent changes
5. Predictions/Outlook - Any forecasts or predictions about this entity
6. Controversies/Risks - Any ongoing issues or risks
  `.trim();

  const outputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: { type: 'string', description: 'company/person/organization/other' },
      overview: { type: 'string' },
      recent_news: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            date: { type: 'string' },
            significance: { type: 'string' },
          },
        },
      },
      key_metrics: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      leadership: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
      outlook: { type: 'string' },
      risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'overview'],
  };

  return runTask(input, {
    processor: DEPTH.DEEP,
    outputSchema,
    cacheKey: `research:entity:${entityName.toLowerCase().replace(/\s+/g, '_')}`,
    cacheTtl: CACHE_TTL.RESEARCH,
  });
}

/**
 * Compare multiple outcomes/scenarios
 * @param {string} question - The prediction market question
 * @param {string[]} outcomes - Possible outcomes to compare
 * @returns {Promise<object>} Comparison analysis
 */
export async function compareOutcomes(question, outcomes) {
  const input = `
Analyze the following prediction market question and compare the likelihood of each outcome:

QUESTION: ${question}

POSSIBLE OUTCOMES:
${outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

For each outcome, provide:
1. Estimated probability
2. Key factors favoring this outcome
3. Key factors against this outcome
4. Historical precedent (if any)
  `.trim();

  const outputSchema = {
    type: 'object',
    properties: {
      question: { type: 'string' },
      outcomes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            probability: { type: 'number' },
            factors_for: { type: 'array', items: { type: 'string' } },
            factors_against: { type: 'array', items: { type: 'string' } },
            precedent: { type: 'string' },
          },
        },
      },
      analysis: { type: 'string' },
      most_likely: { type: 'string' },
      confidence: { type: 'string' },
    },
    required: ['outcomes', 'analysis'],
  };

  return runTask(input, {
    processor: DEPTH.DEEP,
    outputSchema,
    cacheTtl: CACHE_TTL.RESEARCH,
  });
}

/**
 * Custom research query
 * @param {string} query - Free-form research query
 * @param {string} depth - Depth level (quick/standard/deep)
 * @returns {Promise<object>} Research results
 */
export async function customResearch(query, depth = 'standard') {
  const depthMap = {
    quick: DEPTH.QUICK,
    standard: DEPTH.STANDARD,
    deep: DEPTH.DEEP,
  };

  return runTask(query, {
    processor: depthMap[depth] || DEPTH.STANDARD,
    cacheTtl: depth === 'deep' ? CACHE_TTL.RESEARCH : CACHE_TTL.QUICK,
  });
}

// Export as Leet Research Engine
export const ResearchEngine = {
  isConfigured: isResearchConfigured,
  researchMarket,
  factCheck,
  getLatestNews,
  researchEntity,
  compareOutcomes,
  customResearch,
  DEPTH,
};

// Backwards compatibility
export const ParallelAPI = ResearchEngine;

export default ResearchEngine;
