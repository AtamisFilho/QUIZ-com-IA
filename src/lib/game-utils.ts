/**
 * Generate a unique 6-character game code.
 * Avoids ambiguous characters: O, 0, I, 1
 */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateGameCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export function isValidGameCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/i.test(code)
}

export const CATEGORY_LABELS: Record<string, string> = {
  general: 'General Knowledge',
  science: 'Science',
  history: 'History',
  geography: 'Geography',
  sports: 'Sports',
  entertainment: 'Entertainment',
  technology: 'Technology',
  literature: 'Literature',
  art: 'Art',
  music: 'Music',
}

export const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS)
export const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'MIXED']
