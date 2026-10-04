/**
 * Minimal output sanitisation for user-generated content.
 *
 * React escapes text nodes already; this strips control characters and caps
 * length so stored text cannot break layout or bloat the database. It is not a
 * replacement for rendering discipline — never render user text as HTML.
 */
export function sanitizeText(value: string, maxLength = 2000): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Keeps digits and an optional leading plus sign (phone numbers). */
export function sanitizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? `+${digits.slice(1).replace(/\+/g, '')}` : digits.replace(/\+/g, '');
}