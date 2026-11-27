(() => {
  const SIZE = 112;
  const HALF = (SIZE - 1) / 2;
  const COUNT = SIZE * SIZE;
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const smooth = (t) => t * t * (3 - 2 * t);
  const rgb = (hex) => hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16));
  const cells = Array.from({ length: COUNT }, (_, i) => {
    const x = (i % SIZE - HALF) / HALF;
    const y = (Math.floor(i / SIZE) - HALF) / HALF;
    const r = Math.hypot(x, y);
    return { x, y, r };
  });
  // A broad tool groove, a narrow glossy lip, and fine lines within each fold.
  const foldLight = Float32Array.from({length:1024}, (_, i) => {
    const t = i / 1024;
    const lip = Math.exp(-((t - .20) ** 2) / .0018);
    const groove = Math.exp(-((t - .30) ** 2) / .0055);
    return .44 * Math.sin(t * Math.PI * 2) + .92 * lip - .72 * groove +
      .10 * Math.sin(t * Math.PI * 14) + .045 * Math.sin(t * Math.PI * 26);
  });
  class Paint {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      // The flow solver stays small. The material is sampled separately at screen resolution.
      this.u = new Float32Array(COUNT);
      this.v = new Float32Array(COUNT);
      this.nextU = new Float32Array(COUNT);
      this.nextV = new Float32Array(COUNT);
      this.grain = new Float32Array(COUNT);
      this.nextGrain = new Float32Array(COUNT);
      this.fields = new Float32Array(COUNT * 4);
      this.rgb = new Float32Array(1024 * 3);
      this.slowFrames = 0;
      this.resolutionLimit = 768;
      this.a = new Float32Array(COUNT);
      this.b = new Float32Array(COUNT);
      this.nextA = new Float32Array(COUNT);
      this.nextB = new Float32Array(COUNT);
    }
    reset(palette, rotation = 0) {
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      this.first = rgb(palette.first);
      this.second = rgb(palette.second);
      this.mixed = rgb(palette.mixed);
      for (let i = 0; i < COUNT; i++) {
        const cell = cells[i];
        const x = cell.x * cos - cell.y * sin, y = cell.x * sin + cell.y * cos;
        const r = cell.r;
        const edge = smooth(clamp((0.97 - r) * 24));
        const turn = 2.6 * (1 - r) * (1 - r);
        const vein = x * Math.cos(turn) - y * Math.sin(turn) + .13 * Math.sin(4 * y + .3);
        const fold = vein + .20 * r * r + .055 * Math.sin(7 * y + 3 * x);
        this.grain[i] = fold;
        const split = smooth(clamp(0.5 + vein * 19));
        const ripple = 1 + 0.08 * Math.sin(vein * 24 + y * 2);
        this.a[i] = edge * split * ripple;
        this.b[i] = edge * (1 - split) / ripple;
      }
      const sumA = this.a.reduce((sum, amount) => sum + amount, 0);
      const sumB = this.b.reduce((sum, amount) => sum + amount, 0);
      const scale = sumA / sumB;
      for (let i = 0; i < COUNT; i++) {
        this.b[i] *= scale;
        const mass = this.a[i] + this.b[i];
        this.grain[i] *= mass;
        this.u[i] = (cells[i].x * .5 + .5) * mass;
        this.v[i] = (cells[i].y * .5 + .5) * mass;
      }
      for (let k = 0; k < 1024; k++) {
        const ratio = k / 1023, first = ratio < .5 ? this.first : this.mixed;
        const last = ratio < .5 ? this.mixed : this.second;
        const blend = ratio < .5 ? ratio * 2 : ratio * 2 - 1;
        for (let c = 0; c < 3; c++) this.rgb[k * 3 + c] = first[c] + (last[c] - first[c]) * blend;
      }
    }
    advance(from, to, spin, progress) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-3) return;
      const steps = Math.ceil(length / 0.074);
      for (let step = 0; step < steps; step++) {
        const t = (step + 0.5) / steps;
        this.advect(from.x + dx * t, from.y + dy * t, dx / steps, dy / steps, spin, progress);
      }
    }
    advect(px, py, dx, dy, spin, progress) {
      var _a, _b, _c, _d;
      const { a, b, nextA, nextB, grain, nextGrain } = this;
      const distance = Math.hypot(dx, dy);
      const rotation = spin * distance * 2.7;
      const diffusion = Math.min(0.67, distance * 8);
      const fineMix = distance * 4.8 * smooth(clamp((progress - 0.46) / 0.32));
      nextA.fill(0);
      nextB.fill(0);
      nextGrain.fill(0);
      const {u,v,nextU,nextV} = this;
      nextU.fill(0); nextV.fill(0);
      for (let i = 0; i < COUNT; i++) {
        const first = a[i];
        const second = b[i];
        if (first + second < 1e-5) continue;
        const { x, y, r } = cells[i];
        const bx = x - px;
        const by = y - py;
        const local = smooth(clamp(1 - (bx * bx + by * by) / 0.36));
        const shear = rotation * (0.25 + (1 - r) * 1.7);
        const eddy = spin * local * distance * 2.1;
        const boundary = clamp((0.96 - r) * 8);
        const spread = distance * 0.014 * boundary;
        const angle = shear * boundary;
        const sine = Math.sin(angle);
        const cosine = Math.cos(angle);
        const tx = x * cosine - y * sine + boundary * (dx * local * 1.2 - by * eddy) + x * spread;
        const ty = x * sine + y * cosine + boundary * (dy * local * 1.2 + bx * eddy) + y * spread;
        const limit = Math.max(1, Math.hypot(tx, ty) / 0.925);
        const sx = (tx / limit + 1) * HALF;
        const sy = (ty / limit + 1) * HALF;
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;
        const j = y0 * SIZE + x0;
        const w0 = (1 - fx) * (1 - fy);
        const w1 = fx * (1 - fy);
        const w2 = (1 - fx) * fy;
        const w3 = fx * fy;
        nextA[j] += first * w0;
        nextA[j + 1] += first * w1;
        nextA[j + SIZE] += first * w2;
        nextA[j + SIZE + 1] += first * w3;
        const ux = u[i], vy = v[i];
        nextU[j] += ux*w0; nextU[j+1] += ux*w1;
        nextU[j+SIZE] += ux*w2; nextU[j+SIZE+1] += ux*w3;
        nextV[j] += vy*w0; nextV[j+1] += vy*w1;
        nextV[j+SIZE] += vy*w2; nextV[j+SIZE+1] += vy*w3;
        nextGrain[j] += grain[i] * w0;
        nextGrain[j + 1] += grain[i] * w1;
        nextGrain[j + SIZE] += grain[i] * w2;
        nextGrain[j + SIZE + 1] += grain[i] * w3;
        nextB[j] += second * w0;
        nextB[j + 1] += second * w1;
        nextB[j + SIZE] += second * w2;
        nextB[j + SIZE + 1] += second * w3;
      }
      const step = 2;
      for (let i = 0; i < COUNT; i++) {
        const { r } = cells[i];
        if (r >= 0.97) {
          a[i] = b[i] = grain[i] = u[i] = v[i] = 0;
          continue;
        }
        const left = ((_a = cells[i - step]) == null ? void 0 : _a.r) < 0.97 ? i - step : i;
        const right = ((_b = cells[i + step]) == null ? void 0 : _b.r) < 0.97 ? i + step : i;
        const up = ((_c = cells[i - step * SIZE]) == null ? void 0 : _c.r) < 0.97 ? i - step * SIZE : i;
        const down = ((_d = cells[i + step * SIZE]) == null ? void 0 : _d.r) < 0.97 ? i + step * SIZE : i;
        const nearA = (nextA[left] + nextA[right] + nextA[up] + nextA[down]) * 0.25;
        const nearB = (nextB[left] + nextB[right] + nextB[up] + nextB[down]) * 0.25;
        u[i] = nextU[i] + diffusion * ((nextU[left]+nextU[right]+nextU[up]+nextU[down])*.25-nextU[i]);
        v[i] = nextV[i] + diffusion * ((nextV[left]+nextV[right]+nextV[up]+nextV[down])*.25-nextV[i]);
        const nearGrain = (nextGrain[left] + nextGrain[right] + nextGrain[up] + nextGrain[down]) * .25;
        grain[i] = nextGrain[i] + (nearGrain - nextGrain[i]) * diffusion;
        const mixedA = nextA[i] + (nearA - nextA[i]) * diffusion;
        const mixedB = nextB[i] + (nearB - nextB[i]) * diffusion;
        const exchange = (mixedB - mixedA) * fineMix * 0.5;
        a[i] = mixedA + exchange;
        b[i] = mixedB - exchange;
      }
    }
    ratioAt(point) {
      const col=Math.round((point.x+1)*HALF), row=Math.round((point.y+1)*HALF);
      if(col<0 || col>=SIZE || row<0 || row>=SIZE) return null;
      const i=row*SIZE+col, mass=this.a[i]+this.b[i];
      return mass>.08 ? this.b[i]/mass : null;
    }
    preview(progress) {
      const orbit = (angle) => ({ x: Math.cos(angle) * 0.55, y: Math.sin(angle) * 0.55 });
      const distance = progress * 4.8;
      const steps = Math.ceil(distance / 0.068);
      for (let i = 1; i <= steps; i++) {
        const from = (i - 1) / steps * distance / 0.55;
        const to = i / steps * distance / 0.55;
        this.advance(orbit(from), orbit(to), 1, i / steps * progress);
      }
      this.render();
    }
    loadMaterial(surface, redraw) {
      window.CupPhotos.ready("cream").then(image => {
        this.surface = surface;
        try { this.drawSurface = window.CreamMaterial(surface, image, SIZE, redraw); } catch (error) { this.drawSurface = null; }
        // Read the same local texture once for software-only devices and photo baking.
        const copy = document.createElement("canvas");
        copy.width = copy.height = 1024;
        const ctx = copy.getContext("2d");
        try {
          ctx.drawImage(image,0,0,1024,1024);
          this.setTexture(ctx.getImageData(0,0,1024,1024).data,1024);
        } catch (error) { /* The 2D renderer still supports its procedural finish. */ }
        redraw();
      }).catch(() => { redraw(); });
    }
    setTexture(rgba, side) {
      this.textureSize = side;
      this.texture = new Uint8Array(side*side);
      for(let i=0;i<this.texture.length;i++) this.texture[i]=Math.round(.299*rgba[4*i]+.587*rgba[4*i+1]+.114*rgba[4*i+2]);
    }
    render() {
      const { a, b, grain, fields, rgb, canvas, ctx } = this;
      const width = canvas.clientWidth;
      if (this.drawSurface && this.drawSurface(this, width)) {
        this.surface.hidden = false;
        // Keep a single visible layer; this canvas still supplies CSS sizing and gesture coordinates.
        canvas.style.opacity = "0";
        return;
      }
      if (this.surface) { this.surface.hidden = true; canvas.style.opacity = "1"; }
      const size = width ? Math.max(1, Math.min(this.resolutionLimit, Math.round(width * Math.min(window.devicePixelRatio || 1, 2.5)))) : canvas.width;
      if (!this.image || this.image.width !== size) {
        canvas.width = canvas.height = size;
        this.image = ctx.createImageData(size, size);
        this.axis = Array.from({length:size}, (_, k) => {
          const pos = (k + .5) / size * (SIZE - 1);
          return { cell: Math.floor(pos), frac: pos % 1 };
        });
      }
      const started = performance.now();
      for (let i = 0; i < COUNT; i++) {
        const mass = a[i] + b[i], j = i * 4;
        fields[j] = mass;
        fields[j + 1] = b[i];
        fields[j + 2] = grain[i];
        const left = i - 1, right = i + 1, top = i - SIZE, bottom = i + SIZE;
        const mx = a[left] + b[left] + a[right] + b[right];
        const my = a[top] + b[top] + a[bottom] + b[bottom];
        const center = mass > .001 ? grain[i] / mass : 0;
        const dx = mx > .001 ? (grain[right] - grain[left] - center * (a[right]+b[right]-a[left]-b[left])) / mx : 0;
        const dy = my > .001 ? (grain[bottom] - grain[top] - center * (a[bottom]+b[bottom]-a[top]-b[top])) / my : 0;
        fields[j + 3] = mass * clamp((dx*.78 + dy*.62)*HALF, -1.6, 1.6);
      }
      const data = this.image.data, axis = this.axis;
      for (let y = 0; y < size; y++) {
        const sy = axis[y], py = (y + .5) / size * 2 - 1;
        const row = sy.cell * SIZE * 4, v = sy.frac, iv = 1 - v;
        // Clip a subpixel circular rim rather than magnifying the simulation's alpha mask.
        const rim = Math.sqrt(Math.max(0, .977 * .977 - py * py));
        for (let x = 0; x < size; x++) {
          const px = (x + .5) / size * 2 - 1, out = (y * size + x) * 4;
          if (Math.abs(px) >= rim) { data[out + 3] = 0; continue; }
          const sx = axis[x], u = sx.frac, j = row + sx.cell * 4, below = j + SIZE * 4;
          const tl = (1-u)*iv, tr = u*iv, bl = (1-u)*v, br = u*v;
          const mass = tl*fields[j]+tr*fields[j+4]+bl*fields[below]+br*fields[below+4];
          const alpha = clamp(mass * 8) * clamp((rim - Math.abs(px)) * size * .5);
          data[out+3] = 255 * alpha;
          if (alpha < .002) continue;
          const ratio = clamp((tl*fields[j+1]+tr*fields[j+5]+bl*fields[below+1]+br*fields[below+5])/mass);
          const color = Math.round(ratio * 1023) * 3;
          if (this.texture) {
            const c = j/4, n = this.textureSize;
            const tu = clamp((tl*this.u[c]+tr*this.u[c+1]+bl*this.u[c+SIZE]+br*this.u[c+SIZE+1])/mass);
            const tv = clamp((tl*this.v[c]+tr*this.v[c+1]+bl*this.v[c+SIZE]+br*this.v[c+SIZE+1])/mass);
            const lum = this.texture[Math.round(tv*(n-1))*n+Math.round(tu*(n-1))]/255;
            const relief = clamp((lum-.18)/.64,.28,1.16);
            const glint = smooth(clamp((lum-.87)/.115))*255;
            data[out] = rgb[color]*relief+.28*glint;
            data[out+1] = rgb[color+1]*relief+.235*glint;
            data[out+2] = rgb[color+2]*relief+.20*glint;
            continue;
          }
          const g = (tl*fields[j+2]+tr*fields[j+6]+bl*fields[below+2]+br*fields[below+6])/mass;
          // The material coordinate and its gradient move with the fluid; interpolate before shading.
          const phase = Math.floor((g + 3) * 1024 * 3.4) & 1023;
          const lightSlope = (tl*fields[j+3]+tr*fields[j+7]+bl*fields[below+3]+br*fields[below+7])/mass;
          const relief = foldLight[phase] * lightSlope;
          const mound = 1 - px*px - py*py;
          const shade = .88 + .11*mound + .16*relief;
          const glint = Math.max(0, relief - .28);
          const highlight = 52 * Math.min(1, glint * glint) + 4*mound;
          data[out] = rgb[color]*shade + highlight;
          data[out+1] = rgb[color+1]*shade + highlight;
          data[out+2] = rgb[color+2]*shade + highlight;
        }
      }
      ctx.putImageData(this.image, 0, 0);
      if (width && performance.now() - started > 25) {
        if (++this.slowFrames >= 5) {
          this.resolutionLimit = Math.max(384, Math.floor(size * .82));
          this.slowFrames = 0;
        }
      } else this.slowFrames = 0;
    }
    imprint(canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(this.surface && !this.surface.hidden ? this.surface : this.canvas, 0, 0, canvas.width, canvas.height);
    }
  }
  window.StirPaint = Paint;
})();
