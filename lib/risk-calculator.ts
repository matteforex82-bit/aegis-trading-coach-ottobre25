/**
 * Risk Calculator Utility
 *
 * Calcola automaticamente la size corretta del trade basandosi su:
 * - Risk % desiderato
 * - Balance del conto
 * - Distanza dello Stop Loss
 * - Valore del pip per il symbol (da broker specs se disponibile)
 */

import { db as prisma } from '@/lib/db';
import { getSymbolSpec } from '@/lib/symbol-mapper';

export interface RiskCalculationInput {
  accountBalance: number;
  riskPercent: number; // e.g., 1.0 for 1%
  entryPrice: number;
  stopLoss: number;
  symbol: string;
  accountCurrency?: string;
  accountId?: string; // Optional: per usare broker specs invece di valori hardcoded
}

export interface RiskCalculationResult {
  lotSize: number;
  riskAmount: number; // In account currency
  pipDistance: number;
  pipValue: number;
  positionValue: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Mappa dei valori pip standard per le coppie forex principali
 * Formato: { symbol: { pipValue, pipDigits } }
 */
const FOREX_PIP_VALUES: Record<string, { pipValue: number; pipDigits: number }> = {
  // Major Pairs (XXX/USD)
  EURUSD: { pipValue: 10, pipDigits: 5 },
  GBPUSD: { pipValue: 10, pipDigits: 5 },
  AUDUSD: { pipValue: 10, pipDigits: 5 },
  NZDUSD: { pipValue: 10, pipDigits: 5 },

  // USD/XXX
  USDCAD: { pipValue: 7.5, pipDigits: 5 },  // Approx, varies with CAD rate
  USDCHF: { pipValue: 11, pipDigits: 5 },   // Approx, varies with CHF rate
  USDJPY: { pipValue: 9, pipDigits: 3 },    // Approx, varies with JPY rate

  // Cross Pairs
  EURGBP: { pipValue: 13, pipDigits: 5 },
  EURJPY: { pipValue: 9, pipDigits: 3 },
  GBPJPY: { pipValue: 9, pipDigits: 3 },

  // Commodities
  XAUUSD: { pipValue: 10, pipDigits: 2 },   // Gold
  XAGUSD: { pipValue: 50, pipDigits: 3 },   // Silver

  // Indices (contract size varies by broker)
  US30: { pipValue: 1, pipDigits: 1 },      // Dow Jones
  NAS100: { pipValue: 1, pipDigits: 1 },    // Nasdaq
  SPX500: { pipValue: 1, pipDigits: 1 },    // S&P 500
};

/**
 * Calcola il numero di pips tra entry e stop loss
 */
function calculatePipDistance(
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number {
  const symbolInfo = FOREX_PIP_VALUES[symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')];
  const pipDigits = symbolInfo?.pipDigits || 5;
  const pipMultiplier = Math.pow(10, pipDigits);

  const priceDifference = Math.abs(entryPrice - stopLoss);
  return priceDifference * pipMultiplier;
}

/**
 * Ottiene il valore di 1 pip per 1 lotto standard
 */
function getPipValue(symbol: string): number {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return FOREX_PIP_VALUES[cleanSymbol]?.pipValue || 10; // Default to $10/pip
}

/**
 * Ottiene pip value e digits dalle specifiche broker se disponibili
 * Fallback a valori hardcoded se specifiche non trovate
 */
async function getPipValueFromBrokerSpec(
  symbol: string,
  accountId?: string
): Promise<{ pipValue: number; pipDigits: number }> {
  // Se accountId fornito, prova a recuperare specifiche broker
  if (accountId) {
    try {
      const spec = await getSymbolSpec(symbol, accountId);
      if (spec) {
        // Calcola pip value dinamicamente dalle specifiche
        // Per la maggior parte degli strumenti: pip = point * 10
        // Pip value per lotto standard dipende da contractSize
        const pipValue = spec.point * 10 * spec.contractSize / 100000;
        return {
          pipValue: pipValue > 0 ? pipValue : getPipValue(symbol),
          pipDigits: spec.digits,
        };
      }
    } catch (error) {
      console.warn(`[Risk Calculator] Failed to get broker spec for ${symbol}:`, error);
    }
  }

  // Fallback a valori hardcoded
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const defaultSpec = FOREX_PIP_VALUES[cleanSymbol];
  return {
    pipValue: defaultSpec?.pipValue || 10,
    pipDigits: defaultSpec?.pipDigits || 5,
  };
}

/**
 * Calcola la lot size ottimale basata sul risk management
 */
export function calculateLotSize(input: RiskCalculationInput): RiskCalculationResult {
  const errors: string[] = [];

  // Validazione input
  if (input.accountBalance <= 0) {
    errors.push("Account balance must be positive");
  }

  if (input.riskPercent <= 0 || input.riskPercent > 10) {
    errors.push("Risk percent must be between 0.1% and 10%");
  }

  if (input.entryPrice <= 0 || input.stopLoss <= 0) {
    errors.push("Entry price and stop loss must be positive");
  }

  if (input.entryPrice === input.stopLoss) {
    errors.push("Entry price and stop loss cannot be the same");
  }

  if (errors.length > 0) {
    return {
      lotSize: 0,
      riskAmount: 0,
      pipDistance: 0,
      pipValue: 0,
      positionValue: 0,
      isValid: false,
      errors,
    };
  }

  // Calcolo del risk amount in valuta
  const riskAmount = (input.accountBalance * input.riskPercent) / 100;

  // Calcolo distanza in pips
  const pipDistance = calculatePipDistance(
    input.entryPrice,
    input.stopLoss,
    input.symbol
  );

  if (pipDistance === 0) {
    errors.push("Invalid pip distance (too small)");
    return {
      lotSize: 0,
      riskAmount,
      pipDistance: 0,
      pipValue: 0,
      positionValue: 0,
      isValid: false,
      errors,
    };
  }

  // Valore del pip per lotto standard
  const pipValue = getPipValue(input.symbol);

  // Formula: Lot Size = Risk Amount / (Pip Distance × Pip Value)
  const lotSize = riskAmount / (pipDistance * pipValue);

  // Arrotonda a 2 decimali (standard per MT5)
  const roundedLotSize = Math.round(lotSize * 100) / 100;

  // Validazione lot size
  if (roundedLotSize < 0.01) {
    errors.push("Calculated lot size is too small (min 0.01)");
  }

  if (roundedLotSize > 100) {
    errors.push("Calculated lot size is too large (max 100)");
  }

  // Calcolo position value (per info)
  const positionValue = roundedLotSize * 100000; // Standard lot = 100k units

  return {
    lotSize: roundedLotSize,
    riskAmount,
    pipDistance,
    pipValue,
    positionValue,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida se un trade rispetta le regole di risk management
 */
export function validateTradeRisk(
  lotSize: number,
  accountBalance: number,
  maxRiskPercent: number,
  pipDistance: number,
  pipValue: number
): { isValid: boolean; actualRisk: number; errors: string[] } {
  const errors: string[] = [];

  // Calcola il risk effettivo del trade
  const actualRiskAmount = lotSize * pipDistance * pipValue;
  const actualRiskPercent = (actualRiskAmount / accountBalance) * 100;

  if (actualRiskPercent > maxRiskPercent) {
    errors.push(
      `Risk too high: ${actualRiskPercent.toFixed(2)}% (max ${maxRiskPercent}%)`
    );
  }

  if (lotSize < 0.01) {
    errors.push("Lot size too small (min 0.01)");
  }

  if (lotSize > 100) {
    errors.push("Lot size too large (max 100)");
  }

  return {
    isValid: errors.length === 0,
    actualRisk: actualRiskPercent,
    errors,
  };
}

/**
 * Calcola il risk/reward ratio di un trade
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  if (risk === 0) return 0;

  return reward / risk;
}

/**
 * Suggerisce il take profit basato su un R:R desiderato
 */
export function suggestTakeProfit(
  entryPrice: number,
  stopLoss: number,
  direction: 'BUY' | 'SELL',
  desiredRRRatio: number = 2.0
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = risk * desiredRRRatio;

  if (direction === 'BUY') {
    return entryPrice + reward;
  } else {
    return entryPrice - reward;
  }
}

/**
 * Versione async di calculateLotSize che usa specifiche broker se disponibili
 * Usa automaticamente le specifiche reali del broker invece di valori hardcoded
 */
export async function calculateLotSizeWithBrokerSpec(
  input: RiskCalculationInput
): Promise<RiskCalculationResult> {
  const errors: string[] = [];

  // Validazione input
  if (input.accountBalance <= 0) {
    errors.push("Account balance must be positive");
  }

  if (input.riskPercent <= 0 || input.riskPercent > 10) {
    errors.push("Risk percent must be between 0.1% and 10%");
  }

  if (input.entryPrice <= 0 || input.stopLoss <= 0) {
    errors.push("Entry price and stop loss must be positive");
  }

  if (input.entryPrice === input.stopLoss) {
    errors.push("Entry price and stop loss cannot be the same");
  }

  if (errors.length > 0) {
    return {
      lotSize: 0,
      riskAmount: 0,
      pipDistance: 0,
      pipValue: 0,
      positionValue: 0,
      isValid: false,
      errors,
    };
  }

  // Calcolo del risk amount in valuta
  const riskAmount = (input.accountBalance * input.riskPercent) / 100;

  // Ottieni pip value e digits dalle broker specs
  const { pipValue, pipDigits } = await getPipValueFromBrokerSpec(
    input.symbol,
    input.accountId
  );

  // Calcolo distanza in punti usando digits reali del broker
  const pipMultiplier = Math.pow(10, pipDigits);
  const priceDifference = Math.abs(input.entryPrice - input.stopLoss);
  const pipDistance = priceDifference * pipMultiplier;

  if (pipDistance === 0) {
    errors.push("Invalid pip distance (too small)");
    return {
      lotSize: 0,
      riskAmount,
      pipDistance: 0,
      pipValue: 0,
      positionValue: 0,
      isValid: false,
      errors,
    };
  }

  // Formula: Lot Size = Risk Amount / (Pip Distance × Pip Value)
  const lotSize = riskAmount / (pipDistance * pipValue);

  // Arrotonda a 2 decimali (standard per MT5)
  const roundedLotSize = Math.round(lotSize * 100) / 100;

  // Calcolo del valore totale della posizione
  const positionValue = roundedLotSize * 100000; // Standard lot size

  return {
    lotSize: roundedLotSize,
    riskAmount,
    pipDistance,
    pipValue,
    positionValue,
    isValid: true,
    errors: [],
  };
}
