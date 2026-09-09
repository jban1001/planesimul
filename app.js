const app = document.querySelector('.app');
const modeButtons = [...document.querySelectorAll('[data-set-mode]')];
const clockWindow = document.querySelector('#clockWindow');
const clockMap = document.querySelector('#clockMap');
const timerToggle = document.querySelector('#timerToggle');
const timerText = document.querySelector('#timerText');
const timerState = document.querySelector('#timerState');
const durationButtons = [...document.querySelectorAll('[data-minutes]')];
const soundButton = document.querySelector('#soundButton');
const fullscreenButton = document.querySelector('#fullscreenButton');
const installButton = document.querySelector('#installButton');
const hideUiButton = document.querySelector('#hideUiButton');
const showUiButton = document.querySelector('#showUiButton');
const destinationSelect = document.querySelector('#destinationSelect');
const destinationVideo = document.querySelector('#destinationVideo');
const journeyVideoB = document.querySelector('#journeyVideoB');
const journeyVideos = [destinationVideo,journeyVideoB];
const windowScene = document.querySelector('.scene-window');
const footageCredit = document.querySelector('#footageCredit');
const themeButton = document.querySelector('#themeButton');
const mapStage = document.querySelector('.map-stage');
const flightStageLabel = document.querySelector('#flightStageLabel');
const journeyProgressText = document.querySelector('#journeyProgressText');
const journeyTrackFill = document.querySelector('#journeyTrackFill');
const journeyPreviewButton = document.querySelector('#journeyPreviewButton');
const destinationDialog = document.querySelector('#destinationDialog');
const destinationSearchForm = document.querySelector('#destinationSearchForm');
const destinationQuery = document.querySelector('#destinationQuery');
const destinationResults = document.querySelector('#destinationResults');
const destinationSearchStatus = document.querySelector('#destinationSearchStatus');
const WINDOW_VIEWS = [
  { video:'https://videos.pexels.com/video-files/16127349/16127349-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-16127349/' },
  { video:'https://videos.pexels.com/video-files/34103177/14464255_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/aircraft-wing-view-with-scenic-clouds-in-flight-34103177/' },
  { video:'https://videos.pexels.com/video-files/34597437/14661683_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-in-bright-blue-sky-over-clouds-34597437/' }
];
const TOKYO_JOURNEY = [
  { id:'taxi', label:'TAXI · INCHEON', durationSec:12, video:'https://videos.pexels.com/video-files/3785721/3785721-hd_1920_1080_25fps.mp4', source:'https://www.pexels.com/video/view-of-the-airport-field-from-an-airplane-s-window-3785721/' },
  { id:'takeoff', label:'TAKEOFF · INCHEON', durationSec:14, video:'https://videos.pexels.com/video-files/18437623/18437623-hd_1920_1080_50fps.mp4', source:'https://www.pexels.com/video/a-plane-wing-is-seen-from-the-window-of-an-airplane-18437623/' },
  { id:'climb', label:'CLIMB · LEAVING SEOUL', durationSec:12, video:'https://videos.pexels.com/video-files/32064798/13667400_2160_3840_30fps.mp4', source:'https://www.pexels.com/video/view-from-airplane-window-during-takeoff-32064798/' },
  { id:'cloudbreak', label:'CLOUD BREAK · ABOVE KOREA', durationSec:14, video:'https://videos.pexels.com/video-files/16127349/16127349-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-16127349/' },
  { id:'cruise', label:'CRUISE · EAST SEA', durationSec:14, video:'https://videos.pexels.com/video-files/34597437/14661683_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-in-bright-blue-sky-over-clouds-34597437/' },
  { id:'approach', label:'APPROACH · JAPAN', durationSec:14, video:'https://videos.pexels.com/video-files/34103177/14464255_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/aircraft-wing-view-with-scenic-clouds-in-flight-34103177/' },
  { id:'descent', label:'DESCENT · TOKYO BAY', durationSec:14, video:'https://videos.pexels.com/video-files/36390540/15432226_1920_1080_25fps.mp4', source:'https://www.pexels.com/video/airplane-landing-at-coastal-city-airport-36390540/' },
  { id:'landing', label:'LANDING · TOKYO', durationSec:16, video:'https://videos.pexels.com/video-files/14063546/14063546-uhd_3840_2160_60fps.mp4', source:'https://www.pexels.com/video/window-view-from-a-plane-landing-at-the-airport-14063546/' }
];
const JOURNEY_OVERLAP_SECONDS = 1.1;
const DESTINATIONS = {
  paris: { name:'Paris', ko:'파리', code:'CDG', coords:[2.3522,48.8566], timezone:'Europe/Paris', video:'https://videos.pexels.com/video-files/16127349/16127349-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-16127349/' },
  newyork: { name:'New York', ko:'뉴욕', code:'JFK', coords:[-74.006,40.7128], timezone:'America/New_York', video:'https://videos.pexels.com/video-files/34103177/14464255_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/aircraft-wing-view-with-scenic-clouds-in-flight-34103177/' },
  tokyo: { name:'Tokyo', ko:'도쿄', code:'NRT', coords:[139.6917,35.6895], timezone:'Asia/Tokyo', video:'https://videos.pexels.com/video-files/34597437/14661683_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-in-bright-blue-sky-over-clouds-34597437/' },
  reykjavik: { name:'Reykjavík', ko:'레이캬비크', code:'KEF', coords:[-21.9426,64.1466], timezone:'Atlantic/Reykjavik', video:'https://videos.pexels.com/video-files/34103177/14464255_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/aircraft-wing-view-with-scenic-clouds-in-flight-34103177/' },
  zurich: { name:'Zürich', ko:'취리히', code:'ZRH', coords:[8.5417,47.3769], timezone:'Europe/Zurich', video:'https://videos.pexels.com/video-files/16127349/16127349-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/airplane-wing-16127349/' },
  london: { name:'London', ko:'런던', code:'LHR', coords:[-0.1276,51.5072], timezone:'Europe/London' },
  rome: { name:'Rome', ko:'로마', code:'FCO', coords:[12.4964,41.9028], timezone:'Europe/Rome' },
  barcelona: { name:'Barcelona', ko:'바르셀로나', code:'BCN', coords:[2.1734,41.3851], timezone:'Europe/Madrid' },
  singapore: { name:'Singapore', ko:'싱가포르', code:'SIN', coords:[103.8198,1.3521], timezone:'Asia/Singapore' },
  bangkok: { name:'Bangkok', ko:'방콕', code:'BKK', coords:[100.5018,13.7563], timezone:'Asia/Bangkok' },
  bali: { name:'Bali', ko:'발리', code:'DPS', coords:[115.1889,-8.4095], timezone:'Asia/Makassar' },
  sydney: { name:'Sydney', ko:'시드니', code:'SYD', coords:[151.2093,-33.8688], timezone:'Australia/Sydney' },
  auckland: { name:'Auckland', ko:'오클랜드', code:'AKL', coords:[174.7633,-36.8485], timezone:'Pacific/Auckland' },
  helsinki: { name:'Helsinki', ko:'헬싱키', code:'HEL', coords:[24.9384,60.1699], timezone:'Europe/Helsinki' },
  honolulu: { name:'Honolulu', ko:'호놀룰루', code:'HNL', coords:[-157.8583,21.3069], timezone:'Pacific/Honolulu' },
  vancouver: { name:'Vancouver', ko:'밴쿠버', code:'YVR', coords:[-123.1207,49.2827], timezone:'America/Vancouver' },
  dubai: { name:'Dubai', ko:'두바이', code:'DXB', coords:[55.2708,25.2048], timezone:'Asia/Dubai' },
  istanbul: { name:'Istanbul', ko:'이스탄불', code:'IST', coords:[28.9784,41.0082], timezone:'Europe/Istanbul' },
  cairo: { name:'Cairo', ko:'카이로', code:'CAI', coords:[31.2357,30.0444], timezone:'Africa/Cairo' },
  losangeles: { name:'Los Angeles', ko:'로스앤젤레스', code:'LAX', coords:[-118.2437,34.0522], timezone:'America/Los_Angeles' }
};
const ORIGIN = { name:'Seoul', code:'ICN', coords:[126.4505,37.4691] };

let duration = Number(localStorage.getItem('cabin-duration')) || 50;
let secondsLeft = duration * 60;
let timerId = null;
let audioContext = null;
let soundNodes = null;
let installPrompt = null;
let currentDestination = DESTINATIONS.paris;
let map = null;
let planeMarker = null;
let currentRouteCoordinates = [];
let flightStartedAt = Date.now();
let flightDurationMs = 0;
let flightTicker = null;
let currentFlightPhase = '';
let currentVideoMeta = null;
let cinematicActive = false;
let journeyIndex = 0;
let journeyTimer = null;
let journeyToken = 0;
let activeVideoIndex = 0;

function updateClock() {
  const localValue = new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const destinationValue = new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:currentDestination.timezone}).format(new Date());
  clockWindow.textContent = localValue;
  clockMap.textContent = destinationValue;
}
updateClock();
setInterval(updateClock, 10000);

function setMode(mode) {
  app.dataset.mode = mode;
  localStorage.setItem('cabin-mode', mode);
  modeButtons.forEach(button => {
    const active = button.dataset.setMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.setMode)));
setMode(localStorage.getItem('cabin-mode') || 'window');

function distanceKm(a,b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b[1]-a[1]);
  const dLon = rad(b[0]-a[0]);
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

function selectWindowView(destination) {
  if (destination.video) return {video:destination.video,source:destination.source};
  const index = Math.abs(Math.round(destination.coords[0] + destination.coords[1])) % WINDOW_VIEWS.length;
  return WINDOW_VIEWS[index];
}
function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(0,Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
}
function setWindowVideo(view, phase = 'cruise') {
  cinematicActive = false;
  currentFlightPhase = phase;
  currentVideoMeta = view;
  windowScene.dataset.flightPhase = phase;
  windowScene.classList.remove('video-ready','video-error');
  windowScene.classList.add('video-switching');
  footageCredit.href = view.source;
  footageCredit.textContent = 'FLIGHT PHASE FOOTAGE · PEXELS';
  const video = journeyVideos[activeVideoIndex];
  const otherVideo = journeyVideos[1-activeVideoIndex];
  otherVideo.pause();
  otherVideo.classList.remove('is-active');
  video.loop = true;
  video.src = view.video;
  video.load();
  video.play().catch(() => {});
}
function updateJourneyStage(progress) {
  const percentage = Math.min(100,Math.max(0,progress * 100));
  journeyTrackFill.style.width = `${percentage}%`;
  journeyProgressText.textContent = `${percentage.toFixed(0)}%`;
  if (currentDestination !== DESTINATIONS.tokyo || !cinematicActive) {
    flightStageLabel.textContent = progress >= 1 ? `ARRIVED · ${currentDestination.code}` : `CRUISE · TO ${currentDestination.code}`;
    return;
  }
  const stage = TOKYO_JOURNEY[Math.min(journeyIndex,TOKYO_JOURNEY.length-1)];
  flightStageLabel.textContent = progress >= 1 ? 'ARRIVED · TOKYO' : stage.label;
}
function updateFlightProgress() {
  const elapsed = Math.max(0,Date.now() - flightStartedAt);
  const progress = flightDurationMs ? Math.min(1,elapsed / flightDurationMs) : 0;
  document.querySelector('#arrivalTime').textContent = formatRemaining(flightDurationMs - elapsed);
  document.querySelector('.flight-progress span').style.width = `${progress * 100}%`;
  document.querySelector('#flightPercent').textContent = `${(progress * 100).toFixed(2)}%`;
  updateJourneyStage(progress);
  if (planeMarker && currentRouteCoordinates.length) {
    const scaled = progress * (currentRouteCoordinates.length - 1);
    const index = Math.floor(scaled);
    const next = currentRouteCoordinates[Math.min(index + 1,currentRouteCoordinates.length - 1)];
    const part = scaled - index;
    const current = currentRouteCoordinates[index];
    planeMarker.setLngLat([current[0] + (next[0]-current[0])*part,current[1] + (next[1]-current[1])*part]);
  }
  if (progress >= 1 && flightTicker) { clearInterval(flightTicker); flightTicker = null; }
}
function resetFlight(destination, durationOverrideMs = 0) {
  clearInterval(flightTicker);
  flightStartedAt = Date.now();
  flightDurationMs = durationOverrideMs || Math.max(45 * 60 * 1000,(distanceKm(ORIGIN.coords,destination.coords) / 820 + .65) * 3600 * 1000);
  currentFlightPhase = '';
  document.querySelector('.flight-progress span').style.width = '0%';
  document.querySelector('#flightPercent').textContent = '0.00%';
  updateFlightProgress();
  flightTicker = setInterval(updateFlightProgress,1000);
}
function stopJourneySequence() {
  clearTimeout(journeyTimer);
  journeyTimer = null;
  journeyToken += 1;
  cinematicActive = false;
  journeyVideos.forEach(video => { video.loop = false; });
}
function finishJourney(token) {
  if (token !== journeyToken) return;
  clearTimeout(journeyTimer);
  journeyTimer = null;
  journeyIndex = TOKYO_JOURNEY.length - 1;
  flightStartedAt = Date.now() - flightDurationMs;
  updateFlightProgress();
  journeyPreviewButton.textContent = 'REPLAY ICN → TOKYO';
}
function playJourneySegment(index,token) {
  if (token !== journeyToken) return;
  if (index >= TOKYO_JOURNEY.length) { finishJourney(token); return; }
  const segment = TOKYO_JOURNEY[index];
  const incomingIndex = 1-activeVideoIndex;
  const incoming = journeyVideos[incomingIndex];
  const outgoing = journeyVideos[activeVideoIndex];
  journeyIndex = index;
  currentFlightPhase = segment.id;
  currentVideoMeta = segment;
  windowScene.dataset.flightPhase = segment.id;
  footageCredit.href = segment.source;
  footageCredit.textContent = 'CONTINUOUS JOURNEY FOOTAGE · PEXELS';
  incoming.pause();
  incoming.loop = false;
  incoming.classList.remove('is-active');
  incoming.src = segment.video;
  incoming.load();
  const reveal = () => {
    incoming.removeEventListener('canplay',reveal);
    if (token !== journeyToken) return;
    incoming.currentTime = 0;
    incoming.play().catch(() => {});
    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');
    setTimeout(() => outgoing.pause(),1250);
    activeVideoIndex = incomingIndex;
    windowScene.classList.add('video-ready');
    windowScene.classList.remove('video-switching');
    flightStageLabel.textContent = segment.label;
    clearTimeout(journeyTimer);
    const waitMs = Math.max(4000,(segment.durationSec - JOURNEY_OVERLAP_SECONDS) * 1000);
    journeyTimer = setTimeout(() => playJourneySegment(index+1,token),waitMs);
  };
  incoming.addEventListener('canplay',reveal,{once:true});
  incoming.play().catch(() => {});
}
function startTokyoJourney() {
  stopJourneySequence();
  cinematicActive = true;
  journeyIndex = 0;
  const token = journeyToken;
  const totalSeconds = TOKYO_JOURNEY.reduce((sum,item) => sum + item.durationSec,0) - JOURNEY_OVERLAP_SECONDS * (TOKYO_JOURNEY.length-1);
  journeyPreviewButton.textContent = 'RESTART ICN → TOKYO';
  journeyPreviewButton.setAttribute('aria-pressed','true');
  resetFlight(DESTINATIONS.tokyo,totalSeconds*1000);
  playJourneySegment(0,token);
}
function setDestination(key) {
  const destination = DESTINATIONS[key] || DESTINATIONS.paris;
  stopJourneySequence();
  journeyPreviewButton.textContent = 'ICN → TOKYO · FULL JOURNEY';
  journeyPreviewButton.setAttribute('aria-pressed','false');
  currentDestination = destination;
  destinationSelect.value = key;
  localStorage.setItem('cabin-destination', key);
  document.querySelector('#windowDestination').textContent = destination.ko;
  document.querySelector('#mapAirportCode').textContent = destination.code;
  document.querySelector('#cardAirportCode').textContent = destination.code;
  document.querySelector('#destinationClockLabel').textContent = `${destination.name.toUpperCase()} · LOCAL TIME`;
  const view = selectWindowView(destination);
  if (destination === DESTINATIONS.tokyo) startTokyoJourney();
  else { setWindowVideo(view,'cruise'); resetFlight(destination); }
  updateClock();
  updateMapRoute();
}
journeyPreviewButton.addEventListener('click', () => {
  if (currentDestination !== DESTINATIONS.tokyo) setDestination('tokyo'); else startTokyoJourney();
  setMode('window');
});
journeyVideos.forEach(video => {
  video.addEventListener('canplay', () => {
    if (video.classList.contains('is-active')) {
      windowScene.classList.add('video-ready');
      windowScene.classList.remove('video-switching');
      video.play().catch(() => {});
    }
  });
  video.addEventListener('error', () => windowScene.classList.add('video-error'));
});
destinationSelect.addEventListener('change', () => setDestination(destinationSelect.value));

function drawTimer() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  timerText.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function stopTimer(completed = false) {
  clearInterval(timerId);
  timerId = null;
  timerState.textContent = completed ? 'COMPLETE' : 'START';
  timerToggle.setAttribute('aria-label', completed ? '집중 세션 다시 시작' : '집중 타이머 시작');
}
function startTimer() {
  if (secondsLeft <= 0) secondsLeft = duration * 60;
  timerState.textContent = 'PAUSE';
  timerToggle.setAttribute('aria-label','집중 타이머 일시정지');
  timerId = setInterval(() => {
    secondsLeft -= 1;
    drawTimer();
    if (secondsLeft <= 0) {
      stopTimer(true);
      if ('vibrate' in navigator) navigator.vibrate([180,100,180]);
    }
  },1000);
}
timerToggle.addEventListener('click', () => timerId ? stopTimer() : startTimer());
durationButtons.forEach(button => button.addEventListener('click', () => {
  duration = Number(button.dataset.minutes);
  secondsLeft = duration * 60;
  localStorage.setItem('cabin-duration', duration);
  stopTimer();
  drawTimer();
  durationButtons.forEach(item => item.classList.toggle('active', item === button));
}));
durationButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) === duration));
drawTimer();

function createCabinNoise() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * .985 + white * .015;
      data[i] = last * 2.6;
    }
  }
  const noise = audioContext.createBufferSource();
  const lowpass = audioContext.createBiquadFilter();
  const hum = audioContext.createOscillator();
  const humGain = audioContext.createGain();
  const master = audioContext.createGain();
  noise.buffer = buffer; noise.loop = true;
  lowpass.type = 'lowpass'; lowpass.frequency.value = 520;
  hum.type = 'sine'; hum.frequency.value = 82; humGain.gain.value = .012;
  master.gain.value = .085;
  noise.connect(lowpass).connect(master);
  hum.connect(humGain).connect(master);
  master.connect(audioContext.destination);
  noise.start(); hum.start();
  soundNodes = { noise, hum, master };
}
soundButton.addEventListener('click', async () => {
  if (!audioContext) createCabinNoise();
  else if (audioContext.state === 'suspended') await audioContext.resume();
  else await audioContext.suspend();
  const active = audioContext.state === 'running';
  soundButton.textContent = active ? 'SOUND ON' : 'SOUND OFF';
  soundButton.setAttribute('aria-pressed', String(active));
});

fullscreenButton.addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.();
});
document.addEventListener('fullscreenchange', () => fullscreenButton.textContent = document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN');
hideUiButton.addEventListener('click', () => app.classList.add('ui-hidden'));
showUiButton.addEventListener('click', () => app.classList.remove('ui-hidden'));

function mapStyle(theme) { return `https://tiles.openfreemap.org/styles/${theme === 'light' ? 'positron' : 'dark'}`; }
function setTheme(theme) {
  app.dataset.theme = theme;
  localStorage.setItem('cabin-theme', theme);
  themeButton.textContent = theme === 'light' ? 'LIGHT CABIN' : 'DARK CABIN';
  themeButton.setAttribute('aria-label', theme === 'light' ? '어두운 테마로 변경' : '밝은 테마로 변경');
  if (map) {
    map.setStyle(mapStyle(theme));
    map.once('idle',updateMapRoute);
  }
}
themeButton.addEventListener('click', () => setTheme(app.dataset.theme === 'light' ? 'dark' : 'light'));
setTheme(localStorage.getItem('cabin-theme') || 'dark');
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'm') setMode(app.dataset.mode === 'window' ? 'map' : 'window');
  if (event.key.toLowerCase() === 'f') fullscreenButton.click();
  if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); timerToggle.click(); }
  if (event.key === 'Escape') app.classList.remove('ui-hidden');
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; installButton.classList.remove('hidden');
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.classList.add('hidden');
});

function ensureCustomOption(destination) {
  let option = destinationSelect.querySelector('option[value="custom"]');
  if (!option) { option = document.createElement('option'); option.value = 'custom'; destinationSelect.append(option); }
  option.textContent = `${destination.name} · ${destination.country || 'Custom'}`;
}
document.querySelector('#openDestinationSearch').addEventListener('click', () => {
  destinationDialog.showModal();
  setTimeout(() => destinationQuery.focus(),50);
});
document.querySelector('#closeDestinationSearch').addEventListener('click', () => destinationDialog.close());
destinationDialog.addEventListener('click', event => { if (event.target === destinationDialog) destinationDialog.close(); });
destinationSearchForm.addEventListener('submit', async event => {
  event.preventDefault();
  const query = destinationQuery.value.trim();
  if (query.length < 2) return;
  destinationSearchStatus.textContent = '전 세계 여행지를 찾는 중…';
  destinationResults.replaceChildren();
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=ko&format=json`);
    if (!response.ok) throw new Error('search failed');
    const data = await response.json();
    const results = data.results || [];
    destinationSearchStatus.textContent = results.length ? '원하는 위치를 선택하면 ICN에서 새 비행이 시작됩니다.' : '검색 결과가 없습니다. 도시명과 국가를 함께 입력해보세요.';
    results.forEach(result => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'destination-result';
      const text = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = result.name;
      const detail = document.createElement('small'); detail.textContent = [result.admin1,result.country].filter(Boolean).join(' · ');
      const action = document.createElement('span'); action.textContent = 'FLY HERE →';
      text.append(title,detail); button.append(text,action);
      button.addEventListener('click', () => {
        const latin = (result.name.match(/[A-Za-z]/g) || []).slice(0,3).join('').toUpperCase();
        const code = latin.length === 3 ? latin : result.name.slice(0,3).toUpperCase();
        const custom = {name:result.name,ko:result.name,code,coords:[result.longitude,result.latitude],timezone:result.timezone || 'UTC',country:result.country || ''};
        DESTINATIONS.custom = custom;
        localStorage.setItem('cabin-custom-destination',JSON.stringify(custom));
        ensureCustomOption(custom);
        setDestination('custom');
        destinationDialog.close();
      });
      destinationResults.append(button);
    });
  } catch (error) {
    destinationSearchStatus.textContent = '지금은 위치 검색에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
  }
});

function routeCoordinates(start,end,steps=80) {
  let deltaLon = end[0] - start[0];
  if (deltaLon > 180) deltaLon -= 360;
  if (deltaLon < -180) deltaLon += 360;
  const distanceFactor = Math.min(1,Math.abs(deltaLon)/120);
  return Array.from({length:steps+1},(_,index) => {
    const t = index / steps;
    const lon = start[0] + deltaLon * t;
    const lat = start[1] + (end[1]-start[1])*t + Math.sin(Math.PI*t)*(10 + 15*distanceFactor);
    return [lon,Math.min(78,lat)];
  });
}
function updateMapRoute() {
  if (!map || !map.isStyleLoaded()) return;
  const coordinates = routeCoordinates(ORIGIN.coords,currentDestination.coords);
  currentRouteCoordinates = coordinates;
  const geojson = {type:'Feature',properties:{},geometry:{type:'LineString',coordinates}};
  if (map.getSource('flight-route')) map.getSource('flight-route').setData(geojson);
  else {
    map.addSource('flight-route',{type:'geojson',data:geojson});
    map.addLayer({id:'flight-route-glow',type:'line',source:'flight-route',paint:{'line-color':app.dataset.theme === 'light' ? '#006778' : '#66d5dc','line-width':app.dataset.theme === 'light' ? 12 : 9,'line-opacity':app.dataset.theme === 'light' ? .34 : .2,'line-blur':4}});
    map.addLayer({id:'flight-route-line',type:'line',source:'flight-route',paint:{'line-color':app.dataset.theme === 'light' ? '#b84400' : '#f2c578','line-width':app.dataset.theme === 'light' ? 3.6 : 2.8,'line-opacity':1,'line-dasharray':[2,1.5]}});
    map.addSource('airports',{type:'geojson',data:{type:'FeatureCollection',features:[
      {type:'Feature',properties:{label:'ICN'},geometry:{type:'Point',coordinates:coordinates[0]}},
      {type:'Feature',properties:{label:currentDestination.code},geometry:{type:'Point',coordinates:coordinates[coordinates.length-1]}}
    ]}});
    map.addLayer({id:'airports-dot',type:'circle',source:'airports',paint:{'circle-radius':5,'circle-color':'#e7b66c','circle-stroke-color':'#fff','circle-stroke-width':1}});
    map.addLayer({id:'airports-label',type:'symbol',source:'airports',layout:{'text-field':['get','label'],'text-offset':[0,1.4],'text-size':12},paint:{'text-color':app.dataset.theme === 'light' ? '#173541' : '#e5efef','text-halo-color':app.dataset.theme === 'light' ? '#f4faf9' : '#07121d','text-halo-width':1.5}});
  }
  if (map.getSource('airports')) map.getSource('airports').setData({type:'FeatureCollection',features:[
    {type:'Feature',properties:{label:'ICN'},geometry:{type:'Point',coordinates:coordinates[0]}},
    {type:'Feature',properties:{label:currentDestination.code},geometry:{type:'Point',coordinates:coordinates[coordinates.length-1]}}
  ]});
  const bounds = coordinates.reduce((box,coord) => box.extend(coord),new maplibregl.LngLatBounds(coordinates[0],coordinates[0]));
  map.fitBounds(bounds,{padding:{top:80,bottom:80,left:100,right:100},duration:1300,maxZoom:4});
  if (!planeMarker) {
    const marker = document.createElement('div'); marker.className = 'plane-marker'; marker.textContent = '✈';
    planeMarker = new maplibregl.Marker({element:marker,anchor:'center'}).setLngLat(coordinates[0]).addTo(map);
  }
  planeMarker.setLngLat(coordinates[0]);
  updateFlightProgress();
}
function initializeMap() {
  if (!window.maplibregl) return;
  map = new maplibregl.Map({container:'realMap',style:mapStyle(app.dataset.theme),center:[70,45],zoom:1.4,attributionControl:true,interactive:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
  map.on('load',() => { mapStage.classList.add('map-ready'); updateMapRoute(); });
  map.on('styledata',() => {
    if (map.isStyleLoaded() && !map.getSource('flight-route')) updateMapRoute();
  });
}
initializeMap();
try {
  const savedCustom = JSON.parse(localStorage.getItem('cabin-custom-destination'));
  if (savedCustom?.coords?.length === 2) { DESTINATIONS.custom = savedCustom; ensureCustomOption(savedCustom); }
} catch (error) {}
const shouldShowTokyoJourney = !localStorage.getItem('cabin-tokyo-journey-v1');
setDestination(shouldShowTokyoJourney ? 'tokyo' : (localStorage.getItem('cabin-destination') || 'paris'));
if (shouldShowTokyoJourney) {
  localStorage.setItem('cabin-tokyo-journey-v1','shown');
  setMode('window');
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
