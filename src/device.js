// อุปกรณ์ IoT จำลอง: เซนเซอร์ไฮโดรโฟนที่ปลายท่อ ส่ง telemetry เป็น JSON ให้ gateway

export class VirtualSensorNode {
  constructor({ id, position, battery = 100 }) {
    this.id = id;
    this.position = position; // ตำแหน่งบนท่อ (m จากเซนเซอร์ A)
    this.battery = battery;   // เปอร์เซ็นต์
    this.seq = 0;
  }

  // แปลงหน้าต่างสัญญาณเป็น telemetry (ข้อความ JSON) ตามรูปแบบที่ gateway อ่าน
  telemetry(samples, { fs, t0 = Date.parse("2026-10-28T08:00:00Z") } = {}) {
    this.seq += 1;
    this.battery = Math.max(0, this.battery - 0.05);
    let s = 0;
    for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
    return {
      deviceId: this.id,
      seq: this.seq,
      timestamp: new Date(t0 + this.seq * 1000).toISOString(),
      position_m: this.position,
      sampleRate_Hz: fs,
      samples: samples.length,
      rms: Number(Math.sqrt(s / samples.length).toFixed(4)),
      battery_pct: Number(this.battery.toFixed(2)),
    };
  }
}

// ตัวช่วยสร้างเซนเซอร์คู่สำหรับท่อยาว L
export function createPair(L) {
  return [
    new VirtualSensorNode({ id: "NODE-A", position: 0 }),
    new VirtualSensorNode({ id: "NODE-B", position: L }),
  ];
}
