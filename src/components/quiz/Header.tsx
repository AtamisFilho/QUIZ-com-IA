'use client'

import { useTranslation, type Locale } from '@/lib/i18n'
import { useTheme } from 'next-themes'
import { useGameStore } from '@/lib/game-store'
import { Brain, Sun, Moon, Monitor, Globe, Shield, Gamepad2, User, Crown, Trophy, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { localeLabels, availableLocales } from '@/lib/i18n'

export default function Header() {
  const { t, locale, setLocale } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { currentView, setCurrentView } = useGameStore()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-quiz-purple to-quiz-violet">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-quiz-purple to-quiz-violet bg-clip-text text-transparent">
            QUIZ AI
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('common.language')}>
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableLocales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={locale === loc ? 'bg-accent' : ''}
                >
                  {localeLabels[loc]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Theme">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Solo */}
          {currentView !== 'solo' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('solo')}
              aria-label={t('solo.title')}
            >
              <Gamepad2 className="h-4 w-4" />
            </Button>
          )}

          {/* Daily Challenge */}
          {currentView !== 'daily' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('daily')}
              aria-label={t('daily.title')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          )}

          {/* Leaderboard */}
          {currentView !== 'leaderboard' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('leaderboard')}
              aria-label={t('leaderboard.title')}
            >
              <Trophy className="h-4 w-4" />
            </Button>
          )}

          {/* Subscription */}
          {currentView !== 'subscription' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('subscription')}
              aria-label={t('subscription.title')}
            >
              <Crown className="h-4 w-4" />
            </Button>
          )}

          {/* Profile */}
          {currentView !== 'profile' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('profile')}
              aria-label={t('profile.title')}
            >
              <User className="h-4 w-4" />
            </Button>
          )}

          {/* Admin */}
          {currentView !== 'admin' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCurrentView('admin')}
              aria-label={t('admin.title')}
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
