/** Färg för matchningspotential (linjer på kartan, poängmärken). */
export function scoreColor(score: number, rejected = false) {
  if (rejected) return '#ef4444';
  if (score >= 80) return '#059669';
  if (score >= 60) return '#ca8a04';
  return '#94a3b8';
}
