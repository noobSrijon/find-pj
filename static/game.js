let gd = null;
let cr = 0;
let locIdx = 0;
let m = null;
let mk = null;
let selLoc = null;
let pano = null;
let bgm = null;

let used = [];

const els = {
    startBtn: document.getElementById('startButton'),
    introT: document.getElementById('introText'),
    introLoading: document.getElementById('introLoading'),
    continueBtn: document.getElementById('continueButton'),
    locCnt: document.getElementById('locationCounter'),
    panoEl: document.getElementById('streetViewPano'),
    nextLocBtn: document.getElementById('nextLocationButton'),
    riddleT: document.getElementById('riddleText'),
    guessBtn: document.getElementById('submitGuessButton'),
    skipBtn: document.getElementById('skipButton'),
    resTitle: document.getElementById('resultTitle'),
    distT: document.getElementById('distanceText'),
    ptsT: document.getElementById('pointsText'),
    actualLocT: document.getElementById('actualLocationText'),
    otherLocsT: document.getElementById('otherLocationsText'),
    nextRoundBtn: document.getElementById('nextRoundButton'),
    restartBtn: document.getElementById('restartButton')
};

const scrns = {
    startScr: document.getElementById('startScreen'),
    introScr: document.getElementById('introScreen'),
    exploreScr: document.getElementById('exploreScreen'),
    riddleScr: document.getElementById('riddleScreen'),
    resultScr: document.getElementById('resultScreen')
};

function showScr(scr) {
    console.log('showing screen:', scr);
    Object.values(scrns).forEach(s => {
        s.style.display = 'none';
        s.classList.add('hide');
        s.classList.remove('show');
    });
    
    if (scr === 'exploreScr') {
        scrns[scr].style.display = 'block';
    } else {
        scrns[scr].style.display = 'flex';
    }
    
    scrns[scr].classList.remove('hide');
    scrns[scr].classList.add('show');
}

async function loadGD() {
    try {
        const res = await fetch('/api/game-data');
        gd = await res.json();
    } catch (e) {
        console.error('failed to load game data:', e);
    }
}

function getRnd() {
    if (used.length >= gd.rounds.length) {
        used = [];
    }
    
    let avlRnds = [];
    for (let i = 0; i < gd.rounds.length; i++) {
        if (!used.includes(i)) {
            avlRnds.push(i);
        }
    }
    
    const rndIdx = Math.floor(Math.random() * avlRnds.length);
    const rnd = avlRnds[rndIdx];
    used.push(rnd);
    
    return rnd;
}

function startGame() {
    cr = getRnd();
    locIdx = 0;
    
    if (!bgm) {
        bgm = document.getElementById('backgroundMusic');
    }
    
    if (bgm) {
        bgm.volume = 0.3;
        bgm.play().catch(e => {
            console.log('audio autoplay prevented:', e);
        });
    }
    
    showScr('introScr');
    animateIntroText();
}

function animateIntroText() {
    const txt = gd.intro_text;
    els.introT.textContent = '';
    els.continueBtn.style.display = 'none';
    els.introLoading.style.display = 'flex';
    let idx = 0;
    
    const interval = setInterval(() => {
        if (idx < txt.length) {
            els.introT.textContent += txt[idx];
            idx++;
        } else {
            clearInterval(interval);
            els.introLoading.style.display = 'none';
            els.continueBtn.style.display = 'inline-block';
        }
    }, 30);
}

function startExploration() {
    locIdx = 0;
    pano = null;
    showScr('exploreScr');
    
    setTimeout(() => {
        loadCurrLoc();
    }, 100);
}

function loadCurrLoc() {
    const rnd = gd.rounds[cr];
    const loc = rnd.locations[locIdx];
    
    els.locCnt.textContent = `${locIdx + 1} / 3`;
    
    const coords = loc.coordinates.split(',');
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    
    console.log('loading location', locIdx + 1, 'at', lat, lng);
    
    const pos = { lat: lat, lng: lng };
    
    if (!pano) {
        console.log('creating new Street View pano');
        
        const panoEl = document.getElementById('streetViewPano');
        if (!panoEl) {
            console.error('Street View container not found');
            return;
        }
        
        pano = new google.maps.StreetViewPanorama(
            panoEl,
            {
                position: pos,
                pov: {
                    heading: 0,
                    pitch: 0
                },
                zoom: 1,
                addressControl: false,
                showRoadLabels: false,
                zoomControl: true,
                fullscreenControl: true,
                linksControl: true,
                panControl: true,
                imageDateControl: false,
                clickToGo: true,
                scrollwheel: true
            }
        );
        console.log('pano created');
    } else {
        console.log('updating pano position');
        pano.setPosition(pos);
        pano.setPov({ heading: 0, pitch: 0 });
        pano.setZoom(1);
    }
    
    if (locIdx === 2) {
        els.nextLocBtn.textContent = 'SOLVE THE RIDDLE';
    } else {
        els.nextLocBtn.textContent = 'NEXT LOCATION';
    }
}

function nextLoc() {
    if (locIdx < 2) {
        locIdx++;
        loadCurrLoc();
    } else {
        showRiddleScr();
    }
}

function showRiddleScr() {
    showScr('riddleScr');
    const rnd = gd.rounds[cr];
    els.riddleT.textContent = rnd.riddle;
    selLoc = null;
    initMap();
}

function initMap() {
    const mapEl = document.getElementById('map');
    
    if (!mapEl) {
        console.error('map container not found');
        return;
    }
    
    if (mk) {
        mk.setMap(null);
        mk = null;
    }
    
    if (m) {
        google.maps.event.clearInstanceListeners(m);
    }
    
    m = new google.maps.Map(mapEl, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: [
            {
                featureType: 'all',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
            }
        ],
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });

    m.addListener('click', (e) => {
        placeMarker(e.latLng);
    });
    
    console.log('map initialized');
}

function placeMarker(loc) {
    if (mk) {
        mk.setMap(null);
    }

    mk = new google.maps.Marker({
        position: loc,
        map: m,
        animation: google.maps.Animation.DROP
    });

    selLoc = loc;
}

function calcDist(lat1, lon1, lat2, lon2) {
    const p1 = new google.maps.LatLng(lat1, lon1);
    const p2 = new google.maps.LatLng(lat2, lon2);
    const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    return dist / 1000;
}

function calcPts(distKm) {
    if (distKm < 50) return 5000;
    if (distKm < 100) return 4500;
    if (distKm < 250) return 4000;
    if (distKm < 500) return 3500;
    if (distKm < 1000) return 3000;
    if (distKm < 2000) return 2500;
    if (distKm < 3000) return 2000;
    if (distKm < 5000) return 1500;
    if (distKm < 8000) return 1000;
    if (distKm < 12000) return 500;
    return 0;
}

function submitGuess() {
    if (!selLoc) {
        alert('Please select a location on the map first');
        return;
    }

    const rnd = gd.rounds[cr];
    const corrLoc = rnd.locations.find(loc => loc.is_correct);
    const [corrLat, corrLon] = corrLoc.coordinates.split(',').map(Number);
    
    const dist = calcDist(
        selLoc.lat(),
        selLoc.lng(),
        corrLat,
        corrLon
    );

    const pts = calcPts(dist);
    
    showResult(dist, pts, corrLoc.name);
}

function showResult(dist, pts, actualLoc) {
    showScr('resultScr');
    
    if (dist < 250) {
        els.resTitle.textContent = '✓ PJ FOUND!';
        els.resTitle.className = 'text-5xl md:text-7xl game-font font-black text-green-400 text-glow-green tracking-wider mb-4';
    } else if (dist < 1000) {
        els.resTitle.textContent = '⚡ GETTING CLOSE!';
        els.resTitle.className = 'text-5xl md:text-7xl game-font font-black text-amber-400 text-glow tracking-wider mb-4';
    } else {
        els.resTitle.textContent = '✗ NOT QUITE!';
        els.resTitle.className = 'text-5xl md:text-7xl game-font font-black text-red-400 text-glow-red tracking-wider mb-4';
    }
    
    els.distT.textContent = `${Math.round(dist)} km`;
    els.ptsT.textContent = pts.toLocaleString();
    els.actualLocT.textContent = actualLoc;
    
    const rnd = gd.rounds[cr];
    const otherLocs = rnd.locations
        .filter(loc => loc.name !== actualLoc)
        .map(loc => loc.name)
        .join(' : ');
    els.otherLocsT.textContent = `Other locations: ${otherLocs}`;
}

function nextRnd() {
    cr = getRnd();
    locIdx = 0;
    
    if (pano) {
        pano = null;
    }
    if (mk) {
        mk.setMap(null);
        mk = null;
    }
    selLoc = null;
    
    startExploration();
}

function skipRnd() {
    const rnd = gd.rounds[cr];
    const corrLoc = rnd.locations.find(loc => loc.is_correct);
    showResult(99999, 0, corrLoc.name);
}

function restartGame() {
    used = [];
    locIdx = 0;
    
    if (pano) {
        pano = null;
    }
    if (mk) {
        mk.setMap(null);
        mk = null;
    }
    selLoc = null;
    
    showScr('startScr');
}

els.startBtn.addEventListener('click', startGame);
els.continueBtn.addEventListener('click', startExploration);
els.nextLocBtn.addEventListener('click', nextLoc);
els.guessBtn.addEventListener('click', submitGuess);
els.skipBtn.addEventListener('click', skipRnd);
els.nextRoundBtn.addEventListener('click', nextRnd);
els.restartBtn.addEventListener('click', restartGame);
async function initGame() {
    await loadGD();
    
    if (!gd) {
        alert('Failed to load game data.');
        return;
    }

    showScr('startScr');
}

window.initGame = initGame;
