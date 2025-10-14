import { SubscriptionPlan } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * Get plan limits for a specific subscription plan
 */
export async function getPlanLimits(plan: SubscriptionPlan) {
  const limits = await prisma.planLimits.findUnique({
    where: { plan },
  })

  if (!limits) {
    throw new Error(`Plan limits not found for plan: ${plan}`)
  }

  return limits
}

/**
 * Check if user can create a new API key based on their plan
 * @returns { canCreate: boolean, currentCount: number, limit: number }
 */
export async function checkApiKeyLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const limits = await getPlanLimits(user.plan)
  const currentCount = await prisma.apiKey.count({
    where: {
      userId,
      isActive: true,
    },
  })

  return {
    canCreate: currentCount < limits.maxApiKeys,
    currentCount,
    limit: limits.maxApiKeys,
  }
}

/**
 * Check if user can create a new trading account based on their plan
 * @returns { canCreate: boolean, currentCount: number, limit: number }
 */
export async function checkAccountLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const limits = await getPlanLimits(user.plan)
  const currentCount = await prisma.tradingAccount.count({
    where: {
      userId,
      deletedAt: null, // Only count active accounts
    },
  })

  return {
    canCreate: currentCount < limits.maxTradingAccounts,
    currentCount,
    limit: limits.maxTradingAccounts,
  }
}

/**
 * Check if user has access to advanced analytics based on their plan
 */
export async function hasAdvancedAnalytics(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const limits = await getPlanLimits(user.plan)
  return limits.advancedAnalytics
}

/**
 * Check if user has priority support based on their plan
 */
export async function hasPrioritySupport(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const limits = await getPlanLimits(user.plan)
  return limits.prioritySupport
}

/**
 * Get data retention days for user's plan
 */
export async function getDataRetentionDays(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const limits = await getPlanLimits(user.plan)
  return limits.maxDataRetentionDays
}

/**
 * Check if user's subscription is active and not expired
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if subscription is active or in trial
  if (user.status === 'ACTIVE') {
    return true
  }

  if (user.status === 'TRIAL' && user.trialEndsAt) {
    return new Date() < user.trialEndsAt
  }

  return false
}
