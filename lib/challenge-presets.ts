/**
 * Challenge Presets Library
 * Defines standard prop firm challenge rules
 * Used in Setup Wizard for quick configuration
 */

export interface ChallengePreset {
  id: string;
  name: string;
  provider: string;
  overRollMaxPercent: number;        // Max total drawdown %
  dailyMaxPercent: number;            // Max daily loss %
  prohibitedStrategies: string[];
  description: string;

  // Optional fields
  profitTargetPercent?: number;       // Required profit %
  minTradingDays?: number;            // Minimum trading days
  maxTradingDays?: number;            // Maximum calendar days
  maxLotSize?: number;                // Max lot per trade
  maxOpenTrades?: number;             // Max concurrent positions
}

/**
 * Standard Challenge Presets
 * Based on documentation from major prop firms (as of Oct 2025)
 */
export const CHALLENGE_PRESETS: Record<string, ChallengePreset> = {

  // =============================================================================
  // FUNDEDNEXT
  // =============================================================================
  FUNDEDNEXT_STANDARD: {
    id: "FUNDEDNEXT_001",
    name: "FundedNext Standard",
    provider: "FundedNext",
    overRollMaxPercent: 5.0,
    dailyMaxPercent: 2.5,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "5% over-roll, 2.5% daily - Most common challenge",
    profitTargetPercent: 10.0,
    minTradingDays: 4,
    maxTradingDays: 30,
  },

  FUNDEDNEXT_EXPRESS: {
    id: "FUNDEDNEXT_002",
    name: "FundedNext Express",
    provider: "FundedNext",
    overRollMaxPercent: 4.0,
    dailyMaxPercent: 2.0,
    prohibitedStrategies: ["martingale", "grid_trading", "news_trading"],
    description: "4% over-roll, 2% daily - Stricter rules, faster eval",
    profitTargetPercent: 8.0,
    minTradingDays: 3,
    maxTradingDays: 14,
  },

  // =============================================================================
  // FTMO
  // =============================================================================
  FTMO_PHASE1: {
    id: "FTMO_P1",
    name: "FTMO Phase 1",
    provider: "FTMO",
    overRollMaxPercent: 10.0,
    dailyMaxPercent: 5.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "10% max DD, 5% daily, 10% profit target",
    profitTargetPercent: 10.0,
    minTradingDays: 4,
    maxTradingDays: 30,
  },

  FTMO_PHASE2: {
    id: "FTMO_P2",
    name: "FTMO Phase 2 (Verification)",
    provider: "FTMO",
    overRollMaxPercent: 10.0,
    dailyMaxPercent: 5.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "10% max DD, 5% daily, 5% profit target",
    profitTargetPercent: 5.0,
    minTradingDays: 4,
    maxTradingDays: 60,
  },

  FTMO_FUNDED: {
    id: "FTMO_FUNDED",
    name: "FTMO Funded Account",
    provider: "FTMO",
    overRollMaxPercent: 10.0,
    dailyMaxPercent: 5.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "10% max DD, 5% daily - Live funded account",
  },

  // =============================================================================
  // THINCAP
  // =============================================================================
  THINCAP_TRADER: {
    id: "THINCAP_001",
    name: "ThinCap Trader",
    provider: "ThinCap",
    overRollMaxPercent: 7.0,
    dailyMaxPercent: 3.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "7% over-roll, 3% daily",
    profitTargetPercent: 8.0,
    minTradingDays: 3,
  },

  // =============================================================================
  // MYFUNDEDFX
  // =============================================================================
  MYFUNDEDFX_STANDARD: {
    id: "MYFX_001",
    name: "MyFundedFX Standard",
    provider: "MyFundedFX",
    overRollMaxPercent: 4.0,
    dailyMaxPercent: 2.0,
    prohibitedStrategies: ["martingale", "grid_trading", "news_trading"],
    description: "4% over-roll, 2% daily (strict rules)",
    profitTargetPercent: 10.0,
    minTradingDays: 5,
  },

  // =============================================================================
  // THE 5%ERS
  // =============================================================================
  FIVE_PERCENTERS_STANDARD: {
    id: "5ERS_001",
    name: "The 5%ers Hyper Growth",
    provider: "The5%ers",
    overRollMaxPercent: 6.0,
    dailyMaxPercent: 4.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "6% max DD, 4% daily",
    profitTargetPercent: 6.0,
  },

  // =============================================================================
  // THE FUNDED TRADER
  // =============================================================================
  FUNDED_TRADER_STANDARD: {
    id: "TFT_001",
    name: "The Funded Trader Standard",
    provider: "TheFundedTrader",
    overRollMaxPercent: 8.0,
    dailyMaxPercent: 4.0,
    prohibitedStrategies: ["martingale", "grid_trading"],
    description: "8% max DD, 4% daily",
    profitTargetPercent: 10.0,
    minTradingDays: 5,
  },

  // =============================================================================
  // CUSTOM (USER-DEFINED)
  // =============================================================================
  CUSTOM: {
    id: "CUSTOM_001",
    name: "Custom Challenge",
    provider: "Custom",
    overRollMaxPercent: 0,
    dailyMaxPercent: 0,
    prohibitedStrategies: [],
    description: "Manually configure your own rules",
  },
};

/**
 * Get challenge preset by ID
 */
export function getChallengePreset(presetId: string): ChallengePreset | null {
  return CHALLENGE_PRESETS[presetId] || null;
}

/**
 * Get all available presets as array
 */
export function getAllChallengePresets(): ChallengePreset[] {
  return Object.values(CHALLENGE_PRESETS);
}

/**
 * Get presets filtered by provider
 */
export function getChallengesByProvider(provider: string): ChallengePreset[] {
  return Object.values(CHALLENGE_PRESETS).filter(
    (preset) => preset.provider.toLowerCase() === provider.toLowerCase()
  );
}

/**
 * Validate if a preset ID is valid
 */
export function isValidPresetId(presetId: string): boolean {
  return presetId in CHALLENGE_PRESETS;
}
