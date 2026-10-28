// Gateway: เทรนโมเดลตรวจจับ วิเคราะห์หน้าต่างสัญญาณ และประมาณตำแหน่งรั่ว

import { makeRng, simulateWindow } from "./signal.js";
import { extractFeatures } from "./features.js";
import { train, predict, accuracy } from "./model.js";

export const CONFIG = { fs: 5000, c: 1200, windowS: 0.2 };

// สร้างชุดข้อมูลจำลองแบบมีป้ายกำกับ: 1 = มีการรั่ว, 0 = ไม่มีการรั่ว
export function buildDataset(seed, perClass) {
  const rng = makeRng(seed);
  const X = [], y = [];
  for (const leak of [true, false]) {
    for (let k = 0; k < perClass; k++) {
      const L = 100 + rng() * 300;
      const x = L * (0.05 + rng() * 0.9);
      const noise = rng() * 1.5;
      const { sA, sB } = simulateWindow({ rng, fs: CONFIG.fs, L, leakX: x, c: CONFIG.c, noise, leak, windowS: CONFIG.windowS });
      const maxLag = Math.ceil((L / CONFIG.c) * CONFIG.fs) + 2;
      X.push(extractFeatures(sA, sB, maxLag).vector);
      y.push(leak ? 1 : 0);
    }
  }
  return { X, y };
}

// เทรนโมเดลและวัดความแม่นยำบนชุดข้อมูลที่ไม่ได้ใช้เทรน
export function trainDetector({ seed = 7, perClass = 300 } = {}) {
  const train_ = buildDataset(seed, perClass);
  const test = buildDataset(seed + 1000, Math.round(perClass / 2));
  const model = train(train_.X, train_.y);
  return { model, testAccuracy: accuracy(model, test.X, test.y) };
}

// วิเคราะห์หน้าต่างสัญญาณจากเซนเซอร์คู่หนึ่ง
export function analyzeWindow(model, { sA, sB }, { L, threshold = 0.5 } = {}) {
  const maxLag = Math.ceil((L / CONFIG.c) * CONFIG.fs) + 2;
  const { lag, vector, peak } = extractFeatures(sA, sB, maxLag);
  const leakProb = predict(model, vector);
  const alarm = leakProb >= threshold;
  // สูตร x = (L − c·Δt)/2 โดย Δt = lag / fs จากนั้นจำกัดให้อยู่ในช่วงท่อ
  const xEst = alarm ? Math.min(L, Math.max(0, (L - (CONFIG.c * lag) / CONFIG.fs) / 2)) : null;
  return { leakProb, alarm, xEst, lag, peak, features: vector };
}
