/**
 * Correlation Engine
 *
 * Gestisce il calcolo dell'esposizione valutaria e previene
 * posizioni troppo correlate che aumentano il rischio effettivo
 */

export interface CurrencyExposure {
  currency: string;
  longExposure: number; // % in long positions
  shortExposure: number; // % in short positions
  netExposure: number; // Net exposure (long - short)
  openPositions: number;
  totalRisk: number; // Combined risk %
}

export interface TradeExposure {
  symbol: string;
  direction: 'BUY' | 'SELL';
  riskPercent: number;
  baseCurrency: string; // e.g., EUR in EURUSD
  quoteCurrency: string; // e.g., USD in EURUSD
}

export interface ExposureAnalysis {
  exposures: Record<string, CurrencyExposure>;
  violations: string[];
  warnings: string[];
  maxExposureCurrency: string | null;
  maxExposureValue: number;
  totalRisk: number;
}

/**
 * Matrice di correlazione storica (media ultimi 12 mesi)
 * Valori da -1 (correlazione negativa perfetta) a +1 (correlazione positiva perfetta)
 *
 * Fonte: Media storica dei dati di mercato forex
 */
const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  EURUSD: {
    EURUSD: 1.0,
    GBPUSD: 0.89,
    AUDUSD: 0.76,
    NZDUSD: 0.72,
    USDCAD: -0.85,
    USDCHF: -0.91,
    USDJPY: -0.68,
    EURGBP: 0.45,
    EURJPY: 0.82,
  },
  GBPUSD: {
    EURUSD: 0.89,
    GBPUSD: 1.0,
    AUDUSD: 0.71,
    NZDUSD: 0.68,
    USDCAD: -0.80,
    USDCHF: -0.85,
    USDJPY: -0.61,
    EURGBP: 0.52,
    GBPJPY: 0.79,
  },
  AUDUSD: {
    EURUSD: 0.76,
    GBPUSD: 0.71,
    AUDUSD: 1.0,
    NZDUSD: 0.94,
    USDCAD: -0.88,
    USDCHF: -0.74,
    USDJPY: -0.55,
  },
  NZDUSD: {
    EURUSD: 0.72,
    GBPUSD: 0.68,
    AUDUSD: 0.94,
    NZDUSD: 1.0,
    USDCAD: -0.84,
    USDCHF: -0.70,
    USDJPY: -0.52,
  },
  USDCAD: {
    EURUSD: -0.85,
    GBPUSD: -0.80,
    AUDUSD: -0.88,
    NZDUSD: -0.84,
    USDCAD: 1.0,
    USDCHF: 0.78,
    USDJPY: 0.61,
  },
  USDCHF: {
    EURUSD: -0.91,
    GBPUSD: -0.85,
    AUDUSD: -0.74,
    NZDUSD: -0.70,
    USDCAD: 0.78,
    USDCHF: 1.0,
    USDJPY: 0.71,
  },
  USDJPY: {
    EURUSD: -0.68,
    GBPUSD: -0.61,
    AUDUSD: -0.55,
    NZDUSD: -0.52,
    USDCAD: 0.61,
    USDCHF: 0.71,
    USDJPY: 1.0,
    EURJPY: 0.84,
    GBPJPY: 0.86,
  },
  EURJPY: {
    EURUSD: 0.82,
    USDJPY: 0.84,
    EURJPY: 1.0,
  },
  GBPJPY: {
    GBPUSD: 0.79,
    USDJPY: 0.86,
    GBPJPY: 1.0,
  },
  EURGBP: {
    EURUSD: 0.45,
    GBPUSD: 0.52,
    EURGBP: 1.0,
  },
};

/**
 * Estrae le valute base e quote da un symbol
 */
export function parseCurrencyPair(symbol: string): {
  baseCurrency: string;
  quoteCurrency: string;
} {
  // Rimuovi caratteri speciali
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z]/g, '');

  // Gestisci casi speciali (metalli, indici)
  if (cleanSymbol.startsWith('XAU')) {
    return { baseCurrency: 'GOLD', quoteCurrency: 'USD' };
  }
  if (cleanSymbol.startsWith('XAG')) {
    return { baseCurrency: 'SILVER', quoteCurrency: 'USD' };
  }
  if (cleanSymbol.includes('US30') || cleanSymbol.includes('NAS') || cleanSymbol.includes('SPX')) {
    return { baseCurrency: 'INDEX', quoteCurrency: 'USD' };
  }

  // Standard forex pair (6 caratteri)
  if (cleanSymbol.length >= 6) {
    return {
      baseCurrency: cleanSymbol.substring(0, 3),
      quoteCurrency: cleanSymbol.substring(3, 6),
    };
  }

  // Fallback
  return { baseCurrency: cleanSymbol, quoteCurrency: 'USD' };
}

/**
 * Calcola l'esposizione valutaria totale dato un set di trade
 */
export function calculateCurrencyExposure(
  trades: TradeExposure[]
): Record<string, CurrencyExposure> {
  const exposures: Record<string, CurrencyExposure> = {};

  // Inizializza struttura per ogni valuta
  const allCurrencies = new Set<string>();
  trades.forEach(trade => {
    allCurrencies.add(trade.baseCurrency);
    allCurrencies.add(trade.quoteCurrency);
  });

  allCurrencies.forEach(currency => {
    exposures[currency] = {
      currency,
      longExposure: 0,
      shortExposure: 0,
      netExposure: 0,
      openPositions: 0,
      totalRisk: 0,
    };
  });

  // Calcola esposizione per ogni trade
  trades.forEach(trade => {
    const { baseCurrency, quoteCurrency } = trade;

    if (trade.direction === 'BUY') {
      // BUY EURUSD = Long EUR, Short USD
      exposures[baseCurrency].longExposure += trade.riskPercent;
      exposures[baseCurrency].totalRisk += trade.riskPercent;
      exposures[baseCurrency].openPositions += 1;

      exposures[quoteCurrency].shortExposure += trade.riskPercent;
      exposures[quoteCurrency].totalRisk += trade.riskPercent;
      exposures[quoteCurrency].openPositions += 1;
    } else {
      // SELL EURUSD = Short EUR, Long USD
      exposures[baseCurrency].shortExposure += trade.riskPercent;
      exposures[baseCurrency].totalRisk += trade.riskPercent;
      exposures[baseCurrency].openPositions += 1;

      exposures[quoteCurrency].longExposure += trade.riskPercent;
      exposures[quoteCurrency].totalRisk += trade.riskPercent;
      exposures[quoteCurrency].openPositions += 1;
    }
  });

  // Calcola net exposure
  Object.values(exposures).forEach(exposure => {
    exposure.netExposure = exposure.longExposure - exposure.shortExposure;
  });

  return exposures;
}

/**
 * Analizza l'esposizione e rileva violazioni/warning
 */
export function analyzeExposure(
  existingTrades: TradeExposure[],
  newTrade: TradeExposure | null,
  maxCurrencyExposure: number = 2.0 // Default 2% max per currency
): ExposureAnalysis {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Combina trade esistenti + nuovo trade (se presente)
  const allTrades = newTrade
    ? [...existingTrades, newTrade]
    : existingTrades;

  const exposures = calculateCurrencyExposure(allTrades);

  let maxExposureCurrency: string | null = null;
  let maxExposureValue = 0;
  let totalRisk = 0;

  // Verifica violazioni
  Object.entries(exposures).forEach(([currency, exposure]) => {
    const absExposure = Math.abs(exposure.netExposure);

    totalRisk += exposure.totalRisk;

    // Track max exposure
    if (absExposure > maxExposureValue) {
      maxExposureValue = absExposure;
      maxExposureCurrency = currency;
    }

    // Violazioni (hard limit)
    if (absExposure > maxCurrencyExposure) {
      violations.push(
        `${currency}: ${absExposure.toFixed(2)}% exposure exceeds limit of ${maxCurrencyExposure}%`
      );
    }

    // Warnings (70% del limite)
    else if (absExposure > maxCurrencyExposure * 0.7) {
      warnings.push(
        `${currency}: ${absExposure.toFixed(2)}% exposure is approaching limit (${maxCurrencyExposure}%)`
      );
    }

    // Warning per troppe posizioni sulla stessa valuta
    if (exposure.openPositions >= 4) {
      warnings.push(
        `${currency}: ${exposure.openPositions} open positions (consider reducing)`
      );
    }
  });

  // Warning per risk totale combinato
  if (totalRisk > 5.0) {
    warnings.push(
      `Total combined risk is ${totalRisk.toFixed(2)}% (consider reducing)`
    );
  }

  return {
    exposures,
    violations,
    warnings,
    maxExposureCurrency,
    maxExposureValue,
    totalRisk,
  };
}

/**
 * Ottiene il coefficiente di correlazione tra due symbols
 */
export function getCorrelation(symbol1: string, symbol2: string): number {
  const clean1 = symbol1.toUpperCase().replace(/[^A-Z]/g, '');
  const clean2 = symbol2.toUpperCase().replace(/[^A-Z]/g, '');

  if (clean1 === clean2) return 1.0;

  const correlation = CORRELATION_MATRIX[clean1]?.[clean2];
  if (correlation !== undefined) return correlation;

  // Try reverse lookup
  const reverseCorrelation = CORRELATION_MATRIX[clean2]?.[clean1];
  if (reverseCorrelation !== undefined) return reverseCorrelation;

  // Default: nessuna correlazione conosciuta
  return 0;
}

/**
 * Calcola il risk effettivo considerando le correlazioni
 */
export function calculateEffectiveRisk(trades: TradeExposure[]): number {
  if (trades.length === 0) return 0;
  if (trades.length === 1) return trades[0].riskPercent;

  let effectiveRisk = 0;

  // Calcola risk combinato con correlazioni
  for (let i = 0; i < trades.length; i++) {
    for (let j = 0; j < trades.length; j++) {
      const correlation = getCorrelation(trades[i].symbol, trades[j].symbol);

      // Considera la direzione
      let directionMultiplier = 1;
      if (trades[i].direction !== trades[j].direction) {
        directionMultiplier = -1; // Opposti riducono il risk
      }

      const combinedCorrelation = correlation * directionMultiplier;
      const weightedRisk =
        Math.sqrt(trades[i].riskPercent * trades[j].riskPercent) *
        combinedCorrelation;

      effectiveRisk += weightedRisk;
    }
  }

  return Math.sqrt(Math.abs(effectiveRisk));
}

/**
 * Suggerisce una size ridotta per un nuovo trade se viola limiti
 */
export function suggestReducedRisk(
  newTrade: TradeExposure,
  existingTrades: TradeExposure[],
  maxCurrencyExposure: number
): { suggestedRisk: number; reason: string } | null {
  const analysis = analyzeExposure(existingTrades, newTrade, maxCurrencyExposure);

  if (analysis.violations.length === 0) {
    return null; // No violations, trade is OK
  }

  // Trova la currency con il problema più grande
  const { baseCurrency, quoteCurrency } = newTrade;
  const baseExposure = Math.abs(analysis.exposures[baseCurrency]?.netExposure || 0);
  const quoteExposure = Math.abs(analysis.exposures[quoteCurrency]?.netExposure || 0);

  const maxViolation = Math.max(baseExposure, quoteExposure);
  const violatingCurrency = baseExposure > quoteExposure ? baseCurrency : quoteCurrency;

  // Calcola quanto deve essere ridotto
  const excessExposure = maxViolation - maxCurrencyExposure;
  const suggestedRisk = Math.max(0.5, newTrade.riskPercent - excessExposure);

  return {
    suggestedRisk: Math.round(suggestedRisk * 10) / 10,
    reason: `${violatingCurrency} exposure too high (${maxViolation.toFixed(1)}% > ${maxCurrencyExposure}%)`,
  };
}
