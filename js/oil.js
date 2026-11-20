/* Paper-space albedo and paint height. The same surface is used for drawing, replay and export. */
(function (game) {
  "use strict";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const tileSize = 128;
  function linenTile() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = tileSize;
    const ctx = tile.getContext("2d");
    const image = ctx.createImageData(tileSize, tileSize);
    let seed = 13579;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const warp = Math.cos(Math.PI * 0.5 * x + 0.25 * Math.sin((y * Math.PI) / 16));
        const weft = Math.cos(Math.PI * 0.5 * y + 0.32 * Math.sin((x * Math.PI) / 32));
        const onTop = ((x >> 2) + (y >> 2)) & 1;
        const grain = (onTop ? warp * 3.4 + weft : weft * 3.2 + warp) + (seed / 2 ** 32 - 0.5) * 4;
        const i = (y * tileSize + x) * 4;
        image.data[i] = 246 + grain;
        image.data[i + 1] = 242 + grain;
        image.data[i + 2] = 232 + grain;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return tile;
  }

  class OilSurface {
    constructor(ctx) {
      this.ctx = ctx;
      this.width = ctx.canvas.width;
      this.height = ctx.canvas.height;
      this.linen = ctx.createPattern(linenTile(), "repeat");
      ctx.fillStyle = this.linen;
      ctx.fillRect(0, 0, this.width, this.height);
      this.ground = ctx.getImageData(0, 0, this.width, this.height);
      this.base = new Uint8ClampedArray(this.ground.data);
      this.image = ctx.createImageData(this.width, this.height);
      const count = this.width * this.height;
      this.heightField = new Float32Array(count);
      this.under = new Float32Array(count);
      this.layer = new Uint32Array(count);
      this.serial = 0;
    }
    clear() {
      this.base.set(this.ground.data);
      this.image.data.set(this.ground.data);
      this.heightField.fill(0);
      this.dirty = null;
      this.ctx.putImageData(this.ground, 0, 0);
    }
    adoptFlatLayer() {
      this.base.set(this.ctx.getImageData(0, 0, this.width, this.height).data);
      this.image.data.set(this.base);
    }
    begin(stroke) {
      this.serial++;
      this.erase = stroke.material === "erase";
      this.rgb = game.pigment.hexToRgb(stroke.ink).map((v) => Math.round(v * 255));
      const [x, y, width] = stroke.points[0];
      this.travel = 0;
      this.phase = (x * 0.031 + y * 0.017 + width * 0.23) % (2 * Math.PI);
      // A fixed cross-section travels with the brush so grooves continue across pointer events.
      this.profile = new Float32Array(256);
      const groups = Math.max(2, Math.min(17, width / 5));
      for (let i = 0; i < this.profile.length; i++) {
        const u = (i / 255) * 2 - 1;
        const coarse = Math.sin(u * groups * Math.PI + this.phase + 1.1 * Math.sin(7 * u + this.phase));
        const fine = Math.cos(2.7 * groups * Math.PI * u + 0.7 * coarse);
        this.profile[i] = 1.6 + 0.86 * coarse + 0.37 * fine + 0.28 * Math.sin(8 * u + this.phase);
      }
    }
    dab(a, b, headingX, headingY) {
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      const tx = length ? dx / length : headingX,
        ty = length ? dy / length : headingY;
      const margin = Math.max(a[2], b[2]) / 2 + 2;
      const left = clamp(Math.floor(Math.min(a[0], b[0]) - margin), 0, this.width);
      const right = clamp(Math.ceil(Math.max(a[0], b[0]) + margin), 0, this.width);
      const top = clamp(Math.floor(Math.min(a[1], b[1]) - margin), 0, this.height);
      const bottom = clamp(Math.ceil(Math.max(a[1], b[1]) + margin), 0, this.height);
      if (left >= right || top >= bottom) {
        this.travel += length;
        return;
      }
      const rect = this.dirty;
      if (rect) {
        rect.left = Math.min(rect.left, left);
        rect.right = Math.max(rect.right, right);
        rect.top = Math.min(rect.top, top);
        rect.bottom = Math.max(rect.bottom, bottom);
      } else this.dirty = { left, right, top, bottom };
      const wave = this.phase + this.travel / 56;
      const field = this.heightField;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const ox = x + 0.5 - a[0],
            oy = y + 0.5 - a[1];
          const along = ox * tx + oy * ty,
            side = oy * tx - ox * ty;
          const distance = clamp(along, 0, length);
          const radius = (a[2] + (b[2] - a[2]) * (length ? distance / length : 0)) / 2;
          const overhang = along - distance;
          const r2 = side * side + overhang * overhang;
          if (r2 > (radius + 1) ** 2) continue;
          const edge = radius - Math.sqrt(r2);
          const u = side / radius;
          const drift = 0.047 * Math.sin(wave + distance / 56 + 3.2 * u);
          const k = clamp((u + drift + 1) * 127.5, 0, 254.999);
          const j = Math.floor(k);
          const ridge = this.profile[j] + (this.profile[j + 1] - this.profile[j]) * (k - j);
          const coverage = clamp(edge + 0.5 + (this.erase ? 0 : (ridge - 1.6) * 0.75), 0, 1);
          if (!coverage) continue;
          const idx = y * this.width + x,
            pixel = idx * 4;
          const firstContact = this.layer[idx] !== this.serial;
          if (firstContact) {
            this.under[idx] = field[idx];
            this.layer[idx] = this.serial;
          }
          if (this.erase) {
            field[idx] *= 1 - coverage;
            for (let c = 0; c < 3; c++)
              this.base[pixel + c] += (this.ground.data[pixel + c] - this.base[pixel + c]) * coverage;
          } else {
            const body = clamp(edge / Math.max(1, radius * 0.18), 0, 1);
            const thickness = (0.65 + 0.64 * ridge) * Math.min(2.1, 0.65 + radius / 25);
            const deposit = this.under[idx] * 0.52 + thickness * body;
            // Overlapping sections of one brush pass share a ridge, including their round caps.
            if (firstContact || deposit > field[idx]) field[idx] += (deposit - field[idx]) * coverage;
            for (let c = 0; c < 3; c++)
              this.base[pixel + c] += (this.rgb[c] - this.base[pixel + c]) * coverage;
          }
        }
      }
      this.travel += length;
    }
    point(stroke, index) {
      const pts = stroke.points,
        end = pts[index];
      if (index === 0) {
        this.begin(stroke);
        this.dab(end, end, Math.cos(this.phase), Math.sin(this.phase));
        return;
      }
      const control = pts[index - 1],
        previous = pts[Math.max(0, index - 2)];
      const a = previous.map((v, i) => (v + control[i]) / 2);
      const b = end.map((v, i) => (v + control[i]) / 2);
      const steps = Math.max(
        1,
        Math.ceil(
          (Math.hypot(a[0] - control[0], a[1] - control[1]) +
            Math.hypot(b[0] - control[0], b[1] - control[1])) /
            Math.max(5, control[2] * 0.32),
        ),
      );
      let last = a;
      for (let n = 1; n <= steps; n++) {
        const t = n / steps,
          s = 1 - t;
        const tip = b.map((v, i) => s * s * a[i] + 2 * s * t * control[i] + t * t * v);
        this.dab(last, tip, 1, 0);
        last = tip;
      }
    }
    finish(stroke) {
      const pts = stroke.points;
      if (pts.length < 2) return;
      const b = pts.at(-1),
        a = pts.at(-2);
      this.dab(
        a.map((v, i) => (v + b[i]) / 2),
        b,
        1,
        0,
      );
    }
    present() {
      if (!this.dirty) return;
      const { left, top, right, bottom } = this.dirty;
      const field = this.heightField,
        out = this.image.data,
        w = this.width;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const i = y * w + x,
            p = i * 4,
            h = field[i];
          let shade = 1,
            sheen = 0;
          if (h > 0.002) {
            const gx = (field[i + (x < w - 1 ? 1 : 0)] - field[i - (x ? 1 : 0)]) * 0.5;
            const gy = (field[i + (y < this.height - 1 ? w : 0)] - field[i - (y ? w : 0)]) * 0.5;
            const inv = 1 / Math.sqrt(1 + gx * gx + gy * gy);
            const light = (0.45 * gx + 0.63 * gy + 0.64) * inv;
            shade = 0.73 + 0.4 * Math.max(0, light) + (this.ground.data[p] - 246) * 0.0016;
            const halfway = Math.max(0, (0.26 * gx + 0.36 * gy + 0.897) * inv);
            sheen = 43 * halfway ** 30 * Math.min(1, h);
          }
          for (let c = 0; c < 3; c++) out[p + c] = this.base[p + c] * shade + sheen;
        }
      }
      this.ctx.putImageData(this.image, 0, 0, left, top, right - left, bottom - top);
      this.dirty = null;
    }
  }
  game.OilSurface = OilSurface;
})(window.MixGame);
