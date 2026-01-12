// Contract Equivalence Verification System
// Determines if Polymarket and Kalshi markets are economically identical
// This is THE critical check before any cross-venue arbitrage

/**
 * Equivalence verification result structure
 */
const EQUIVALENCE_RESULT = {
  IDENTICAL: 'IDENTICAL',           // Safe for arbitrage
  SIMILAR: 'SIMILAR',               // Needs manual review
  DIFFERENT: 'DIFFERENT',           // Do not arbitrage
  UNKNOWN: 'UNKNOWN',               // Cannot determine
};

/**
 * Risk factors that reduce equivalence confidence
 */
const RISK_FACTORS = {
  WORDING_MISMATCH: { weight: 30, description: 'Event wording differs significantly' },
  SETTLEMENT_SOURCE_MISMATCH: { weight: 40, description: 'Different settlement sources/oracles' },
  TIME_CUTOFF_MISMATCH: { weight: 50, description: 'Different time cutoffs or timezones' },
  OUTCOME_DEFINITION_MISMATCH: { weight: 35, description: 'Outcome definitions differ' },
  EDGE_CASE_HANDLING_MISMATCH: { weight: 25, description: 'Edge cases handled differently' },
  VOID_RULES_MISMATCH: { weight: 20, description: 'Different void/cancel conditions' },
  DISPUTE_MECHANISM_MISMATCH: { weight: 15, description: 'Different dispute processes' },
  RESOLUTION_TIMING_MISMATCH: { weight: 20, description: 'Settlement timing differs significantly' },
};

/**
 * Known market mappings (manually verified)
 * These are pairs that have been human-audited for equivalence
 */
const VERIFIED_MAPPINGS = new Map([
  // Example format - these need to be populated with actual verified pairs
  // ['polymarket_market_id', { kalshiTicker: 'KALSHI_TICKER', equivalence: 'IDENTICAL', verifiedAt: '2024-01-01', notes: '' }],
]);

/**
 * Text similarity using Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate text similarity (0-1)
 */
function textSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLen);
}

/**
 * Extract key terms from market question
 */
function extractKeyTerms(question) {
  if (!question) return [];

  // Remove common words
  const stopWords = new Set([
    'will', 'the', 'a', 'an', 'be', 'by', 'on', 'in', 'at', 'to', 'of', 'for',
    'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did',
    'this', 'that', 'these', 'those', 'and', 'or', 'but', 'if', 'then',
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Parse date/time from text
 */
function parseTimeReference(text) {
  if (!text) return null;

  const patterns = [
    // ISO dates
    /(\d{4}-\d{2}-\d{2})/,
    // Month Day, Year
    /(\w+ \d{1,2},? \d{4})/i,
    // End of year
    /end of (\d{4})|eoy (\d{4})|by (\d{4})/i,
    // Specific times
    /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*(?:et|pt|utc|gmt)?/i,
    // Before/by date
    /(?:before|by)\s+(\w+ \d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        raw: match[0],
        parsed: match[1] || match[2] || match[3],
      };
    }
  }

  return null;
}

/**
 * Check if two time references are equivalent
 */
function areTimesEquivalent(time1, time2) {
  if (!time1 || !time2) return { equivalent: false, confidence: 0 };

  // Both null means potentially equivalent (no time constraint)
  if (!time1.raw && !time2.raw) {
    return { equivalent: true, confidence: 0.5, note: 'No time references found' };
  }

  // One has time, other doesn't
  if (!time1.raw || !time2.raw) {
    return { equivalent: false, confidence: 0.3, note: 'Time reference missing from one market' };
  }

  // Direct comparison
  const similarity = textSimilarity(time1.raw, time2.raw);
  if (similarity > 0.9) {
    return { equivalent: true, confidence: 0.95 };
  }

  // Check for timezone mismatches (CRITICAL)
  const tz1 = time1.raw.match(/et|pt|utc|gmt|est|pst/i)?.[0]?.toLowerCase();
  const tz2 = time2.raw.match(/et|pt|utc|gmt|est|pst/i)?.[0]?.toLowerCase();

  if (tz1 && tz2 && tz1 !== tz2) {
    return {
      equivalent: false,
      confidence: 0.9,
      note: `TIMEZONE MISMATCH: ${tz1} vs ${tz2}`,
      critical: true,
    };
  }

  return {
    equivalent: similarity > 0.7,
    confidence: similarity,
  };
}

/**
 * Compare settlement sources
 */
function compareSettlementSources(poly, kalshi) {
  const polySource = poly.resolution_source || poly._raw?.resolutionSource || '';
  const kalshiSource = kalshi.settlement?.source || kalshi._raw?.settlement_source_url || '';

  if (!polySource && !kalshiSource) {
    return { match: false, confidence: 0.3, note: 'No settlement sources specified' };
  }

  // Polymarket uses UMA oracle
  const polyUsesUMA = polySource.toLowerCase().includes('uma') ||
    poly._raw?.enableOrderBook === true;  // CLOB markets use UMA

  // Check for common authoritative sources
  const authoritativeSources = [
    'associated press', 'ap news',
    'reuters',
    'official', 'government',
    'sec.gov', 'whitehouse.gov',
  ];

  const polyHasAuthoritative = authoritativeSources.some(s =>
    polySource.toLowerCase().includes(s)
  );
  const kalshiHasAuthoritative = authoritativeSources.some(s =>
    kalshiSource.toLowerCase().includes(s)
  );

  if (polyHasAuthoritative && kalshiHasAuthoritative) {
    const similarity = textSimilarity(polySource, kalshiSource);
    return {
      match: similarity > 0.5,
      confidence: similarity,
      note: 'Both use authoritative sources',
    };
  }

  return {
    match: false,
    confidence: 0.4,
    note: `Different settlement mechanisms: Polymarket (${polyUsesUMA ? 'UMA Oracle' : 'Unknown'}) vs Kalshi (${kalshiSource || 'Official'})`,
    polySource,
    kalshiSource,
  };
}

/**
 * Main equivalence verification function
 */
export function verifyEquivalence(polyMarket, kalshiMarket) {
  const result = {
    polymarketId: polyMarket.id,
    kalshiTicker: kalshiMarket.ticker,
    equivalence: EQUIVALENCE_RESULT.UNKNOWN,
    confidence: 0,
    riskScore: 0,
    risks: [],
    details: {},
    recommendation: '',
    timestamp: Date.now(),
  };

  // Check if already verified
  const verified = VERIFIED_MAPPINGS.get(polyMarket.id);
  if (verified && verified.kalshiTicker === kalshiMarket.ticker) {
    return {
      ...result,
      equivalence: verified.equivalence,
      confidence: 1.0,
      verified: true,
      verifiedAt: verified.verifiedAt,
      notes: verified.notes,
    };
  }

  // 1. Question/Title similarity
  const questionSimilarity = textSimilarity(
    polyMarket.question,
    kalshiMarket.question
  );
  result.details.questionSimilarity = questionSimilarity;

  if (questionSimilarity < 0.5) {
    result.risks.push({
      ...RISK_FACTORS.WORDING_MISMATCH,
      detail: `Question similarity: ${(questionSimilarity * 100).toFixed(1)}%`,
    });
    result.riskScore += RISK_FACTORS.WORDING_MISMATCH.weight;
  }

  // 2. Key terms comparison
  const polyTerms = new Set(extractKeyTerms(polyMarket.question));
  const kalshiTerms = new Set(extractKeyTerms(kalshiMarket.question));
  const commonTerms = [...polyTerms].filter(t => kalshiTerms.has(t));
  const termOverlap = commonTerms.length / Math.max(polyTerms.size, kalshiTerms.size, 1);
  result.details.keyTermOverlap = termOverlap;
  result.details.commonTerms = commonTerms;

  // 3. Time cutoff comparison
  const polyTime = parseTimeReference(polyMarket.question + ' ' + (polyMarket.end_date || ''));
  const kalshiTime = parseTimeReference(kalshiMarket.question + ' ' + (kalshiMarket.end_date || ''));
  const timeComparison = areTimesEquivalent(polyTime, kalshiTime);
  result.details.timeComparison = timeComparison;

  if (!timeComparison.equivalent) {
    result.risks.push({
      ...RISK_FACTORS.TIME_CUTOFF_MISMATCH,
      detail: timeComparison.note || 'Time references do not match',
      critical: timeComparison.critical,
    });
    result.riskScore += RISK_FACTORS.TIME_CUTOFF_MISMATCH.weight;
  }

  // 4. Settlement source comparison
  const settlementComparison = compareSettlementSources(polyMarket, kalshiMarket);
  result.details.settlementComparison = settlementComparison;

  if (!settlementComparison.match) {
    result.risks.push({
      ...RISK_FACTORS.SETTLEMENT_SOURCE_MISMATCH,
      detail: settlementComparison.note,
    });
    result.riskScore += RISK_FACTORS.SETTLEMENT_SOURCE_MISMATCH.weight;
  }

  // 5. End date comparison
  const polyEnd = polyMarket.end_date ? new Date(polyMarket.end_date) : null;
  const kalshiEnd = kalshiMarket.end_date ? new Date(kalshiMarket.end_date) : null;

  if (polyEnd && kalshiEnd) {
    const timeDiffHours = Math.abs(polyEnd - kalshiEnd) / (1000 * 60 * 60);
    result.details.endDateDiffHours = timeDiffHours;

    if (timeDiffHours > 24) {
      result.risks.push({
        ...RISK_FACTORS.RESOLUTION_TIMING_MISMATCH,
        detail: `End dates differ by ${timeDiffHours.toFixed(1)} hours`,
        critical: timeDiffHours > 48,
      });
      result.riskScore += RISK_FACTORS.RESOLUTION_TIMING_MISMATCH.weight;
    }
  }

  // 6. Check for Polymarket UMA dispute risk
  // UMA has 2-hour dispute window, can extend to 48+ hours
  result.details.polymarketDisputeRisk = {
    usesUMA: true,  // All Polymarket CLOB markets use UMA
    minDisputeWindow: 2 * 60 * 60 * 1000,  // 2 hours in ms
    maxDisputeWindow: 96 * 60 * 60 * 1000, // 96 hours if escalated to DVM
    note: 'Polymarket uses UMA optimistic oracle with 2hr+ dispute window',
  };

  // Calculate overall confidence
  const baseConfidence = (questionSimilarity * 0.3) +
    (termOverlap * 0.2) +
    (timeComparison.confidence * 0.25) +
    (settlementComparison.confidence * 0.25);

  // Reduce confidence based on risk score
  const riskPenalty = Math.min(result.riskScore / 100, 0.5);
  result.confidence = Math.max(0, baseConfidence - riskPenalty);

  // Determine equivalence level
  const hasCriticalRisk = result.risks.some(r => r.critical);

  if (hasCriticalRisk) {
    result.equivalence = EQUIVALENCE_RESULT.DIFFERENT;
    result.recommendation = 'DO NOT ARBITRAGE - Critical risk identified';
  } else if (result.confidence >= 0.8 && result.riskScore < 30) {
    result.equivalence = EQUIVALENCE_RESULT.IDENTICAL;
    result.recommendation = 'Safe for arbitrage with standard precautions';
  } else if (result.confidence >= 0.6 && result.riskScore < 50) {
    result.equivalence = EQUIVALENCE_RESULT.SIMILAR;
    result.recommendation = 'MANUAL REVIEW REQUIRED before arbitrage';
  } else {
    result.equivalence = EQUIVALENCE_RESULT.DIFFERENT;
    result.recommendation = 'DO NOT ARBITRAGE - Markets may not be equivalent';
  }

  // Calculate basis risk (worst case loss from mismatch)
  result.basisRisk = calculateBasisRisk(result);

  return result;
}

/**
 * Calculate potential basis risk (loss from resolution mismatch)
 */
function calculateBasisRisk(equivalenceResult) {
  const { riskScore, confidence, risks } = equivalenceResult;

  // Base probability of mismatch
  let mismatchProbability = (100 - confidence * 100) / 100;

  // Increase for specific risks
  if (risks.some(r => r.description.includes('timezone'))) {
    mismatchProbability += 0.1;
  }
  if (risks.some(r => r.description.includes('settlement'))) {
    mismatchProbability += 0.05;
  }

  mismatchProbability = Math.min(mismatchProbability, 0.5);

  return {
    mismatchProbability,
    worstCaseLossPercent: 100,  // Can lose 100% of position on one leg
    expectedLossPercent: mismatchProbability * 100,
    recommendation: mismatchProbability > 0.1
      ? 'Consider reducing position size or avoiding this pair'
      : 'Acceptable basis risk for small positions',
  };
}

/**
 * Find potential matching markets between platforms
 */
export function findPotentialMatches(polymarkets, kalshiMarkets) {
  const matches = [];

  for (const poly of polymarkets) {
    const polyTerms = new Set(extractKeyTerms(poly.question));

    for (const kalshi of kalshiMarkets) {
      const kalshiTerms = new Set(extractKeyTerms(kalshi.question));

      // Quick filter: need at least 2 common key terms
      const commonTerms = [...polyTerms].filter(t => kalshiTerms.has(t));
      if (commonTerms.length < 2) continue;

      // More detailed check
      const similarity = textSimilarity(poly.question, kalshi.question);
      if (similarity < 0.3) continue;

      matches.push({
        polymarket: poly,
        kalshi: kalshi,
        similarity,
        commonTerms,
      });
    }
  }

  // Sort by similarity
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches;
}

/**
 * Add a verified mapping (for manual verification)
 */
export function addVerifiedMapping(polymarketId, kalshiTicker, equivalence, notes = '') {
  VERIFIED_MAPPINGS.set(polymarketId, {
    kalshiTicker,
    equivalence,
    verifiedAt: new Date().toISOString(),
    notes,
  });
}

/**
 * Get all verified mappings
 */
export function getVerifiedMappings() {
  return Array.from(VERIFIED_MAPPINGS.entries()).map(([polyId, data]) => ({
    polymarketId: polyId,
    ...data,
  }));
}

/**
 * Export verification report for a market pair
 */
export function generateVerificationReport(equivalenceResult) {
  const { equivalence, confidence, risks, details, recommendation, basisRisk } = equivalenceResult;

  return `
CONTRACT EQUIVALENCE VERIFICATION REPORT
========================================
Polymarket: ${equivalenceResult.polymarketId}
Kalshi:     ${equivalenceResult.kalshiTicker}

VERDICT: ${equivalence}
Confidence: ${(confidence * 100).toFixed(1)}%
Risk Score: ${equivalenceResult.riskScore}/100

RECOMMENDATION: ${recommendation}

RISK FACTORS:
${risks.length === 0 ? '  None identified' : risks.map(r =>
    `  - [${r.critical ? 'CRITICAL' : 'WARNING'}] ${r.description}\n    ${r.detail}`
  ).join('\n')}

BASIS RISK:
  Mismatch Probability: ${(basisRisk.mismatchProbability * 100).toFixed(1)}%
  Worst Case Loss: ${basisRisk.worstCaseLossPercent}%
  Expected Loss: ${basisRisk.expectedLossPercent.toFixed(2)}%
  ${basisRisk.recommendation}

DETAILS:
  Question Similarity: ${(details.questionSimilarity * 100).toFixed(1)}%
  Key Term Overlap: ${(details.keyTermOverlap * 100).toFixed(1)}%
  Common Terms: ${details.commonTerms?.join(', ') || 'None'}
  Time Comparison: ${details.timeComparison?.note || 'N/A'}
  Settlement Sources: ${details.settlementComparison?.note || 'N/A'}
  End Date Diff: ${details.endDateDiffHours?.toFixed(1) || 'N/A'} hours

DISPUTE RISK (Polymarket):
  Uses UMA Oracle: Yes
  Min Dispute Window: 2 hours
  Max Dispute Window: 96 hours (if escalated)

Generated: ${new Date().toISOString()}
========================================
  `.trim();
}

export const ContractEquivalence = {
  verifyEquivalence,
  findPotentialMatches,
  addVerifiedMapping,
  getVerifiedMappings,
  generateVerificationReport,
  EQUIVALENCE_RESULT,
  RISK_FACTORS,
};

export default ContractEquivalence;
