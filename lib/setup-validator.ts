/**
 * Setup Validator
 * Validates challenge setup configuration before activation
 * Based on Section 0.5 of technical specification
 */

export interface SetupInput {
  // Account Info
  accountSize: number;

  // Challenge Rules
  overRollMaxPercent: number;
  dailyMaxPercent: number;

  // User Settings
  userRiskPerTradePercent: number;
  userRiskPerAssetPercent: number;
  maxOrdersPerAsset: number;
  minTimeBetweenOrdersSec: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

/**
 * Validate Setup Configuration
 * Implements validation rules from Section 0.5
 */
export function validateSetup(input: SetupInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate derived values for validation
  const dailyBudget = (input.accountSize * input.dailyMaxPercent) / 100;
  const overRollBudget = (input.accountSize * input.overRollMaxPercent) / 100;
  const maxTradeRisk = (input.accountSize * input.userRiskPerTradePercent) / 100;
  const maxAssetAllocation = (input.accountSize * input.userRiskPerAssetPercent) / 100;

  // =============================================================================
  // RULE 1: Risk per trade cannot exceed 5%
  // =============================================================================
  if (input.userRiskPerTradePercent > 5) {
    errors.push(
      `Risk per trade (${input.userRiskPerTradePercent}%) cannot exceed 5%. ` +
      `This is a safety limit to prevent account destruction.`
    );
  }

  // =============================================================================
  // RULE 2: Risk per trade vs daily budget (should not eat >33% of daily)
  // =============================================================================
  if (maxTradeRisk > dailyBudget / 3) {
    warnings.push(
      `Risk per trade ($${maxTradeRisk.toFixed(2)}) is more than 33% of daily budget ($${dailyBudget.toFixed(2)}). ` +
      `One losing trade will consume a significant portion of your daily allowance. ` +
      `Consider reducing risk per trade or increasing daily limit.`
    );
  }

  // =============================================================================
  // RULE 3: Risk per asset must be >= risk per trade
  // =============================================================================
  if (input.userRiskPerAssetPercent < input.userRiskPerTradePercent) {
    errors.push(
      `Risk per asset (${input.userRiskPerAssetPercent}%) must be >= risk per trade (${input.userRiskPerTradePercent}%). ` +
      `Otherwise, the asset constraint is meaningless - you cannot even place one trade.`
    );
  }

  // =============================================================================
  // RULE 4: Daily budget cannot exceed over-roll budget
  // =============================================================================
  if (input.dailyMaxPercent > input.overRollMaxPercent) {
    errors.push(
      `Daily drawdown limit (${input.dailyMaxPercent}%) cannot exceed over-roll limit (${input.overRollMaxPercent}%). ` +
      `This is illogical - daily resets, but over-roll is cumulative.`
    );
  }

  // =============================================================================
  // RULE 5: Daily budget should be at least 30% of over-roll (warning)
  // =============================================================================
  if (input.dailyMaxPercent < input.overRollMaxPercent * 0.3) {
    warnings.push(
      `Daily budget (${input.dailyMaxPercent}%) is less than 30% of over-roll (${input.overRollMaxPercent}%). ` +
      `This is very conservative. You may hit daily limits frequently before utilizing your full over-roll allowance. ` +
      `Estimated tradeable days: ~${Math.floor(overRollBudget / dailyBudget)} days before over-roll limit.`
    );
  }

  // =============================================================================
  // RULE 6: Max orders per asset sanity check
  // =============================================================================
  if (input.maxOrdersPerAsset > 10) {
    warnings.push(
      `Max orders per asset (${input.maxOrdersPerAsset}) is quite high. ` +
      `Managing more than 10 orders on a single asset may be difficult. ` +
      `Are you sure this is intentional?`
    );
  }

  if (input.maxOrdersPerAsset === 0) {
    errors.push(
      `Max orders per asset cannot be 0. You must allow at least 1 order per asset.`
    );
  }

  // =============================================================================
  // RULE 7: Combined risk from max orders per asset
  // =============================================================================
  const worstCaseAssetRisk = maxTradeRisk * input.maxOrdersPerAsset;
  if (worstCaseAssetRisk > maxAssetAllocation) {
    errors.push(
      `Configuration conflict: ` +
      `${input.maxOrdersPerAsset} orders × ${input.userRiskPerTradePercent}% risk = ${worstCaseAssetRisk.toFixed(2)}$ total risk, ` +
      `but max asset allocation is only ${maxAssetAllocation.toFixed(2)}$. ` +
      `Either reduce max orders per asset, or increase risk per asset limit.`
    );
  }

  // =============================================================================
  // RULE 8: Validate account size is reasonable
  // =============================================================================
  if (input.accountSize < 1000) {
    warnings.push(
      `Account size ($${input.accountSize}) is very small. ` +
      `Risk calculations may result in lot sizes below broker minimums (0.01 lots).`
    );
  }

  if (input.accountSize > 10000000) {
    warnings.push(
      `Account size ($${input.accountSize.toLocaleString()}) is unusually large. ` +
      `Please verify this is correct.`
    );
  }

  // =============================================================================
  // RULE 9: Time between orders sanity
  // =============================================================================
  if (input.minTimeBetweenOrdersSec > 3600) {
    warnings.push(
      `Cooldown between orders (${input.minTimeBetweenOrdersSec / 60} minutes) is quite long. ` +
      `This may limit your ability to enter trades during Elliott Wave setups.`
    );
  }

  // =============================================================================
  // FINAL VALIDATION: Can Proceed?
  // =============================================================================
  const canProceed = errors.length === 0;

  return {
    isValid: canProceed,
    errors,
    warnings,
    canProceed,
  };
}

/**
 * Calculate derived values from setup input
 * These are stored in database after validation
 */
export function calculateDerivedValues(input: SetupInput) {
  return {
    dailyBudgetDollars: (input.accountSize * input.dailyMaxPercent) / 100,
    overRollBudgetDollars: (input.accountSize * input.overRollMaxPercent) / 100,
    maxTradeRiskDollars: (input.accountSize * input.userRiskPerTradePercent) / 100,
    maxAssetAllocationDollars: (input.accountSize * input.userRiskPerAssetPercent) / 100,
  };
}

/**
 * Validate that setup is not being modified after activation
 */
export function validateSetupMutability(
  setupStatus: string,
  isLocked: boolean
): { canModify: boolean; reason?: string } {
  if (isLocked) {
    return {
      canModify: false,
      reason: "Setup is locked. Cannot modify after activation. " +
              "To change settings, you must end the current challenge and create a new one."
    };
  }

  if (setupStatus === "ACTIVE") {
    return {
      canModify: false,
      reason: "Setup is currently active. Cannot modify during active challenge."
    };
  }

  return { canModify: true };
}
