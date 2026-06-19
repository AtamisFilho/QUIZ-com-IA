# Task 1 - Phase 1 Agent Work Record

## Task: Implement authentication, user profiles, XP/leveling system, and achievements backend

## Files Created

1. **`/src/lib/auth.ts`** - NextAuth configuration
   - CredentialsProvider with email/password/name
   - PrismaAdapter for database persistence
   - JWT session strategy with user ID in token
   - Auto-creates user + profile on registration via authorize()
   - bcrypt password hashing

2. **`/src/app/api/auth/[...nextauth]/route.ts`** - NextAuth route handler
   - Exports GET and POST handlers

3. **`/src/lib/profile-utils.ts`** - Profile & XP utilities
   - Exponential XP curve: `xpForLevel(l) = floor(100 * 1.5^(l-1))`
   - `levelFromXp()` reverse calculation
   - `XP_REWARDS` constant map
   - `addXpToUser()` with auto-level-up
   - `updateUserGameStats()` for post-game stat updates
   - `checkAchievements()` with 10 achievement checks
   - `seedAchievements()` upsert pattern for idempotent seeding

4. **`/src/app/api/auth/register/route.ts`** - Registration API
   - POST with name + email, duplicate check, auto-profile creation

5. **`/src/app/api/profile/[userId]/route.ts`** - Profile API
   - GET returns profile + user info + achievements + xpForNextLevel
   - Fixed: achievements queried through User.achievements (not UserProfile)

6. **`/src/app/api/achievements/route.ts`** - Achievements API
   - GET with auto-seeding, ordered by category and xpReward

7. **`/src/hooks/use-auth.ts`** - Client auth hook
   - Session + profile fetching
   - Guest login via localStorage
   - Registration support
   - Refactored to avoid set-state-in-effect lint error

## Files Modified

1. **`/src/lib/game-store.ts`** - Added profile state
   - `userProfile: { level: number; xp: number; tier: string } | null`
   - `setUserProfile` action
   - `subscriptionTier: string` (default 'free')
   - `setSubscriptionTier` action

2. **`.env`** - Added NEXTAUTH_SECRET and NEXTAUTH_URL

## Lint Status
✅ All files pass ESLint cleanly

## Key Notes for Next Agents
- Achievements are on the User model, not UserProfile - always query through `user.achievements`
- The auth system uses JWT strategy (not database sessions) for simplicity
- Guest users store ID in localStorage with prefix `quiz-ai-guest-`
- The `subscriptionTier` field in game-store defaults to 'free' and can be 'pro' or 'corporate'
- The `xpForLevel` calculation uses exponential scaling (1.5x per level)
