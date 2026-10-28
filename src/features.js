// สกัดคุณลักษณะ (features) จากหน้าต่างสัญญาณ 2 ช่องเพื่อส่งให้โมเดล AI

export function rms(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

// สัดส่วนพลังงานความถี่สูง: พลังงานของอนุพันธ์อันดับหนึ่งเทียบกับพลังงานรวม
// เสียงพื้นหลังความถี่ต่ำ (ปั๊ม) จะมีค่าต่ำ ส่วนเสียงรั่วจะสูงกว่า
export function highFreqRatio(x) {
  let e = 0, de = 0;
  for (let i = 0; i < x.length; i++) e += x[i] * x[i];
  for (let i = 1; i < x.length; i++) {
    const d = x[i] - x[i - 1];
    de += d * d;
  }
  return e > 0 ? de / e : 0;
}

// Normalized cross-correlation หาพีคสูงสุดของ |R(k)| ในช่วง lag ที่เป็นไปได้
// คืนค่า { lag (จำนวนตัวอย่าง), peak (ค่าระหว่าง -1 ถึง 1) }
export function crossCorr(sA, sB, maxLag) {
  const n = sA.length;
  let eA = 0, eB = 0;
  for (let i = 0; i < n; i++) { eA += sA[i] * sA[i]; eB += sB[i] * sB[i]; }
  const norm = Math.sqrt(eA * eB) || 1;

  let bestLag = 0, bestAbs = -1, bestVal = 0;
  for (let k = -maxLag; k <= maxLag; k++) {
    let s = 0;
    const i0 = Math.max(0, -k), i1 = Math.min(n, n - k);
    for (let i = i0; i < i1; i++) s += sA[i] * sB[i + k];
    s /= norm;
    if (Math.abs(s) > bestAbs) { bestAbs = Math.abs(s); bestLag = k; bestVal = s; }
  }
  return { lag: bestLag, peak: bestVal };
}

// เวกเตอร์คุณลักษณะ 4 มิติ
// [peak correlation, สัดส่วนความถี่สูงเฉลี่ย, log10(RMS เฉลี่ย), ความไม่สมดุลของ RMS]
export function extractFeatures(sA, sB, maxLag) {
  const { lag, peak } = crossCorr(sA, sB, maxLag);
  const rA = rms(sA), rB = rms(sB);
  const hf = (highFreqRatio(sA) + highFreqRatio(sB)) / 2;
  const logRms = Math.log10((rA + rB) / 2 + 1e-9);
  const imbalance = Math.abs(Math.log10((rA + 1e-9) / (rB + 1e-9)));
  return { lag, vector: [Math.abs(peak), hf, logRms, imbalance], peak };
}
