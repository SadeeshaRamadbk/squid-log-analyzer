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
