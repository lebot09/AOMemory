/**
 * AO logo, vector traced exactly from the AO Digital Style Guide v2.0 (page 7).
 * Rules from the AO brand portal: blue on light backgrounds, white on blue/dark,
 * clear space of half the logo height, never modified or combined into one mark.
 */
export function AoLogo({ variant = 'blue', height = 32 }: { variant?: 'blue' | 'white'; height?: number }) {
  return <img src={`${import.meta.env.BASE_URL}brand/ao-logo-${variant}.svg`} alt="AO" height={height} width={Math.round(height * 1.885)} draggable={false} />
}

export function Brand() {
  return (
    <span className="brand">
      <AoLogo variant="white" height={28} />
      <span className="brand__name">Memory</span>
    </span>
  )
}
