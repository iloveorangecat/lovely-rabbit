// Equally spaced nodes have unequal thresholds. Interpolate their centers.
export function wishAxisPercent(costs: number[], points: number) {
  if (!costs.length || points <= 0) return 0;
  const next = costs.findIndex((cost) => cost > points);
  if (next === -1) return 100;
  if (next === 0) return (points / costs[0]) * (50 / costs.length);
  const fraction = (points - costs[next - 1]) / (costs[next] - costs[next - 1]);
  return ((next - 0.5 + fraction) / costs.length) * 100;
}
