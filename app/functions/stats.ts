export function getMedian(arr: number[]): number {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)

  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
};

export function getFirstQuartile(arr: number[]): number {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)

  const subArr = arr.length % 2 !== 0
    ? nums.slice(0, mid + 1)
    : nums.slice(0, mid)
  const subArrMid = Math.floor(subArr.length / 2)

  return subArr.length % 2 !== 0 ? subArr[subArrMid] : (subArr[subArrMid - 1] + subArr[subArrMid]) / 2
}

export function getThirdQuartile(arr: number[]): number {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)

  const subArr = nums.slice(mid, arr.length),
    subArrMid = Math.floor(subArr.length / 2)

  return subArr.length % 2 !== 0 ? subArr[subArrMid] : (subArr[subArrMid - 1] + subArr[subArrMid]) / 2
}

export function mean(arr: number[]): number {
  if (!arr.length) return NaN
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const v = arr.reduce((s, v) => s + (v - m) * (v - m), 0) / (arr.length - 1)
  return Math.sqrt(v)
}

export function iqr(arr: number[]): number {
  return getThirdQuartile(arr) - getFirstQuartile(arr)
}

export function mad(arr: number[]): number {
  if (!arr.length) return 0
  const m = getMedian(arr)
  const deviations = arr.map(v => Math.abs(v - m))
  return getMedian(deviations)
}

// Generic bootstrap CI for an estimator (median by default)
export function bootstrapCI(
  arr: number[],
  {
    estimator = getMedian,
    iterations = 1000,
    alpha = 0.05,
    seed,
  }: { estimator?: (a: number[]) => number; iterations?: number; alpha?: number; seed?: number } = {}
): { low: number; high: number } {
  if (arr.length === 0) return { low: NaN, high: NaN }
  const rnd = mulberry32(seed ?? 123456)
  const stats: number[] = []
  const n = arr.length
  for (let i = 0; i < iterations; i++) {
    const sample = new Array(n)
    for (let j = 0; j < n; j++) sample[j] = arr[Math.floor(rnd() * n)]
    stats.push(estimator(sample))
  }
  stats.sort((a, b) => a - b)
  const lowIdx = Math.floor((alpha / 2) * iterations)
  const highIdx = Math.ceil((1 - alpha / 2) * iterations) - 1
  return { low: stats[lowIdx], high: stats[highIdx] }
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}