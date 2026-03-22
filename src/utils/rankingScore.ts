interface RankingInput {
  avgRating: number; // 0–5
  completionRate: number; // 0–100
  disputeRate: number; // 0–100
  totalOrders: number;
  isFeatured: boolean;
}

/**
 * Calculates a seller's service rank score.
 * Higher = ranked higher in marketplace listings.
 *
 * Formula weights:
 *  - Rating:          40%
 *  - Completion rate: 30%
 *  - Low dispute:     20%
 *  - Order volume:    10% (log scale, capped)
 *  - Featured boost:  flat +20
 */
export const calculateRankScore = (input: RankingInput): number => {
  const ratingScore = (input.avgRating / 5) * 40;
  const completionScore = (input.completionRate / 100) * 30;
  const disputeScore = ((100 - input.disputeRate) / 100) * 20;
  const volumeScore = Math.min(Math.log10(input.totalOrders + 1) * 5, 10);
  const featuredBoost = input.isFeatured ? 20 : 0;

  return Math.round(ratingScore + completionScore + disputeScore + volumeScore + featuredBoost);
};
