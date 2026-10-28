// ทดสอบแบบไม่มี dependency: node tests/test.mjs
import assert from "node:assert/strict";
import { makeRng, simulateWindow } from "../src/signal.js";
import { CONFIG, trainDetector, analyzeWindow } from "../src/gateway.js";

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("ok   -", name); }
  catch (e) { failed++; console.log("FAIL -", name, "\n     ", e.message); }
}

test("rng is deterministic for the same seed", () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

const t0 = Date.now();
const { model, testAccuracy } = trainDetector();
console.log(`     trained in ${((Date.now() - t0) / 1000).toFixed(1)} s, held-out accuracy ${(testAccuracy * 100).toFixed(1)}%`);

test("detector accuracy on held-out synthetic data >= 85%", () => {
  assert.ok(testAccuracy >= 0.85, `accuracy ${testAccuracy}`);
});

test("localization error < 1 m for clear leak (low noise)", () => {
  const rng = makeRng(5);
  const L = 250, leakX = 90;
  const w = simulateWindow({ rng, fs: CONFIG.fs, L, leakX, c: CONFIG.c, noise: 0.1, leak: true, windowS: CONFIG.windowS });
  const r = analyzeWindow(model, w, { L });
  assert.ok(r.alarm, `expected alarm, prob ${r.leakProb}`);
  assert.ok(Math.abs(r.xEst - leakX) < 1, `estimate ${r.xEst}`);
});

test("false alarm rate on normal windows < 15%", () => {
  const rng = makeRng(77);
  let alarms = 0;
  const N = 60;
  for (let i = 0; i < N; i++) {
    const L = 100 + rng() * 300;
    const w = simulateWindow({ rng, fs: CONFIG.fs, L, leakX: 0, c: CONFIG.c, noise: rng() * 1.0, leak: false, windowS: CONFIG.windowS });
    if (analyzeWindow(model, w, { L }).alarm) alarms++;
  }
  assert.ok(alarms / N < 0.15, `false alarm ${alarms}/${N}`);
});

test("no localization estimate when no alarm", () => {
  const rng = makeRng(9);
  const L = 200;
  const w = simulateWindow({ rng, fs: CONFIG.fs, L, leakX: 0, c: CONFIG.c, noise: 1.2, leak: false, windowS: CONFIG.windowS });
  const r = analyzeWindow(model, w, { L });
  if (!r.alarm) assert.equal(r.xEst, null);
});

if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log("\nall tests passed");
