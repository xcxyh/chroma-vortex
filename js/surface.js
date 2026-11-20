/* Three.js r160. Both surface displacement and wet reflection use the live pigment height field. */
(function (game, T) {
  "use strict";
  game.createSurface = function (well, canvas) {
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return null;
    }
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 8);
    camera.position.z = 3;
    const albedo = new T.CanvasTexture(well.canvas);
    const relief = new T.DataTexture(well.heightMap, well.n, well.n, T.RGBAFormat, T.UnsignedByteType);
    relief.flipY = true;
    for (const tex of [albedo, relief]) {
      tex.minFilter = tex.magFilter = T.LinearFilter;
      tex.generateMipmaps = false;
    }
    const material = new T.ShaderMaterial({
      uniforms: { paint: { value: albedo }, relief: { value: relief }, texel: { value: 1 / well.n } },
      vertexShader: `
        uniform sampler2D relief; varying vec2 vUv;
        void main() {
          vUv = uv; vec3 p = position;
          p.z += 0.095 * texture2D(relief, uv).r;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }`,
      fragmentShader: `
        precision highp float;
        uniform sampler2D paint, relief;
        uniform float texel;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv; vec2 p = uv * 2. - 1.;
          vec2 field = texture2D(relief, uv).rg;
          vec2 d = vec2(texel * .65, 0.);
          float dx = texture2D(relief, uv + d).r - texture2D(relief, uv - d).r;
          float dy = texture2D(relief, uv + d.yx).r - texture2D(relief, uv - d.yx).r;
          vec3 n = normalize(vec3(-dx * 7.8 + p.x * .12, -dy * 7.8 + p.y * .12, 1.));
          vec3 light = normalize(vec3(-.45,.64,.85));
          vec3 h = normalize(light + vec3(0.,0.,1.));
          float gloss = pow(max(dot(n,h),0.), 65.);
          vec3 base = texture2D(paint, uv).rgb;
          float edge = smoothstep(.72,1.,length(p));
          vec3 col = base * (.69 + .45 * max(0.,dot(n,light))) * (1. - .22 * edge);
          vec3 refl = reflect(vec3(0.,0.,-1.), n);
          float softbox = exp(-28. * abs(refl.x + .34 + .24 * refl.y)) * smoothstep(-.7, .18, refl.y);
          col += (.39 * gloss + .32 * softbox + .021 * n.z) * field.g;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    scene.add(new T.Mesh(new T.PlaneGeometry(2, 2, 96, 96), material));
    function draw() {
      const px = Math.max(1, Math.round(canvas.clientWidth * Math.min(2, devicePixelRatio)));
      if (canvas.width !== px || canvas.height !== px) renderer.setSize(px, px, false);
      albedo.needsUpdate = relief.needsUpdate = true;
      renderer.render(scene, camera);
      canvas.classList.add("ready");
    }
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      canvas.classList.remove("ready");
    });
    canvas.addEventListener("webglcontextrestored", draw);
    return { draw };
  };
})(window.MixGame, window.THREE);
