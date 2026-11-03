/** Deterministic, small presentation fallback. It never pretends to be issuer artwork. */
export function instrumentMonogram(ticker: string) {
  const token = ticker.replace(/[^\p{L}\p{N}]/gu, '');
  return /^\d+$/.test(token) ? (token.replace(/^0+/, '') || '0').slice(-3) : token.slice(0, 2).toLocaleUpperCase() || '·';
}
export function instrumentBadgeTone(identity: string) {
  let hash = 0;
  for (const char of identity) hash = (hash * 31 + char.codePointAt(0)!) | 0;
  return ['slate', 'blue', 'teal', 'violet', 'amber', 'rose'][Math.abs(hash) % 6];
}
/** Package assets may resolve below an OCI mount; external website requests are excluded. */
export function localArtworkUrl(value?: string) {
  if (!value || /[\u0000-\u001f]/.test(value) || value.startsWith('//')) return undefined;
  if (value.length <= 768000 && /^data:image\/(?:svg\+xml|png|jpeg|webp);(?:charset=utf-8,|base64,)/i.test(value)) return value;
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) return value;
  if (typeof location !== 'undefined') {
    try { const url = new URL(value, location.href); if (url.origin === location.origin && ['http:', 'https:', 'blob:'].includes(url.protocol)) return url.href; } catch { /* use monogram */ }
  }
  return undefined;
}
