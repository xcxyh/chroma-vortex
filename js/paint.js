/* Mass, local RYB concentrations and relief travel together under the brush. */
(function (game) {
  "use strict";
  const P = game.pigment;
  const size = matchMedia("(pointer: coarse)").matches ? 160 : 216;
  // Bulk RYBW, mass, relief, then the premultiplied RGB and opacity of unmixed surface paint.
  const stride = 10;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  const transportedChannels = [0, 1, 2, 3, 5]; // RYB, white and surface relief travel with pigment mass.
  const profileScale = 1024;
  const bristleProfile = Float32Array.from({length: profileScale + 1}, (_, j) => {
    const side = j / profileScale - 0.5;
    return 0.105 * Math.cos(275 * side + 0.65 * Math.sin(81 * side)) + 0.03 * Math.cos(430 * side + 0.8);
  });
  const pitch = size + 1;
  const wall = new Float32Array(pitch * pitch);
  for (let y = 0; y <= size; y++) {
    for (let x = 0; x <= size; x++) {
      // A corner can carry flow only when all four adjoining cell centres are inside the dish.
      const farthestCell = Math.hypot(Math.abs(x - size / 2) + 0.5, Math.abs(y - size / 2) + 0.5);
      wall[y * pitch + x] = Math.max(0, size / 2 - farthestCell);
    }
  }

  // Reconstruct a sloping pigment concentration inside the donor cell. The two cells
  // receive equal and opposite pigment amounts; local peaks and flat colours need no correction.
  function transportGradient(old, field, retained, donor, receiver, volume) {
    const upstream = 2 * donor - receiver;
    const source = donor * stride, dest = receiver * stride, back = upstream * stride;
    const parcel = 0.75 * volume * retained[donor] * old[source + 4];
    if (parcel < 1e-10 || !old[back + 4] || !old[dest + 4]) return;
    const sourceShare = parcel / field[source + 4], destShare = parcel / field[dest + 4];
    for (let c = 0; c < 4; c++) {
      const a = old[source + c] - old[back + c], b = old[dest + c] - old[source + c];
      if (a * b <= 0) continue;
      const slope = Math.abs(a) < Math.abs(b) ? a : b;
      field[source + c] -= sourceShare * slope;
      field[dest + c] += destShare * slope;
    }
  }

  class PaintWell {
    constructor(canvas, brushDiameter) {
      this.canvas = canvas;
      this.brushDiameter = brushDiameter;
      this.n = size;
      this.ctx = canvas.getContext("2d");
      canvas.width = canvas.height = size;
      this.image = this.ctx.createImageData(size, size);
      this.heightMap = new Uint8Array(size * size * 4);
      this.field = new Float32Array(size * size * stride);
      this.stream = new Float32Array(pitch * pitch);
      this.brushWork = new Float32Array(size * size);
      this.exchange = new Float32Array(size * size);
      this.retained = new Float32Array(size * size);
      this.previous = new Float32Array(this.field.length);
      this.clear();
    }

    clear() {
      this.field.fill(0);
      this.brushWork.fill(0);
      this.hasFreshPaint = false;
      this.dirty = { left: 0, top: 0, right: size, bottom: size };
      this.mix = P.mixParts([]);
    }

    invalidate(left, top, right, bottom) {
      const rect = this.dirty;
      if (!rect) this.dirty = { left, top, right, bottom };
      else {
        rect.left = Math.min(rect.left, left);
        rect.top = Math.min(rect.top, top);
        rect.right = Math.max(rect.right, right);
        rect.bottom = Math.max(rect.bottom, bottom);
      }
    }

    ingredient(name, amount) {
      const tube = P.TUBES[name];
      this.mix = P.mixParts([this.mix, { ...tube, mass: amount }]);
      return tube;
    }

    seed(blobs) {
      this.invalidate(0, 0, size, size);
      const tubes = blobs.map((blob) => this.ingredient(blob.color, blob.mass));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const nx = (x + 0.5) / size - 0.5,
            ny = (y + 0.5) / size - 0.5;
          const r = Math.hypot(nx, ny);
          const angle = Math.atan2(ny, nx);
          const turn = angle + 5.8 * r;
          const fold = turn + 0.23 * Math.sin(3 * turn + 2 * r) + 0.13 * Math.sin(5 * angle - 6 * r);
          const band = (fold / (2 * Math.PI) + 2) * tubes.length;
          const segment = Math.floor(band);
          const mass = tubes[segment % tubes.length];
          const next = tubes[(segment + 1) % tubes.length];
          const phase = band - segment;
          const veil = clamp((phase - 0.965) / 0.035, 0, 1);
          const filament = 0.12 * Math.exp(-((phase - 0.85) ** 2) / 0.0015) * (1 + Math.sin(fold * 115));
          const blend = veil + filament;
          const offset = (y * size + x) * stride;
          const ridge = 0.5 + 0.5 * Math.sin(12 * fold + 3 * Math.sin(3 * fold + r * 7));
          const grain = Math.sin(43 * fold + 6 * r + 2 * Math.sin(5 * fold));
          this.field.set(
            [
              mass.r + (next.r - mass.r) * blend,
              mass.y + (next.y - mass.y) * blend,
              mass.b + (next.b - mass.b) * blend,
              mass.w + (next.w - mass.w) * blend,
              clamp((0.5 - r) * 75, 0, 1),
              0.39 + 0.15 * Math.sin(fold * tubes.length) + 0.24 * ridge ** 2 + 0.025 * grain,
            ],
            offset,
          );
        }
      }
    }

    drop(name, nx, ny, dose = 1) {
      const tube = this.ingredient(name, dose);
      const fresh = P.tubeRgb(name);
      this.hasFreshPaint = true;
      const radius = Math.min(0.4, 0.27 * Math.cbrt(dose));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x / size - nx,
            dy = y / size - ny;
          if ((x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2 >= size * size / 4) continue;
          const angle = Math.atan2(dy, dx);
          const r = Math.hypot(dx, dy) / (radius * (1 + 0.08 * Math.sin(3 * angle + this.mix.mass)));
          if (r >= 1) continue;
          const i = (y * size + x) * stride;
          // Antialias only the silhouette. The interior of a fresh dollop hides the paint below.
          const edge = this.field[i + 4] ? Math.min(1, (1 - r) * radius * size) : 1;
          const underneath = edge < 1 ? this.surfaceRgb(i) : fresh;
          for (let c = 0; c < 3; c++) this.field[i + 6 + c] = underneath[c] + (fresh[c] - underneath[c]) * edge;
          this.field[i + 9] = 1;
          this.brushWork[y * size + x] *= 1 - edge;
          const amount = (1 - r * r) ** 2 * 2.4;
          const mass = this.field[i + 4] + amount;
          const a = amount / mass;
          for (const [ch, key] of ["r", "y", "b", "w"].entries()) {
            this.field[i + ch] += (tube[key] - this.field[i + ch]) * a;
          }
          this.field[i + 4] = mass;
          const peak = 0.35 + (1 - r) * 0.48 + 0.12 * Math.sin(angle * 5 + r * 15) * r;
          this.field[i + 5] += (peak - this.field[i + 5]) * a;
        }
      }
      const extent = radius * 1.08;
      this.invalidate(
        Math.max(0, Math.floor((nx - extent) * size)),
        Math.max(0, Math.floor((ny - extent) * size)),
        Math.min(size, Math.ceil((nx + extent) * size)),
        Math.min(size, Math.ceil((ny + extent) * size)),
      );
    }

    brushRadius(pressure) {
      return (this.brushDiameter / 200) * (0.68 + 0.64 * pressure);
    }

    surfaceRgb(i) {
      const data = this.field;
      const remaining = 1 - data[i + 9];
      if (!remaining) return [data[i + 6], data[i + 7], data[i + 8]];
      const rgb = P.pigmentToRgb(data[i], data[i + 1], data[i + 2], data[i + 3]);
      if (remaining < 1) {
        for (let c = 0; c < 3; c++) rgb[c] = rgb[c] * remaining + data[i + 6 + c];
      }
      return rgb;
    }

    sampleHex(x, y) {
      const col = clamp(Math.floor(x * size), 0, size - 1);
      const row = clamp(Math.floor(y * size), 0, size - 1);
      const i = (row * size + col) * stride;
      if (this.field[i + 4] < 0.012) return null;
      return P.rgbToHex(this.surfaceRgb(i));
    }

    measureUniformity() {
      let weight = 0,
        lightness = 0,
        a = 0,
        b = 0,
        squared = 0;
      // Sample the unlit pigment on a regular grid. Bare dish and gloss do not contribute.
      for (let y = 2; y < size; y += 4) {
        for (let x = 2; x < size; x += 4) {
          if ((x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2 >= (size * size) / 4) continue;
          const i = (y * size + x) * stride;
          const mass = this.field[i + 4];
          if (mass <= 0) continue;
          const w = Math.min(1, mass * 4.5);
          const rgb = this.surfaceRgb(i);
          const lab = P.rgbToLab(rgb);
          weight += w;
          lightness += w * lab.L;
          a += w * lab.a;
          b += w * lab.b;
          squared += w * (lab.L ** 2 + lab.a ** 2 + lab.b ** 2);
        }
      }
      if (!weight) return null;
      const variance = squared / weight - (lightness ** 2 + a ** 2 + b ** 2) / weight ** 2;
      return P.scoreFromDeltaE(Math.sqrt(Math.max(0, variance)));
    }

    foldUnderBrush(px, py, radius, distance) {
      const left = Math.max(0, Math.floor(px - radius)), right = Math.min(size, Math.ceil(px + radius));
      const top = Math.max(0, Math.floor(py - radius)), bottom = Math.min(size, Math.ceil(py + radius));
      const pigment = [0, 0, 0, 0];
      let load = 0;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const cell = y * size + x, i = cell * stride;
          const mass = this.field[i + 4];
          const rr = ((x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2) / (radius * radius);
          this.exchange[cell] = 0;
          if (!mass || rr >= 1) continue;
          // Accumulate actual brush travel: a single straight pass leaves the ribbon intact.
          const contact = (1 - rr) * distance / radius;
          const work = Math.min(3, this.brushWork[cell] + contact);
          this.brushWork[cell] = work;
          const repeated = clamp(work - 1.5, 0, 1);
          if (!repeated) continue;
          const fraction = -Math.expm1(-26 * contact * repeated);
          this.exchange[cell] = fraction;
          const weight = mass * fraction;
          load += weight;
          for (let c = 0; c < 4; c++) pigment[c] += this.field[i + c] * weight;
        }
      }
      if (!load) return;
      for (let c = 0; c < 4; c++) pigment[c] /= load;
      // Return each participating cell's share at the common concentration, conserving each pigment.
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const cell = y * size + x, fraction = this.exchange[cell];
          if (!fraction) continue;
          const i = cell * stride;
          for (let c = 0; c < 4; c++) this.field[i + c] += fraction * (pigment[c] - this.field[i + c]);
        }
      }
      this.invalidate(left, top, right, bottom);
    }

    stroke(from, to, pressure) {
      const dx = to.x - from.x,
        dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (!distance) return 0;
      const reach = this.brushRadius(pressure);
      const radius = size * reach;
      const steps = Math.ceil(distance * size);
      const vx = dx * size / steps, vy = dy * size / steps;
      const travel = distance * size / steps;
      const radiusSquared = radius * radius;
      const foldSteps = Math.max(1, Math.floor(radius / 4));
      const tangentX = vx / travel, tangentY = vy / travel;
      const psi = this.stream, field = this.field, old = this.previous;
      let contact = 0;

      for (let step = 0; step < steps; step++) {
        const px = from.x * size + (step + 0.5) * vx, py = from.y * size + (step + 0.5) * vy;
        const left = Math.max(0, Math.floor(px - radius)), right = Math.min(size, Math.ceil(px + radius));
        const top = Math.max(0, Math.floor(py - radius)), bottom = Math.min(size, Math.ceil(py + radius));
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            const ox = x - px, oy = y - py;
            const envelope = Math.max(0, 1 - (ox * ox + oy * oy) / radiusSquared);
            const k = y * pitch + x;
            psi[k] = (vx * oy - vy * ox) * envelope * envelope * Math.min(1, 2 * wall[k] / radius);
          }
        }

        // The curl of this stream function gives equal inflow and outflow per cell.
        // Scale the entire footprint together so no cell transfers more than its volume.
        let maxFlow = 1;
        for (let y = top; y < bottom; y++) {
          for (let x = left; x < right; x++) {
            const k = y * pitch + x;
            const tl = psi[k], tr = psi[k + 1], bl = psi[k + pitch], br = psi[k + pitch + 1];
            maxFlow = Math.max(maxFlow, Math.max(0, bl - tl) + Math.max(0, tr - br) +
              Math.max(0, tl - tr) + Math.max(0, br - bl));
          }
        }
        const scale = 1 / maxFlow;
        const first = Math.max(0, top - 1) * size * stride;
        const last = Math.min(size, bottom + 1) * size * stride;
        old.set(field.subarray(first, last), first);
        let wet = false;
        for (let y = top; y < bottom; y++) {
          for (let x = left; x < right; x++) {
            const k = y * pitch + x;
            const tl = psi[k], tr = psi[k + 1], bl = psi[k + pitch], br = psi[k + pitch + 1];
            const fromLeft = Math.max(0, bl - tl) * scale, fromRight = Math.max(0, tr - br) * scale;
            const fromTop = Math.max(0, tl - tr) * scale, fromBottom = Math.max(0, br - bl) * scale;
            const flow = fromLeft + fromRight + fromTop + fromBottom;
            if (!flow) continue;
            const i = (y * size + x) * stride;
            // Closed faces use this cell as a safe, zero-weight neighbour at the grid edge.
            const west = fromLeft ? i - stride : i, east = fromRight ? i + stride : i;
            const north = fromTop ? i - size * stride : i, south = fromBottom ? i + size * stride : i;
            const westMass = fromLeft * old[west + 4], eastMass = fromRight * old[east + 4];
            const northMass = fromTop * old[north + 4], southMass = fromBottom * old[south + 4];
            const retained = Math.max(0, 1 - flow);
            this.retained[y * size + x] = retained;
            const kept = retained * old[i + 4];
            const mass = kept + westMass + eastMass + northMass + southMass;
            field[i + 4] = mass;
            if (!mass) continue;
            wet = true;
            for (const channel of transportedChannels) {
              field[i + channel] = (kept * old[i + channel] +
                westMass * old[west + channel] + eastMass * old[east + channel] +
                northMass * old[north + channel] + southMass * old[south + channel]) / mass;
            }
            const height = field[i + 5];
            const rr = ((x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2) / radiusSquared;
            const contactWeight = Math.max(0, 1 - rr) ** 2 * travel / radius;
            if (this.hasFreshPaint) {
              // Advect the visible layer with the same paint. Brush travel folds it into the bulk locally.
              const unmixed = Math.exp(-2.5 * contactWeight) / mass;
              for (let c = 6; c <= 9; c++) {
                field[i + c] = (kept * old[i + c] + westMass * old[west + c] + eastMass * old[east + c] +
                  northMass * old[north + c] + southMass * old[south + c]) * unmixed;
              }
            }
            const groove = 0.26 + 0.34 * Math.exp(-((Math.sqrt(rr) - 0.62) ** 2) / 0.019);
            // Filaments run tangentially along the gesture and leave ridges across its width.
            const side = ((y + 0.5 - py) * tangentX - (x + 0.5 - px) * tangentY) / size;
            const ridges = bristleProfile[Math.round((0.5 + side) * profileScale)];
            field[i + 5] = height + (groove + ridges - height) * Math.min(1, 2.4 * contactWeight);

            // West and north already hold their new masses. Correct each shared face once.
            const cell = y * size + x;
            const eastward = (bl - tl) * scale, southward = (tl - tr) * scale;
            if (eastward > 0 && x >= 2) transportGradient(old, field, this.retained, cell - 1, cell, eastward);
            if (eastward < 0 && x + 1 < size) transportGradient(old, field, this.retained, cell, cell - 1, -eastward);
            if (southward > 0 && y >= 2) transportGradient(old, field, this.retained, cell - size, cell, southward);
            if (southward < 0 && y + 1 < size) transportGradient(old, field, this.retained, cell, cell - size, -southward);
          }
        }
        const span = step % foldSteps + 1;
        if (span === foldSteps || step + 1 === steps) {
          const offset = (span - 1) / 2;
          this.foldUnderBrush(px - vx * offset, py - vy * offset, radius, span * travel);
        }
        if (wet) {
          this.invalidate(left, top, right, bottom);
          contact += distance / steps;
        }
      }
      return contact;
    }

    render() {
      if (!this.dirty) return;
      const { left, top, right, bottom } = this.dirty;
      const pixels = this.image.data;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const pixel = y * size + x;
          const i = pixel * stride,
            j = pixel * 4;
          const data = this.field;
          const coverage = clamp(data[i + 4] * 4.5, 0, 1);
          const rgb = coverage ? this.surfaceRgb(i) : [0, 0, 0];
          for (let c = 0; c < 3; c++)
            pixels[j + c] = 255 * (rgb[c] * coverage + (0.18 + c * 0.01) * (1 - coverage));
          pixels[j + 3] = 255;
          this.heightMap[j] =
            clamp((data[i + 5] * 0.8 + Math.min(1, data[i + 4]) * 0.2) * coverage, 0, 1) * 255;
          this.heightMap[j + 1] = coverage * 255;
          this.heightMap[j + 3] = 255;
        }
      }
      this.ctx.putImageData(this.image, 0, 0, left, top, right - left, bottom - top);
      this.dirty = null;
    }
  }

  game.PaintWell = PaintWell;
})(window.MixGame);
