/* Cabin Focus - flight profile and destination biomes.
   One journey is a continuous function of progress, so the window view, the map
   plane, the ETA and the gauges all read from the same clock. */
(function (global) {
  'use strict';

  /* The flight profile is written in seconds, not in fractions of the journey.
     A real Incheon to Paris flight is eleven hours, and a takeoff roll is
     forty seconds in both that and a short hop: scaling everything by the
     total would give a fourteen minute takeoff roll. So the departure and
     arrival blocks are fixed durations measured from each end, and cruise
     absorbs whatever is left in the middle. */
  const DEPARTURE = [
    { t: 0, alt: 3, pitch: 0.020, speed: 6, shake: 1.00, phase: 'taxi' },
    { t: 90, alt: 3, pitch: 0.018, speed: 13, shake: 1.12, phase: 'taxi' },
    { t: 620, alt: 3, pitch: 0.014, speed: 11, shake: 1.16, phase: 'taxi' },
    { t: 690, alt: 3, pitch: 0.012, speed: 4, shake: 0.95, phase: 'taxi' },
    { t: 700, alt: 3, pitch: 0.010, speed: 22, shake: 1.45, phase: 'takeoff' },
    { t: 736, alt: 5, pitch: 0.030, speed: 84, shake: 1.75, phase: 'takeoff' },
    { t: 748, alt: 120, pitch: 0.175, speed: 96, shake: 1.15, phase: 'takeoff' },
    { t: 810, alt: 900, pitch: 0.155, speed: 128, shake: 0.72, phase: 'climb' },
    { t: 960, alt: 2600, pitch: 0.135, speed: 158, shake: 0.50, phase: 'climb' },
    { t: 1260, alt: 5600, pitch: 0.105, speed: 195, shake: 0.34, phase: 'climb' },
    { t: 1740, alt: 9000, pitch: 0.072, speed: 224, shake: 0.26, phase: 'climb' },
    { t: 2280, alt: 10600, pitch: 0.024, speed: 244, shake: 0.16, phase: 'cruise' }
  ];

  /* Measured backwards from touchdown. */
  const ARRIVAL = [
    { t: 2040, alt: 11200, pitch: 0.010, speed: 248, shake: 0.13, phase: 'cruise' },
    { t: 1860, alt: 11100, pitch: -0.028, speed: 246, shake: 0.16, phase: 'descent' },
    { t: 1380, alt: 8600, pitch: -0.042, speed: 232, shake: 0.22, phase: 'descent' },
    { t: 900, alt: 4800, pitch: -0.050, speed: 198, shake: 0.44, phase: 'descent' },
    { t: 480, alt: 2100, pitch: -0.048, speed: 158, shake: 0.52, phase: 'approach' },
    { t: 210, alt: 760, pitch: -0.044, speed: 118, shake: 0.66, phase: 'approach' },
    { t: 70, alt: 190, pitch: -0.036, speed: 88, shake: 0.88, phase: 'approach' },
    { t: 26, alt: 34, pitch: -0.020, speed: 78, shake: 1.05, phase: 'landing' },
    { t: 14, alt: 6, pitch: 0.016, speed: 72, shake: 1.20, phase: 'landing' },
    { t: 0, alt: 3, pitch: 0.000, speed: 18, shake: 1.45, phase: 'landing' }
  ];

  const DEPARTURE_SEC = DEPARTURE[DEPARTURE.length - 1].t;
  const ARRIVAL_SEC = ARRIVAL[0].t;
  const MIN_JOURNEY_SEC = DEPARTURE_SEC + ARRIVAL_SEC + 60;

  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function interpolate(a, b, k) {
    const e = smoothstep(0, 1, k);
    return {
      alt: a.alt + (b.alt - a.alt) * e,
      pitch: a.pitch + (b.pitch - a.pitch) * e,
      speed: a.speed + (b.speed - a.speed) * e,
      shake: a.shake + (b.shake - a.shake) * e,
      phase: e < 0.5 ? a.phase : b.phase
    };
  }

  function sampleTable(table, seconds, ascending) {
    let index = 0;
    while (index < table.length - 2) {
      const next = table[index + 1].t;
      if (ascending ? next >= seconds : next <= seconds) break;
      index += 1;
    }
    const a = table[index];
    const b = table[index + 1];
    const span = b.t - a.t;
    return interpolate(a, b, Math.abs(span) < 1e-6 ? 0 : (seconds - a.t) / span);
  }

  /* Short hops cannot fit the full ground blocks, so both ends compress
     together rather than the flight losing its cruise entirely. */
  function blockScale(durationSec) {
    return Math.min(1, durationSec / MIN_JOURNEY_SEC);
  }

  function sampleProfile(progress, durationSec) {
    const total = durationSec || 3600;
    const scale = blockScale(total);
    const elapsed = Math.min(1, Math.max(0, progress)) * total;
    const remaining = total - elapsed;
    const departureEnd = DEPARTURE_SEC * scale;
    const arrivalStart = ARRIVAL_SEC * scale;

    if (elapsed <= departureEnd) return sampleTable(DEPARTURE, elapsed / scale, true);
    if (remaining <= arrivalStart) return sampleTable(ARRIVAL, remaining / scale, false);

    /* Cruise: drift up a little over the middle of the flight, the way a real
       one steps up as it burns off weight. */
    const climbOut = DEPARTURE[DEPARTURE.length - 1];
    const topOfDescent = ARRIVAL[0];
    const cruiseSpan = Math.max(total - departureEnd - arrivalStart, 1);
    const k = (elapsed - departureEnd) / cruiseSpan;
    return interpolate(climbOut, topOfDescent, k);
  }

  /* Where the phase boundaries fall as fractions, for anything that needs to
     line up with the journey clock. */
  function phaseFraction(secondsFromStart, durationSec) {
    return Math.min(1, Math.max(0, secondsFromStart * blockScale(durationSec) / durationSec));
  }

  function phaseFractionFromEnd(secondsBeforeEnd, durationSec) {
    return 1 - phaseFraction(secondsBeforeEnd, durationSec);
  }

  const BIOMES = {
    temperate: {
      groundA: [0.27, 0.38, 0.19], groundB: [0.52, 0.57, 0.31], waterCol: [0.07, 0.22, 0.36],
      water: 0.30, snow: 0.00, urban: 0.38, cloudCover: 0.44, highCloud: 0.42, deckY: 2300, relief: 0.30
    },
    coastal: {
      groundA: [0.26, 0.39, 0.21], groundB: [0.54, 0.58, 0.34], waterCol: [0.05, 0.26, 0.42],
      water: 0.56, snow: 0.00, urban: 0.48, cloudCover: 0.42, highCloud: 0.40, deckY: 2100, relief: 0.26
    },
    mediterranean: {
      groundA: [0.45, 0.43, 0.23], groundB: [0.70, 0.65, 0.40], waterCol: [0.06, 0.34, 0.50],
      water: 0.44, snow: 0.00, urban: 0.42, cloudCover: 0.18, highCloud: 0.24, deckY: 2600, relief: 0.42
    },
    tropical: {
      groundA: [0.14, 0.36, 0.14], groundB: [0.36, 0.56, 0.24], waterCol: [0.05, 0.42, 0.50],
      water: 0.42, snow: 0.00, urban: 0.36, cloudCover: 0.60, highCloud: 0.52, deckY: 1750, relief: 0.24
    },
    island: {
      groundA: [0.16, 0.38, 0.17], groundB: [0.40, 0.58, 0.27], waterCol: [0.04, 0.48, 0.58],
      water: 0.72, snow: 0.00, urban: 0.24, cloudCover: 0.40, highCloud: 0.44, deckY: 1650, relief: 0.34
    },
    desert: {
      groundA: [0.62, 0.48, 0.29], groundB: [0.86, 0.73, 0.50], waterCol: [0.06, 0.36, 0.50],
      water: 0.12, snow: 0.00, urban: 0.34, cloudCover: 0.06, highCloud: 0.16, deckY: 3200, relief: 0.38
    },
    mountain: {
      groundA: [0.26, 0.34, 0.21], groundB: [0.62, 0.63, 0.58], waterCol: [0.08, 0.28, 0.40],
      water: 0.24, snow: 0.46, urban: 0.26, cloudCover: 0.40, highCloud: 0.38, deckY: 2700, relief: 1.00
    },
    northern: {
      groundA: [0.24, 0.32, 0.26], groundB: [0.52, 0.56, 0.52], waterCol: [0.07, 0.20, 0.32],
      water: 0.46, snow: 0.52, urban: 0.22, cloudCover: 0.40, highCloud: 0.46, deckY: 1900, relief: 0.46
    },
    megacity: {
      groundA: [0.28, 0.34, 0.24], groundB: [0.54, 0.54, 0.45], waterCol: [0.06, 0.24, 0.38],
      water: 0.40, snow: 0.00, urban: 0.78, cloudCover: 0.38, highCloud: 0.38, deckY: 2200, relief: 0.20
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

  /* Bank angle: one departure turn out of the origin, one arrival turn onto
     final, plus a slow drift so cruise never looks frozen. Both turns are
     fixed minutes, not fractions, or an eleven hour flight would spend an hour
     in the departure turn. */
  function bankAt(progress, seconds, durationSec) {
    const total = durationSec || 3600;
    const elapsed = progress * total;
    const remaining = total - elapsed;
    const scale = blockScale(total);
    const departure = Math.sin(smoothstep(755 * scale, 1010 * scale, elapsed) * Math.PI) * 0.13;
    const arrival = -Math.sin(smoothstep(620 * scale, 150 * scale, remaining) * Math.PI) * 0.11;
    const drift = Math.sin(seconds * 0.09) * 0.016 + Math.sin(seconds * 0.037) * 0.010;
    return departure + arrival + drift;
  }

  const DEG = Math.PI / 180;

  /* Solar position for a real place at the real current moment. The sun has to
     land in the right part of the sky relative to the runway heading, so a
     believable-looking fake is not enough here: we need a true azimuth. */
  function sunState(coords) {
    const longitude = coords[0];
    const latitude = coords[1];
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), 0, 0);
    const dayOfYear = (now.getTime() - start) / 86400000;
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

    /* Fractional year, then the equation of time in minutes. */
    const gamma = 2 * Math.PI / 365 * (dayOfYear - 1 + (utcHours - 12) / 24);
    const eqTime = 229.18 * (0.000075
      + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const declination = 0.006918
      - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma) + 0.001480 * Math.sin(3 * gamma);

    const trueSolarMinutes = utcHours * 60 + eqTime + 4 * longitude;
    const hourAngle = (trueSolarMinutes / 4 - 180) * DEG;

    const lat = latitude * DEG;
    const sinElev = Math.sin(lat) * Math.sin(declination)
      + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev)));
    /* Azimuth measured clockwise from true north. */
    const azimuth = Math.atan2(
      -Math.sin(hourAngle) * Math.cos(declination),
      Math.sin(declination) * Math.cos(lat) - Math.cos(declination) * Math.sin(lat) * Math.cos(hourAngle)
    );

    return {
      azimuth: (azimuth / DEG + 360) % 360,
      elevation: elevation / DEG,
      sunElev: Math.sin(elevation),
      night: smoothstep(0.5, -3.0, elevation / DEG)
    };
  }

  /* Great circle bearing, used for the cruise heading. */
  function bearing(from, to) {
    const lat1 = from[1] * DEG;
    const lat2 = to[1] * DEG;
    const dLon = (to[0] - from[0]) * DEG;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) / DEG + 360) % 360;
  }

  function angleLerp(a, b, k) {
    let delta = ((b - a + 540) % 360) - 180;
    return (a + delta * k + 360) % 360;
  }

  /* Where the nose is pointing: lined up with the departure runway, swinging on
     to the great circle course after takeoff, then on to the arrival runway. */
  function headingAt(progress, route, durationSec) {
    const total = durationSec || 3600;
    const scale = blockScale(total);
    const elapsed = progress * total;
    const remaining = total - elapsed;
    if (elapsed < 748 * scale) return route.originHeading;
    if (remaining < 150 * scale) return route.destinationHeading;
    if (remaining < 700 * scale) {
      return angleLerp(route.courseHeading, route.destinationHeading, smoothstep(700 * scale, 150 * scale, remaining));
    }
    if (elapsed < 1200 * scale) {
      return angleLerp(route.originHeading, route.courseHeading, smoothstep(748 * scale, 1200 * scale, elapsed));
    }
    return route.courseHeading;
  }

  /* Rotate the sun into the aircraft frame, where +z is the nose and +x is the
     right wing. This is what makes a westbound evening departure put the sun in
     the correct window. */
  function sunVector(sun, headingDeg) {
    const relative = (sun.azimuth - headingDeg) * DEG;
    const elevation = sun.elevation * DEG;
    const horizontal = Math.cos(elevation);
    return [Math.sin(relative) * horizontal, Math.sin(elevation), Math.cos(relative) * horizontal];
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

  const SCALARS = ['water', 'snow', 'urban', 'cloudCover', 'highCloud', 'deckY', 'relief'];
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
      azimuth: angleLerp(a.azimuth, b.azimuth, k),
      elevation: a.elevation + (b.elevation - a.elevation) * k,
      sunElev: a.sunElev + (b.sunElev - a.sunElev) * k,
      night: a.night + (b.night - a.night) * k
    };
  }

  /* Numerically integrate the speed profile so we know, before the journey
     starts, how far along the world the touchdown point will be. The arrival
     runway has to be placed there. */
  function travelAt(progress, durationSec, steps) {
    const n = steps || 900;
    const limit = Math.min(1, Math.max(0, progress));
    const dt = limit / n;
    let distance = 0;
    for (let i = 0; i < n; i++) {
      distance += sampleProfile((i + 0.5) * dt, durationSec).speed * dt * durationSec;
    }
    return distance;
  }

  /* The landscape and the light belong to where the aircraft actually is, so
     both cross over from origin to destination during the cruise. Departing
     Incheon for Dubai should not start over sand. */
  function crossfade(progress, durationSec) {
    const total = durationSec || 3600;
    const scale = blockScale(total);
    const start = phaseFraction(1500 * scale, total);
    const end = phaseFractionFromEnd(1500 * scale, total);
    return smoothstep(start, Math.max(end, start + 0.02), progress);
  }

  /* Full renderer state for a moment in the journey. `biome` and `sun` may each
     be a single value, or a { from, to } pair that crosses over en route. */
  function frameState(progress, biome, sun, seconds, route) {
    const durationSec = (route && route.durationSec) || 3600;
    const k = crossfade(progress, durationSec);
    if (biome && biome.to) biome = mixBiome(biome.from, biome.to, k);
    if (sun && sun.to) sun = mixSun(sun.from, sun.to, k);
    const heading = route ? headingAt(progress, route, durationSec) : 0;
    const sunDir = sun.azimuth === undefined ? sun.sunDir : sunVector(sun, heading);
    const profile = sampleProfile(progress, durationSec);
    const deckThick = 820;
    const nearDeck = 1 - smoothstep(0, deckThick * 1.35, Math.abs(profile.alt - biome.deckY));
    const inCloud = nearDeck * smoothstep(0.05, 0.45, biome.cloudCover);
    const phase = inCloud > 0.45 && (profile.phase === 'climb' || profile.phase === 'descent')
      ? 'cloudbreak'
      : profile.phase;

    /* Below half way the visible airport is the one behind us; after that it is
       the one ahead, parked at the precomputed touchdown distance. */
    const runway = !route ? { z0: 0, airportZ0: -400, lengthM: 3500, widthM: 60, lighted: true }
      : (progress < 0.5
        /* Line up past the piano keys, the way an aircraft actually does.
           Starting on top of them fills the window with white bars. */
        ? { z0: route.taxiDistance - 120, airportZ0: -400, lengthM: route.origin.lengthM, widthM: route.origin.widthM, lighted: route.origin.lighted }
        : { z0: route.touchdownDistance - 340, airportZ0: route.touchdownDistance - 1400, lengthM: route.destination.lengthM, widthM: route.destination.widthM, lighted: route.destination.lighted });

    return {
      phase: phase,
      heading: heading,
      alt: profile.alt,
      speedKmh: profile.speed * 3.6,
      render: {
        alt: profile.alt,
        pitch: profile.pitch,
        roll: bankAt(progress, seconds, durationSec),
        speed: profile.speed,
        shake: profile.shake,
        wingLift: smoothstep(0, 2500, profile.alt) * 0.030,
        groundFade: 1,
        deckY: biome.deckY,
        relief: biome.relief,
        deckThick: deckThick,
        cloudCover: biome.cloudCover,
        highCloud: biome.highCloud,
        groundA: biome.groundA,
        groundB: biome.groundB,
        waterCol: biome.waterCol,
        water: biome.water,
        snow: biome.snow,
        urban: biome.urban,
        sunDir: sunDir,
        sunElev: sun.sunElev,
        night: sun.night,
        runwayZ0: runway.z0,
        airportZ0: runway.airportZ0,
        runwayLength: runway.lengthM,
        runwayWidth: runway.widthM,
        runwayLit: runway.lighted ? 1 : 0
      }
    };
  }

  global.Journey = {
    sampleProfile: sampleProfile,
    frameState: frameState,
    biomeFor: biomeFor,
    sunState: sunState,
    bearing: bearing,
    travelAt: travelAt,
    minJourneySec: MIN_JOURNEY_SEC,
    route: function (originKey, origin, destinationKey, destination, durationSec) {
      const seconds = durationSec || 3600;
      const airports = global.Airports;
      const fallback = { lengthM: 3500, widthM: 60, headingDeg: 0, lighted: true };
      const originAirport = (airports && airports.get(originKey)) || fallback;
      const destinationAirport = (airports && airports.get(destinationKey)) || fallback;
      const courseHeading = bearing(origin.coords, destination.coords);
      return {
        biome: { from: biomeFor(originKey, origin), to: biomeFor(destinationKey, destination) },
        sun: { from: sunState(origin.coords), to: sunState(destination.coords) },
        origin: originAirport,
        destination: destinationAirport,
        originHeading: originAirport.headingDeg,
        /* No arrival data for a searched destination: land on the reciprocal of
           the course, which is what a runway roughly aligned with the approach
           would give. */
        destinationHeading: destinationAirport === fallback ? courseHeading : destinationAirport.headingDeg,
        courseHeading: courseHeading,
        durationSec: seconds,
        /* Place the arrival runway where the aircraft will actually be at
           touchdown, which is a fixed number of seconds before the end. */
        touchdownDistance: travelAt(1 - (20 * blockScale(seconds)) / seconds, seconds),
        /* Taxiing covers real ground, so the departure threshold has to sit at
           the far end of it rather than under the parking stand. */
        taxiDistance: travelAt(700 * blockScale(seconds) / seconds, seconds)
      };
    },
    phaseLabel: function (phase) { return PHASE_LABELS[phase] || 'CRUISE'; }
  };
})(window);
