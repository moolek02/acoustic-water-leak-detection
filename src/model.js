// โมเดลจำแนกแบบ logistic regression ที่เทรนด้วย gradient descent ในเบราว์เซอร์
// ไม่มี dependency ภายนอก เพื่อให้รันบน GitHub Pages ได้โดยตรง

const sigmoid = z => 1 / (1 + Math.exp(-z));

export function train(X, y, { epochs = 300, lr = 0.5 } = {}) {
  const d = X[0].length, n = X.length;

  // standardize ฟีเจอร์ด้วยค่าเฉลี่ยและส่วนเบี่ยงเบนมาตรฐานของชุดเทรน
  const mean = new Array(d).fill(0), std = new Array(d).fill(0);
  for (const x of X) for (let j = 0; j < d; j++) mean[j] += x[j] / n;
  for (const x of X) for (let j = 0; j < d; j++) std[j] += (x[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;

  const Z = X.map(x => x.map((v, j) => (v - mean[j]) / std[j]));
  const w = new Array(d).fill(0);
  let b = 0;

  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * Z[i][j];
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * Z[i][j] / n;
      gb += err / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * gw[j];
    b -= lr * gb;
  }
  return { mean, std, w, b };
}

export function predict(model, x) {
  let z = model.b;
  for (let j = 0; j < x.length; j++) z += model.w[j] * ((x[j] - model.mean[j]) / model.std[j]);
  return sigmoid(z);
}

export function accuracy(model, X, y, threshold = 0.5) {
  let ok = 0;
  for (let i = 0; i < X.length; i++) if ((predict(model, X[i]) >= threshold ? 1 : 0) === y[i]) ok++;
  return ok / X.length;
}
