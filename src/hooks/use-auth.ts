'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UserProfile {
  id: string
  userId: string
  displayName: string
  avatarEmoji: string
  avatarColor: string
  level: number
  xp: number
  totalGames: number
  totalWins: number
  totalCorrect: number
  totalAnswered: number
  bestStreak: number
  dailyStreak: number
  subscriptionTier: string
  xpForNextLevel: number
  achievements: Array<{
    id: string
    key: string
    name: string
    description: string
    icon: string
    category: string
    xpReward: number
    unlockedAt: string
  }>
}

interface AuthState {
  isLoggedIn: boolean
  userId: string | null
  userName: string | null
  profile: UserProfile | null
  loading: boolean
}

async function resolveProfile(): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/session')
    const session = await res.json()

    if (session?.user?.id) {
      const profileRes = await fetch(`/api/profile/${session.user.id}`)
      if (profileRes.ok) {
        const profile = await profileRes.json()
        return {
          isLoggedIn: true,
          userId: session.user.id,
          userName: session.user.name,
          profile,
          loading: false,
        }
      }
    }

    // Check localStorage for guest user
    const guestId = typeof window !== 'undefined' ? localStorage.getItem('quiz-ai-guest-id') : null
    const guestName = typeof window !== 'undefined' ? localStorage.getItem('quiz-ai-guest-name') : null

    return {
      isLoggedIn: false,
      userId: guestId,
      userName: guestName,
      profile: null,
      loading: false,
    }
  } catch {
    return {
      isLoggedIn: false,
      userId: null,
      userName: null,
      profile: null,
      loading: false,
    }
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    userId: null,
    userName: null,
    profile: null,
    loading: true,
  })
  const mountedRef = useRef(false)

  // Initial profile fetch on mount
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    let cancelled = false
    resolveProfile().then((result) => {
      if (!cancelled) {
        setState(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const refetch = useCallback(async () => {
    const result = await resolveProfile()
    setState(result)
  }, [])

  const loginAsGuest = useCallback((name: string) => {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('quiz-ai-guest-id', guestId)
    localStorage.setItem('quiz-ai-guest-name', name)
    setState(prev => ({
      ...prev,
      userId: guestId,
      userName: name,
    }))
    return guestId
  }, [])

  const register = useCallback(async (name: string, email: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    if (res.ok) {
      const data = await res.json()
      await refetch()
      return data
    }
    throw new Error('Registration failed')
  }, [refetch])

  return {
    ...state,
    loginAsGuest,
    register,
    refetch,
  }
}
