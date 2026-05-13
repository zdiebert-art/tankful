/* ============================================
   GAS WATCH — Fill-Up Score Logic
   Pure functions, no DOM access.
   ============================================ */

const GW_Score = {

  /**
   * RBOB trend sub-score
   * +5%/5d => 90 (fill up); -5%/5d => 10 (wait); flat => 50
   */
  rbobScore(percentChange5d) {
    const p = percentChange5d;
    if (p >= 5) return 90;
    if (p <= -5) return 10;
    return 50 + (p * 8);
  },

  /**
   * WTI trend sub-score
   */
  wtiScore(percentChange5d) {
    const p = percentChange5d;
    if (p >= 7) return 85;
    if (p <= -7) return 15;
    return 50 + (p * 5);
  },

  /**
   * USD/CAD sub-score
   */
  fxScore(percentChange5d) {
    const p = percentChange5d;
    if (p >= 1.5) return 85;
    if (p <= -1.5) return 15;
    return 50 + (p * 23);
  },

  /**
   * Day-of-week heat — Kelowna sticky-step pattern
   */
  dowScore(dayOfWeek) {
    const heatTable = [60, 60, 70, 55, 80, 90, 65];
    return heatTable[dayOfWeek] ?? 50;
  },

  /**
   * Cycle age — days since last local reset
   */
  cycleAgeScore(daysSinceReset) {
    if (daysSinceReset <= 2) return 15;
    if (daysSinceReset <= 5) return 35;
    if (daysSinceReset <= 7) return 55;
    if (daysSinceReset <= 9) return 70;
    return 85;
  },

  /**
   * Position within recent (30-day) range
   */
  rangeScore(currentPrice, low, high) {
    if (high === low) return 50;
    const ratio = (currentPrice - low) / (high - low);
    if (ratio <= 0.1) return 25;
    if (ratio >= 0.9) return 75;
    return 25 + ratio * 50;
  },

  /**
   * Combine sub-scores using weights, then apply modifiers
   */
  combine(subScores, weights, modifiers = []) {
    let total = 0;
    for (const key of Object.keys(weights)) {
      total += (subScores[key] || 0) * weights[key];
    }
    for (const m of modifiers) {
      total += m.impact;
    }
    return Math.round(Math.min(100, Math.max(0, total)));
  },

  /**
   * Per-station savings — simple per-litre difference vs. local market.
   * Returns the ¢/L gap (positive = cheaper than market).
   */
  stationSavings(stationPrice, marketPrice) {
    return Math.round((marketPrice - stationPrice) * 10) / 10;
  },

  /**
   * Verdict text from a numeric score
   */
  verdictFor(score) {
    if (score >= 70) {
      return {
        state: 'fill-up',
        verdict: 'Fill Up Now',
        sub: 'Conditions favor a price increase soon'
      };
    } else if (score >= 30) {
      return {
        state: 'neutral',
        verdict: 'Maybe Today',
        sub: 'Mixed signals — no strong push either way'
      };
    } else {
      return {
        state: 'wait',
        verdict: 'Wait a Bit',
        sub: 'Prices look likely to drift down'
      };
    }
  }
};
