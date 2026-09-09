/* Cabin Focus - flight profile and destination biomes.
   One journey is a continuous function of progress, so the window view, the map
   plane, the ETA and the gauges all read from the same clock. */
(function (global) {
  'use strict';

  /* Keyframes along normalised journey progress. Altitude in metres, pitch in
     radians, speed in metres per second. Everything between keys is smoothly
     interpolated, which is what removes the seams a clip sequence has. */
  const KEYS = [
    { t: 0.000, alt: 3, pitch: 0.020, speed: 10, shake: 1.05, phase: 'taxi' },
    { t: 0.038, alt: 3, pitch: 0.015, speed: 26, shake: 1.15, phase: 'taxi' },
    { t: 0.052, alt: 3, pitch: 0.010, speed: 82, shake: 1.70, phase: 'takeoff' },
    { t: 0.072, alt: 140, pitch: 0.170, speed: 96, shake: 1.10, phase: 'takeoff' },
    { t: 0.105, alt: 1250, pitch: 0.140, speed: 138, shake: 0.62, phase: 'climb' },
    { t: 0.155, alt: 4000, pitch: 0.105, speed: 186, shake: 0.34, phase: 'climb' },
    { t: 0.215, alt: 7600, pitch: 0.070, speed: 218, shake: 0.26, phase: 'climb' },
    { t: 0.280, alt: 10500, pitch: 0.022, speed: 244, shake: 0.16, phase: 'cruise' },
    { t: 0.500, alt: 11100, pitch: 0.008, speed: 250, shake: 0.12, phase: 'cruise' },
    { t: 0.700, alt: 11400, pitch: 0.008, speed: 250, shake: 0.12, phase: 'cruise' },
    { t: 0.780, alt: 9400, pitch: -0.038, speed: 236, shake: 0.20, phase: 'descent' },
    { t: 0.860, alt: 4400, pitch: -0.050, speed: 198, shake: 0.46, phase: 'descent' },
    { t: 0.922, alt: 1500, pitch: -0.046, speed: 148, shake: 0.52, phase: 'approach' },
    { t: 0.968, alt: 300, pitch: -0.036, speed: 96, shake: 0.82, phase: 'approach' },
    { t: 0.990, alt: 24, pitch: 0.014, speed: 76, shake: 1.15, phase: 'landing' },
    { t: 1.000, alt: 3, pitch: 0.000, speed: 22, shake: 1.55, phase: 'landing' }
  ];

  const BIOMES = {
    temperate: {
      groundA: [0.27, 0.38, 0.19], groundB: [0.52, 0.57, 0.31], waterCol: [0.07, 0.22, 0.36],
      water: 0.30, snow: 0.00, urban: 0.38, cloudCover: 0.44, highCloud: 0.42, deckY: 2300
    },
    coastal: {
      groundA: [0.26, 0.39, 0.21], groundB: [0.54, 0.58, 0.34], waterCol: [0.05, 0.26, 0.42],
      water: 0.56, snow: 0.00, urban: 0.48, cloudCover: 0.42, highCloud: 0.40, deckY: 2100
    },
    mediterranean: {
      groundA: [0.45, 0.43, 0.23], groundB: [0.70, 0.65, 0.40], waterCol: [0.06, 0.34, 0.50],
      water: 0.44, snow: 0.00, urban: 0.42, cloudCover: 0.18, highCloud: 0.24, deckY: 2600
    },
    tropical: {
      groundA: [0.14, 0.36, 0.14], groundB: [0.36, 0.56, 0.24], waterCol: [0.05, 0.42, 0.50],
      water: 0.42, snow: 0.00, urban: 0.36, cloudCover: 0.60, highCloud: 0.52, deckY: 1750
    },
    island: {
      groundA: [0.16, 0.38, 0.17], groundB: [0.40, 0.58, 0.27], waterCol: [0.04, 0.48, 0.58],
      water: 0.72, snow: 0.00, urban: 0.24, cloudCover: 0.40, highCloud: 0.44, deckY: 1650
    },
    desert: {
      groundA: [0.62, 0.48, 0.29], groundB: [0.86, 0.73, 0.50], waterCol: [0.06, 0.36, 0.50],
      water: 0.12, snow: 0.00, urban: 0.34, cloudCover: 0.06, highCloud: 0.16, deckY: 3200
    },
    mountain: {
      groundA: [0.26, 0.34, 0.21], groundB: [0.62, 0.63, 0.58], waterCol: [0.08, 0.28, 0.40],
      water: 0.24, snow: 0.46, urban: 0.26, cloudCover: 0.40, highCloud: 0.38, deckY: 2700
    },
    northern: {
      groundA: [0.24, 0.32, 0.26], groundB: [0.52, 0.56, 0.52], waterCol: [0.07, 0.20, 0.32],
      water: 0.46, snow: 0.52, urban: 0.22, cloudCover: 0.40, highCloud: 0.46, deckY: 1900
    },
    megacity: {
      groundA: [0.28, 0.34, 0.24], groundB: [0.54, 0.54, 0.45], waterCol: [0.06, 0.24, 0.38],
      water: 0.40, snow: 0.00, urban: 0.78, cloudCover: 0.38, highCloud: 0.38, deckY: 2200
    }
  };

  const DESTINATION_BIOMES = {
    seoul: 'coastal',
    paris: 'temperate',
    newyork: 'megacity',
    tokyo: 'megacity',
    london: 'temperate',
    rome: 'mediterranean',
    barcelona: 'mediterranean',
    singapore: 'island',
    bangkok: 'tropical',
    bali: 'island',
    sydney: 'coastal',
    auckland: 'coastal',
    reykjavik: 'northern',
    zurich: 'mountain',
    helsinki: 'northern',
    honolulu: 'island',
    vancouver: 'mountain',
    dubai: 'desert',
    istanbul: 'coastal',
    cairo: 'desert',
    losangeles: 'megacity'
  };

  const PHASE_LABELS = {
    taxi: 'TAXI',
    takeoff: 'TAKEOFF',
    climb: 'CLIMB',
    cloudbreak: 'CLOUD BREAK',
    cruise: 'CRUISE',
    descent: 'DESCENT',
    approach: 'APPROACH',
    landing: 'LANDING'
  };

  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function sampleProfile(progress) {
    const t = Math.min(1, Math.max(0, progress));
    let index = 0;
    while (index < KEYS.length - 2 && KEYS[index + 1].t < t) index += 1;
    const a = KEYS[index];
    const b = KEYS[index + 1];
    const span = Math.max(b.t - a.t, 1e-6);
    const k = smoothstep(0, 1, (t - a.t) / span);
    return {
      alt: a.alt + (b.alt - a.alt) * k,
      pitch: a.pitch + (b.pitch - a.pitch) * k,
      speed: a.speed + (b.speed - a.speed) * k,
      shake: a.shake + (b.shake - a.shake) * k,
      phase: k < 0.5 ? a.phase : b.phase
    };
  }

  /* Bank angle: one departure turn out of the origin, one arrival turn onto
     final, plus a slow drift so cruise never looks frozen. */
  function bankAt(t, seconds) {
    const departure = Math.sin(smoothstep(0.075, 0.145, t) * Math.PI) * 0.13;
    const arrival = -Math.sin(smoothstep(0.800, 0.930, t) * Math.PI) * 0.11;
    const drift = Math.sin(seconds * 0.09) * 0.016 + Math.sin(seconds * 0.037) * 0.010;
    return departure + arrival + drift;
  }

  /* Rough solar position from the destination's local clock. Good enough to put
     the sun in a believable place and to know whether it is night. */
  function sunState(timezone) {
    let hours = 12;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone
      }).format(new Date()).split(':');
      hours = Number(parts[0]) + Number(parts[1]) / 60;
    } catch (error) {
      hours = new Date().getHours();
    }
    const dayAngle = (hours - 12) / 12 * Math.PI;
    const elevation = Math.cos(dayAngle) * 0.92 - 0.06;
    const azimuth = dayAngle + Math.PI * 0.5;
    const horizontal = Math.max(0.12, Math.sqrt(Math.max(0, 1 - elevation * elevation)));
    const dir = [Math.cos(azimuth) * horizontal, elevation, Math.sin(azimuth) * horizontal];
    const length = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    return {
      sunDir: [dir[0] / length, dir[1] / length, dir[2] / length],
      sunElev: elevation,
      night: smoothstep(0.02, -0.16, elevation)
    };
  }

  function biomeKeyFor(key, destination) {
    if (DESTINATION_BIOMES[key]) return DESTINATION_BIOMES[key];
    const latitude = Math.abs(destination && destination.coords ? destination.coords[1] : 40);
    if (latitude > 58) return 'northern';
    if (latitude > 46) return 'temperate';
    if (latitude < 23.5) return 'tropical';
    return 'temperate';
  }

  function biomeFor(key, destination) {
    const biomeKey = biomeKeyFor(key, destination);
    const preset = BIOMES[biomeKey] || BIOMES.temperate;
    return Object.assign({ biomeKey: biomeKey }, preset);
  }

  const SCALARS = ['water', 'snow', 'urban', 'cloudCover', 'highCloud', 'deckY'];
  const VECTORS = ['groundA', 'groundB', 'waterCol'];

  function mixBiome(a, b, k) {
    const out = { biomeKey: k < 0.5 ? a.biomeKey : b.biomeKey };
    SCALARS.forEach(name => { out[name] = a[name] + (b[name] - a[name]) * k; });
    VECTORS.forEach(name => {
      out[name] = [
        a[name][0] + (b[name][0] - a[name][0]) * k,
        a[name][1] + (b[name][1] - a[name][1]) * k,
        a[name][2] + (b[name][2] - a[name][2]) * k
      ];
    });
    return out;
  }

  function mixSun(a, b, k) {
    return {
      sunDir: [
        a.sunDir[0] + (b.sunDir[0] - a.sunDir[0]) * k,
        a.sunDir[1] + (b.sunDir[1] - a.sunDir[1]) * k,
        a.sunDir[2] + (b.sunDir[2] - a.sunDir[2]) * k
      ],
      sunElev: a.sunElev + (b.sunElev - a.sunElev) * k,
      night: a.night + (b.night - a.night) * k
    };
  }

  /* The landscape and the light belong to where the aircraft actually is, so
     both cross over from origin to destination during the cruise. Departing
     Incheon for Dubai should not start over sand. */
  function crossfade(progress) {
    return smoothstep(0.16, 0.86, progress);
  }

  /* Full renderer state for a moment in the journey. `biome` and `sun` may each
     be a single value, or a { from, to } pair that crosses over en route. */
  function frameState(progress, biome, sun, seconds) {
    const k = crossfade(progress);
    if (biome && biome.to) biome = mixBiome(biome.from, biome.to, k);
    if (sun && sun.to) sun = mixSun(sun.from, sun.to, k);
    const profile = sampleProfile(progress);
    const deckThick = 820;
    const nearDeck = 1 - smoothstep(0, deckThick * 1.35, Math.abs(profile.alt - biome.deckY));
    const inCloud = nearDeck * smoothstep(0.05, 0.45, biome.cloudCover);
    const phase = inCloud > 0.45 && (profile.phase === 'climb' || profile.phase === 'descent')
      ? 'cloudbreak'
      : profile.phase;

    return {
      phase: phase,
      alt: profile.alt,
      speedKmh: profile.speed * 3.6,
      render: {
        alt: profile.alt,
        pitch: profile.pitch,
        roll: bankAt(progress, seconds),
        speed: profile.speed,
        shake: profile.shake,
        wingLift: smoothstep(0, 2500, profile.alt) * 0.030,
        groundFade: 1,
        deckY: biome.deckY,
        deckThick: deckThick,
        cloudCover: biome.cloudCover,
        highCloud: biome.highCloud,
        groundA: biome.groundA,
        groundB: biome.groundB,
        waterCol: biome.waterCol,
        water: biome.water,
        snow: biome.snow,
        urban: biome.urban,
        sunDir: sun.sunDir,
        sunElev: sun.sunElev,
        night: sun.night
      }
    };
  }

  global.Journey = {
    sampleProfile: sampleProfile,
    frameState: frameState,
    biomeFor: biomeFor,
    sunState: sunState,
    route: function (originKey, origin, destinationKey, destination) {
      return {
        biome: { from: biomeFor(originKey, origin), to: biomeFor(destinationKey, destination) },
        sun: { from: sunState(origin.timezone), to: sunState(destination.timezone) }
      };
    },
    phaseLabel: function (phase) { return PHASE_LABELS[phase] || 'CRUISE'; }
  };
})(window);
