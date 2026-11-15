/** Render a reframed, textured Earth using the supplied model's color texture. */
export function attachGlobe(surface) {
  const canvas = surface.querySelector('canvas');
  const poster = surface.querySelector('img');
  const controls = surface.querySelector('[data-orbit-controls]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || !poster || !controls || motion.matches || matchMedia('(max-width: 560px)').matches) return;
  const gl = canvas.getContext('webgl', { alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    varying vec2 plane;
    void main() { plane = position; gl_Position = vec4(position, 0.0, 1.0); }`;
  const fragmentSource = `
    precision highp float;
    varying vec2 plane;
    uniform sampler2D earth;
    uniform float longitude;
    uniform float pixel;
    void main() {
      vec2 p = plane * 1.006;
      float r = length(p);
      if (r >= 1.0) discard;
      float z = sqrt(max(0.0, 1.0 - dot(p, p)));
      float sinLat = 0.5299192642, cosLat = 0.8480480962;
      float lat = asin(clamp(p.y * cosLat + z * sinLat, -1.0, 1.0));
      float lon = longitude + atan(p.x, z * cosLat - p.y * sinLat);
      vec2 uv = vec2(fract(lon / 6.28318530718 + 0.5), 0.5 - lat / 3.14159265359);
      vec3 color = texture2D(earth, uv).rgb;
      float light = clamp(dot(vec3(-0.50, 0.41, 0.57), vec3(p, z)), 0.0, 1.0);
      color = color * (0.31 + 0.91 * light) + vec3(9.0, 25.0, 29.0) / 255.0;
      color += pow(1.0 - z, 4.0) * (0.19 + 0.55 * light) * vec3(39.0, 162.0, 184.0) / 255.0;
      float alpha = smoothstep(0.0, pixel, 1.0 - r);
      gl_FragColor = vec4(color * alpha, alpha);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const center = gl.getUniformLocation(program, 'longitude');
  const pixel = gl.getUniformLocation(program, 'pixel');
  const texture = gl.createTexture();

  const initial = -100 * Math.PI / 180;
  let longitude = initial;
  let frame = 0;
  let last = 0;
  let started = 0;
  let disposed = false;
  let usable = false;
  let x = null;
  let visible = true;
  const pause = controls.querySelector('[data-orbit="pause"]');
  const events = new AbortController();
  const options = { signal: events.signal };
  const asset = new Image();
  asset.src = new URL('../assets/earth-texture.webp', import.meta.url).href;

  function draw() {
    if (!usable || disposed || gl.isContextLost()) return;
    gl.uniform1f(center, longitude);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function resize() {
    if (!usable) return;
    const size = Math.min(1000, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 1.6)));
    if (size < 1) return;
    canvas.width = size;
    canvas.height = size;
    gl.viewport(0, 0, size, size);
    gl.uniform1f(pixel, 2.1 / size);
    draw();
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    pause.textContent = 'Play orbit';
    pause.setAttribute('aria-pressed', 'false');
  }

  function tick(now) {
    if (!usable || !visible || document.hidden || now - started > 9000) {
      stop();
      return;
    }
    if (now - last >= 42) {
      longitude += Math.min(now - last, 85) * .00015;
      last = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (frame || motion.matches || !visible || !usable) return;
    last = started = performance.now();
    pause.textContent = 'Pause orbit';
    pause.setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(tick);
  }

  function fallback() {
    usable = false;
    stop();
    surface.classList.remove('earth-active');
    controls.hidden = true;
  }

  const onResize = new ResizeObserver(resize);
  const onView = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
  }, { threshold: .05 });
  onResize.observe(canvas);
  onView.observe(surface);

  controls.addEventListener('click', event => {
    const action = event.target.closest('[data-orbit]')?.dataset.orbit;
    if (!action) return;
    if (action === 'pause') {
      if (frame) stop();
      else play();
      return;
    }
    stop();
    longitude += (action === 'east' ? 1 : -1) * Math.PI / 12;
    draw();
  }, options);

  canvas.addEventListener('pointerdown', event => {
    if (!usable || event.pointerType === 'touch' || event.button !== 0) return;
    x = event.clientX;
    stop();
    canvas.setPointerCapture(event.pointerId);
  }, options);
  canvas.addEventListener('pointermove', event => {
    if (x === null) return;
    longitude -= (event.clientX - x) / canvas.clientWidth * 3.2;
    x = event.clientX;
    draw();
  }, options);
  canvas.addEventListener('lostpointercapture', () => { x = null; }, options);
  canvas.addEventListener('webglcontextlost', fallback, options);
  motion.addEventListener('change', () => { if (motion.matches) fallback(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);

  asset.decode().then(() => {
    if (disposed || gl.isContextLost() || motion.matches) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    usable = true;
    resize();
    controls.hidden = false;
    surface.classList.add('earth-active');
    play();
  }).catch(fallback);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    events.abort();
    onResize.disconnect();
    onView.disconnect();
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
