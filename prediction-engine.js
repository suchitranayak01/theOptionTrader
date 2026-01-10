/**
 * Market Prediction Engine
 * Analyzes price movements and PCR data to predict bullish/bearish trends
 */

class PredictionEngine {
  constructor() {
    this.pcrBullishThreshold = 0.7;  // PCR below this is bullish
    this.pcrBearishThreshold = 1.3;  // PCR above this is bearish
  }

  /**
   * Main prediction function
   * @param {Array} priceData - Array of {price, timestamp} objects
   * @param {Number} currentPCR - Current Put-Call Ratio
   * @param {Object} options - Additional options
   * @returns {Object} - Prediction result
   */
  predict(priceData, currentPCR, options = {}) {
    if (!priceData || priceData.length < 10) {
      return {
        prediction: 'INSUFFICIENT_DATA',
        confidence: 0,
        reason: 'Need at least 10 data points'
      };
    }

    // Calculate multiple indicators
    const trendScore = this.analyzeTrend(priceData);
    const momentumScore = this.calculateMomentum(priceData);
    const volatilityScore = this.calculateVolatility(priceData);
    const pcrScore = this.analyzePCR(currentPCR);
    const supportResistance = this.findSupportResistance(priceData);
    const rsi = this.calculateRSI(priceData, 14);
    
    // Weight the different signals
    const weights = {
      trend: 0.25,
      momentum: 0.20,
      pcr: 0.30,
      rsi: 0.15,
      volatility: 0.10
    };

    // Calculate weighted score (-100 to +100)
    // Positive = Bullish, Negative = Bearish
    const totalScore = 
      (trendScore * weights.trend) +
      (momentumScore * weights.momentum) +
      (pcrScore * weights.pcr) +
      (this.normalizeRSI(rsi) * weights.rsi) +
      (volatilityScore * weights.volatility);

    // Determine prediction
    let prediction = 'NEUTRAL';
    let confidence = Math.abs(totalScore);
    
    if (totalScore > 20) {
      prediction = 'BULLISH';
    } else if (totalScore < -20) {
      prediction = 'BEARISH';
    }

    // Cap confidence at 100
    confidence = Math.min(Math.round(confidence), 100);

    // Generate detailed analysis
    const analysis = this.generateAnalysis({
      trendScore,
      momentumScore,
      pcrScore,
      rsi,
      volatilityScore,
      currentPCR,
      supportResistance,
      totalScore
    });

    return {
      prediction,
      confidence,
      score: Math.round(totalScore * 10) / 10,
      signals: {
        trend: this.getSignalLabel(trendScore),
        momentum: this.getSignalLabel(momentumScore),
        pcr: this.getPCRSignal(currentPCR),
        rsi: this.getRSISignal(rsi),
        volatility: volatilityScore > 0 ? 'High' : 'Low'
      },
      indicators: {
        rsi: Math.round(rsi * 10) / 10,
        pcr: currentPCR,
        support: supportResistance.support,
        resistance: supportResistance.resistance
      },
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze price trend using moving averages
   */
  analyzeTrend(priceData) {
    const prices = priceData.map(d => d.price);
    const sma5 = this.calculateSMA(prices, 5);
    const sma10 = this.calculateSMA(prices, 10);
    const sma20 = this.calculateSMA(prices, 20);

    let score = 0;

    // Short term trend (SMA5 vs SMA10)
    if (sma5 > sma10) score += 30;
    else score -= 30;

    // Medium term trend (SMA10 vs SMA20)
    if (sma10 > sma20) score += 40;
    else score -= 40;

    // Recent price vs SMA20
    const currentPrice = prices[prices.length - 1];
    if (currentPrice > sma20) score += 30;
    else score -= 30;

    return score;
  }

  /**
   * Calculate momentum using rate of change
   */
  calculateMomentum(priceData) {
    const prices = priceData.map(d => d.price);
    const period = Math.min(5, prices.length - 1);
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    
    const roc = ((currentPrice - pastPrice) / pastPrice) * 100;

    // Convert ROC to score (-100 to +100)
    if (roc > 2) return 100;
    if (roc > 1) return 70;
    if (roc > 0.5) return 40;
    if (roc > 0) return 20;
    if (roc > -0.5) return -20;
    if (roc > -1) return -40;
    if (roc > -2) return -70;
    return -100;
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(priceData) {
    const prices = priceData.map(d => d.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // High volatility can be bearish (negative score)
    if (stdDev > 0.02) return -30;
    if (stdDev > 0.01) return -10;
    return 10;
  }

  /**
   * Analyze Put-Call Ratio
   */
  analyzePCR(pcr) {
    if (pcr < this.pcrBullishThreshold) {
      // Low PCR = More calls = Bullish
      return 60 + (this.pcrBullishThreshold - pcr) * 50;
    } else if (pcr > this.pcrBearishThreshold) {
      // High PCR = More puts = Bearish
      return -60 - (pcr - this.pcrBearishThreshold) * 30;
    } else {
      // Neutral range
      return (1.0 - pcr) * 30;
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(priceData, period = 14) {
    const prices = priceData.map(d => d.price);
    if (prices.length < period + 1) period = prices.length - 1;

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Normalize RSI to -100 to +100 scale
   */
  normalizeRSI(rsi) {
    if (rsi > 70) return 80;  // Overbought - caution
    if (rsi > 60) return 50;
    if (rsi > 50) return 30;
    if (rsi > 40) return -30;
    if (rsi > 30) return -50;
    return -80;  // Oversold - potential reversal
  }

  /**
   * Find support and resistance levels
   */
  findSupportResistance(priceData) {
    const prices = priceData.map(d => d.price);
    const currentPrice = prices[prices.length - 1];
    
    // Simple approach: use recent high/low
    const recentPrices = prices.slice(-20);
    const resistance = Math.max(...recentPrices);
    const support = Math.min(...recentPrices);

    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      distanceToResistance: ((resistance - currentPrice) / currentPrice * 100).toFixed(2),
      distanceToSupport: ((currentPrice - support) / currentPrice * 100).toFixed(2)
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(prices, period) {
    if (prices.length < period) period = prices.length;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Generate detailed analysis text
   */
  generateAnalysis(data) {
    const insights = [];

    // Trend analysis
    if (data.trendScore > 50) {
      insights.push("📈 Strong uptrend detected across multiple timeframes");
    } else if (data.trendScore < -50) {
      insights.push("📉 Strong downtrend detected across multiple timeframes");
    } else {
      insights.push("➡️ Market showing mixed signals on trend");
    }

    // PCR analysis
    if (data.currentPCR < this.pcrBullishThreshold) {
      insights.push(`🟢 PCR at ${data.currentPCR.toFixed(2)} suggests bullish sentiment (more calls)`);
    } else if (data.currentPCR > this.pcrBearishThreshold) {
      insights.push(`🔴 PCR at ${data.currentPCR.toFixed(2)} suggests bearish sentiment (more puts)`);
    } else {
      insights.push(`⚪ PCR at ${data.currentPCR.toFixed(2)} shows neutral market sentiment`);
    }

    // RSI analysis
    if (data.rsi > 70) {
      insights.push(`⚠️ RSI at ${data.rsi.toFixed(1)} indicates overbought conditions`);
    } else if (data.rsi < 30) {
      insights.push(`⚠️ RSI at ${data.rsi.toFixed(1)} indicates oversold conditions`);
    } else {
      insights.push(`✓ RSI at ${data.rsi.toFixed(1)} is in healthy range`);
    }

    // Momentum
    if (data.momentumScore > 50) {
      insights.push("🚀 Strong positive momentum detected");
    } else if (data.momentumScore < -50) {
      insights.push("⚡ Strong negative momentum detected");
    }

    // Support/Resistance
    insights.push(`📊 Support: ₹${data.supportResistance.support} | Resistance: ₹${data.supportResistance.resistance}`);

    return insights;
  }

  /**
   * Get signal label from score
   */
  getSignalLabel(score) {
    if (score > 60) return 'Strong Bullish';
    if (score > 30) return 'Bullish';
    if (score > -30) return 'Neutral';
    if (score > -60) return 'Bearish';
    return 'Strong Bearish';
  }

  /**
   * Get PCR signal
   */
  getPCRSignal(pcr) {
    if (pcr < this.pcrBullishThreshold) return 'Bullish';
    if (pcr > this.pcrBearishThreshold) return 'Bearish';
    return 'Neutral';
  }

  /**
   * Get RSI signal
   */
  getRSISignal(rsi) {
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    if (rsi > 50) return 'Bullish';
    return 'Bearish';
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.PredictionEngine = PredictionEngine;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictionEngine;
}
