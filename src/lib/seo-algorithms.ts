/**
 * SEO Algorithms Library
 * Comprehensive mathematical formulas and scoring functions for SEO analysis
 */

// ============= CTR Calculations =============

/**
 * Base CTR benchmarks by position (industry averages)
 */
export const BASE_CTR_BY_POSITION: { [key: number]: number } = {
  1: 0.316,
  2: 0.158,
  3: 0.108,
  4: 0.081,
  5: 0.066,
  6: 0.053,
  7: 0.044,
  8: 0.037,
  9: 0.032,
  10: 0.028,
};

/**
 * Get base CTR for a given position
 */
export function getBaseCTRByPosition(position: number): number {
  if (position <= 10 && BASE_CTR_BY_POSITION[Math.floor(position)]) {
    return BASE_CTR_BY_POSITION[Math.floor(position)];
  }
  // Exponential decay for positions > 10
  return 0.028 * Math.exp(-0.15 * (position - 10));
}

/**
 * Calculate expected CTR with SERP feature multipliers
 */
export function calculateExpectedCTR(
  position: number,
  serpFeatures?: string[]
): number {
  let baseCTR = getBaseCTRByPosition(position);
  
  if (!serpFeatures || serpFeatures.length === 0) {
    return baseCTR;
  }

  let multiplier = 1.0;

  // Positive multipliers (features you own)
  if (serpFeatures.includes('featured_snippet')) multiplier *= 1.25;
  if (serpFeatures.includes('sitelinks')) multiplier *= 1.15;
  if (serpFeatures.includes('optimal_title')) multiplier *= 1.10;
  if (serpFeatures.includes('numbers_in_title')) multiplier *= 1.08;
  if (serpFeatures.includes('emoji_in_title')) multiplier *= 1.05;

  // Negative multipliers (features that reduce CTR)
  if (serpFeatures.includes('featured_snippet_competitor')) multiplier *= 0.85;
  if (serpFeatures.includes('people_also_ask')) multiplier *= 0.95;
  if (serpFeatures.includes('local_pack')) multiplier *= 0.80;
  if (serpFeatures.includes('knowledge_panel')) multiplier *= 0.90;
  if (serpFeatures.includes('image_pack')) multiplier *= 0.93;
  if (serpFeatures.includes('video_carousel')) multiplier *= 0.92;
  if (serpFeatures.includes('shopping_results')) multiplier *= 0.88;
  if (serpFeatures.includes('top_stories')) multiplier *= 0.94;

  return baseCTR * multiplier;
}

/**
 * Calculate CTR gap and potential traffic gain
 */
export function calculateCTRGap(
  currentCTR: number,
  expectedCTR: number,
  impressions: number
): {
  gap: number;
  gapPercentage: number;
  potentialExtraClicks: number;
  improvementOpportunity: number;
} {
  const gap = expectedCTR - currentCTR;
  const gapPercentage = currentCTR > 0 ? (gap / currentCTR) * 100 : 0;
  const potentialExtraClicks = Math.round(impressions * gap);
  const improvementOpportunity = currentCTR > 0 ? (gap / currentCTR) * 100 : 0;

  return {
    gap,
    gapPercentage,
    potentialExtraClicks,
    improvementOpportunity,
  };
}

/**
 * Analyze CTR performance
 */
export function analyzeCtr(
  currentPosition: number,
  currentCTR: number,
  searchVolume: number,
  serpFeatures?: string[]
): {
  expectedCTR: number;
  ctrGap: number;
  potentialClicks: number;
  improvementOpportunity: number;
  status: 'excellent' | 'good' | 'needs_improvement';
} {
  const expectedCTR = calculateExpectedCTR(currentPosition, serpFeatures);
  const { gap, potentialExtraClicks, improvementOpportunity } = calculateCTRGap(
    currentCTR,
    expectedCTR,
    searchVolume
  );

  let status: 'excellent' | 'good' | 'needs_improvement' = 'good';
  if (currentCTR >= expectedCTR * 1.1) {
    status = 'excellent';
  } else if (currentCTR < expectedCTR * 0.8) {
    status = 'needs_improvement';
  }

  return {
    expectedCTR,
    ctrGap: gap,
    potentialClicks: potentialExtraClicks,
    improvementOpportunity,
    status,
  };
}

// ============= Keyword Difficulty =============

/**
 * Calculate keyword difficulty score
 */
export function calculateKeywordDifficulty(
  searchVolume: number,
  competitorMetrics?: {
    avgDomainAuthority?: number;
    avgBacklinks?: number;
    avgContentLength?: number;
    cpc?: number;
  }
): {
  difficulty: number;
  timeToRank: number;
  requiredBacklinks: number;
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
} {
  const metrics = {
    avgDomainAuthority: competitorMetrics?.avgDomainAuthority || 50,
    avgBacklinks: competitorMetrics?.avgBacklinks || 100,
    avgContentLength: competitorMetrics?.avgContentLength || 2000,
    cpc: competitorMetrics?.cpc || 1.0,
  };

  // Volume score (0-100)
  const volumeScore = Math.min(100, (searchVolume / 10000) * 100);

  // Commercial score (0-100)
  const commercialScore = Math.min(100, metrics.cpc * 20);

  // Authority score (0-100)
  const authorityScore = metrics.avgDomainAuthority;

  // Backlink score (0-100)
  const backlinkScore = Math.min(100, (metrics.avgBacklinks / 500) * 100);

  // Content score (0-100)
  const contentScore = Math.min(100, (metrics.avgContentLength / 5000) * 100);

  // Weighted difficulty formula
  const difficulty =
    volumeScore * 0.2 +
    commercialScore * 0.15 +
    authorityScore * 0.3 +
    backlinkScore * 0.25 +
    contentScore * 0.1;

  // Time to rank estimate (months)
  const timeToRank = Math.max(1, Math.round(difficulty / 10 + metrics.avgBacklinks / 50));

  // Required backlinks estimate
  const requiredBacklinks = Math.max(5, Math.round(metrics.avgBacklinks * 0.8));

  // Competition level
  let competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
  if (difficulty < 30) competitionLevel = 'low';
  else if (difficulty < 50) competitionLevel = 'medium';
  else if (difficulty < 70) competitionLevel = 'high';
  else competitionLevel = 'very_high';

  return {
    difficulty: Math.round(difficulty),
    timeToRank,
    requiredBacklinks,
    competitionLevel,
  };
}

// ============= Performance Scoring =============

/**
 * Calculate page performance score (0-100)
 */
export function calculatePagePerformanceScore(
  clicks: number,
  impressions: number,
  ctr: number,
  position: number
): number {
  // Position score (better position = higher score)
  const positionScore = Math.max(0, 100 - position * 5);

  // CTR score
  const ctrScore = Math.min(100, ctr * 100 * 5);

  // Click score
  const clickScore = Math.min(100, (clicks / 10) * 2);

  // Weighted formula
  const score = positionScore * 0.4 + ctrScore * 0.4 + clickScore * 0.2;

  return Math.round(score);
}

/**
 * Calculate priority score for actions
 */
export function calculatePriorityScore(
  impact: number,
  value: number,
  effort: number,
  confidence: number
): number {
  return Math.round(((impact * value) / effort) * confidence);
}

// ============= Cannibalization Detection =============

interface PageMetrics {
  url: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

/**
 * Calculate weighted position variance
 */
export function calculateWeightedPositionVariance(pages: PageMetrics[]): number {
  const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
  
  if (totalImpressions === 0) return 0;

  // Calculate weighted average position
  const weightedAvgPosition = pages.reduce(
    (sum, p) => sum + p.position * (p.impressions / totalImpressions),
    0
  );

  // Calculate weighted variance
  const variance = pages.reduce(
    (sum, p) =>
      sum +
      Math.pow(p.position - weightedAvgPosition, 2) * (p.impressions / totalImpressions),
    0
  );

  return variance;
}

/**
 * Calculate cannibalization score
 */
export function calculateCannibalizationScore(
  pages: PageMetrics[],
  query: string
): {
  score: number;
  variance: number;
  severity: 'mild' | 'moderate' | 'severe';
} {
  const n = pages.length;
  const variance = calculateWeightedPositionVariance(pages);
  const score = (n - 1) * (1 + variance / 10);

  let severity: 'mild' | 'moderate' | 'severe';
  if (score < 5) severity = 'mild';
  else if (score < 10) severity = 'moderate';
  else severity = 'severe';

  return { score, variance, severity };
}

/**
 * Select primary candidate for consolidation
 */
export function selectPrimaryCandidate(pages: PageMetrics[]): {
  primaryPage: PageMetrics;
  supportingPages: PageMetrics[];
} {
  if (pages.length === 0) {
    throw new Error('No pages provided');
  }

  const maxImpressions = Math.max(...pages.map((p) => p.impressions));
  const maxClicks = Math.max(...pages.map((p) => p.clicks));
  const minPosition = Math.min(...pages.map((p) => p.position));

  // Score each page
  const scoredPages = pages.map((page) => ({
    page,
    score:
      0.5 * (page.impressions / maxImpressions) +
      0.7 * (page.clicks / maxClicks) +
      0.6 * (minPosition / page.position),
  }));

  // Sort by score descending
  scoredPages.sort((a, b) => b.score - a.score);

  return {
    primaryPage: scoredPages[0].page,
    supportingPages: scoredPages.slice(1).map((sp) => sp.page),
  };
}

/**
 * Calculate consolidation opportunity score
 */
export function calculateConsolidationScore(
  pageCount: number,
  totalImpressions: number,
  avgPosition: number,
  difficulty: number
): number {
  const pageCountScore = Math.min(100, pageCount * 20) * 0.35;
  const impressionsScore = Math.min(100, (totalImpressions / 1000) * 25) * 0.3;
  const positionScore = Math.max(0, (avgPosition / 20) * 50) * 0.2;
  const difficultyScore = (100 - difficulty) * 0.15 * 0.15;

  return Math.round(pageCountScore + impressionsScore + positionScore + difficultyScore);
}

// ============= Content Quality Analysis =============

/**
 * Calculate Flesch Reading Ease score
 */
export function calculateFleschScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0).length;
  const syllables = text
    .split(/\s+/)
    .reduce((sum, word) => sum + countSyllables(word), 0);

  if (words === 0 || sentences === 0) return 0;

  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Analyze content quality
 */
export function analyzeContentQuality(
  content: string,
  metadata?: {
    imageCount?: number;
    videoCount?: number;
    internalLinks?: number;
    externalLinks?: number;
    headingCount?: number;
    targetKeyword?: string;
  }
): {
  overallScore: number;
  lengthScore: number;
  keywordScore: number;
  readabilityScore: number;
  mediaScore: number;
  internalLinksScore: number;
  externalLinksScore: number;
  vocabularyScore: number;
  headingScore: number;
} {
  const words = content.split(/\s+/).filter((w) => w.trim().length > 0);
  const wordCount = words.length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;

  // Length score (optimal: 1500-2500 words)
  let lengthScore: number;
  if (wordCount < 300) lengthScore = 20;
  else if (wordCount < 500) lengthScore = 40;
  else if (wordCount < 1000) lengthScore = 60;
  else if (wordCount >= 1500 && wordCount <= 2500) lengthScore = 100;
  else if (wordCount < 1500) lengthScore = 80;
  else if (wordCount > 10000) lengthScore = 60;
  else lengthScore = 90;

  // Keyword score (optimal density: 1-2%)
  let keywordScore = 70; // default if no keyword provided
  if (metadata?.targetKeyword) {
    const keywordCount = content
      .toLowerCase()
      .split(metadata.targetKeyword.toLowerCase()).length - 1;
    const density = (keywordCount / wordCount) * 100;
    if (density < 0.5) keywordScore = 30;
    else if (density >= 1 && density <= 2) keywordScore = 100;
    else if (density > 4) keywordScore = 40;
    else keywordScore = 70;
  }

  // Readability score
  const readabilityScore = calculateFleschScore(content);

  // Media score
  const imageCount = metadata?.imageCount || 0;
  const videoCount = metadata?.videoCount || 0;
  const optimalImages = Math.ceil(wordCount / 300);
  let mediaScore = Math.min(100, (imageCount / optimalImages) * 100);
  mediaScore += Math.min(30, videoCount * 15); // Bonus for videos

  // Internal links score
  const internalLinks = metadata?.internalLinks || 0;
  const optimalInternalLinks = Math.ceil(wordCount / 200);
  const internalLinksScore = Math.min(100, (internalLinks / optimalInternalLinks) * 100);

  // External links score
  const externalLinks = metadata?.externalLinks || 0;
  const externalLinksScore = Math.min(100, externalLinks * 10);

  // Vocabulary diversity
  const vocabularyScore = Math.min(100, (uniqueWords / wordCount) * 150);

  // Heading structure score
  const headingCount = metadata?.headingCount || 0;
  const headingScore = Math.min(100, headingCount * 10);

  // Overall weighted score
  const overallScore =
    lengthScore * 0.25 +
    keywordScore * 0.2 +
    readabilityScore * 0.15 +
    mediaScore * 0.15 +
    internalLinksScore * 0.1 +
    externalLinksScore * 0.05 +
    vocabularyScore * 0.05 +
    headingScore * 0.05;

  return {
    overallScore: Math.round(overallScore),
    lengthScore: Math.round(lengthScore),
    keywordScore: Math.round(keywordScore),
    readabilityScore: Math.round(readabilityScore),
    mediaScore: Math.round(mediaScore),
    internalLinksScore: Math.round(internalLinksScore),
    externalLinksScore: Math.round(externalLinksScore),
    vocabularyScore: Math.round(vocabularyScore),
    headingScore: Math.round(headingScore),
  };
}

// ============= Clustering Algorithms =============

/**
 * Generate n-grams from text
 */
export function generateNGrams(text: string, n: number): string[] {
  const normalized = text.toLowerCase();
  const ngrams: string[] = [];

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.substring(i, i + n));
  }

  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
export function calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Calculate combined n-gram similarity
 */
export function calculateCombinedNGramSimilarity(text1: string, text2: string): number {
  // Bigrams (most important for short strings)
  const bigrams1 = new Set(generateNGrams(text1, 2));
  const bigrams2 = new Set(generateNGrams(text2, 2));
  const bigramSimilarity = calculateJaccardSimilarity(bigrams1, bigrams2);

  // Trigrams
  const trigrams1 = new Set(generateNGrams(text1, 3));
  const trigrams2 = new Set(generateNGrams(text2, 3));
  const trigramSimilarity = calculateJaccardSimilarity(trigrams1, trigrams2);

  // Fourgrams
  const fourgrams1 = new Set(generateNGrams(text1, 4));
  const fourgrams2 = new Set(generateNGrams(text2, 4));
  const fourgramSimilarity = calculateJaccardSimilarity(fourgrams1, fourgrams2);

  // Weighted combination (prefer bigrams for better matching)
  return bigramSimilarity * 0.5 + trigramSimilarity * 0.3 + fourgramSimilarity * 0.2;
}

/**
 * Classify search intent
 */
export function classifySearchIntent(
  keyword: string
): 'transactional' | 'commercial' | 'navigational' | 'informational' {
  const lower = keyword.toLowerCase();

  // Transactional patterns
  const transactional = [
    'buy',
    'purchase',
    'order',
    'shop',
    'cart',
    'checkout',
    'discount',
    'coupon',
    'deal',
    'price',
    'cheap',
    'affordable',
    'subscribe',
    'download',
    'free trial',
  ];

  // Commercial patterns
  const commercial = [
    'best',
    'top',
    'review',
    'comparison',
    'vs',
    'versus',
    'alternative',
    'compare',
    'recommended',
    'rating',
  ];

  // Navigational patterns
  const navigational = [
    'login',
    'sign in',
    'account',
    'dashboard',
    'portal',
    'official',
    'website',
    'homepage',
  ];

  if (transactional.some((t) => lower.includes(t))) {
    return 'transactional';
  }

  if (commercial.some((c) => lower.includes(c))) {
    return 'commercial';
  }

  if (navigational.some((n) => lower.includes(n))) {
    return 'navigational';
  }

  return 'informational';
}

// ============= Link Opportunity Scoring =============

/**
 * Calculate link opportunity score
 */
export function calculateLinkOpportunityScore(
  donorAuthority: number,
  topicalOverlap: number,
  targetNeed: number
): number {
  // donorAuthority: 0-1 (normalized from backlinks/domain authority)
  // topicalOverlap: 0-1 (Jaccard similarity of shared keywords)
  // targetNeed: 0-1 (normalized CTR gap)

  const score = donorAuthority * 0.5 + topicalOverlap * 0.3 + targetNeed * 0.2;

  return Math.round(score * 100);
}

/**
 * Calculate topical overlap between two sets of keywords
 */
export function calculateTopicalOverlap(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
  const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

  return calculateJaccardSimilarity(set1, set2);
}
