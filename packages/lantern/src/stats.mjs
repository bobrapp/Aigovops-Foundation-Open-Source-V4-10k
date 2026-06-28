// Lantern v-next (M7) — statistical / distributional drift. Zero-dependency.
//
// Structural diff (index.mjs) catches "a field changed". These catch the subtler thing: the
// *distribution* of a metric or feature has shifted, even when every individual value is in range.
//   PSI — Population Stability Index   (classic data/feature drift; >0.25 = significant)
//   KL  — Kullback–Leibler divergence  (relative entropy between two distributions)
//   KS  — Kolmogorov–Smirnov statistic (max distance between two empirical CDFs)

const EPS = 1e-6;

function bounds(s) { let lo = Infinity, hi = -Infinity; for (const x of s) { if (x < lo) lo = x; if (x > hi) hi = x; } return [lo, hi]; }

/** Equal-width bin edges spanning the sample (bins+1 edges). */
export function edges(sample, bins = 10) {
  let [lo, hi] = bounds(sample);
  if (!(hi > lo)) hi = lo + 1; // degenerate: single value
  const w = (hi - lo) / bins;
  return Array.from({ length: bins + 1 }, (_, i) => lo + i * w);
}

/** Count samples per bin, then normalize to proportions. */
export function binProb(sample, e) {
  const bins = e.length - 1;
  const lo = e[0], hi = e[bins], w = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const x of sample) {
    let b = Math.floor((x - lo) / w);
    if (b < 0) b = 0;
    if (b >= bins) b = bins - 1;
    counts[b]++;
  }
  const total = sample.length || 1;
  return counts.map((c) => c / total);
}

/** Population Stability Index between a baseline and a current sample. */
export function psi(baseline, current, bins = 10) {
  const e = edges(baseline, bins);
  const b = binProb(baseline, e), c = binProb(current, e);
  let score = 0;
  for (let i = 0; i < b.length; i++) {
    const ei = Math.max(b[i], EPS), ai = Math.max(c[i], EPS);
    score += (ai - ei) * Math.log(ai / ei);
  }
  return score;
}

/** KL divergence KL(P‖Q) over two probability arrays (each ≈ sums to 1). */
export function klDivergence(p, q) {
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], EPS), qi = Math.max(q[i], EPS);
    kl += pi * Math.log(pi / qi);
  }
  return kl;
}

/** KL between two samples, binned on the baseline's edges: KL(current‖baseline). */
export function klFromSamples(baseline, current, bins = 10) {
  const e = edges(baseline, bins);
  return klDivergence(binProb(current, e), binProb(baseline, e));
}

/** Two-sample Kolmogorov–Smirnov statistic (max CDF distance). */
export function ksStatistic(a, b) {
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  const all = [...new Set([...sa, ...sb])].sort((x, y) => x - y);
  const cdf = (s, v) => { let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] <= v) lo = m + 1; else hi = m; } return lo / s.length; };
  let d = 0;
  for (const v of all) d = Math.max(d, Math.abs(cdf(sa, v) - cdf(sb, v)));
  return d;
}

const DEFAULT_THRESHOLD = { psi: 0.25, kl: 0.1, ks: 0.1 };

/**
 * Distributional drift over two numeric samples.
 * @param {{baseline:number[], current:number[], method?:"psi"|"kl"|"ks", threshold?:number, bins?:number}} args
 * @returns {{method, score, threshold, status, drifted}}
 */
export function distributionDrift({ baseline, current, method = "psi", threshold, bins = 10 }) {
  const thr = threshold ?? DEFAULT_THRESHOLD[method];
  const score =
    method === "psi" ? psi(baseline, current, bins)
    : method === "kl" ? klFromSamples(baseline, current, bins)
    : method === "ks" ? ksStatistic(baseline, current)
    : (() => { throw new Error(`unknown method '${method}'`); })();
  return { method, score, threshold: thr, status: score > thr ? "FAIL" : "PASS", drifted: score > thr };
}
