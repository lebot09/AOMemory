/**
 * Placeholder wordmark. Replace with the official AO logo SVG from brand.aofoundation.org
 * (save it as public/brand/ao-logo.svg and set HAS_OFFICIAL_LOGO = true).
 */
const HAS_OFFICIAL_LOGO = false

export function Brand() {
  if (HAS_OFFICIAL_LOGO) return <img src="/brand/ao-logo.svg" alt="AO" height={40} />
  return (
    <span className="brand" aria-label="AO Memory">
      <span className="brand__mark" aria-hidden="true">AO</span>
      <span className="brand__name">Memory</span>
    </span>
  )
}
