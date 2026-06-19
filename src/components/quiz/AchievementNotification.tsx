'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export interface AchievementNotificationData {
  id: string
  icon: string
  name: string
  xpReward: number
}

interface AchievementNotificationProps {
  notifications: AchievementNotificationData[]
  onDismiss: (id: string) => void
}

export default function AchievementNotification({ notifications, onDismiss }: AchievementNotificationProps) {
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <AchievementToast
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function AchievementToast({
  notification,
  onDismiss,
}: {
  notification: AchievementNotificationData
  onDismiss: (id: string) => void
}) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }, [notification.id, onDismiss])

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(handleDismiss, 4000)
    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: 100 }}
      animate={isVisible ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 100 }}
      exit={{ opacity: 0, scale: 0.5, x: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative rounded-xl border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/80 dark:to-yellow-950/80 p-4 shadow-lg shadow-amber-200/50 dark:shadow-amber-800/30"
      style={{
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1)',
      }}
    >
      {/* Golden glow overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-200/20 to-yellow-200/20 dark:from-amber-400/10 dark:to-yellow-400/10 pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3 text-amber-700 dark:text-amber-300" />
      </button>

      <div className="flex items-center gap-3">
        {/* Achievement icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-2xl">
          {notification.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
            🏆 Achievement Unlocked!
          </p>
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">
            {notification.name}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            +{notification.xpReward} XP
          </p>
        </div>
      </div>
    </motion.div>
  )
}
