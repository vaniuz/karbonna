/* SideRays — port vanilla WebGL do componente React Bits <SideRays />.
   Luz volumetrica sobre a foto do hero. Zero dependencias (sem React, sem ogl).
   Props ajustaveis via data-* no host .hero__rays (ex: data-speed="1.4"). */
(function () {
  var host = document.querySelector('.hero__rays');
  if (!host) return;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  var P = {
    speed: num(host.dataset.speed, 1.4),
    rayColor1: host.dataset.color1 || '#e6c25c',
    rayColor2: host.dataset.color2 || '#d7e6ff',
    intensity: num(host.dataset.intensity, 1.1),
    spread: num(host.dataset.spread, 2.0),
    origin: host.dataset.origin || 'top-right',
    tilt: num(host.dataset.tilt, 0),
    saturation: num(host.dataset.saturation, 1.2),
    blend: num(host.dataset.blend, 0.5),
    falloff: num(host.dataset.falloff, 1.8),
    opacity: num(host.dataset.opacity, 0.5)
  };

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
  }
  function originToFlip(origin) {
    switch (origin) {
      case 'top-left': return [1, 0];
      case 'bottom-right': return [0, 1];
      case 'bottom-left': return [1, 1];
      default: return [0, 0];
    }
  }

  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var gl = null;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
  if (!gl) { host.style.display = 'none'; return; }

  var VERT = 'attribute vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}';
  var FRAG = [
    'precision highp float;',
    'uniform float iTime;',
    'uniform vec2 iResolution;',
    'uniform float iSpeed;',
    'uniform vec3 iRayColor1;',
    'uniform vec3 iRayColor2;',
    'uniform float iIntensity;',
    'uniform float iSpread;',
    'uniform float iFlipX;',
    'uniform float iFlipY;',
    'uniform float iTilt;',
    'uniform float iSaturation;',
    'uniform float iBlend;',
    'uniform float iFalloff;',
    'uniform float iOpacity;',
    'float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed){',
    '  vec2 sourceToCoord = coord - raySource;',
    '  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);',
    '  return clamp((0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) + (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)), 0.0, 1.0)',
    '    * clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);',
    '}',
    'void main(){',
    '  vec2 fragCoord = gl_FragCoord.xy;',
    '  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;',
    '  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;',
    '  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);',
    '  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);',
    '  float tiltRad = iTilt * 3.14159265 / 180.0;',
    '  float cs = cos(tiltRad);',
    '  float sn = sin(tiltRad);',
    '  vec2 rel = coord - rayPos;',
    '  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;',
    '  float halfSpread = iSpread * 0.275;',
    '  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));',
    '  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));',
    '  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);',
    '  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);',
    '  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;',
    '  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;',
    '  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);',
    '  color.rgb *= brightness;',
    '  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));',
    '  color.rgb = mix(vec3(gray), color.rgb, iSaturation);',
    '  color.a = max(color.r, max(color.g, color.b)) * iOpacity;',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');

  function makeShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  var vs = makeShader(gl.VERTEX_SHADER, VERT);
  var fs = makeShader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { host.style.display = 'none'; return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { host.style.display = 'none'; return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  function uni(n) { return gl.getUniformLocation(prog, n); }
  var U = {
    iTime: uni('iTime'), iResolution: uni('iResolution'), iSpeed: uni('iSpeed'),
    iRayColor1: uni('iRayColor1'), iRayColor2: uni('iRayColor2'),
    iIntensity: uni('iIntensity'), iSpread: uni('iSpread'),
    iFlipX: uni('iFlipX'), iFlipY: uni('iFlipY'), iTilt: uni('iTilt'),
    iSaturation: uni('iSaturation'), iBlend: uni('iBlend'),
    iFalloff: uni('iFalloff'), iOpacity: uni('iOpacity')
  };
  var c1 = hexToRgb(P.rayColor1), c2 = hexToRgb(P.rayColor2), fl = originToFlip(P.origin);
  gl.uniform1f(U.iSpeed, P.speed);
  gl.uniform3f(U.iRayColor1, c1[0], c1[1], c1[2]);
  gl.uniform3f(U.iRayColor2, c2[0], c2[1], c2[2]);
  gl.uniform1f(U.iIntensity, P.intensity);
  gl.uniform1f(U.iSpread, P.spread);
  gl.uniform1f(U.iFlipX, fl[0]);
  gl.uniform1f(U.iFlipY, fl[1]);
  gl.uniform1f(U.iTilt, P.tilt);
  gl.uniform1f(U.iSaturation, P.saturation);
  gl.uniform1f(U.iBlend, P.blend);
  gl.uniform1f(U.iFalloff, P.falloff);
  gl.uniform1f(U.iOpacity, P.opacity);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(host.clientWidth * dpr));
    var h = Math.max(1, Math.floor(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(U.iResolution, w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(t) {
    gl.uniform1f(U.iTime, t * 0.001);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (REDUCED) { frame(0); return; }

  var raf = 0, visible = true, t0 = performance.now(), elapsed = 0;
  function loop(now) {
    raf = 0;
    elapsed = now - t0;
    frame(elapsed);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (raf || !visible || document.hidden) return;
    t0 = performance.now() - elapsed;
    raf = requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { resize(); kick(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.02 }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.addEventListener('resize', kick);
  kick();
})();
