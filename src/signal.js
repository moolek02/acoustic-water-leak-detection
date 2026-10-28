// สร้างสัญญาณเสียงจำลองสำหรับท่อประปา: เสียงรั่ว เสียงพื้นหลัง (ปั๊ม) และสัญญาณรบกวน

// Mulberry32: ตัวสุ่มที่ใช้ seed ได้ เพื่อให้ผลซ้ำได้
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller: สุ่มแบบเกาส์เซียน
export function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// เสียงรั่ว: white noise ผ่าน one-pole low-pass คูณ envelope ที่ดังตอนแรกแล้วค่อย ๆ จาง
export function leakSound(rng, fs, n) {
  const out = new Float32Array(n);
  const a = 0.85;
  const burst = Math.floor(0.12 * fs);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = a * y + (1 - a) * gauss(rng);
    const env = i < burst ? 1 : Math.exp(-(i - burst) / (0.03 * fs));
    out[i] = y * env * 10;
  }
  return out;
}

// เสียงพื้นหลังของระบบ (ปั๊มและการไหล): เสียงความถี่ต่ำ 50/100 Hz ผสมกับ noise สีแดง
export function backgroundSound(rng, fs, n) {
  const out = new Float32Array(n);
  const p1 = rng() * 2 * Math.PI, p2 = rng() * 2 * Math.PI;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    drift = 0.995 * drift + 0.05 * gauss(rng);
    out[i] = 0.5 * Math.sin(2 * Math.PI * 50 * t + p1)
      + 0.2 * Math.sin(2 * Math.PI * 100 * t + p2)
      + 0.3 * drift;
  }
  return out;
}

// หน่วงสัญญาณไปยังเซนเซอร์ด้วยจำนวนตัวอย่าง d (ก่อนถึงเวลาเป็นศูนย์)
function delay(src, d, n) {
  const out = new Float32Array(n);
  for (let i = d; i < n; i++) out[i] = src[i - d];
  return out;
}

// สร้างหน้าต่างสัญญาณ 2 ช่อง (เซนเซอร์ A ที่ x=0 และ B ที่ x=L)
// ถ้า leak=false จะเป็นเสียงพื้นหลังอย่างเดียว
export function simulateWindow({ rng, fs, L, leakX, c, noise, leak = true, windowS = 0.4 }) {
  const n = Math.floor(windowS * fs);
  const maxDelay = Math.ceil((L / c) * fs) + 1;
  const src = leakSound(rng, fs, n + maxDelay);
  const bgA = backgroundSound(rng, fs, n);
  const bgB = backgroundSound(rng, fs, n);

  let sA = new Float32Array(n), sB = new Float32Array(n);
  if (leak) {
    const dA = Math.round((leakX / c) * fs);
    const dB = Math.round(((L - leakX) / c) * fs);
    sA = delay(src, dA, n);
    sB = delay(src, dB, n);
  }
  for (let i = 0; i < n; i++) {
    sA[i] += bgA[i] + noise * gauss(rng);
    sB[i] += bgB[i] + noise * gauss(rng);
  }
  return { sA, sB };
}
