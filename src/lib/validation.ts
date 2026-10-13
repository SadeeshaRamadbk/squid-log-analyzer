/**
 * Input sanitization and validation utilities for network & proxy parameters
 */

const IPV4_REGEX = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates if a string is a well-formed IPv4 address
 */
export function isValidIp(ip?: string | null): boolean {
  if (!ip) return false;
  return IPV4_REGEX.test(ip.trim());
}

/**
 * Validates if a string is a well-formed domain name
 */
export function isValidDomain(domain?: string | null): boolean {
  if (!domain) return false;
  return DOMAIN_REGEX.test(domain.trim());
}

/**
 * Validates if a date string is YYYY-MM-DD
 */
export function isValidDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return DATE_REGEX.test(dateStr.trim());
}

/**
 * Sanitize and bound pagination parameters safely
 */
export function sanitizePagination(
  rawPage: any,
  rawLimit: any,
  defaultLimit = 25,
  maxLimit = 250
): { page: number; limit: number; offset: number } {
  let page = parseInt(String(rawPage), 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(String(rawLimit), 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Strip control characters, quotes, and dangerous characters from raw strings
 */
export function sanitizeParam(str?: string | null, maxLength = 255): string | undefined {
  if (!str) return undefined;
  const trimmed = str.trim().slice(0, maxLength);
  // Remove ASCII control characters
  const clean = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
  return clean || undefined;
}
