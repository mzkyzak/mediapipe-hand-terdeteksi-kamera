/**
 * NovaSpark Engine — 3D Particle System for Mode 3
 * Supports 13 Shapes: NEBULA, HEART, SATURN, LOTUS, GALAXY, JELLYFISH, TORUS, TORNADO, DOUBLE HELIX, CUBE, BUTTERFLY, PEACH BLOSSOM, MZKYZAK STAR
 */

const NOVA_COUNT = 1800; // Optimal particle count for smooth 60 FPS 2D projection

// ---- Particle class: pure JS, 3D coordinates projected into 2D ----
class NovaSpark {
  constructor() { this.reset(); }

  reset() {
    this.x = (Math.random() - 0.5) * 700;
    this.y = (Math.random() - 0.5) * 700;
    this.z = (Math.random() - 0.5) * 700;
    this.tx = this.x; this.ty = this.y; this.tz = this.z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.r = 255; this.g = 255; this.b = 255;
  }

  update() {
    this.vx += (this.tx - this.x) * 0.05;
    this.vy += (this.ty - this.y) * 0.05;
    this.vz += (this.tz - this.z) * 0.05;
    this.vx *= 0.78; this.vy *= 0.78; this.vz *= 0.78;
    this.x += this.vx; this.y += this.vy; this.z += this.vz;
  }

  drawRotated(ctx, cx, cy, scale, cosY, sinY, cosX, sinX, cosZ, sinZ) {
    // 3D rotation transform: Y-axis (Yaw) -> X-axis (Pitch) -> Z-axis (Roll)
    let x1 = this.x * cosY + this.z * sinY;
    let y1 = this.y;
    let z1 = -this.x * sinY + this.z * cosY;

    let x2 = x1;
    let y2 = y1 * cosX - z1 * sinX;
    let z2 = y1 * sinX + z1 * cosX;

    let rx = x2 * cosZ - y2 * sinZ;
    let ry = x2 * sinZ + y2 * cosZ;
    let rz = z2;

    const depth = 700 / (700 + rz);
    const sx = cx + rx * depth * scale;
    const sy = cy + ry * depth * scale;
    const sr = Math.max(0.6, 2.4 * depth * Math.min(scale, 1.8));

    if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;

    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`;
    ctx.fill();
  }

  draw(ctx, cx, cy, scale) {
    this.drawRotated(ctx, cx, cy, scale, 1, 0, 1, 0, 1, 0);
  }
}

// ---- Shape Generators ----
function _shapeNebula() {
  const pts = [], cols = [];
  const palette = [[245,179,66], [100,149,237], [138,43,226], [0,240,255], [255,60,150]];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const angle = (i / NOVA_COUNT) * Math.PI * 44;
    const spiral = (i / NOVA_COUNT) * 550;
    const spread = (Math.random() - 0.5) * 200;
    pts.push([
      Math.cos(angle) * spiral + spread,
      Math.sin(angle) * spiral * 0.5 + (Math.random() - 0.5) * 260,
      (Math.random() - 0.5) * 580
    ]);
    cols.push(palette[i % palette.length]);
  }
  return { pts, cols };
}

function _shapeSaturn(rot) {
  const pts = [], cols = [];
  const tilt = Math.PI / 7;
  const planetR = 90;
  const coreCount = Math.floor(NOVA_COUNT * 0.28);
  const ringCount = NOVA_COUNT - coreCount;

  for (let i = 0; i < coreCount; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / coreCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i + rot;
    const r = planetR;
    let x = r * Math.sin(phi) * Math.cos(theta);
    let y = r * Math.cos(phi);
    let z = r * Math.sin(phi) * Math.sin(theta);
    let ny = y * Math.cos(tilt) - z * Math.sin(tilt);
    let nz = y * Math.sin(tilt) + z * Math.cos(tilt);
    let nx = x * Math.cos(rot * 0.35) + nz * Math.sin(rot * 0.35);
    nz = -x * Math.sin(rot * 0.35) + nz * Math.cos(rot * 0.35);
    pts.push([nx, ny, nz]);
    cols.push([245, 179, 66]);
  }

  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    const dist = 120 + Math.pow(Math.random(), 0.6) * 130;
    let rx = Math.cos(angle) * dist;
    let rz = Math.sin(angle) * dist;
    let ry = (Math.random() - 0.5) * 5;
    let ny2 = ry * Math.cos(tilt) - rz * Math.sin(tilt);
    let nz2 = ry * Math.sin(tilt) + rz * Math.cos(tilt);
    let nx2 = rx * Math.cos(rot * 0.3) + nz2 * Math.sin(rot * 0.3);
    nz2 = -rx * Math.sin(rot * 0.3) + nz2 * Math.cos(rot * 0.3);
    pts.push([nx2, ny2, nz2]);
    cols.push([0, 229, 255]);
  }

  return { pts: pts.slice(0, NOVA_COUNT), cols: cols.slice(0, NOVA_COUNT) };
}

function _shapeHeart(pulse, t = 0) {
  const pts = [], cols = [];
  // Vibrant multi-color palette inspired by Screenshot 1 (rainbow burst) & Screenshot 2 (star dust)
  const rainbowPalette = [
    [255, 40, 120],  // Neon Pink / Heart Magenta
    [255, 90, 0],    // Warm Coral / Sunset Orange
    [255, 220, 0],   // Electric Gold
    [0, 240, 255],   // Cyan Glow
    [170, 50, 255],  // Royal Purple
    [255, 0, 180]    // Deep Magenta Burst
  ];

  // 65% Core Heart Perimeter with radiating burst rays (Screenshot 1)
  const coreCount = Math.floor(NOVA_COUNT * 0.65);
  for (let i = 0; i < coreCount; i++) {
    const angle = (i / coreCount) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(angle), 3);
    const hy = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));

    // Burst rays radiating outward along perimeter
    const isRay = (i % 6 === 0);
    const rayLen = isRay ? (1.0 + Math.sin(t * 6 + i) * 0.35) : 1.0;
    const scale = 14.5 * pulse * rayLen;

    const x = hx * scale;
    const y = hy * scale;
    const z = (Math.random() - 0.5) * 85;

    pts.push([x, y, z]);
    cols.push(rainbowPalette[i % rainbowPalette.length]);
  }

  // 35% Romantic Sparkling Star Dust Inside & Surrounding Heart (Screenshot 2 "Corazón de Estrella")
  for (let i = coreCount; i < NOVA_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rInner = Math.pow(Math.random(), 0.6);
    const hx = 16 * Math.pow(Math.sin(angle), 3) * rInner;
    const hy = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * rInner;

    const scale = 14.0 * pulse;
    const x = hx * scale + (Math.random() - 0.5) * 35;
    const y = hy * scale + (Math.random() - 0.5) * 35;
    const z = (Math.random() - 0.5) * 150;

    pts.push([x, y, z]);
    // Soft romantic sparkling star dust colors
    cols.push(i % 2 === 0 ? [255, 190, 230] : [255, 235, 255]);
  }

  return { pts, cols };
}

function _shapeEarthSolar(t, rot) {
  const pts = [], cols = [];
  const globeR = 125;
  const coreCount = Math.floor(NOVA_COUNT * 0.6);

  // Earth Globe Sphere (Blue Oceans & Green Continents)
  for (let i = 0; i < coreCount; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / coreCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i + rot * 0.4;

    const lat = phi - Math.PI / 2;
    const lon = theta;
    const isLand = (Math.sin(lat * 4) + Math.cos(lon * 5) > 0.25);

    const x = globeR * Math.sin(phi) * Math.cos(theta);
    const y = globeR * Math.cos(phi);
    const z = globeR * Math.sin(phi) * Math.sin(theta);

    pts.push([x, y, z]);
    cols.push(isLand ? [0, 255, 130] : [0, 160, 255]); // Emerald Green Land, Azure Blue Ocean
  }

  // Solar System Orbit Rings & Satellites (Gold & Electric Cyan)
  const ringCount = NOVA_COUNT - coreCount;
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    const dist = 185 + Math.sin(angle * 4 + t * 2) * 35;
    const rx = Math.cos(angle + rot) * dist;
    const rz = Math.sin(angle + rot) * dist;
    const ry = Math.sin(angle * 3) * 40;

    pts.push([rx, ry, rz]);
    cols.push(i % 3 === 0 ? [255, 215, 0] : [0, 240, 255]);
  }

  return { pts, cols };
}

function _shapeMzkyzakName(t) {
  const pts = [], cols = [];
  // 3D Letter vector strokes for M Z K Y Z A K
  const letters = [
    // M
    [[0,0],[0,100],[50,50],[100,100],[100,0]],
    // Z
    [[0,100],[100,100],[0,0],[100,0]],
    // K
    [[0,0],[0,100],[0,50],[100,100],[0,50],[100,0]],
    // Y
    [[0,100],[50,50],[100,100],[50,50],[50,0]],
    // Z
    [[0,100],[100,100],[0,0],[100,0]],
    // A
    [[0,0],[50,100],[100,0],[25,50],[75,50]],
    // K
    [[0,0],[0,100],[0,50],[100,100],[0,50],[100,0]]
  ];

  const perLetter = Math.floor(NOVA_COUNT * 0.85 / letters.length);
  letters.forEach((strokes, lIdx) => {
    const startX = -320 + lIdx * 105;
    for (let i = 0; i < perLetter; i++) {
      const strokeIdx = i % strokes.length;
      const p1 = strokes[strokeIdx];
      const p2 = strokes[(strokeIdx + 1) % strokes.length];
      const interp = Math.random();

      const lx = (p1[0] + (p2[0] - p1[0]) * interp) * 0.75 + startX;
      const ly = (p1[1] + (p2[1] - p1[1]) * interp) * 0.75 - 35;
      const lz = (Math.random() - 0.5) * 40 + Math.sin(t * 3 + lIdx) * 15;

      pts.push([lx, ly, lz]);
      cols.push(lIdx % 2 === 0 ? [0, 240, 255] : [255, 215, 0]); // Electric Cyan & Gold
    }
  });

  // Floating Star Dust around text emblem
  while (pts.length < NOVA_COUNT) {
    pts.push([
      (Math.random() - 0.5) * 750,
      (Math.random() - 0.5) * 320,
      (Math.random() - 0.5) * 220
    ]);
    cols.push([255, 0, 160]);
  }

  return { pts, cols };
}

function _shapeLotus(rot) {
  const pts = [], cols = [];
  const petals = 7;
  for (let i = 0; i < NOVA_COUNT; i++) {
    const u = (i / NOVA_COUNT) * Math.PI * 2 + rot;
    const v = Math.random();
    const rBase = 220 * (0.5 + 0.5 * Math.pow(Math.sin(petals * u * 0.5), 2)) * v;
    const x = rBase * Math.cos(u);
    const z = rBase * Math.sin(u);
    const y = (4 * Math.pow(v, 2) - 2) * 50;
    pts.push([x, y, z]);
    cols.push([255, 130, 200]);
  }
  return { pts, cols };
}

function _shapeGalaxy(rot) {
  const pts = [], cols = [];
  const arms = 3;
  for (let i = 0; i < NOVA_COUNT; i++) {
    const spin = i % arms;
    const angleOffset = (spin / arms) * Math.PI * 2;
    const dist = Math.pow(i / NOVA_COUNT, 0.5);
    const r = dist * 320;
    const angle = dist * 10 + angleOffset + rot;
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    const y = (Math.random() - 0.5) * (300 - r) * 0.2;
    pts.push([x, y, z]);
    cols.push([0, 229, 255]);
  }
  return { pts, cols };
}

function _shapeJellyfish(t) {
  const pts = [], cols = [];
  const capCount = Math.floor(NOVA_COUNT * 0.35);
  for (let i = 0; i < capCount; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random();
    const r = 180 * Math.sqrt(v);
    const x = r * Math.cos(u);
    const z = r * Math.sin(u);
    const y = -120 + Math.sin(t * 2) * 20 - Math.pow(v, 1.5) * 120;
    pts.push([x, y, z]);
    cols.push([0, 255, 200]);
  }
  for (let i = capCount; i < NOVA_COUNT; i++) {
    const tentacleIdx = i % 12;
    const angle = (tentacleIdx / 12) * Math.PI * 2;
    const len = (i - capCount) / (NOVA_COUNT - capCount);
    const r = 100 + Math.sin(t * 3 + len * 6) * 20;
    const x = r * Math.cos(angle) + Math.sin(t * 2 + len * 4) * 30;
    const z = r * Math.sin(angle) + Math.cos(t * 2 + len * 4) * 30;
    const y = -120 + len * 350;
    pts.push([x, y, z]);
    cols.push([255, 0, 180]);
  }
  return { pts, cols };
}

function _shapeTorus(rot) {
  const pts = [], cols = [];
  const R = 200, r = 60;
  for (let i = 0; i < NOVA_COUNT; i++) {
    const u = (i / NOVA_COUNT) * Math.PI * 2 + rot;
    const v = Math.random() * Math.PI * 2;
    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const z = (R + r * Math.cos(v)) * Math.sin(u);
    const y = r * Math.sin(v);
    pts.push([x, y, z]);
    cols.push([0, 255, 153]);
  }
  return { pts, cols };
}

function _shapeTornado(t) {
  const pts = [], cols = [];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const progress = i / NOVA_COUNT;
    const y = (progress - 0.5) * 450;
    const rad = 20 + progress * 220;
    const angle = progress * Math.PI * 24 + t * 4;
    const x = rad * Math.cos(angle);
    const z = rad * Math.sin(angle);
    pts.push([x, y, z]);
    cols.push([255, 183, 0]);
  }
  return { pts, cols };
}

function _shapeDoubleHelix(t) {
  const pts = [], cols = [];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const progress = i / NOVA_COUNT;
    const y = (progress - 0.5) * 500;
    const strand = (i % 2 === 0) ? 0 : Math.PI;
    const angle = progress * Math.PI * 12 + t * 2 + strand;
    const r = 110;
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    pts.push([x, y, z]);
    cols.push(i % 2 === 0 ? [0, 229, 255] : [255, 0, 120]);
  }
  return { pts, cols };
}

function _shapeCube(rot) {
  const pts = [], cols = [];
  const s = 150;
  for (let i = 0; i < NOVA_COUNT; i++) {
    const face = i % 6;
    const a = (Math.random() - 0.5) * 2 * s;
    const b = (Math.random() - 0.5) * 2 * s;
    let x, y, z;
    if (face === 0) { x = s; y = a; z = b; }
    else if (face === 1) { x = -s; y = a; z = b; }
    else if (face === 2) { x = a; y = s; z = b; }
    else if (face === 3) { x = a; y = -s; z = b; }
    else if (face === 4) { x = a; y = b; z = s; }
    else { x = a; y = b; z = -s; }
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    pts.push([rx, y, rz]);
    cols.push([0, 240, 255]);
  }
  return { pts, cols };
}

function _shapeButterfly(t) {
  const pts = [], cols = [];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const u = (i / NOVA_COUNT) * Math.PI * 2;
    const r = Math.exp(Math.sin(u)) - 2 * Math.cos(4 * u) + Math.pow(Math.sin((2 * u - Math.PI) / 24), 5);
    const flap = 1.0 + Math.sin(t * 3) * 0.15;
    const x = r * 80 * Math.cos(u) * flap;
    const y = r * 80 * Math.sin(u) * 0.6;
    const z = (Math.random() - 0.5) * 60;
    pts.push([x, y, z]);
    cols.push([255, 100, 200]);
  }
  return { pts, cols };
}

function _shapePeachBlossom(rot) {
  const pts = [], cols = [];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const angle = (i / NOVA_COUNT) * Math.PI * 10 + rot;
    const r = Math.sin(5 * angle / 2) * 220;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle) * 0.8;
    const z = (Math.random() - 0.5) * 50;
    pts.push([x, y, z]);
    cols.push([255, 180, 210]);
  }
  return { pts, cols };
}

function _shapeStarForge(t, rot) {
  const pts = [], cols = [];
  const points = 8;
  const innerR = 95;
  const outerR = 230;
  const heightExtrude = 85;

  // Spectrum colors from Estrella.html Star Forge (#4f6fff Core, #c462ff Aura, #ff4f7e Edge)
  const colorCore = [79, 111, 255];   // Electric Blue
  const colorAura = [196, 98, 255];   // Neon Purple
  const colorEdge = [255, 79, 126];   // Bright Coral Pink

  const meshCount = Math.floor(NOVA_COUNT * 0.7);

  // 1. Extruded 3D 8-Point Star Forge Mesh & Energy Flow
  for (let i = 0; i < meshCount; i++) {
    const angleIndex = Math.floor((i / meshCount) * points * 2);
    const stepFrac = ((i / meshCount) * points * 2) % 1;
    const a1 = (angleIndex * Math.PI) / points;
    const a2 = ((angleIndex + 1) * Math.PI) / points;

    const r1 = angleIndex % 2 === 0 ? outerR : innerR;
    const r2 = (angleIndex + 1) % 2 === 0 ? outerR : innerR;

    const currentR = r1 + (r2 - r1) * stepFrac;
    const currentAngle = a1 + (a2 - a1) * stepFrac + rot;

    // Energy pulse displacement
    const pulse = Math.sin(t * 3.5 + currentR * 0.04) * 16;
    const x = Math.sin(currentAngle) * (currentR + pulse);
    const y = Math.cos(currentAngle) * (currentR + pulse);
    const z = (Math.random() - 0.5) * heightExtrude;

    pts.push([x, y, z]);

    // Color gradient mapping
    const normR = (currentR - innerR) / (outerR - innerR);
    if (normR < 0.35) cols.push(colorCore);
    else if (normR < 0.75) cols.push(colorAura);
    else cols.push(colorEdge);
  }

  // 2. Ambient Starfield & Energy Sprites
  const starCount = NOVA_COUNT - meshCount;
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 320;
    const x = Math.cos(angle + rot * 0.4) * dist;
    const y = Math.sin(angle + rot * 0.4) * dist;
    const z = (Math.random() - 0.5) * 180;

    pts.push([x, y, z]);
    cols.push(i % 3 === 0 ? colorCore : (i % 3 === 1 ? colorAura : colorEdge));
  }

  return { pts, cols };
}

function _shapeMzkyzakStar(t) {
  const pts = [], cols = [];
  for (let i = 0; i < NOVA_COUNT; i++) {
    const angle = (i / NOVA_COUNT) * Math.PI * 2;
    const starR = (i % 2 === 0 ? 250 : 100) + Math.sin(t * 3 + i) * 15;
    const pAngle = Math.floor(i % 5) * (Math.PI * 2 / 5) + (i / NOVA_COUNT) * 0.2 + t * 0.5;
    const x = Math.cos(pAngle) * starR;
    const y = Math.sin(pAngle) * starR;
    const z = (Math.random() - 0.5) * 80;
    pts.push([x, y, z]);
    cols.push(i % 2 === 0 ? [0, 255, 153] : [255, 230, 0]);
  }
  return { pts, cols };
}

// Particle System Wrapper
class ParticleSystem {
  constructor(scene, count) {
    this.scene = scene;
    this.count = NOVA_COUNT;
    this.sparks = Array.from({ length: NOVA_COUNT }, () => new NovaSpark());
    this.currentShape = "GALAXY";
    this._rot = 0;
    this._time = 0;
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this._setShapeData(_shapeGalaxy(0));
  }

  _setShapeData({ pts, cols }) {
    for (let i = 0; i < this.count; i++) {
      const p = this.sparks[i];
      if (i < pts.length) {
        p.tx = pts[i][0]; p.ty = pts[i][1]; p.tz = pts[i][2];
        if (cols[i]) { p.r = cols[i][0]; p.g = cols[i][1]; p.b = cols[i][2]; }
      }
    }
  }

  _reset() {
    this.sparks.forEach(p => p.reset());
  }

  setShape(shapeKey) {
    if (this.currentShape !== shapeKey) {
      this._reset();
      this.currentShape = shapeKey;
    }
  }

  update(isBurst = false) {
    this._time += isBurst ? 0.035 : 0.016;
    this._rot += isBurst ? 0.045 : 0.02;

    let data;
    const pulseFactor = isBurst ? (1 + Math.sin(this._time * 8) * 0.22) : (1 + Math.sin(this._time * 4) * 0.15);
    switch (this.currentShape) {
      case "NEBULA": data = _shapeNebula(); break;
      case "HEART": data = _shapeHeart(pulseFactor, this._time); break;
      case "SATURN": data = _shapeSaturn(this._rot); break;
      case "STAR_FORGE": data = _shapeStarForge(this._time, this._rot); break;
      case "EARTH_SOLAR": data = _shapeEarthSolar(this._time, this._rot); break;
      case "MZKYZAK_NAME": data = _shapeMzkyzakName(this._time); break;
      case "LOTUS": data = _shapeLotus(this._rot); break;
      case "GALAXY": data = _shapeGalaxy(this._rot); break;
      case "JELLYFISH": data = _shapeJellyfish(this._time); break;
      case "TORUS": data = _shapeTorus(this._rot); break;
      case "TORNADO": data = _shapeTornado(this._time); break;
      case "DOUBLEHELIX": data = _shapeDoubleHelix(this._time); break;
      case "CUBE": data = _shapeCube(this._rot); break;
      case "BUTTERFLY": data = _shapeButterfly(this._time); break;
      case "PEACHBLOSSOM": data = _shapePeachBlossom(this._rot); break;
      case "MZKYZAK_STAR": data = _shapeMzkyzakStar(this._time); break;
      default: data = _shapeGalaxy(this._rot); break;
    }

    if (isBurst) {
      // Add dynamic radial wave pulse when burst is active
      const burstScale = 1.0 + Math.sin(this._time * 10) * 0.18;
      for (let i = 0; i < data.pts.length; i++) {
        data.pts[i][0] *= burstScale;
        data.pts[i][1] *= burstScale;
        data.pts[i][2] *= burstScale;
      }
    }

    this._setShapeData(data);
    this.sparks.forEach(p => p.update());
  }

  draw(ctx, cx, cy, scale = 1.0, addRotX = 0, addRotY = 0, addRotZ = 0, isBurst = false) {
    this.rotX += addRotX;
    this.rotY += addRotY;
    this.rotZ += addRotZ;

    const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);
    const cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX);
    const cosZ = Math.cos(this.rotZ), sinZ = Math.sin(this.rotZ);

    if (isBurst) {
      // Render glowing energy shockwave core when burst is active
      ctx.save();
      const waveRadius = (Math.sin(Date.now() * 0.008) * 0.5 + 0.5) * 220 + 80;
      const pulseGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, waveRadius * scale);
      pulseGrad.addColorStop(0, "rgba(0, 240, 255, 0.25)");
      pulseGrad.addColorStop(0.5, "rgba(255, 0, 150, 0.15)");
      pulseGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = pulseGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.sparks.forEach(p => p.drawRotated(ctx, cx, cy, scale, cosY, sinY, cosX, sinX, cosZ, sinZ));
  }
}
