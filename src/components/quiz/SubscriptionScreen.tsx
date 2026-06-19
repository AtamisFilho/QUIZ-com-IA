'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { useAuth } from '@/hooks/use-auth'
import { TIERS, type TierKey } from '@/lib/subscription'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, X, Crown, Sparkles, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const tierIcons: Record<TierKey, React.ReactNode> = {
  free: <Sparkles className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6" />,
  corporate: <Building2 className="h-6 w-6" />,
}

const tierColors: Record<TierKey, { bg: string; border: string; text: string; iconBg: string }> = {
  free: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
  },
  pro: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  corporate: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
}

const tierPrices: Record<TierKey, string> = {
  free: 'R$ 0',
  pro: 'R$ 14,90',
  corporate: 'R$ 299',
}

interface TierFeature {
  label: string
  included: boolean
}

function getTierFeatures(tier: TierKey, t: (key: string) => string): TierFeature[] {
  const freeLabels = [
    t('subscription.freeFeatures.0'),
    t('subscription.freeFeatures.1'),
    t('subscription.freeFeatures.2'),
    t('subscription.freeFeatures.3'),
  ]
  const proLabels = [
    t('subscription.proFeatures.0'),
    t('subscription.proFeatures.1'),
    t('subscription.proFeatures.2'),
    t('subscription.proFeatures.3'),
    t('subscription.proFeatures.4'),
    t('subscription.proFeatures.5'),
  ]
  const corpLabels = [
    t('subscription.corpFeatures.0'),
    t('subscription.corpFeatures.1'),
    t('subscription.corpFeatures.2'),
    t('subscription.corpFeatures.3'),
    t('subscription.corpFeatures.4'),
    t('subscription.corpFeatures.5'),
  ]

  switch (tier) {
    case 'free':
      return freeLabels.map((label, i) => ({
        label,
        included: i < 4, // last feature (ads) is included but not a "pro" feature
      }))
    case 'pro':
      return proLabels.map((label) => ({ label, included: true }))
    case 'corporate':
      return corpLabels.map((label) => ({ label, included: true }))
  }
}

export default function SubscriptionScreen() {
  const { t } = useTranslation()
  const { setCurrentView, subscriptionTier } = useGameStore()
  const { profile } = useAuth()
  const currentTier = profile?.subscriptionTier || subscriptionTier || 'free'

  const handleUpgrade = (tier: string) => {
    toast.info(t('subscription.comingSoon'))
  }

  const tiers: TierKey[] = ['free', 'pro', 'corporate']

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('landing')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold">{t('subscription.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('subscription.subtitle')}</p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, index) => {
            const colors = tierColors[tier]
            const features = getTierFeatures(tier, t)
            const isCurrentTier = currentTier === tier
            const isPro = tier === 'pro'

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative"
              >
                {/* Popular badge for Pro */}
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 px-3 py-1 text-xs font-bold shadow-lg">
                      ⭐ {t('subscription.popular')}
                    </Badge>
                  </div>
                )}

                <Card
                  className={`relative h-full flex flex-col transition-all hover:shadow-lg ${
                    isPro
                      ? `border-2 ${colors.border} shadow-md`
                      : `border ${colors.border}`
                  } ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto flex items-center justify-center w-14 h-14 rounded-2xl ${colors.iconBg} ${colors.text} mb-3`}>
                      {tierIcons[tier]}
                    </div>
                    <CardTitle className={`text-xl ${colors.text}`}>
                      {t(`subscription.${tier}`)}
                    </CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{tierPrices[tier]}</span>
                      <span className="text-muted-foreground text-sm">{t('subscription.month')}</span>
                    </div>
                    {isCurrentTier && (
                      <Badge variant="secondary" className="mt-2">
                        {t('subscription.currentPlan')}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 pt-4">
                    <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      {t('subscription.features')}
                    </p>
                    <ul className="space-y-2">
                      {features.map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                            {feature.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    {isCurrentTier ? (
                      <Button variant="outline" className="w-full" disabled>
                        {t('subscription.currentPlan')}
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${
                          isPro
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white'
                            : ''
                        }`}
                        variant={tier === 'free' ? 'outline' : 'default'}
                        onClick={() => handleUpgrade(tier)}
                      >
                        {t('subscription.upgrade')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
