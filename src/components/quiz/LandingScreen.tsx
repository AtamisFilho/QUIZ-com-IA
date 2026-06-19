'use client'

import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion } from 'framer-motion'
import { Brain, Users, Share2, Sparkles, Trophy, ArrowRight, Zap, Globe, Calendar, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stepIcons = [Users, Share2, Sparkles, Trophy]

export default function LandingScreen() {
  const { t } = useTranslation()
  const { setCurrentView } = useGameStore()

  // Category icons for the daily challenge preview
  const categoryIcons: Record<string, string> = {
    general: '🌍', science: '🔬', history: '📜', geography: '🗺️',
    sports: '⚽', entertainment: '🎬', technology: '💻', literature: '📚',
    art: '🎨', music: '🎵',
  }

  // Determine today's category based on day of year (same logic as API)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  const categories = ['general', 'science', 'history', 'geography', 'sports', 'entertainment', 'technology', 'literature', 'art', 'music']
  const todayCategory = categories[dayOfYear % categories.length]
  const todayCategoryIcon = categoryIcons[todayCategory] || '🎯'

  const steps = [
    { key: 'landing.features.step1', icon: Users },
    { key: 'landing.features.step2', icon: Share2 },
    { key: 'landing.features.step3', icon: Sparkles },
    { key: 'landing.features.step4', icon: Trophy },
  ]

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-quiz-purple/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-quiz-amber/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-quiz-emerald/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-quiz-rose/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          {/* Logo & Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-quiz-purple via-quiz-violet to-quiz-rose shadow-2xl shadow-quiz-purple/30 animate-float">
              <Brain className="w-14 h-14 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl sm:text-7xl font-extrabold mb-4"
          >
            <span className="bg-gradient-to-r from-quiz-purple via-quiz-violet to-quiz-rose bg-clip-text text-transparent">
              {t('app.title')}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl text-foreground/80 mb-2 font-semibold"
          >
            {t('app.subtitle')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-base text-muted-foreground mb-8 max-w-lg mx-auto"
          >
            {t('landing.heroSubtitle')}
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {[
              { icon: Zap, label: 'IA', color: 'from-quiz-amber to-quiz-amber/80' },
              { icon: Globe, label: 'Multiplayer', color: 'from-quiz-emerald to-quiz-emerald/80' },
              { icon: Brain, label: '10+ Categories', color: 'from-quiz-purple to-quiz-violet' },
            ].map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r shadow-sm"
                style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}
              >
                <pill.icon className="w-3 h-3" />
                {pill.label}
              </span>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => setCurrentView('create')}
              className="group text-lg px-8 py-6 bg-gradient-to-r from-quiz-purple to-quiz-violet hover:from-quiz-violet hover:to-quiz-rose shadow-lg shadow-quiz-purple/25 transition-all duration-300 rounded-xl"
              aria-label={t('landing.createGame')}
            >
              {t('landing.createGame')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setCurrentView('join')}
              className="group text-lg px-8 py-6 border-2 border-quiz-purple/30 text-quiz-purple hover:bg-quiz-purple/5 dark:border-quiz-purple/50 dark:text-quiz-purple dark:hover:bg-quiz-purple/10 transition-all duration-300 rounded-xl"
              aria-label={t('landing.joinGame')}
            >
              {t('landing.joinGame')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Daily Challenge Card */}
      <section className="py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <button
            onClick={() => setCurrentView('daily')}
            className="w-full group relative overflow-hidden rounded-2xl border-2 border-amber-400/40 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 p-6 text-left shadow-lg hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300"
          >
            {/* Decorative gradient strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
            
            {/* Sparkle effects */}
            <div className="absolute top-4 right-4 opacity-20">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>

            <div className="flex items-center gap-4">
              {/* Calendar Icon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30 shrink-0"
              >
                <Calendar className="w-7 h-7 text-white" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-1">
                  {t('daily.title')}
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-300/70 mb-2">
                  {t('daily.subtitle')}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 font-medium">
                    {todayCategoryIcon} {t('daily.questions')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-200/60 dark:bg-orange-800/40 text-orange-700 dark:text-orange-300 font-medium">
                    <Flame className="w-3 h-3" /> {t('daily.streak')}
                  </span>
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </button>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-muted/30 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold text-center mb-12"
          >
            {t('landing.features.title')}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = stepIcons[index]
              const colors = [
                'from-quiz-purple/20 to-quiz-violet/20 text-quiz-purple',
                'from-quiz-amber/20 to-quiz-amber/10 text-quiz-amber',
                'from-quiz-emerald/20 to-quiz-cyan/20 text-quiz-emerald',
                'from-quiz-rose/20 to-quiz-amber/20 text-quiz-rose',
              ]
              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${colors[index]} mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="text-sm font-bold bg-gradient-to-r from-quiz-purple to-quiz-violet bg-clip-text text-transparent mb-2">
                    {index + 1}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(step.key as Parameters<typeof t>[0])}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t border-border/40 bg-muted/20">
        <p>QUIZ AI &mdash; {t('app.description')}</p>
      </footer>
    </div>
  )
}
