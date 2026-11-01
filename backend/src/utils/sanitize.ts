/**
 * Input sanitization utility for XSS and malicious protocol prevention.
 * Challenge 247: Sanitize company descriptions, job descriptions, profiles, and announcements.
 */

/**
 * Strips HTML tags and script content from user input to prevent stored XSS.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Remove iframes
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '') // Remove object tags
    .replace(/<embed[^>]*>/gi, '') // Remove embed tags
    .replace(/\s+on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '') // Remove inline event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tag) => {
      const allowedTags = ['b', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'strong', 'em'];
      const lowerTag = tag.toLowerCase();
      if (!allowedTags.includes(lowerTag)) return '';
      const isClosing = match.startsWith('</');
      return isClosing ? `</${lowerTag}>` : `<${lowerTag}>`;
    })
    .trim();
}

/**
 * Validates that a URL uses a safe protocol (http/https only).
 * Challenge 247: Prevent javascript: URLs in company links, meeting links, and resumes.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
