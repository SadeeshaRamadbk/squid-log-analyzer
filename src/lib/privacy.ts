/**
 * Anonymize employee username for privacy (e.g. "Rama Fernando" -> "User_R***o_0412")
 * Client-safe: Does not import any server-only modules or SQLite.
 */
export function anonymizeUsername(name?: string | null): string {
  if (!name || name.trim() === '' || name === '-') return 'Unassigned';
  const clean = name.trim();
  const first = clean[0];
  const last = clean[clean.length - 1];
  const hash = Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9999).toString().padStart(4, '0');
  return `User_${first}***${last}_${hash}`;
}

/**
 * Mask employee name for optional privacy mode (e.g. "Kasun Perera" -> "K***n P****a")
 */
export function maskEmployeeName(name?: string | null, isPrivacyMode = true): string {
  if (!name || !name.trim()) return '';
  if (!isPrivacyMode) return name;

  const tokens = name.trim().split(/\s+/);
  return tokens
    .map((token) => {
      if (token.length <= 2) {
        return token[0] + '*';
      }
      return token[0] + '*'.repeat(Math.max(2, token.length - 2)) + token[token.length - 1];
    })
    .join(' ');
}
