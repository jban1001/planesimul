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
const windowScene = document.querySelector('.scene-window');
const footageCredit = document.querySelector('#footageCredit');
const themeButton = document.querySelector('#themeButton');
const mapStage = document.querySelector('.map-stage');
const DESTINATIONS = {
  paris: { name:'Paris', ko:'파리', code:'CDG', coords:[2.3522,48.8566], timezone:'Europe/Paris', video:'https://videos.pexels.com/video-files/38835023/16508092_3840_2160_25fps.mp4', source:'https://www.pexels.com/video/paris-aerial-view-with-famous-landmarks-38835023/' },
  newyork: { name:'New York', ko:'뉴욕', code:'JFK', coords:[-74.006,40.7128], timezone:'America/New_York', video:'https://videos.pexels.com/video-files/5796436/5796436-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/aerial-view-of-new-york-city-5796436/' },
  tokyo: { name:'Tokyo', ko:'도쿄', code:'NRT', coords:[139.6917,35.6895], timezone:'Asia/Tokyo', video:'https://videos.pexels.com/video-files/35462656/15024368_1920_1080_30fps.mp4', source:'https://www.pexels.com/video/aerial-view-of-tokyo-city-skyline-35462656/' },
  reykjavik: { name:'Reykjavík', ko:'레이캬비크', code:'KEF', coords:[-21.9426,64.1466], timezone:'Atlantic/Reykjavik', video:'https://videos.pexels.com/video-files/34476866/14609179_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/scenic-drone-footage-of-icelandic-landscape-34476866/' },
  zurich: { name:'Zürich', ko:'취리히', code:'ZRH', coords:[8.5417,47.3769], timezone:'Europe/Zurich', video:'https://videos.pexels.com/video-files/3971604/3971604-uhd_3840_2160_30fps.mp4', source:'https://www.pexels.com/video/drone-footage-of-swiss-alps-3971604/' }
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
let planeAnimation = null;

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

function setDestination(key) {
  const destination = DESTINATIONS[key] || DESTINATIONS.paris;
  currentDestination = destination;
  destinationSelect.value = key;
  localStorage.setItem('cabin-destination', key);
  document.querySelector('#windowDestination').textContent = destination.ko;
  document.querySelector('#mapAirportCode').textContent = destination.code;
  document.querySelector('#cardAirportCode').textContent = destination.code;
  document.querySelector('#destinationClockLabel').textContent = `${destination.name.toUpperCase()} · LOCAL TIME`;
  const hours = Math.max(1,Math.ceil(distanceKm(ORIGIN.coords,destination.coords) / 820 * 2) / 2);
  document.querySelector('#arrivalTime').textContent = `${Math.floor(hours)}h ${String((hours % 1) * 60).padStart(2,'0')}m`;
  footageCredit.href = destination.source;
  footageCredit.textContent = `${destination.name.toUpperCase()} FOOTAGE · PEXELS`;
  windowScene.classList.remove('video-ready','video-error');
  destinationVideo.src = destination.video;
  destinationVideo.load();
  destinationVideo.play().catch(() => {});
  updateClock();
  updateMapRoute();
}
destinationVideo.addEventListener('canplay', () => { windowScene.classList.add('video-ready'); destinationVideo.play().catch(() => {}); });
destinationVideo.addEventListener('error', () => windowScene.classList.add('video-error'));
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
    map.once('style.load', updateMapRoute);
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
  const geojson = {type:'Feature',properties:{},geometry:{type:'LineString',coordinates}};
  if (map.getSource('flight-route')) map.getSource('flight-route').setData(geojson);
  else {
    map.addSource('flight-route',{type:'geojson',data:geojson});
    map.addLayer({id:'flight-route-glow',type:'line',source:'flight-route',paint:{'line-color':app.dataset.theme === 'light' ? '#167b89' : '#66d5dc','line-width':8,'line-opacity':.16,'line-blur':5}});
    map.addLayer({id:'flight-route-line',type:'line',source:'flight-route',paint:{'line-color':app.dataset.theme === 'light' ? '#a95f1b' : '#e7b66c','line-width':2.5,'line-opacity':.95,'line-dasharray':[2,2]}});
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
  cancelAnimationFrame(planeAnimation);
  const startTime = performance.now();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function movePlane(now) {
    const t = reduceMotion ? .42 : ((now-startTime)%60000)/60000;
    const scaled = t*(coordinates.length-1); const i = Math.floor(scaled); const next = coordinates[Math.min(i+1,coordinates.length-1)]; const p = scaled-i;
    planeMarker.setLngLat([coordinates[i][0]+(next[0]-coordinates[i][0])*p,coordinates[i][1]+(next[1]-coordinates[i][1])*p]);
    if (!reduceMotion) planeAnimation = requestAnimationFrame(movePlane);
  }
  planeAnimation = requestAnimationFrame(movePlane);
}
function initializeMap() {
  if (!window.maplibregl) return;
  map = new maplibregl.Map({container:'realMap',style:mapStyle(app.dataset.theme),center:[70,45],zoom:1.4,attributionControl:true,interactive:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
  map.on('load',() => { mapStage.classList.add('map-ready'); updateMapRoute(); });
}
initializeMap();
setDestination(localStorage.getItem('cabin-destination') || 'paris');
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
