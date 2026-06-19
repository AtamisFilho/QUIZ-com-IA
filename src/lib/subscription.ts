export const TIERS = {
  free: {
    name: 'Free',
    maxGamesPerDay: 5,
    maxPlayersPerRoom: 4,
    categories: ['general', 'science', 'history'] as const,
    customQuestions: false,
    advancedStats: false,
    noAds: false,
    customAvatars: false,
    dailyChallenge: true,
    soloMode: true,
  },
  pro: {
    name: 'Pro',
    maxGamesPerDay: Infinity,
    maxPlayersPerRoom: 20,
    categories: 'all' as const,
    customQuestions: true,
    advancedStats: true,
    noAds: true,
    customAvatars: true,
    dailyChallenge: true,
    soloMode: true,
  },
  corporate: {
    name: 'Corporate',
    maxGamesPerDay: Infinity,
    maxPlayersPerRoom: 500,
    categories: 'all' as const,
    customQuestions: true,
    advancedStats: true,
    noAds: true,
    customAvatars: true,
    dailyChallenge: true,
    soloMode: true,
    whiteLabel: true,
    apiAccess: true,
    ssoIntegration: true,
    prioritySupport: true,
  },
} as const

export type TierKey = keyof typeof TIERS

export function getTierLimits(tier: string) {
  return TIERS[tier as TierKey] || TIERS.free
}

export function canPerformAction(tier: string, action: string, currentCount?: number): boolean {
  const limits = getTierLimits(tier)

  switch (action) {
    case 'create_game':
      return currentCount !== undefined ? currentCount < limits.maxGamesPerDay : true
    case 'custom_questions':
      return limits.customQuestions
    case 'advanced_stats':
      return limits.advancedStats
    case 'no_ads':
      return limits.noAds
    case 'custom_avatars':
      return limits.customAvatars
    default:
      return true
  }
}
