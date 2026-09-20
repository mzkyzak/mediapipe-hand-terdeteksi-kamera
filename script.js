// Master State & Variables
let currentMode = "mode1"; // "mode1", "mode2", "mode3"
let mediaStream = null;
let isDetecting = false;
let ttsEnabled = true;

// Detection Models
let handDetector = null;
let faceModel = null;
let lastFingerCount = -1;
let lastGesture = "";

// Mode 3 Engine Instances
let threeScene = null;
let particleSystem = null;
let handEffects = null;
let faceEffects = null;
let wsManager = null;

// Photo Blur State (Mode 2)
let isPhotoBlurActive = false;
let photoBlurIntensity = 25; // px

// Custom Names - editabel oleh user (index 0 = Tinju/Fist, 1-5 = jumlah jari)
// Disimpan di localStorage agar tetap tersimpan setelah refresh
function loadCustomNames() {
  const saved = localStorage.getItem('customNames');
  return saved ? JSON.parse(saved) : [
    "Taufiq",   // 0 jari / Tinju (Fist)
    "Ikhsan",   // 1 jari
    "Muzaky",   // 2 jari
    "Panggil",  // 3 jari
    "Saya",     // 4 jari
    "Zaky"      // 5 jari
  ];
}

let customNames = loadCustomNames();

function saveCustomNames() {
  localStorage.setItem('customNames', JSON.stringify(customNames));
}

function updateNameFromInput(index, value) {
  customNames[index] = value.trim() || customNames[index];
  saveCustomNames();
}

function populateNameInputs() {
  customNames.forEach((name, i) => {
    const input = document.getElementById(`name-input-${i}`);
    if (input) input.value = name;
  });
}

// TTS Voice Synthesizer
function speak(text) {
  if (!ttsEnabled) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// Check Finger Count for TTS Names (pakai customNames)
function checkForSpeech(fingerCount, gesture) {
  if (fingerCount !== lastFingerCount) {
    const name = customNames[fingerCount];
    if (name) speak(name);
    lastFingerCount = fingerCount;
  }
}

// Init Media Stream
async function initCamera() {
  if (mediaStream) return true;
  try {
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } };
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    const v1 = document.getElementById("video-mode1");
    const v2 = document.getElementById("video-mode2");
    const v3 = document.getElementById("video-mode3");

    if (v1) v1.srcObject = mediaStream;
    if (v2) v2.srcObject = mediaStream;
    if (v3) v3.srcObject = mediaStream;

    return true;
  } catch (err) {
    console.error("Camera access failed:", err);
    return false;
  }
}

// Load TensorFlow / MediaPipe Models
async function loadModels() {
  const loading = document.getElementById("loading-status");
  if (loading) loading.style.display = "block";
  try {
    if (window.blazeface) faceModel = await window.blazeface.load();
    if (window.handPoseDetection) {
      const model = window.handPoseDetection.SupportedModels.MediaPipeHands;
      handDetector = await window.handPoseDetection.createDetector(model, {
        runtime: 'mediapipe',
        modelType: 'full',
        maxHands: 4,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/'
      });
    }
    if (loading) loading.style.display = "none";
    console.log("✅ MediaPipe & BlazeFace models loaded successfully!");
    return true;
  } catch (err) {
    if (loading) loading.style.display = "none";
    console.error("Failed loading models:", err);
    return false;
  }
}

// Count extended fingers from keypoints
function countFingers(k) {
  if (!k || k.length < 21) return 0;
  let c = 0;
  if (k[4].x > k[3].x) c++; // Thumb
  if (k[8].y < k[6].y) c++; // Index
  if (k[12].y < l[10].y) c++; // Middle (safe check)
  if (k[16].y < k[14].y) c++; // Ring
  if (k[20].y < k[18].y) c++; // Pinky
  return c;
}

// Main Frame Detection Loop
async function processFrame() {
  if (!isDetecting) return;

  let activeVideo = document.getElementById("video-mode1");
  if (currentMode === "mode2") activeVideo = document.getElementById("video-mode2");
  if (currentMode === "mode3") activeVideo = document.getElementById("video-mode3");
  if (currentMode === "mode4") activeVideo = document.getElementById("video-mode4");

  let faces = [];
  let hands = [];

  if (activeVideo && activeVideo.readyState >= 2) {
    if (faceModel && (currentMode === "mode1" || currentMode === "mode2")) {
      try { faces = await faceModel.estimateFaces(activeVideo, false); } catch (e) { }
    }
    if (handDetector) {
      try { hands = await handDetector.estimateHands(activeVideo); } catch (e) { }
    }
  }

  // Handle Current Mode Rendering
  if (currentMode === "mode1") {
    renderMode1(faces, hands);
  } else if (currentMode === "mode2") {
    renderMode2(faces, hands);
  } else if (currentMode === "mode3") {
    renderMode3(faces, hands);
  } else if (currentMode === "mode4") {
    renderMode4(faces, hands);
  }

  requestAnimationFrame(processFrame);
}

// MODE 1: Render Overlay & Sidebar Stats
function renderMode1(faces, hands) {
  const overlay = document.getElementById("overlay-mode1");
  if (!overlay) return;
  const ctx = overlay.getContext("2d");

  const v = document.getElementById("video-mode1");
  if (v && v.videoWidth) {
    overlay.width = v.videoWidth;
    overlay.height = v.videoHeight;
  }

  ctx.clearRect(0, 0, overlay.width, overlay.height);

  // Draw Faces
  faces.forEach(f => {
    const s = f.topLeft, e = f.bottomRight;
    ctx.strokeStyle = '#00ff99';
    ctx.lineWidth = 3;
    ctx.strokeRect(s[0], s[1], e[0] - s[0], e[1] - s[1]);
  });

  let totalFingers = 0;
  let gestText = "-";

  // Draw Hands
  hands.forEach((h, i) => {
    const k = h.keypoints;
    ctx.fillStyle = '#ff0078';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;

    k.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Skeleton Lines
    const drawLine = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(k[a].x, k[a].y);
      ctx.lineTo(k[b].x, k[b].y);
      ctx.stroke();
    };

    [0, 1, 2, 3, 0, 5, 6, 7, 5, 9, 10, 11, 9, 13, 14, 15, 13, 17, 18, 19, 0, 17].forEach((_, idx, arr) => {
      if (idx % 2 === 0 && arr[idx + 1] !== undefined) drawLine(arr[idx], arr[idx + 1]);
    });

    // Count fingers - cek tinju/kepalan (fist) dulu
    const isFist = k[8].y > k[6].y && k[12].y > k[10].y && k[16].y > k[14].y && k[20].y > k[18].y;
    let fCount = 0;
    if (!isFist) {
      if (k[8].y < k[6].y) fCount++;
      if (k[12].y < k[10].y) fCount++;
      if (k[16].y < k[14].y) fCount++;
      if (k[20].y < k[18].y) fCount++;
      if (k[4].x < k[3].x) fCount++;
    }
    // Tinju = 0 jari = slot 0 = "Taufiq" (default)

    totalFingers += fCount;
    if (i === 0) {
      gestText = customNames[fCount] || "-";
    }
  });

  // Update UI & TTS
  checkForSpeech(totalFingers, gestText);

  const elFaceCount = document.getElementById("res-face-count");
  const elFaceStatus = document.getElementById("res-face-status");
  const elHandCount = document.getElementById("res-hand-count");
  const elHandStatus = document.getElementById("res-hand-status");
  const elFingerCount = document.getElementById("res-finger-count");
  const elGesture = document.getElementById("res-gesture");

  if (elFaceCount) elFaceCount.textContent = faces.length;
  if (elFaceStatus) elFaceStatus.textContent = faces.length > 0 ? "Terdeteksi" : "Tidak terdeteksi";
  if (elHandCount) elHandCount.textContent = hands.length;
  if (elHandStatus) elHandStatus.textContent = hands.length > 0 ? "Terdeteksi" : "Tidak terdeteksi";
  if (elFingerCount) elFingerCount.textContent = totalFingers;
  if (elGesture) elGesture.textContent = gestText;
}

// MODE 2: Photo Blur Trend (Portrait Depth Bokeh)
// BLUR hanya aktif saat ✌️ 2 jari (telunjuk + jari tengah naik, lainnya turun)
function renderMode2(faces, hands) {
  const videoElem = document.getElementById("video-mode2");
  const blurCanvas = document.getElementById("overlay-mode2");
  if (!videoElem || !blurCanvas) return;

  const ctx = blurCanvas.getContext("2d");
  if (videoElem.videoWidth) {
    blurCanvas.width = videoElem.videoWidth;
    blurCanvas.height = videoElem.videoHeight;
  }

  ctx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);

  // Deteksi ✌️ Peace / 2 jari: HANYA telunjuk & jari tengah naik, jari manis & kelingking turun
  let isPeaceGesture = false;
  let peaceHand = null;

  hands.forEach(h => {
    const k = h.keypoints;
    const indexUp = k[8].y < k[6].y;   // telunjuk naik
    const middleUp = k[12].y < k[10].y;  // jari tengah naik
    const ringDown = k[16].y > k[14].y;  // jari manis turun
    const pinkyDown = k[20].y > k[18].y;  // kelingking turun

    if (indexUp && middleUp && ringDown && pinkyDown) {
      isPeaceGesture = true;
      peaceHand = k;
    }
  });

  const isBlurActive = isPeaceGesture || isPhotoBlurActive;

  // Terapkan blur HANYA kalau gesture ✌️ 2 jari terdeteksi
  if (isBlurActive) {
    videoElem.classList.add("blurred");

    // Overlay titik neon di atas tangan yang gesture ✌️
    if (peaceHand) {
      const k = peaceHand;
      ctx.save();

      // Halo besar di ujung 2 jari (tips)
      [[8, "#00f0ff"], [12, "#ff0090"]].forEach(([idx, color]) => {
        const grad = ctx.createRadialGradient(k[idx].x, k[idx].y, 0, k[idx].x, k[idx].y, 40);
        grad.addColorStop(0, color.replace(")", ", 0.7)").replace("rgb(", "rgba(") || color + "bb");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(k[idx].x, k[idx].y, 40, 0, Math.PI * 2);
        ctx.fill();
      });

      // Titik landmark tangan
      ctx.fillStyle = "rgba(0, 255, 153, 0.5)";
      ctx.shadowColor = "#00ff99";
      ctx.shadowBlur = 18;
      k.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Label HUD
      ctx.shadowBlur = 0;
      ctx.font = "bold 18px Outfit, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("✌️ Photo Blur ON", 16, 32);

      ctx.restore();
    }
  } else {
    videoElem.classList.remove("blurred");

    // Tampilkan hint kalau ada tangan tapi bukan 2 jari
    if (hands.length > 0) {
      ctx.font = "bold 16px Outfit, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("✌️ Tunjuk 2 jari untuk blur", 16, 32);
    }
  }

  // --- Update Sidebar Results (Header Kanan Mode 2) ---
  const elBlurStatus = document.getElementById("res-mode2-blur-status");
  const elGesture = document.getElementById("res-mode2-gesture");
  const elFaceCount = document.getElementById("res-mode2-face-count");
  const elHandCount = document.getElementById("res-mode2-hand-count");

  if (elBlurStatus) {
    elBlurStatus.textContent = isBlurActive ? "✨ AKTIF (Bokeh)" : "Off (Butuh ✌️ 2 Jari)";
    elBlurStatus.style.color = isBlurActive ? "var(--neon-green)" : "var(--neon-cyan)";
  }
  if (elGesture) {
    elGesture.textContent = isPeaceGesture ? "✌️ 2 Jari (Peace)" : (hands.length > 0 ? "Tangan Terdeteksi" : "-");
  }
  if (elFaceCount) elFaceCount.textContent = faces.length;
  if (elHandCount) elHandCount.textContent = hands.length;

  // Sync Mode 2 Audio Playback with Blur status
  syncMode2AudioWithBlur(isBlurActive);
}

// --- MODE 2 MP3 AUDIO & SYNTH ENGINE ---
let mode2AudioElement = new Audio("photo_blur.mp3");
let isMode2AudioPlaying = false;
let isAutoSyncAudioEnabled = true;
let mode2SynthAudioCtx = null;
let mode2SynthOsc = null;
let mode2SynthGain = null;
let isUsingCustomMP3 = true;
let prevBlurActiveState = false;

mode2AudioElement.loop = true;
mode2AudioElement.volume = 0.8;

mode2AudioElement.onplay = () => {
  isMode2AudioPlaying = true;
  updateMode2AudioUI();
};
mode2AudioElement.onpause = () => {
  try {
    mode2AudioElement.currentTime = 0;
  } catch (e) {}
  isMode2AudioPlaying = false;
  updateMode2AudioUI();
};

function playSynthFallback() {
  try {
    if (!mode2SynthAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) mode2SynthAudioCtx = new AudioCtx();
    }
    if (!mode2SynthAudioCtx) return;
    if (mode2SynthAudioCtx.state === 'suspended') {
      mode2SynthAudioCtx.resume();
    }
    if (!mode2SynthOsc) {
      mode2SynthOsc = mode2SynthAudioCtx.createOscillator();
      mode2SynthGain = mode2SynthAudioCtx.createGain();
      mode2SynthOsc.type = 'triangle';
      mode2SynthOsc.frequency.setValueAtTime(329.63, mode2SynthAudioCtx.currentTime); // E4 note
      mode2SynthGain.gain.setValueAtTime(0.12, mode2SynthAudioCtx.currentTime);
      mode2SynthOsc.connect(mode2SynthGain);
      mode2SynthGain.connect(mode2SynthAudioCtx.destination);
      mode2SynthOsc.start();
    } else if (mode2SynthGain) {
      mode2SynthGain.gain.setValueAtTime(0.12, mode2SynthAudioCtx.currentTime);
    }
    isMode2AudioPlaying = true;
    updateMode2AudioUI();
  } catch (err) {
    console.log("Synth audio error:", err);
  }
}

function stopSynthFallback() {
  if (mode2SynthGain && mode2SynthAudioCtx) {
    try {
      mode2SynthGain.gain.setValueAtTime(0, mode2SynthAudioCtx.currentTime);
    } catch (e) {}
  }
  isMode2AudioPlaying = false;
  updateMode2AudioUI();
}

function toggleMode2Audio() {
  if (isUsingCustomMP3 && mode2AudioElement.src) {
    if (mode2AudioElement.paused) {
      mode2AudioElement.currentTime = 0;
      mode2AudioElement.play().catch(e => console.log("Audio play error:", e));
    } else {
      mode2AudioElement.pause();
      mode2AudioElement.currentTime = 0;
    }
  } else {
    if (isMode2AudioPlaying) {
      if (mode2AudioElement.src) {
        mode2AudioElement.pause();
        mode2AudioElement.currentTime = 0;
      }
      stopSynthFallback();
    } else {
      if (mode2AudioElement.src) {
        mode2AudioElement.currentTime = 0;
        mode2AudioElement.play().catch(() => playSynthFallback());
      } else {
        playSynthFallback();
      }
    }
  }
}

function handleMode2AudioUpload(e) {
  const file = e.target.files[0];
  if (file) {
    stopSynthFallback();
    const url = URL.createObjectURL(file);
    mode2AudioElement.src = url;
    isUsingCustomMP3 = true;
    
    const titleEl = document.getElementById("mode2-audio-title");
    if (titleEl) titleEl.textContent = file.name;
    
    mode2AudioElement.currentTime = 0;
    mode2AudioElement.play().catch(err => console.log("Audio upload autoplay error:", err));
  }
}

function updateMode2AudioVolume(val) {
  const vol = parseFloat(val) / 100;
  mode2AudioElement.volume = vol;
  if (mode2SynthGain && mode2SynthAudioCtx) {
    try {
      mode2SynthGain.gain.setValueAtTime(vol * 0.12, mode2SynthAudioCtx.currentTime);
    } catch (e) {}
  }
  const valEl = document.getElementById("mode2-volume-val");
  if (valEl) valEl.textContent = Math.round(vol * 100) + "%";
}

function toggleAutoSyncAudio(enabled) {
  isAutoSyncAudioEnabled = enabled;
}

function updateMode2AudioUI() {
  const btn = document.getElementById("btn-toggle-mode2-audio");
  if (btn) {
    btn.textContent = isMode2AudioPlaying ? "⏸️ Mute Audio MP3" : "🎵 Play Musik MP3";
    btn.style.color = "#ffffff";
    btn.style.fontWeight = "700";
    btn.style.textShadow = "0 1px 4px rgba(0,0,0,0.5)";
    btn.style.background = isMode2AudioPlaying 
      ? "linear-gradient(135deg, #ff0055, #ff0090)" 
      : "linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))";
  }
}

function syncMode2AudioWithBlur(isBlurActive) {
  if (isBlurActive === prevBlurActiveState) return;
  prevBlurActiveState = isBlurActive;

  if (!isAutoSyncAudioEnabled) return;

  if (isBlurActive) {
    if (!isMode2AudioPlaying) {
      if (isUsingCustomMP3 && mode2AudioElement.src) {
        mode2AudioElement.currentTime = 0;
        mode2AudioElement.play().catch(() => {});
      } else {
        playSynthFallback();
      }
    }
  }
  // Catatan: Tidak ada auto-pause saat isBlurActive false, agar musik Mode 2 tidak mati saat pengguna bergerak/gestur berubah!
}


// --- MODE 4 MP3 AUDIO ENGINE (Hand_Tracking.mp3) ---
let mode4AudioElement = new Audio("Hand_Tracking.mp3");
let isMode4AudioPlaying = false;
let isAutoSyncMode4AudioEnabled = true;
let prevMode4HandDetectedState = false;

mode4AudioElement.loop = true;
mode4AudioElement.volume = 0.8;

mode4AudioElement.onplay = () => {
  isMode4AudioPlaying = true;
  updateMode4AudioUI();
};
mode4AudioElement.onpause = () => {
  try {
    mode4AudioElement.currentTime = 0;
  } catch (e) {}
  isMode4AudioPlaying = false;
  updateMode4AudioUI();
};

function toggleMode4Audio() {
  if (mode4AudioElement.paused) {
    mode4AudioElement.currentTime = 0;
    mode4AudioElement.play().catch(e => console.log("Mode 4 Audio play error:", e));
  } else {
    mode4AudioElement.pause();
    mode4AudioElement.currentTime = 0;
  }
}

function updateMode4AudioVolume(val) {
  const vol = parseFloat(val) / 100;
  mode4AudioElement.volume = vol;
  const valEl = document.getElementById("mode4-volume-val");
  if (valEl) valEl.textContent = Math.round(vol * 100) + "%";
}

function toggleAutoSyncMode4Audio(enabled) {
  isAutoSyncMode4AudioEnabled = enabled;
}

function updateMode4AudioUI() {
  const btn = document.getElementById("btn-toggle-mode4-audio");
  if (btn) {
    btn.textContent = isMode4AudioPlaying ? "⏸️ Mute Audio MP3" : "🎵 Play Musik MP3";
    btn.style.color = "#ffffff";
    btn.style.fontWeight = "700";
    btn.style.textShadow = "0 1px 4px rgba(0,0,0,0.5)";
    btn.style.background = isMode4AudioPlaying 
      ? "linear-gradient(135deg, #ff0055, #ff0090)" 
      : "linear-gradient(135deg, #a855f7, #6366f1)";
  }
}

function syncMode4AudioWithHands(isHandDetected) {
  if (isHandDetected === prevMode4HandDetectedState) return;
  prevMode4HandDetectedState = isHandDetected;

  if (!isAutoSyncMode4AudioEnabled) return;

  if (isHandDetected) {
    if (!isMode4AudioPlaying) {
      mode4AudioElement.currentTime = 0;
      mode4AudioElement.play().catch(() => {});
    }
  } else {
    if (isMode4AudioPlaying) {
      mode4AudioElement.pause();
      mode4AudioElement.currentTime = 0;
    }
  }
}


// =====================================================
// MODE 3: NovaSpark 3D Engine — Professional Particle Interaction
// =====================================================

const M3_SHAPES = [
  { id: "HEART", name: "REALISTIC LOVE 3D", emoji: "💖" },
  { id: "STAR_FORGE", name: "STAR FORGE 3D", emoji: "⚡" },
  { id: "EARTH_SOLAR", name: "BUMI TATA SURYA", emoji: "🌍" },
  { id: "MZKYZAK_NAME", name: "PARTIKEL MZKYZAK", emoji: "✨" },
  { id: "GALAXY", name: "GALAXY", emoji: "🌌" },
  { id: "NEBULA", name: "NEBULA", emoji: "🌠" },
  { id: "SATURN", name: "SATURN", emoji: "🪐" },
  { id: "LOTUS", name: "LOTUS", emoji: "🪷" },
  { id: "JELLYFISH", name: "JELLYFISH", emoji: "🪼" },
  { id: "TORUS", name: "TORUS", emoji: "🍩" },
  { id: "TORNADO", name: "TORNADO", emoji: "🌪️" },
  { id: "DOUBLEHELIX", name: "DOUBLE HELIX", emoji: "🧬" },
  { id: "CUBE", name: "CUBE", emoji: "🧊" },
  { id: "BUTTERFLY", name: "BUTTERFLY", emoji: "🦋" },
  { id: "PEACHBLOSSOM", name: "PEACH BLOSSOM", emoji: "🌸" },
  { id: "MZKYZAK_STAR", name: "MZKYZAK STAR", emoji: "⭐" },
];

let m3_shapeIdx = 0;
let m3_inited = false;
let m3_lastSlapTime = 0;
let m3_prevPalmX = null;
let m3_prevPalmPos = null;
let m3_prevFingerPos = null;
let m3_prevRollAngle = null;
let m3_handScale = 1.0;

function m3_initFilterBar() {
  const bar = document.getElementById("filter-bar-mode3");
  if (!bar || bar.childElementCount > 0) return;
  M3_SHAPES.forEach((s, i) => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (i === 0 ? " active-chip" : "");
    chip.dataset.shape = s.id;
    chip.textContent = s.emoji + " " + s.name;
    chip.onclick = () => m3_setShape(i);
    bar.appendChild(chip);
  });
}

function m3_setShape(idx) {
  m3_shapeIdx = (idx + M3_SHAPES.length) % M3_SHAPES.length;
  const s = M3_SHAPES[m3_shapeIdx];
  if (particleSystem) particleSystem.setShape(s.id);
  document.querySelectorAll("#filter-bar-mode3 .filter-chip").forEach((c, i) => {
    c.classList.toggle("active-chip", i === m3_shapeIdx);
  });
  const activeChip = document.querySelector("#filter-bar-mode3 .filter-chip.active-chip");
  if (activeChip) activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  const label = document.getElementById("mode3-shape-name");
  if (label) label.textContent = s.emoji + " " + s.name;
  const sidebarShape = document.getElementById("res-mode3-shape");
  if (sidebarShape) sidebarShape.textContent = s.emoji + " " + s.name;
}

function renderMode3(faces, hands) {
  const canvas = document.getElementById("particle-canvas-mode3");
  if (!canvas) return;

  const wrapper = canvas.parentElement;
  const W = wrapper ? wrapper.clientWidth : window.innerWidth;
  const H = wrapper ? wrapper.clientHeight : window.innerHeight;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }

  const ctx = canvas.getContext("2d");

  // Fill cosmic gradient background
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H) * 0.7);
  bgGrad.addColorStop(0, "#080c1d");
  bgGrad.addColorStop(0.6, "#04060f");
  bgGrad.addColorStop(1, "#020308");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (!m3_inited) {
    m3_initFilterBar();
    m3_inited = true;
  }

  if (!particleSystem) {
    particleSystem = new ParticleSystem(null, 1800);
    particleSystem.setShape(M3_SHAPES[m3_shapeIdx].id);
  }

  // Handle Hand Interaction & Gesture Detection
  let detectedGesture = "-";
  let addRotX = 0, addRotY = 0, addRotZ = 0;
  let targetScale = 1.0;
  let isBurst = false;

  if (hands.length > 0) {
    const v3 = document.getElementById("video-mode3");
    const vw = (v3 && v3.videoWidth) ? v3.videoWidth : 640;
    const vh = (v3 && v3.videoHeight) ? v3.videoHeight : 480;
    const scaleX = W / vw;
    const scaleY = H / vh;

    // TANGAN 1 (hands[0]) is the MASTER REFERENCE for rotation & gesture control
    const k0 = hands[0].keypoints;
    const pts0 = k0.map(p => ({
      x: W - p.x * scaleX,
      y: p.y * scaleY
    }));

    // Tangan 1 Palm Center for continuous 3D view rotation control
    const palmX0 = (pts0[0].x + pts0[9].x) / 2;
    const palmY0 = (pts0[0].y + pts0[9].y) / 2;

    if (m3_prevPalmPos !== null) {
      const dxPalm = palmX0 - m3_prevPalmPos.x;
      const dyPalm = palmY0 - m3_prevPalmPos.y;
      addRotY += dxPalm * 0.006;
      addRotX += -dyPalm * 0.006;
    }
    m3_prevPalmPos = { x: palmX0, y: palmY0 };

    // Hand bounding size & depth (distance between wrist 0 and middle tip 12)
    const dx = pts0[12].x - pts0[0].x;
    const dy = pts0[12].y - pts0[0].y;
    const handSpan = Math.sqrt(dx * dx + dy * dy);

    // Forward-only expansion: minimum 1.0 (never shrinks when hand moves backward)
    const rawSpanRatio = (handSpan - 140) / 120;
    const forwardScale = Math.max(0, Math.min(1.2, rawSpanRatio));
    const depthScale = 1.0 + forwardScale; // Smooth 1.0 -> 2.2 scale

    // Check Finger Extensions for Tangan 1
    const indexUp = k0[8].y < k0[6].y;
    const middleUp = k0[12].y < k0[10].y;
    const ringUp = k0[16].y < k0[14].y;
    const pinkyUp = k0[20].y < k0[18].y;
    const isFiveFingers = indexUp && middleUp && ringUp && pinkyUp;
    const isTwoFingers = indexUp && middleUp && !ringUp && !pinkyUp;
    const isIndexOnly = indexUp && !middleUp && !ringUp && !pinkyUp;

    // Palm position for horizontal slap/swipe detection (Next Shape)
    const now = Date.now();
    if (m3_prevPalmX !== null) {
      const palmSpeed = Math.abs(pts0[9].x - m3_prevPalmX);
      if (isFiveFingers && palmSpeed > 35 && (now - m3_lastSlapTime > 600)) {
        m3_lastSlapTime = now;
        m3_setShape((m3_shapeIdx + 1) % M3_SHAPES.length);
        detectedGesture = "🖐️ Kibasan Tangan 1 (Next Shape)";
      }
    }
    m3_prevPalmX = pts0[9].x;

    if (detectedGesture === "-") {
      // Dynamic Supernova Burst when 5 fingers open OR moving hand forward smoothly!
      if (isFiveFingers) {
        isBurst = true;
        addRotY += 0.02;
        addRotX += 0.01;
        targetScale = 1.35 * depthScale;
        detectedGesture = "💥 5 Jari Open (Cosmic Supernova)";
      } else if (forwardScale > 0.35) {
        isBurst = true;
        addRotY += 0.018;
        addRotX += 0.008;
        targetScale = 1.25 * depthScale;
        detectedGesture = "🚀 Tangan 1 Maju (Forward Motion)";
      } else if (isTwoFingers) {
        // Plane Roll (Z-axis rotation)
        const angle = Math.atan2(pts0[8].y - pts0[12].y, pts0[8].x - pts0[12].x);
        if (m3_prevRollAngle !== null) {
          let delta = angle - m3_prevRollAngle;
          if (delta > Math.PI) delta -= Math.PI * 2;
          if (delta < -Math.PI) delta += Math.PI * 2;
          addRotZ = -delta * 1.8;
        }
        m3_prevRollAngle = angle;
        targetScale = 1.1;
        detectedGesture = "✌️ 2 Jari (Plane Roll Z)";
      } else if (isIndexOnly) {
        // Fine Precision View Rotation (Index Tip)
        if (m3_prevFingerPos !== null) {
          const fx = pts0[8].x - m3_prevFingerPos.x;
          const fy = pts0[8].y - m3_prevFingerPos.y;
          addRotY += fx * 0.008;
          addRotX += -fy * 0.008;
        }
        m3_prevFingerPos = { x: pts0[8].x, y: pts0[8].y };
        targetScale = 1.15;
        detectedGesture = "☝️ 1 Jari (Precision Rotation)";
      } else {
        targetScale = depthScale;
        detectedGesture = `🖐️ Tangan 1 Ref (${hands.length} Total Hand${hands.length > 1 ? 's' : ''})`;
      }
    }

    // Reset tracking memory if gesture switched
    if (!isIndexOnly) m3_prevFingerPos = null;
    if (!isTwoFingers) m3_prevRollAngle = null;

    // Draw Hand Tracking Overlay for ALL DETECTED HANDS (Tangan 1 as primary gold/cyan reference)
    const skeletonPairs = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17]
    ];

    hands.forEach((h, hIdx) => {
      const ptsH = h.keypoints.map(p => ({
        x: W - p.x * scaleX,
        y: p.y * scaleY
      }));

      ctx.save();
      const isHand1 = (hIdx === 0);
      ctx.strokeStyle = isHand1 ? "rgba(0, 240, 255, 0.6)" : "rgba(255, 0, 120, 0.4)";
      ctx.lineWidth = isHand1 ? 3 : 2;
      ctx.shadowColor = isHand1 ? "#00f0ff" : "#ff0078";
      ctx.shadowBlur = isHand1 ? 10 : 5;

      skeletonPairs.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(ptsH[a].x, ptsH[a].y);
        ctx.lineTo(ptsH[b].x, ptsH[b].y);
        ctx.stroke();
      });

      // Glowing fingertips
      [4, 8, 12, 16, 20].forEach(idx => {
        ctx.beginPath();
        ctx.arc(ptsH[idx].x, ptsH[idx].y, isHand1 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isHand1 ? (idx === 8 ? "#ff0090" : "#00ff99") : "#ffb700";
        ctx.fill();
      });

      // Label for Hand 1 Reference anchor
      if (isHand1) {
        ctx.font = "bold 13px Outfit, sans-serif";
        ctx.fillStyle = "#00f0ff";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 4;
        ctx.fillText("🖐️ TANGAN 1 (REF ROTASI)", ptsH[0].x - 40, ptsH[0].y + 25);
      }
      ctx.restore();
    });

  } else {
    // No hand detected: Smooth auto rotation & reset tracking states
    addRotY = 0.008;
    targetScale = 1.0;
    m3_prevPalmX = null;
    m3_prevPalmPos = null;
    m3_prevFingerPos = null;
    m3_prevRollAngle = null;
    detectedGesture = "-";
  }

  // Smooth lerp scale (ultra fluid motion)
  m3_handScale += (targetScale - m3_handScale) * 0.07;

  // Update & Draw Particle System with isBurst flag
  particleSystem.update(isBurst);
  particleSystem.draw(ctx, W / 2, H / 2, m3_handScale, addRotX, addRotY, addRotZ, isBurst);

  // Render Special Star Badge for MZKYZAK_STAR shape
  if (M3_SHAPES[m3_shapeIdx].id === "MZKYZAK_STAR") {
    ctx.save();
    ctx.font = "900 18px Outfit, sans-serif";
    ctx.fillStyle = "#00f0ff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#00ff99";
    ctx.shadowBlur = 20;
    ctx.fillText("⭐ MZKYZAK BINTANG KECIL 3D ⭐", W / 2, 45);
    ctx.restore();
  }

  // Floating Live Webcam Overlay (in bottom-left preview box)
  const v3 = document.getElementById("video-mode3");
  const overlay3 = document.getElementById("overlay-mode3");
  if (v3 && overlay3 && v3.readyState >= 2) {
    const oCtx = overlay3.getContext("2d");
    if (overlay3.width !== v3.videoWidth || overlay3.height !== v3.videoHeight) {
      overlay3.width = v3.videoWidth;
      overlay3.height = v3.videoHeight;
    }
    oCtx.save();
    oCtx.translate(overlay3.width, 0);
    oCtx.scale(-1, 1);
    oCtx.drawImage(v3, 0, 0, overlay3.width, overlay3.height);
    oCtx.restore();

    // Draw hands on webcam preview box
    hands.forEach(h => {
      const k = h.keypoints;
      oCtx.save();
      oCtx.fillStyle = "#ff0078";
      oCtx.strokeStyle = "#00e5ff";
      oCtx.lineWidth = 2;
      k.forEach(p => {
        const mx = overlay3.width - p.x;
        oCtx.beginPath();
        oCtx.arc(mx, p.y, 4, 0, Math.PI * 2);
        oCtx.fill();
      });
      oCtx.restore();
    });
  }

  // Update Sidebar Results (Header Kanan Mode 3)
  const elShape = document.getElementById("res-mode3-shape");
  const elGesture = document.getElementById("res-mode3-gesture");
  const elHandCount = document.getElementById("res-mode3-hand-count");
  const elFps = document.getElementById("res-mode3-fps");

  const currentS = M3_SHAPES[m3_shapeIdx];
  if (elShape) elShape.textContent = currentS.emoji + " " + currentS.name;
  if (elGesture) elGesture.textContent = detectedGesture;
  if (elHandCount) elHandCount.textContent = hands.length;
  if (elFps) {
    elFps.textContent = hands.length > 0 ? `Active (${hands.length} Tangan)` : "Active (60 FPS)";
    elFps.style.color = hands.length > 0 ? "var(--neon-green)" : "var(--neon-cyan)";
  }
}

// =====================================================
// MODE 4: RetroLens — Hand Portal Filter (python-handtrack)
// =====================================================

let rl_filterIdx = 0;
let rl_paused = false;
let rl_lastPinchTime = 0;
let rl_hudToastMsg = "";
let rl_hudToastExpiry = 0;
let rl_inited = false;

// ---- AF Focus rings (DOM elements) ----
let rl_focusRings = [];

function rl_showToast(msg) {
  rl_hudToastMsg = msg;
  rl_hudToastExpiry = Date.now() + 1600;
}

// Filter bank matching python-handtrack main.py & Retrolens
const RETROLENS_FILTERS = [
  { id: "dual-tone", name: "DUAL-TONE", emoji: "🎨", fn: applyDualTone },
  { id: "mono", name: "MONO", emoji: "⚫", fn: applyMono },
  { id: "pixelate", name: "PIXELATE", emoji: "🟦", fn: applyPixelate },
  { id: "invert", name: "INVERT", emoji: "🔄", fn: applyInvert },
  { id: "sepia", name: "SEPIA", emoji: "📜", fn: applySepia },
  { id: "blur", name: "BLUR", emoji: "🌫️", fn: applyBlur },
  { id: "thermal", name: "THERMAL", emoji: "🌡️", fn: applyThermal },
  { id: "sketch", name: "SKETCH", emoji: "✏️", fn: applySketch },
  { id: "glitch", name: "GLITCH", emoji: "⚡", fn: applyGlitch },
  { id: "neon", name: "NEON", emoji: "🔲", fn: applyNeon },
  { id: "rainbow", name: "RAINBOW", emoji: "🌈", fn: applyRainbowWave },
];

function rl_initFilterBar() {
  const bar = document.getElementById("filter-bar-mode4");
  if (!bar || bar.childElementCount > 0) return;
  RETROLENS_FILTERS.forEach((f, i) => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (i === 0 ? " active-chip" : "");
    chip.dataset.idx = i;
    chip.textContent = f.emoji + " " + f.name;
    chip.onclick = () => rl_setFilter(i);
    bar.appendChild(chip);
  });
}

function rl_setFilter(idx) {
  rl_filterIdx = (idx + RETROLENS_FILTERS.length) % RETROLENS_FILTERS.length;
  document.querySelectorAll(".filter-chip").forEach((c, i) => {
    c.classList.toggle("active-chip", i === rl_filterIdx);
  });
  const activeChip = document.querySelector(".filter-chip.active-chip");
  if (activeChip) activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  const label = document.getElementById("retrolens-filter-name");
  if (label) label.textContent = RETROLENS_FILTERS[rl_filterIdx].emoji + " " + RETROLENS_FILTERS[rl_filterIdx].name;
}

// ---- Pure-CSS focus ring (AF bracket) management ----
function rl_updateFocusRings(handCenters) {
  const container = document.getElementById("focus-ring-container");
  if (!container) return;
  while (rl_focusRings.length > handCenters.length) {
    const old = rl_focusRings.pop();
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }
  const ringColors = ["#00f0ff", "#ff0090"];
  handCenters.forEach((center, i) => {
    if (!rl_focusRings[i]) {
      const ring = document.createElement("div");
      ring.className = "focus-ring";
      ring.innerHTML = `
        <div class="focus-ring-outer" style="width:80px;height:80px;top:-40px;left:-40px;border-color:${ringColors[i % 2]}"></div>
        <div class="af-bracket af-tl" style="top:-28px;left:-28px;"></div>
        <div class="af-bracket af-tr" style="top:-28px;left:12px;"></div>
        <div class="af-bracket af-bl" style="top:12px;left:-28px;"></div>
        <div class="af-bracket af-br" style="top:12px;left:12px;"></div>
      `;
      container.appendChild(ring);
      rl_focusRings[i] = ring;
    }
    const mirroredX = window.innerWidth - center.x;
    rl_focusRings[i].style.left = mirroredX + "px";
    rl_focusRings[i].style.top = center.y + "px";
  });
}

// ---- Offscreen portal poly renderer (ROI Bounding Box 60 FPS Optimized) ----
let rl_offscreenCanvas = document.createElement("canvas");
let rl_offscreenCtx = rl_offscreenCanvas.getContext("2d");

function rl_renderPortalPoly(ctx, sourceBufferCanvas, polyPts, filterFn, filterName) {
  if (!polyPts || polyPts.length < 3 || !filterFn) return;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // 1. Calculate Bounding Box ROI of portal polygon for 60 FPS optimization
  let minX = cw, minY = ch, maxX = 0, maxY = 0;
  for (let i = 0; i < polyPts.length; i++) {
    const px = polyPts[i].x, py = polyPts[i].y;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const pad = 12;
  const bx = Math.max(0, Math.floor(minX - pad));
  const by = Math.max(0, Math.floor(minY - pad));
  const bw = Math.min(cw - bx, Math.ceil(maxX - minX + pad * 2));
  const bh = Math.min(ch - by, Math.ceil(maxY - minY + pad * 2));

  if (bw <= 5 || bh <= 5) return;

  // 2. Prepare offscreen canvas sized ONLY to ROI (15x-20x fewer pixels -> 60 FPS!)
  if (rl_offscreenCanvas.width !== bw || rl_offscreenCanvas.height !== bh) {
    rl_offscreenCanvas.width = bw;
    rl_offscreenCanvas.height = bh;
  }
  rl_offscreenCtx.drawImage(sourceBufferCanvas, bx, by, bw, bh, 0, 0, bw, bh);

  // Apply filter to ROI canvas ONLY
  filterFn(rl_offscreenCtx, bw, bh);

  // 3. Clip main canvas to polyPts and draw filtered ROI back at (bx, by)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polyPts[0].x, polyPts[0].y);
  for (let i = 1; i < polyPts.length; i++) {
    ctx.lineTo(polyPts[i].x, polyPts[i].y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(rl_offscreenCanvas, bx, by);
  ctx.restore();

  // 4. Draw glowing white polyline boundary
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polyPts[0].x, polyPts[0].y);
  for (let i = 1; i < polyPts.length; i++) {
    ctx.lineTo(polyPts[i].x, polyPts[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  // 5. Glowing edge particles along 4 boundary lines
  ctx.save();
  for (let i = 0; i < polyPts.length; i++) {
    const pt1 = polyPts[i];
    const pt2 = polyPts[(i + 1) % polyPts.length];
    for (let p = 0; p < 4; p++) {
      const alpha = Math.random();
      const px = pt1.x * alpha + pt2.x * (1 - alpha) + (Math.random() * 16 - 8);
      const py = pt1.y * alpha + pt2.y * (1 - alpha) + (Math.random() * 16 - 8);
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffff00";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 6;
      ctx.fill();
    }
  }
  ctx.restore();

  // 6. Draw Portal Label text above top point
  ctx.save();
  ctx.font = "bold 15px Outfit, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 10;
  ctx.fillText(`PORTAL: ${filterName || ''}`, Math.max(10, minX), Math.max(25, minY - 10));
  ctx.restore();
}

// ---- Optimized Hardware-Accelerated Canvas Filter Functions (60 FPS GPU) ----
let rl_pixelateTmpCanvas = document.createElement("canvas");
let rl_pixelateTmpCtx = rl_pixelateTmpCanvas.getContext("2d");

function applyMono(ctx, w, h) {
  ctx.filter = "grayscale(100%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyDualTone(ctx, w, h) {
  ctx.filter = "contrast(180%) sepia(100%) hue-rotate(280deg)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applySepia(ctx, w, h) {
  ctx.filter = "sepia(100%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyThermal(ctx, w, h) {
  ctx.filter = "contrast(220%) hue-rotate(180deg) saturate(300%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applySketch(ctx, w, h) {
  ctx.filter = "grayscale(100%) invert(100%) contrast(150%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyPixelate(ctx, w, h) {
  const block = 12;
  const pw = Math.max(1, Math.floor(w / block));
  const ph = Math.max(1, Math.floor(h / block));
  if (rl_pixelateTmpCanvas.width !== pw || rl_pixelateTmpCanvas.height !== ph) {
    rl_pixelateTmpCanvas.width = pw;
    rl_pixelateTmpCanvas.height = ph;
  }
  rl_pixelateTmpCtx.drawImage(ctx.canvas, 0, 0, pw, ph);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rl_pixelateTmpCanvas, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function applyGlitch(ctx, w, h) {
  const shift = Math.floor(Math.random() * 14 - 7);
  ctx.drawImage(ctx.canvas, shift, 0);
  ctx.save();
  ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
  ctx.fillRect(0, Math.floor(Math.random() * h), w, 8);
  ctx.restore();
}

function applyInvert(ctx, w, h) {
  ctx.filter = "invert(100%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyRedChannel(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "color-burn";
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyEdge(ctx, w, h) {
  ctx.filter = "contrast(300%) grayscale(100%) invert(100%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyCartoon(ctx, w, h) {
  ctx.filter = "contrast(180%) saturate(260%) brightness(110%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyNeon(ctx, w, h) {
  ctx.filter = "contrast(250%) grayscale(100%) invert(100%)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyBlur(ctx, w, h) {
  ctx.filter = "blur(10px)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function applyRainbowWave(ctx, w, h) {
  const hueShift = (Date.now() * 0.12) % 360;
  ctx.filter = `hue-rotate(${hueShift}deg) saturate(220%) contrast(120%)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

// Geometry & Gesture Helpers matching Python RetroLens
function rl_isFistClosed(k) {
  const wrist = k[0];
  const tips = [8, 12, 16, 20];
  let sum = 0;
  tips.forEach(tIdx => {
    sum += Math.hypot(k[tIdx].x - wrist.x, k[tIdx].y - wrist.y);
  });
  return (sum / 4) < 95;
}

function rl_isHandRotated(thumb, index) {
  const dx = index.x - thumb.x;
  const dy = index.y - thumb.y;
  return (dy > 25) || (Math.abs(dx) > Math.abs(dy) * 1.1);
}

function rl_sortQuadClean(pts) {
  if (pts.length < 4) return pts;
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const left = sorted.slice(0, 2).sort((a, b) => a.y - b.y);
  const right = sorted.slice(2, 4).sort((a, b) => a.y - b.y);
  return [left[0], right[0], right[1], left[1]];
}

function rl_sortQuadBowtie(pts) {
  if (pts.length < 4) return pts;
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const left = sorted.slice(0, 2).sort((a, b) => a.y - b.y);
  const right = sorted.slice(2, 4).sort((a, b) => a.y - b.y);
  return [left[0], right[1], right[0], left[1]];
}

// Source buffer canvas for clean frame caching
let rl_sourceBuffer = document.createElement("canvas");
let rl_sourceBufferCtx = rl_sourceBuffer.getContext("2d");
let rl_prevHandsPoints = [];
let rl_is3DMode = false;
let rl_lastModeToggleTime = 0;

function rl_getSmoothedKeypoints(rawHands, cw, ch, vw, vh, scale) {
  const alpha = 0.7; // Smoothness factor
  const result = [];

  rawHands.forEach((h, hIdx) => {
    const k = h.keypoints;
    const mirrorK = k.map(p => ({
      x: cw - (p.x * scale + (cw - vw * scale) / 2),
      y: p.y * scale + (ch - vh * scale) / 2
    }));

    if (rl_prevHandsPoints[hIdx] && rl_prevHandsPoints[hIdx].length === mirrorK.length) {
      const smoothed = mirrorK.map((p, pIdx) => {
        const prev = rl_prevHandsPoints[hIdx][pIdx];
        return {
          x: p.x * alpha + prev.x * (1 - alpha),
          y: p.y * alpha + prev.y * (1 - alpha)
        };
      });
      result.push(smoothed);
    } else {
      result.push(mirrorK);
    }
  });

  rl_prevHandsPoints = result;
  return result;
}

function renderMode4(faces, hands) {
  const video = document.getElementById("video-mode4");
  const canvas = document.getElementById("overlay-mode4");
  if (!video || !canvas || !video.videoWidth) return;

  // Auto-Sync Mode 4 Audio Playback with Hand Detection
  syncMode4AudioWithHands(hands && hands.length > 0);

  const wrapper = canvas.parentElement;
  const cw = wrapper ? wrapper.clientWidth : window.innerWidth;
  const ch = wrapper ? wrapper.clientHeight : window.innerHeight;

  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const ctx = canvas.getContext("2d");

  if (!rl_inited) { rl_initFilterBar(); rl_inited = true; }

  // 1. Draw raw mirrored camera frame to main canvas (100% CLEAN UNFILTERED BACKGROUND!)
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale, dh = vh * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

  ctx.save();
  ctx.translate(cw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, -dx, dy, dw, dh);
  ctx.restore();

  // Cache clean frame into offscreen buffer for portal filter clipping
  if (rl_sourceBuffer.width !== cw || rl_sourceBuffer.height !== ch) {
    rl_sourceBuffer.width = cw;
    rl_sourceBuffer.height = ch;
  }
  rl_sourceBufferCtx.drawImage(canvas, 0, 0);

  const now = Date.now();
  let pts_portal = [];
  let handCenters = [];
  let change_filter = false;
  let fist_count = 0;
  let is_bowtie = false;

  // Scale & Smooth hand landmarks to canvas screen coords
  const smoothedHandPoints = rl_getSmoothedKeypoints(hands, cw, ch, vw, vh, scale);
  const scaledHands = smoothedHandPoints.map((mirrorK, hIdx) => {
    return { raw: hands[hIdx], mirrorK };
  });

  // Check Gestures & Collect Landmarks
  scaledHands.forEach(({ mirrorK }) => {
    const thumb = mirrorK[4];
    const index = mirrorK[8];
    const pinky = mirrorK[20];

    pts_portal.push(thumb);
    pts_portal.push(index);

    // Fast Pinch Check (Thumb & Pinky < 45px)
    if (Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y) < 45) {
      change_filter = true;
    }

    // Fist Check (Dual Fist Mode Switch)
    if (rl_isFistClosed(mirrorK)) {
      fist_count++;
    }

    // Collect hand center for AF focus ring
    const wrist = mirrorK[0];
    const midFinger = mirrorK[12];
    const cx = (wrist.x + midFinger.x) / 2;
    const cy = (wrist.y + midFinger.y) / 2;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / cw;
    const scaleY = canvasRect.height / ch;
    handCenters.push({
      x: canvasRect.left + cx * scaleX,
      y: canvasRect.top + cy * scaleY,
    });
  });

  // Touch Check Between Hand Pairs (Touch 2 Index Tips)
  for (let i = 0; i < scaledHands.length; i++) {
    for (let j = i + 1; j < scaledHands.length; j++) {
      const pt0 = scaledHands[i].mirrorK[8];
      const pt1 = scaledHands[j].mirrorK[8];
      if (Math.hypot(pt0.x - pt1.x, pt0.y - pt1.y) < 50) {
        change_filter = true;
      }
    }
  }

  // Dual Fist Mode Toggle Trigger
  if (fist_count >= 2 && now - rl_lastModeToggleTime > 1200) {
    rl_is3DMode = !rl_is3DMode;
    rl_lastModeToggleTime = now;
    rl_showToast(`👊 DUAL FIST: Switched to ${rl_is3DMode ? "3D Mesh Mode" : "2D Quad Mode"}`);
  }

  // Filter Switch Trigger with cooldown
  if (change_filter && now - rl_lastPinchTime > 400) {
    rl_setFilter((rl_filterIdx + 1) % RETROLENS_FILTERS.length);
    rl_lastPinchTime = now;
    rl_showToast("👌 FILTER Switched: " + RETROLENS_FILTERS[rl_filterIdx].name);
  }

  // --- RENDER PORTAL FILTER PIPELINE MATCHING PYTHON RETROLENS ---
  const activeFilter = RETROLENS_FILTERS[rl_filterIdx];
  const filterFn = activeFilter.fn;
  const secondaryFilter = RETROLENS_FILTERS[(rl_filterIdx + 1) % RETROLENS_FILTERS.length];

  if (!rl_paused && filterFn) {
    if (rl_is3DMode) {
      // 3D MESH MODE
      if (scaledHands.length >= 2) {
        const h0 = scaledHands[0].mirrorK;
        const h1 = scaledHands[1].mirrorK;
        // Primary Top Portal Poly
        rl_renderPortalPoly(ctx, rl_sourceBuffer, [h0[4], h0[8], h0[12], h1[12], h1[8], h1[4]], filterFn, activeFilter.name);
        // Secondary Bottom Portal Poly
        if (secondaryFilter && secondaryFilter.fn) {
          rl_renderPortalPoly(ctx, rl_sourceBuffer, [h0[12], h0[16], h0[20], h1[20], h1[16], h1[12]], secondaryFilter.fn, secondaryFilter.name);
        }
      } else if (scaledHands.length === 1) {
        const t = scaledHands[0].mirrorK;
        rl_renderPortalPoly(ctx, rl_sourceBuffer, [t[4], t[8], t[12], t[16], t[20]], filterFn, activeFilter.name);
      }
    } else {
      // 2D QUAD / BOWTIE MODE
      if (scaledHands.length >= 2) {
        const corners = [scaledHands[0].mirrorK[4], scaledHands[0].mirrorK[8], scaledHands[1].mirrorK[4], scaledHands[1].mirrorK[8]];
        if (rl_isHandRotated(corners[0], corners[1]) || rl_isHandRotated(corners[2], corners[3])) {
          const quad = rl_sortQuadBowtie(corners);
          is_bowtie = true;
          rl_renderPortalPoly(ctx, rl_sourceBuffer, quad, filterFn, `${activeFilter.name} (BOWTIE)`);
        } else {
          const quad = rl_sortQuadClean(corners);
          rl_renderPortalPoly(ctx, rl_sourceBuffer, quad, filterFn, activeFilter.name);
        }
      } else if (scaledHands.length === 1) {
        const t = scaledHands[0].mirrorK;
        rl_renderPortalPoly(ctx, rl_sourceBuffer, [t[4], t[8], t[12], t[20]], filterFn, activeFilter.name);
      }
    }
  }

  // --- DRAW ANIMATED FINGERTIP TARGET MARKERS ("Animasi Jari Kecil Real-Time") ---
  const FINGER_COLORS = ["#ffb700", "#00f0ff", "#00ff99", "#c462ff", "#ff0090"];
  const FINGER_IDXS = [4, 8, 12, 16, 20];
  const HAND_NEON_COLORS = ["#00f0ff", "#ff0090", "#00ff99", "#ffb700"];

  scaledHands.forEach(({ mirrorK }, hIdx) => {
    const col = HAND_NEON_COLORS[hIdx % HAND_NEON_COLORS.length];
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    // Skeleton Lines
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.8;
    connections.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(mirrorK[a].x, mirrorK[a].y);
      ctx.lineTo(mirrorK[b].x, mirrorK[b].y);
      ctx.stroke();
    });
    ctx.restore();

    // 5 Glowing Animated Fingertip Target Dots (Thumb, Index, Middle, Ring, Pinky)
    FINGER_IDXS.forEach((tipIdx, fIdx) => {
      const p = mirrorK[tipIdx];
      const tipCol = FINGER_COLORS[fIdx];
      const pulseR = 7 + Math.sin(now * 0.01 + fIdx * 1.2) * 2;

      ctx.save();
      // Outer Pulsating Radar Ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = tipCol;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = tipCol;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Inner Solid Target Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = tipCol;
      ctx.shadowColor = tipCol;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    });
  });

  // Update AF Focus Rings (DOM elements)
  rl_updateFocusRings(handCenters);
  if (handCenters.length === 0) rl_updateFocusRings([]);

  // --- HUD Text Overlay ---
  ctx.save();
  ctx.font = "bold 14px Outfit, monospace";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 4;
  const modeStr = rl_is3DMode ? "3D Mesh Portal" : (is_bowtie ? "2D Bowtie Quad" : "2D Clean Quad");
  ctx.fillText(`MODE: ${modeStr} [2 Fist 👊 / Key 'C']`, 14, 28);
  ctx.fillStyle = "#00ffff";
  ctx.fillText(`FILTER: ${activeFilter.name} [Pinch 👌 / Key 'N'/'P']`, 14, 50);
  ctx.restore();

  // --- Toast Alert Popup ---
  if (rl_hudToastMsg && now < rl_hudToastExpiry) {
    ctx.save();
    ctx.font = "bold 16px Outfit, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.fillText(rl_hudToastMsg, cw / 2, 42);
    ctx.restore();
  }

  // Hint when no hand detected
  if (hands.length === 0) {
    ctx.save();
    ctx.font = "13px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 6;
    ctx.fillText("👋 Bentangkan tangan lu (hingga 4 tangan) untuk membuka portal filter retro! 🙂", cw / 2, ch - 90);
    ctx.restore();
  }

  // --- Update Sidebar Results (Header Kanan Mode 4) ---
  const elFilterName = document.getElementById("res-mode4-filter");
  const elPortalType = document.getElementById("res-mode4-portal-type");
  const elGesture = document.getElementById("res-mode4-gesture");
  const elHandCount = document.getElementById("res-mode4-hand-count");

  if (elFilterName) elFilterName.textContent = activeFilter.emoji + " " + activeFilter.name;
  if (elPortalType) {
    elPortalType.textContent = scaledHands.length > 0 ? `✨ ${modeStr} (${scaledHands.length} Tangan)` : "Off (Tanpa Tangan)";
    elPortalType.style.color = scaledHands.length > 0 ? "var(--neon-green)" : "var(--neon-cyan)";
  }
  if (elGesture) {
    elGesture.textContent = fist_count >= 2 ? "👊 Dual Fist (Toggle Mode)" : (change_filter ? "👌 Pinch (Switch Filter)" : (scaledHands.length > 0 ? `${scaledHands.length} Tangan Terdeteksi` : "-"));
  }
  if (elHandCount) elHandCount.textContent = hands.length;
}

  // Global Keyboard listener for Mode 4 RetroLens controls
  window.addEventListener("keydown", (e) => {
    if (currentMode !== "mode4") return;
    const key = e.key.toLowerCase();
    if (key === "n") {
      rl_setFilter((rl_filterIdx + 1) % RETROLENS_FILTERS.length);
      rl_showToast("👌 NEXT FILTER: " + RETROLENS_FILTERS[rl_filterIdx].name);
    } else if (key === "p") {
      rl_setFilter((rl_filterIdx - 1 + RETROLENS_FILTERS.length) % RETROLENS_FILTERS.length);
      rl_showToast("👌 PREV FILTER: " + RETROLENS_FILTERS[rl_filterIdx].name);
    } else if (key === "s") {
      const canvas = document.getElementById("overlay-mode4");
      if (canvas) {
        const link = document.createElement("a");
        link.download = `retrolens_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        rl_showToast("📸 SNAPSHOT SAVED!");
      }
    }
  });

  // Tab Switcher Handler
  function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".page-view").forEach(page => page.classList.remove("active"));

    const targetTab = document.getElementById(`tab-${mode}`);
    const targetPage = document.getElementById(`page-${mode}`);

    if (targetTab) {
      targetTab.classList.add("active");
      targetTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (targetPage) targetPage.classList.add("active");

    if (mode !== "mode2") {
      if (mode2AudioElement && !mode2AudioElement.paused) {
        mode2AudioElement.pause();
      }
      stopSynthFallback();
    }
    if (mode !== "mode4") {
      if (mode4AudioElement && !mode4AudioElement.paused) {
        mode4AudioElement.pause();
      }
    }

    // Init Mode 3 NovaSpark engine on first view (replaces heavy Three.js approach)
    if (mode === "mode3") {
      // NovaSpark uses 2D canvas — no ThreeScene needed
      // ParticleSystem is initialized lazily inside renderMode3
      // Just connect the webcam preview
      if (mediaStream) {
        const v3 = document.getElementById("video-mode3");
        if (v3 && !v3.srcObject) v3.srcObject = mediaStream;
      }
    }

    // Connect video-mode3 to camera stream
    if (mode === "mode3" && mediaStream) {
      const v3 = document.getElementById("video-mode3");
      if (v3 && !v3.srcObject) v3.srcObject = mediaStream;
    }

    // Connect video-mode4 to camera stream
    if (mode === "mode4" && mediaStream) {
      const v4 = document.getElementById("video-mode4");
      if (v4 && !v4.srcObject) v4.srcObject = mediaStream;
      rl_initFilterBar();
    }
  }
  // Toggle Guide Modal (Kiri Atas Header)
  function toggleGuideModal() {
    const modal = document.getElementById("guide-modal");
    if (modal) modal.classList.toggle("active");
  }

  function closeGuideModalOutside(e) {
    const modal = document.getElementById("guide-modal");
    if (modal && e.target === modal) modal.classList.remove("active");
  }

  // Dark / Light Theme Toggle
  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.textContent = isLight ? "☀️ Light" : "🌙 Dark";
    localStorage.setItem("appTheme", isLight ? "light" : "dark");
  }

  function loadSavedTheme() {
    const saved = localStorage.getItem("appTheme");
    if (saved === "light") {
      document.body.classList.add("light-mode");
      const btn = document.getElementById("theme-toggle-btn");
      if (btn) btn.textContent = "☀️ Light";
    }
  }

  window.switchMode = switchMode;
  window.updateNameFromInput = updateNameFromInput;
  window.toggleGuideModal = toggleGuideModal;
  window.closeGuideModalOutside = closeGuideModalOutside;
  window.toggleTheme = toggleTheme;
  window.toggleMode2Audio = toggleMode2Audio;
  window.handleMode2AudioUpload = handleMode2AudioUpload;
  window.updateMode2AudioVolume = updateMode2AudioVolume;
  window.toggleAutoSyncAudio = toggleAutoSyncAudio;

  // Controls Setup
  document.addEventListener("DOMContentLoaded", async () => {
    // Load saved theme preference
    loadSavedTheme();

    // Populate saved names into inputs
    populateNameInputs();

    await initCamera();
    await loadModels();

    isDetecting = true;
    processFrame();

    // Mode Tabs Event Listeners
    document.getElementById("tab-mode1").addEventListener("click", () => switchMode("mode1"));
    document.getElementById("tab-mode2").addEventListener("click", () => switchMode("mode2"));
    document.getElementById("tab-mode3").addEventListener("click", () => switchMode("mode3"));
    document.getElementById("tab-mode4").addEventListener("click", () => switchMode("mode4"));

    // Connect video-mode4 at start
    if (mediaStream) {
      const v4 = document.getElementById("video-mode4");
      if (v4) v4.srcObject = mediaStream;
    }

    // Toggle Photo Blur Button (Mode 2)
    const btnToggleBlur = document.getElementById("btn-toggle-blur");
    if (btnToggleBlur) {
      btnToggleBlur.addEventListener("click", () => {
        isPhotoBlurActive = !isPhotoBlurActive;
        btnToggleBlur.textContent = isPhotoBlurActive ? "📸 Blur Active" : "📸 Toggle Photo Blur";
      });
    }
  });

