/**
 * Optimize a Cloudinary delivery URL by injecting:
 *   - f_auto  → serve AVIF / WebP / JPEG based on browser support
 *   - q_auto  → automatic quality (visually lossless, ~30-60% smaller)
 *   - w_<n>   → optional max width for responsive delivery
 *
 * No-ops on non-Cloudinary URLs (data:, blob:, third-party CDNs).
 *
 * Example:
 *   optimizeImage('https://res.cloudinary.com/demo/image/upload/v123/sample.jpg', { width: 600 })
 *   → '.../upload/f_auto,q_auto,w_600/v123/sample.jpg'
 */
export function optimizeImage(url, { width, quality = 'auto' } = {}) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com')) return url
  if (!url.includes('/upload/')) return url

  const transforms = ['f_auto', `q_${quality}`]
  if (width) transforms.push(`w_${width}`, 'c_limit')

  // Avoid double-injection if transforms are already present.
  const transformStr = transforms.join(',')
  if (url.includes('/upload/f_auto')) return url

  return url.replace('/upload/', `/upload/${transformStr}/`)
}

/**
 * Build a srcset string for responsive Cloudinary images.
 */
export function buildSrcSet(url, widths = [320, 480, 640, 960, 1280]) {
  if (!url || !url.includes('res.cloudinary.com')) return undefined
  return widths.map((w) => `${optimizeImage(url, { width: w })} ${w}w`).join(', ')
}
