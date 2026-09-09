/* Cabin Focus - procedural cabin window renderer.
   Draws the view out of a passenger window entirely in a fragment shader, so a
   journey (taxi > takeoff > climb > cloud break > cruise > descent > landing)
   is one continuous simulation instead of stitched video clips.

   The cumulus deck is raymarched as a real volume, the terrain is lit from a
   derived normal and takes cloud shadows, and the result goes through a filmic
   tonemap. Internal resolution adapts to whatever the GPU can keep up with. */
(function (global) {
  'use strict';

  const VERTEX_SHADER = [
    'attribute vec2 aPos;',
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  const FRAGMENT_SHADER = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uAlt;',
    'uniform float uPitch;',
    'uniform float uRoll;',
    'uniform float uYaw;',
    'uniform float uTravel;',
    'uniform vec3 uSunDir;',
    'uniform float uSunElev;',
    'uniform float uNight;',
    'uniform vec3 uGroundA;',
    'uniform vec3 uGroundB;',
    'uniform vec3 uWaterCol;',
    'uniform float uWater;',
    'uniform float uSnow;',
    'uniform float uUrban;',
    'uniform float uCloudCover;',
    'uniform float uHighCloud;',
    'uniform float uDeckY;',
    'uniform float uDeckThick;',
    'uniform float uGroundFade;',
    'uniform float uShake;',
    'uniform float uWingLift;',
    'uniform float uSteps;',
    '',
    'const float PI = 3.14159265;',
    'const float EARTH_R = 6371000.0;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise2(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    'float fbm5(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise2(p);',
    '    p = p * 2.03 + vec2(17.1, 9.7);',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'float fbm3(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 3; i++) {',
    '    v += a * noise2(p);',
    '    p = p * 2.11 + vec2(5.3, 23.9);',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    '/* ---- light and sky ------------------------------------------------- */',
    '',
    'vec3 sunLight() {',
    '  vec3 high = vec3(1.00, 0.97, 0.92);',
    '  vec3 low = vec3(1.00, 0.62, 0.30);',
    '  vec3 col = mix(low, high, smoothstep(-0.02, 0.38, uSunElev));',
    '  return mix(col * 2.6, vec3(0.16, 0.22, 0.44), uNight);',
    '}',
    '',
    'vec3 horizonTint() {',
    '  vec3 day = vec3(0.62, 0.76, 0.94);',
    '  vec3 dusk = vec3(1.00, 0.56, 0.30);',
    '  vec3 night = vec3(0.035, 0.055, 0.13);',
    '  float golden = smoothstep(0.36, -0.04, abs(uSunElev));',
    '  return mix(mix(day, dusk, golden), night, uNight);',
    '}',
    '',
    'float henyey(float mu, float g) {',
    '  float gg = g * g;',
    '  return (1.0 - gg) / (4.0 * PI * pow(1.0 + gg - 2.0 * g * mu, 1.5));',
    '}',
    '',
    '/* Layered gradient standing in for Rayleigh scattering: saturated overhead,',
    '   pale and warm at the horizon, and deepening as the aircraft climbs. */',
    'vec3 skyColor(vec3 rd) {',
    '  float deep = clamp(uAlt / 11500.0, 0.0, 1.0);',
    '  vec3 zenithDay = mix(vec3(0.11, 0.33, 0.78), vec3(0.012, 0.055, 0.34), deep);',
    '  vec3 midDay = mix(vec3(0.32, 0.55, 0.90), vec3(0.10, 0.28, 0.66), deep);',
    '  vec3 zen = mix(zenithDay, vec3(0.004, 0.010, 0.042), uNight);',
    '  vec3 mid = mix(midDay, vec3(0.010, 0.020, 0.070), uNight);',
    '  vec3 hor = horizonTint();',
    '',
    '  /* A window only shows about 30 degrees of sky, so the gradient has to',
    '     reach the deep blue quickly or everything looks like haze. */',
    '  hor = mix(hor, mid, deep * 0.55);',
    '  float up = clamp(rd.y, 0.0, 1.0);',
    '  vec3 col = mix(hor, mid, pow(up, 0.16));',
    '  col = mix(col, zen, pow(up, 0.46));',
    '',
    '  float mu = dot(rd, uSunDir);',
    '  float daylight = 1.0 - uNight;',
    '  /* Mie forward scatter: the bright wash around the sun. */',
    '  col += sunLight() * henyey(mu, 0.72) * 0.55 * daylight;',
    '  col += mix(vec3(1.0, 0.95, 0.86), sunLight() * 0.4, 0.5) * pow(max(mu, 0.0), 2200.0) * 9.0 * daylight;',
    '  /* Warm band hugging the horizon on the sun side. */',
    '  float horizonBand = pow(1.0 - up, 8.0) * smoothstep(-0.2, 0.6, mu);',
    '  col += horizonTint() * horizonBand * 0.35 * daylight;',
    '',
    '  vec2 sph = vec2(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)));',
    '  float stars = pow(hash21(floor(sph * 240.0)), 76.0) * 2.2;',
    '  col += vec3(0.82, 0.88, 1.0) * stars * smoothstep(0.55, 0.98, uNight) * smoothstep(-0.02, 0.24, rd.y);',
    '  return col;',
    '}',
    '',
    '/* ---- cloud volume --------------------------------------------------- */',
    '',
    'float cloudBaseY() { return uDeckY - uDeckThick * 0.55; }',
    'float cloudTopY() { return uDeckY + uDeckThick * 1.75; }',
    '',
    'vec2 cloudUV(vec3 p, float h) {',
    '  vec2 q = vec2(p.x, p.z + uTravel * 0.62) * 0.000125;',
    '  q += vec2(uTime * 0.0016, uTime * 0.0007);',
    '  /* Shearing the sample with height turns a flat field into something that',
    '     leans and stacks like real cumulus. */',
    '  return q + vec2(h * 0.26, -h * 0.15);',
    '}',
    '',
    'float cloudShape(vec3 p) {',
    '  float base = cloudBaseY();',
    '  float top = cloudTopY();',
    '  float h = clamp((p.y - base) / max(top - base, 1.0), 0.0, 1.0);',
    '  float profile = smoothstep(0.00, 0.22, h) * smoothstep(1.00, 0.45, h);',
    '  /* Threshold the noise rather than subtracting from it: that leaves real',
    '     gaps of open sky instead of a uniform overcast veil. */',
    '  float thr = mix(0.70, 0.34, clamp(uCloudCover, 0.0, 1.0));',
    '  float d = (fbm3(cloudUV(p, h)) - thr) / max(1.0 - thr, 0.05);',
    '  return clamp(d * profile * 1.7, 0.0, 1.0);',
    '}',
    '',
    'float cloudDensity(vec3 p) {',
    '  float d = cloudShape(p);',
    '  if (d <= 0.0) return 0.0;',
    '  float base = cloudBaseY();',
    '  float top = cloudTopY();',
    '  float h = clamp((p.y - base) / max(top - base, 1.0), 0.0, 1.0);',
    '  /* Erode the edges so silhouettes are ragged instead of blobby. */',
    '  float erode = noise2(cloudUV(p, h) * 9.0 + h * 3.0);',
    '  d -= (1.0 - erode) * 0.30 * (1.0 - d);',
    '  return clamp(d, 0.0, 1.0);',
    '}',
    '',
    '/* Shadow the ground with the same field the volume is built from. */',
    'float cloudShadow(vec2 groundXZ) {',
    '  if (uSunDir.y < 0.05) return 1.0;',
    '  float lift = (uDeckY - 0.0) / max(uSunDir.y, 0.05);',
    '  vec3 p = vec3(groundXZ.x - uSunDir.x * lift, uDeckY, groundXZ.y - uSunDir.z * lift);',
    '  float d = cloudShape(p);',
    '  return mix(1.0, 0.42, smoothstep(0.02, 0.45, d));',
    '}',
    '',
    'vec4 marchClouds(vec3 ro, vec3 rd, float maxT, vec3 ambient) {',
    '  float base = cloudBaseY();',
    '  float top = cloudTopY();',
    '  if (abs(rd.y) < 0.0015) return vec4(0.0);',
    '  float ta = (base - ro.y) / rd.y;',
    '  float tb = (top - ro.y) / rd.y;',
    '  float t0 = max(min(ta, tb), 0.0);',
    '  float t1 = min(max(ta, tb), maxT);',
    '  if (t1 <= t0) return vec4(0.0);',
    '  /* Keep the sampled span bounded so steps stay small near the horizon. */',
    '  t1 = min(t1, t0 + 70000.0);',
    '',
    '  float steps = uSteps;',
    '  float dt = (t1 - t0) / steps;',
    '  float jitter = hash21(gl_FragCoord.xy * 0.7 + fract(uTime) * 91.0);',
    '  float t = t0 + dt * jitter;',
    '  float mu = dot(rd, uSunDir);',
    '  float phase = clamp(mix(henyey(mu, 0.62), henyey(mu, -0.22), 0.45) * 4.0 * PI, 0.30, 2.60);',
    '  vec3 sun = sunLight();',
    '  vec3 sum = vec3(0.0);',
    '  float trans = 1.0;',
    '',
    '  for (int i = 0; i < 40; i++) {',
    '    if (float(i) >= steps || trans < 0.015) break;',
    '    vec3 p = ro + rd * t;',
    '    float d = cloudDensity(p);',
    '    if (d > 0.004) {',
    '      float toSun = cloudShape(p + uSunDir * 320.0) + cloudShape(p + uSunDir * 900.0) * 0.55;',
    '      float lightT = exp(-toSun * 2.6);',
    '      float powder = 1.0 - exp(-d * 5.0);',
    '      vec3 lit = sun * (lightT * (0.30 + 0.85 * phase) + 0.045) * powder;',
    '      lit += ambient * (0.42 + 0.30 * clamp((p.y - base) / max(top - base, 1.0), 0.0, 1.0));',
    '      lit = mix(lit, horizonTint() * (0.7 + 0.3 * (1.0 - uNight)), clamp(t * 0.000013, 0.0, 0.72));',
    '      float a = 1.0 - exp(-d * dt * 0.0050);',
    '      sum += lit * a * trans;',
    '      trans *= 1.0 - a;',
    '    }',
    '    t += dt;',
    '  }',
    '  return vec4(sum, 1.0 - trans);',
    '}',
    '',
    '/* ---- ground --------------------------------------------------------- */',
    '',
    'float terrainH(vec2 p) {',
    '  return fbm3(p * 0.00019) * 1500.0 + fbm3(p * 0.0011) * 220.0;',
    '}',
    '',
    'vec3 airportSurface(vec2 p, float t, out float weight) {',
    '  float ax = abs(p.x);',
    '  /* The airport is a footprint, not an infinite apron: past its perimeter',
    '     the ordinary landscape has to take over again. */',
    '  weight = (1.0 - smoothstep(900.0, 2400.0, uAlt))',
    '    * (1.0 - smoothstep(6000.0, 16000.0, t))',
    '    * (1.0 - smoothstep(280.0, 950.0, ax));',
    '  if (weight < 0.002) return vec3(0.0);',
    '  float fine = exp(-t / 260.0);',
    '  float grain = mix(0.5, noise2(p * 0.42) * 0.6 + noise2(p * 2.4) * 0.4, fine);',
    '  float turf = mix(0.5, noise2(p * 0.055), exp(-t / 2400.0));',
    '',
    '  vec3 asphalt = vec3(0.20, 0.205, 0.225) * (0.86 + 0.30 * grain);',
    '  vec3 concrete = vec3(0.36, 0.36, 0.365) * (0.90 + 0.18 * grain);',
    '  vec3 grass = mix(vec3(0.20, 0.30, 0.11), vec3(0.34, 0.43, 0.18), turf);',
    '  grass = mix(grass, grass * 1.10, step(0.5, fract(p.x * 0.045)) * fine * 0.5);',
    '',
    '  float onRunway = 1.0 - smoothstep(21.0, 23.5, ax);',
    '  float onShoulder = (1.0 - smoothstep(29.0, 33.0, ax)) * (1.0 - onRunway);',
    '  float onTaxiway = 1.0 - smoothstep(11.0, 13.5, abs(ax - 92.0));',
    '  float onApron = (1.0 - smoothstep(150.0, 158.0, ax)) * smoothstep(118.0, 126.0, ax);',
    '',
    '  vec3 col = grass;',
    '  col = mix(col, asphalt * 0.86, onShoulder);',
    '  col = mix(col, asphalt, max(onRunway, onTaxiway));',
    '  col = mix(col, concrete, onApron);',
    '',
    '  float edgeLine = 1.0 - smoothstep(0.30, 1.10, abs(ax - 20.0));',
    '  float centerLine = (1.0 - smoothstep(0.25, 0.70, ax)) * step(0.55, fract(p.y * 0.0166));',
    '  col = mix(col, vec3(0.74, 0.75, 0.72), max(edgeLine, centerLine) * onRunway * fine);',
    '  float taxiLine = 1.0 - smoothstep(0.25, 0.70, abs(ax - 92.0));',
    '  col = mix(col, vec3(0.70, 0.60, 0.16), taxiLine * onTaxiway * fine);',
    '',
    '  float terminalBand = (1.0 - smoothstep(196.0, 204.0, ax)) * smoothstep(160.0, 168.0, ax);',
    '  float pier = step(0.30, hash21(floor(vec2(p.y * 0.014, 0.0))));',
    '  col = mix(col, vec3(0.50, 0.51, 0.54), terminalBand * pier);',
    '  float stands = onApron * step(0.62, hash21(floor(vec2(p.y * 0.020, 1.0))));',
    '  col = mix(col, vec3(0.66, 0.67, 0.69), stands * 0.75);',
    '',
    '  float lampRow = step(0.86, fract(p.y * 0.04)) * (1.0 - smoothstep(0.8, 2.4, abs(ax - 26.0)));',
    '  col += vec3(1.0, 0.78, 0.38) * lampRow * (0.20 + uNight * 2.4) * fine;',
    '  float apronLight = step(0.90, fract(p.y * 0.010)) * (1.0 - smoothstep(2.0, 6.0, abs(ax - 155.0)));',
    '  col += vec3(1.0, 0.86, 0.60) * apronLight * uNight * 3.0;',
    '  return col;',
    '}',
    '',
    'vec3 groundColor(vec3 ro, vec3 rd, float dip, vec3 ambient, out float hitDist) {',
    '  hitDist = -1.0;',
    '  float ry = rd.y + dip;',
    '  if (ry > -0.0009) return vec3(0.0);',
    '  float t = ro.y / (-ry);',
    '  hitDist = t;',
    '  vec2 p = vec2(ro.x + rd.x * t, ro.z + rd.z * t + uTravel);',
    '',
    '  /* Each feature band fades out once it is smaller than a pixel at this',
    '     distance, so the same terrain reads at 3 m and at 11 km. */',
    '  float wGrain = exp(-t / 400.0);',
    '  float wPlot = exp(-t / 6000.0);',
    '  float wField = exp(-t / 55000.0);',
    '  float wForest = exp(-t / 110000.0);',
    '  float wRiver = exp(-t / 190000.0);',
    '',
    '  float macro = fbm5(p * 0.00019);',
    '  float hills = fbm5(p * 0.0010);',
    '  float land = clamp(macro * 0.62 + hills * 0.38, 0.0, 1.0);',
    '',
    '  float shore = uWater * 0.58 + 0.18;',
    '  float wet = smoothstep(shore + 0.040, shore - 0.040, macro);',
    '',
    '  vec3 albedo = mix(uGroundA, uGroundB, smoothstep(0.28, 0.74, hills));',
    '  albedo = mix(albedo, albedo * mix(0.90, 1.14, fbm3(p * 0.030)), 0.35 * wGrain);',
    '',
    '  /* Farmland: rectangular parcels with visible boundaries. This is what',
    '     makes a landscape read as inhabited rather than as noise. */',
    '  vec2 cell = p * 0.0021;',
    '  vec2 cellId = floor(cell);',
    '  float parcelTone = hash21(cellId);',
    '  float isField = step(0.30, hash21(cellId + 7.31)) * smoothstep(0.62, 0.34, macro);',
    '  vec3 fieldCol = mix(vec3(0.52, 0.48, 0.24), vec3(0.24, 0.37, 0.14), parcelTone);',
    '  fieldCol = mix(fieldCol, vec3(0.42, 0.34, 0.22), step(0.86, parcelTone));',
    '  albedo = mix(albedo, fieldCol, isField * 0.62 * wField * (1.0 - wet));',
    '  vec2 cellEdge = abs(fract(cell) - 0.5);',
    '  float hedge = smoothstep(0.455, 0.500, max(cellEdge.x, cellEdge.y));',
    '  albedo = mix(albedo, albedo * 0.76, hedge * isField * wField * (1.0 - wet));',
    '',
    '  vec2 plot = p * 0.0090;',
    '  albedo = mix(albedo, albedo * mix(0.86, 1.16, hash21(floor(plot) + 3.7)), 0.45 * wPlot * (1.0 - wet));',
    '  vec2 plotEdge = abs(fract(plot) - 0.5);',
    '  albedo = mix(albedo, albedo * 0.84, smoothstep(0.44, 0.50, max(plotEdge.x, plotEdge.y)) * wPlot * (1.0 - wet));',
    '',
    '  float forest = smoothstep(0.54, 0.70, fbm5(p * 0.0023 + 11.7)) * (1.0 - wet);',
    '  albedo = mix(albedo, mix(uGroundA * 0.52, vec3(0.06, 0.14, 0.07), 0.35), forest * 0.72 * wForest);',
    '',
    '  float river = 1.0 - smoothstep(0.0, 0.016, abs(fbm5(p * 0.00047 + 31.4) - 0.5));',
    '  river *= (1.0 - wet) * smoothstep(0.20, 0.45, macro);',
    '  albedo = mix(albedo, uWaterCol * 1.25, river * 0.85 * wRiver);',
    '',
    '  albedo = mix(albedo, vec3(0.86, 0.89, 0.94), uSnow * smoothstep(0.44, 0.80, land));',
    '',
    '  float townSeed = fbm5(p * 0.00075 + 4.2);',
    '  float cityMask = smoothstep(0.54, 0.78, townSeed) * (1.0 - wet) * uUrban;',
    '  vec3 builtUp = mix(vec3(0.26, 0.25, 0.25), vec3(0.38, 0.36, 0.34), step(0.42, hash21(floor(p * 0.010))));',
    '  albedo = mix(albedo, builtUp, cityMask * 0.62 * wForest);',
    '',
    '  /* Terrain normal from the height field, so hillsides actually catch the',
    '     sun instead of being flat fill. */',
    '  float e = 90.0;',
    '  float h0 = terrainH(p);',
    '  vec3 n = normalize(vec3(h0 - terrainH(p + vec2(e, 0.0)), e, h0 - terrainH(p + vec2(0.0, e))));',
    '  n = normalize(mix(vec3(0.0, 1.0, 0.0), n, wField * (1.0 - wet)));',
    '',
    '  float ndl = max(dot(n, uSunDir), 0.0);',
    '  float shadow = cloudShadow(p);',
    '  vec3 diffuse = sunLight() * ndl * shadow * 0.62;',
    '  vec3 sky = ambient * (0.30 + 0.24 * n.y);',
    '  vec3 col = albedo * (diffuse + sky);',
    '',
    '  /* Water is shaded separately: it reflects sky, not soil. */',
    '  float ripple = fbm3(p * 0.0032 + vec2(uTime * 0.05, 0.0));',
    '  vec3 sea = uWaterCol * (ambient * 1.5 + sunLight() * 0.10) * mix(0.70, 1.25, ripple);',
    '  vec3 reflected = reflect(rd, vec3(0.0, 1.0, 0.0));',
    '  float glint = pow(max(dot(reflected, uSunDir), 0.0), 90.0);',
    '  float fresnel = pow(1.0 - min(-ry, 1.0), 4.0);',
    '  sea = mix(sea, skyColor(reflected) * 0.85, 0.25 + 0.55 * fresnel);',
    '  sea += sunLight() * glint * shadow * 0.9 * (1.0 - uNight);',
    '  float surf = (1.0 - smoothstep(0.0, 0.030, abs(macro - shore))) * wField;',
    '  sea = mix(sea, vec3(0.80, 0.86, 0.90) * (ambient + 0.4), surf * 0.55);',
    '  col = mix(col, sea, wet);',
    '',
    '  float lamps = step(0.955, hash21(floor(p * 0.011)));',
    '  col += vec3(1.0, 0.80, 0.46) * lamps * cityMask * uNight * 2.4 * wRiver;',
    '',
    '  float airportWeight;',
    '  vec3 apron = airportSurface(p, t, airportWeight);',
    '  if (airportWeight > 0.002) {',
    '    vec3 apronLit = apron * (sunLight() * shadow * max(uSunDir.y, 0.0) * 0.62 + ambient * 0.42);',
    '    col = mix(col, apronLit, airportWeight);',
    '  }',
    '  return col;',
    '}',
    '',
    '/* ---- wing ----------------------------------------------------------- */',
    '',
    'float edgeSide(vec2 p, vec2 a, vec2 b) {',
    '  vec2 e = b - a;',
    '  vec2 r = p - a;',
    '  return step(0.0, e.x * r.y - e.y * r.x);',
    '}',
    '',
    'float wingMask(vec2 p) {',
    '  float m = edgeSide(p, vec2(-1.30, -0.46), vec2(0.30, -0.035));',
    '  m *= edgeSide(p, vec2(0.30, -0.035), vec2(0.385, 0.075));',
    '  m *= edgeSide(p, vec2(0.385, 0.075), vec2(-1.30, 0.020));',
    '  m *= edgeSide(p, vec2(-1.30, 0.020), vec2(-1.30, -0.46));',
    '  return m;',
    '}',
    '',
    '/* ---- post ----------------------------------------------------------- */',
    '',
    'vec3 aces(vec3 x) {',
    '  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;',
    '  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);',
    '}',
    '',
    'void main() {',
    '  vec2 frag = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
    '  float shake = uShake * 0.0016;',
    '  frag += vec2(',
    '    sin(uTime * 21.3) * shake + sin(uTime * 7.1) * shake * 0.6,',
    '    cos(uTime * 18.7) * shake + sin(uTime * 5.3) * shake * 0.8',
    '  );',
    '',
    '  float fov = 1.05;',
    '  vec3 dir = normalize(vec3(frag.x * fov, frag.y * fov, 1.0));',
    '  float cr = cos(uRoll), sr = sin(uRoll);',
    '  dir = vec3(dir.x * cr - dir.y * sr, dir.x * sr + dir.y * cr, dir.z);',
    '  float cp = cos(uPitch), sp = sin(uPitch);',
    '  dir = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);',
    '  float cy = cos(uYaw), sy = sin(uYaw);',
    '  vec3 rd = normalize(vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy));',
    '',
    '  vec3 ro = vec3(0.0, max(uAlt, 1.2), 0.0);',
    '  /* Horizon dip from earth curvature: the reason cruise looks like cruise. */',
    '  float dip = sqrt(2.0 * max(uAlt, 0.0) / EARTH_R);',
    '  vec3 ambient = skyColor(vec3(0.0, 1.0, 0.0)) * 0.65 + horizonTint() * 0.35;',
    '',
    '  vec3 col = skyColor(rd);',
    '',
    '  float groundDist;',
    '  vec3 ground = groundColor(ro, rd, dip, ambient, groundDist);',
    '  float sceneT = 260000.0;',
    '  if (groundDist > 0.0) {',
    '    /* Aerial perspective: distant ground drifts toward the sky it sits under. */',
    '    float fog = clamp(1.0 - exp(-groundDist * 0.000032 * (1.0 + uAlt * 0.000040)), 0.0, 1.0);',
    '    vec3 airColor = mix(horizonTint(), skyColor(rd), 0.35);',
    '    vec3 hazed = mix(ground, airColor, fog * 0.94);',
    '    col = mix(col, hazed, uGroundFade * smoothstep(0.0, 0.010, -(rd.y + dip)));',
    '    sceneT = groundDist;',
    '  }',
    '',
    '  /* Thin cirrus stays a cheap layer; it is far enough away to read flat. */',
    '  if (rd.y > 0.0 && uAlt < 10200.0) {',
    '    float ct = (10400.0 - ro.y) / max(rd.y, 0.001);',
    '    if (ct > 0.0 && ct < sceneT) {',
    '      vec2 cq = vec2(ro.x + rd.x * ct, ro.z + rd.z * ct + uTravel * 0.4) * 0.000060;',
    '      float veil = smoothstep(0.52, 0.86, fbm3(cq + vec2(uTime * 0.004, 0.0)));',
    '      veil *= uHighCloud * exp(-ct * 0.0000075);',
    '      vec3 cirrus = mix(ambient * 1.1, sunLight() * 0.55, 0.45);',
    '      cirrus = mix(cirrus, horizonTint(), clamp(ct * 0.000012, 0.0, 0.6));',
    '      col = mix(col, cirrus, clamp(veil, 0.0, 0.85));',
    '    }',
    '  }',
    '',
    '  vec4 clouds = marchClouds(ro, rd, sceneT, ambient);',
    '  col = col * (1.0 - clouds.a) + clouds.rgb;',
    '',
    '  /* ---- wing ---- */',
    '  vec2 wp = frag;',
    '  wp.y += 0.395 - uWingLift;',
    '  wp.y += sin(uTime * 1.9) * 0.0035 + sin(uTime * 6.7) * 0.0014 * (1.0 + uShake);',
    '  if (wingMask(wp) > 0.5) {',
    '    float span = clamp((wp.x + 1.30) / 1.68, 0.0, 1.0);',
    '    float chord = clamp((wp.y + 0.46) / 0.50, 0.0, 1.0);',
    '    vec3 skyRefl = skyColor(normalize(vec3(0.15, 0.90, 0.41)));',
    '    vec3 paint = mix(vec3(0.90, 0.91, 0.93), vec3(0.78, 0.80, 0.84), span);',
    '    paint = mix(paint * 0.90, paint, smoothstep(0.0, 0.30, chord));',
    '    vec3 metal = paint * (sunLight() * max(uSunDir.y * 0.55 + 0.30, 0.0) * 0.42 + ambient * 0.55);',
    '    metal = mix(metal, skyRefl * 0.75, 0.20 + 0.16 * chord);',
    '    float spec = pow(clamp(1.0 - abs(chord - 0.78) * 5.5, 0.0, 1.0), 3.0);',
    '    metal += sunLight() * spec * 0.10 * (1.0 - uNight);',
    '    metal *= 0.985 + 0.03 * noise2(wp * 90.0);',
    '    float panel = smoothstep(0.0045, 0.0, abs(fract(span * 6.0) - 0.5) - 0.492);',
    '    metal *= 1.0 - panel * 0.14;',
    '    float flapLine = smoothstep(0.0055, 0.0, abs(chord - 0.34 - span * 0.06));',
    '    metal = mix(metal, metal * 0.68, flapLine);',
    '    float spoiler = smoothstep(0.004, 0.0, abs(chord - 0.60 - span * 0.04)) * step(span, 0.62);',
    '    metal = mix(metal, metal * 0.78, spoiler);',
    '    metal = mix(metal, metal * 0.70, smoothstep(0.06, 0.0, 1.0 - chord) * 0.7);',
    '    col = metal;',
    '    float navLight = smoothstep(0.988, 1.0, span) * smoothstep(0.55, 0.75, chord);',
    '    col = mix(col, vec3(2.6, 0.16, 0.14), navLight * (0.30 + 0.70 * step(0.5, fract(uTime * 0.7))));',
    '  }',
    '',
    '  /* ---- post ---- */',
    '  col *= 1.05;',
    '  col = aces(col);',
    '  float r = length(frag * vec2(0.84, 1.0));',
    '  col *= 1.0 - smoothstep(0.72, 1.36, r) * 0.38;',
    '  float glare = pow(clamp(1.0 - length(frag - vec2(0.34, 0.26)) * 1.5, 0.0, 1.0), 3.0);',
    '  col += horizonTint() * glare * 0.030 * (1.0 - uNight);',
    '  /* Dither before the 8-bit write, or the sky bands. */',
    '  float dither = (hash21(gl_FragCoord.xy + fract(uTime) * 57.0) - 0.5) / 255.0;',
    '  col += dither * 1.6;',
    '  col += (hash21(gl_FragCoord.xy * 1.7 + fract(uTime) * 13.0) - 0.5) * 0.008;',
    '  gl_FragColor = vec4(max(col, 0.0), 1.0);',
    '}'
  ].join('\n');

  const UNIFORM_NAMES = [
    'uRes', 'uTime', 'uAlt', 'uPitch', 'uRoll', 'uYaw', 'uTravel',
    'uSunDir', 'uSunElev', 'uNight', 'uGroundA', 'uGroundB', 'uWaterCol',
    'uWater', 'uSnow', 'uUrban', 'uCloudCover', 'uHighCloud', 'uDeckY',
    'uDeckThick', 'uGroundFade', 'uShake', 'uWingLift', 'uSteps'
  ];

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('shader compile failed: ' + log);
    }
    return shader;
  }

  function create(canvas) {
    const options = { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    if (!gl) return null;

    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('program link failed: ' + gl.getProgramInfoLog(program));
      }
    } catch (error) {
      console.warn('[skyview]', error.message);
      return null;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {};
    UNIFORM_NAMES.forEach(name => { uniforms[name] = gl.getUniformLocation(program, name); });

    const state = {
      alt: 0, pitch: 0, roll: 0, yaw: -1.35, travel: 0, speed: 0,
      sunDir: new Float32Array([0.42, 0.36, 0.83]), sunElev: 0.35, night: 0,
      groundA: new Float32Array([0.24, 0.30, 0.18]),
      groundB: new Float32Array([0.34, 0.38, 0.24]),
      waterCol: new Float32Array([0.05, 0.16, 0.28]),
      water: 0.35, snow: 0, urban: 0.30,
      cloudCover: 0.5, highCloud: 0.4, deckY: 2400, deckThick: 800,
      groundFade: 1, shake: 0, wingLift: 0
    };

    /* Quality auto-tune. Volumetric clouds are the expensive part, so both the
       internal resolution and the march step count back off together until the
       frame budget is met, then creep back up. */
    const quality = { scale: 0.85, steps: 30, frameMs: 16, locked: false };
    const MAX_DPR = 1.6;

    let running = false;
    let frameId = 0;
    const startedAt = performance.now();
    let lastFrame = startedAt;

    function tuneQuality(ms) {
      /* A hidden or throttled tab reports huge frame gaps that have nothing to
         do with GPU load. Tuning on those would permanently wreck the quality
         of a window the user is not even looking at yet. */
      if (quality.locked || !(ms > 0) || ms > 90) return;
      quality.frameMs = quality.frameMs * 0.88 + ms * 0.12;
      if (quality.frameMs > 30 && quality.scale > 0.42) {
        quality.scale = Math.max(0.42, quality.scale - 0.05);
        quality.steps = Math.max(14, quality.steps - 2);
      } else if (quality.frameMs < 15 && quality.scale < 1.0) {
        quality.scale = Math.min(1.0, quality.scale + 0.015);
        quality.steps = Math.min(34, quality.steps + 0.5);
      }
    }

    function resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, MAX_DPR) * quality.scale;
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    }

    function frame(now) {
      if (!running) return;
      frameId = requestAnimationFrame(frame);
      const delta = Math.min((now - lastFrame) / 1000, 0.1);
      tuneQuality(now - lastFrame);
      lastFrame = now;
      state.travel += state.speed * delta;
      resize();

      gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
      gl.uniform1f(uniforms.uTime, (now - startedAt) / 1000);
      gl.uniform1f(uniforms.uAlt, state.alt);
      gl.uniform1f(uniforms.uPitch, state.pitch);
      gl.uniform1f(uniforms.uRoll, state.roll);
      gl.uniform1f(uniforms.uYaw, state.yaw);
      gl.uniform1f(uniforms.uTravel, state.travel);
      gl.uniform3fv(uniforms.uSunDir, state.sunDir);
      gl.uniform1f(uniforms.uSunElev, state.sunElev);
      gl.uniform1f(uniforms.uNight, state.night);
      gl.uniform3fv(uniforms.uGroundA, state.groundA);
      gl.uniform3fv(uniforms.uGroundB, state.groundB);
      gl.uniform3fv(uniforms.uWaterCol, state.waterCol);
      gl.uniform1f(uniforms.uWater, state.water);
      gl.uniform1f(uniforms.uSnow, state.snow);
      gl.uniform1f(uniforms.uUrban, state.urban);
      gl.uniform1f(uniforms.uCloudCover, state.cloudCover);
      gl.uniform1f(uniforms.uHighCloud, state.highCloud);
      gl.uniform1f(uniforms.uDeckY, state.deckY);
      gl.uniform1f(uniforms.uDeckThick, state.deckThick);
      gl.uniform1f(uniforms.uGroundFade, state.groundFade);
      gl.uniform1f(uniforms.uShake, state.shake);
      gl.uniform1f(uniforms.uWingLift, state.wingLift);
      gl.uniform1f(uniforms.uSteps, Math.round(quality.steps));

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function setVec(target, value) {
      target[0] = value[0];
      target[1] = value[1];
      target[2] = value[2];
    }

    return {
      start() {
        if (running) return;
        running = true;
        /* Give the resumed view a fresh budget rather than one measured while
           it was stopped. */
        quality.frameMs = 16;
        lastFrame = performance.now();
        frameId = requestAnimationFrame(frame);
      },
      stop() {
        running = false;
        cancelAnimationFrame(frameId);
      },
      isRunning() { return running; },
      resetTravel() { state.travel = 0; },
      setQuality(scale, steps) {
        quality.scale = scale;
        quality.steps = steps;
        quality.locked = true;
      },
      quality,
      apply(patch) {
        Object.keys(patch).forEach(key => {
          const value = patch[key];
          if (Array.isArray(value) && state[key] instanceof Float32Array) setVec(state[key], value);
          else state[key] = value;
        });
      },
      state
    };
  }

  global.SkyView = { create };
})(window);
