// ─── Cryptographic Security Utilities ──────────────────────────────────────────
import crypto from 'crypto';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

/**
 * Generates a cryptographically secure random temporary password.
 * Minimum length: 16 characters.
 * Guarantees at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
 */
export function generateSecureTemporaryPassword(length: number = 16): string {
  if (length < 16) length = 16;

  // Guarantee at least 1 character from each required set
  const required = [
    UPPERCASE[crypto.randomInt(0, UPPERCASE.length)],
    LOWERCASE[crypto.randomInt(0, LOWERCASE.length)],
    DIGITS[crypto.randomInt(0, DIGITS.length)],
    SPECIAL[crypto.randomInt(0, SPECIAL.length)],
  ];

  // Fill remaining characters
  const remainingCount = length - required.length;
  const remaining: string[] = [];
  const randomBuffer = crypto.randomBytes(remainingCount);

  for (let i = 0; i < remainingCount; i++) {
    const randomIndex = randomBuffer[i] % ALL_CHARS.length;
    remaining.push(ALL_CHARS[randomIndex]);
  }

  // Combine and shuffle using Fisher-Yates
  const passwordArray = [...required, ...remaining];
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}
