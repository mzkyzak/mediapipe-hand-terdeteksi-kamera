# 🖐️ MediaPipe Hand Tracking 

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-HandPose%20%26%20BlazeFace-00F0FF?logo=google&logoColor=white)](https://google.github.io/mediapipe/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-v3.x-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![HTML5 / JS](https://img.shields.io/badge/Web-HTML5%20%7C%20CSS3%20%7C%20JS-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)](#)

Aplikasi **AI Computer Vision & Hand Gesture Recognition** modern berbasis web yang interaktif, super responsif, dan kaya fitur visual 3D! Menggunakan kombinasi **Google MediaPipe Hands**, **TensorFlow.js BlazeFace**, serta engine audio & efek partisipatif real-time.

---

## 📸 Demo & Tangkapan Layar

| **Mode 1: Panggil Nama TTS** | **Mode 2: Photo Blur Bokeh** |
| :---: | :---: |
| ![Mode 1 Preview](https://img.shields.io/badge/Mode_1-TTS_Voice_Recognition-00F0FF?style=for-the-badge) | ![Mode 2 Preview](https://img.shields.io/badge/Mode_2-Portrait_Bokeh_Blur-FF0090?style=for-the-badge) |
| *Deteksi 0-5 Jari + Panggilan Nama kustom via Text-to-Speech (TTS)* |*Efek Blur Latar Belakang profesional via Pose ✌️ + Music Auto-Sync* |

| **Mode 3: NovaSpark 3D Particles** | **Mode 4: RetroLens Portal Filters** |
| :---: | :---: |
| ![Mode 3 Preview](https://img.shields.io/badge/Mode_3-NovaSpark_3D_Particles-00FF99?style=for-the-badge) | ![Mode 4 Preview](https://img.shields.io/badge/Mode_4-RetroLens_3D_Portal-A855F7?style=for-the-badge) |
| *6 Bentuk Partikel 3D interaktif mengikuti titik koordinat tangan* | *11 Filter Retro + Portal Polygon Visual + Music Auto-Sync* |

---

## ✨ Fitur-Fitur Unggulan

### 🎮 4 Mode Gestur Tangan & AI Utama

#### 1️⃣ Mode 1: Panggil Nama & TTS Voice Custom
* **Counting Jari Presisi**: Mendeteksi gestur tinju 👊 (0 jari) hingga telapak terbuka 🖐️ (5 jari).
* **Text-to-Speech (TTS) Otomatis**: Menyebutkan nama kustom berdasarkan jumlah jari terdeteksi secara real-time.
* **Kustomisasi Nama via UI Sidebar**: Ubah nama panggilan untuk setiap jumlah jari langsung dari sidebar tanpa perlu *coding*.
* **Visual Landmark & Skeleton**: Overlay garis neosian skeleton tangan dengan indikator *confidence score*.

#### 2️⃣ Mode 2: Photo Blur Trend (Portrait Bokeh Depth)
* **Pemicu Gestur ✌️**: Tunjukkan pose 2 jari (Telunjuk + Tengah) untuk mengaktifkan efek *depth blur*.
* **Smart Face & Hand Tracking**: Mengisolasi subjek (wajah/badan) dan memburamkan latar belakang kamera dengan mulus.
* **Dedicated Audio Player (`photo_blur.mp3`)**:
  - Tombol **Play/Mute MP3** dengan visual gradien status.
  - **Auto-Play / Sync**: Musik menyala dari awal saat blur aktif dan mati otomatis saat blur non-aktif.
  - Control Slider Volume (0-100%).

#### 3️⃣ Mode 3: NovaSpark 3D Engine (Interactive Particles)
* **6 Bentuk Partikel 3D Menakjubkan**:
  1. 💖 **REALISTIC LOVE 3D** (Animasi Detak Jantung 3D)
  2. ⚡ **STAR FORGE 3D** (Bintang Garis Neon Interaktif)
  3. 🌍 **BUMI TATA SURYA** (Model Planet Bumi & Orbit)
  4. ✨ **PARTIKEL MZKYZAK** (Partikel Glow Nama)
  5. 🌌 **GALAXY** (Pusaran Galaksi Spiral 3D)
  6. 🌠 **NEBULA** (Awan Kasur Bintang Glow)
* **Fisika Interaktif**: Partikel tertarik, meledak, atau mengikuti gerakan telapak tangan & jari secara fluid 60 FPS.

#### 4️⃣ Mode 4: RetroLens 3D Hand Tracking Portal
* **11 Filter Retro Visual**: DUAL-TONE, MONO, PIXELATE, INVERT, SEPIA, BLUR, THERMAL, SKETCH, GLITCH, NEON, RAINBOW.
* **Hand Portal Polygon Rendering**:
  - **Single Hand**: Portal efek retro di sekeliling ujung-ujung jari.
  - **Dual Hand Bowtie & Quad Mesh**: Menyambungkan dua tangan menjadi portal filter kamera interaktif.
  - **Gestur Switch**: Gestur Pinch 👌 (Jempol + Kelingking) untuk mengganti filter, 👊👊 Double Fist untuk switch mode 2D Quad / 3D Mesh.
* **Dedicated Audio Player (`Hand_Tracking.mp3`)**:
  - **Auto-Sync Hand Detection**: Musik MP3 menyala otomatis saat tangan terdeteksi di kamera dan mati dari awal saat tangan keluar.
  - Dedicated Volume & Play/Mute controls.
* **Keyboard Shortcuts & Snapshot**:
  - Tekan `N`: Next Filter Retro.
  - Tekan `P`: Previous Filter Retro.
  - Tekan `S`: Take Snapshot HD (Unduh foto hasil filter otomatis).

---

## ⌨️ Shortcut Keyboard

| Tombol | Fungsi | Mode Berlaku |
| :---: | :--- | :---: |
| <kbd>N</kbd> | Pindah ke **Filter Retro Selanjutnya** | Mode 4 |
| <kbd>P</kbd> | Pindah ke **Filter Retro Sebelumnya** | Mode 4 |
| <kbd>S</kbd> | Tangkap & Unduh Foto **Snapshot HD (.png)** | Mode 4 |

---

## 🛠️ Teknologi yang Digunakan

* **Core Language**: HTML5, Vanilla JavaScript (ES6+), Modern CSS3 (Glassmorphism UI).
* **AI & Vision Models**:
  * [Google MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) — Deteksi 21 keypoint 3D landmark tangan.
  * [TensorFlow.js BlazeFace](https://github.com/tensorflow/tfjs-models/tree/master/blazeface) — Deteksi lokasi wajah real-time.
* **Audio & Effects**: Web Audio API, Web Speech Synthesis (TTS), HTML5 Canvas 2D Engine.
* **Particles & Visuals**: Custom NovaSpark Engine & Particles.js.

---

## 📁 Struktur Project

```text
mediapipe-hand-terdeteksi-kamera/
├── 📄 index.html          # Halaman Landing Page / Login Authentication
├── 📄 kamera.html         # Workspace Utama (Dashboard 4 Mode Tracking)
├── 📄 script.js           # Engine Utama MediaPipe, Logic Audio, TTS, & Render Canvas
├── 📄 style.css           # Styling Theme Neon Glassmorphism Modern
├── 📄 particles.js        # Background Particle Animation pada Halaman Login
├── 📄 python_server.py    # Opsional Local Python Web Server
├── 🎵 photo_blur.mp3      # Audio Musik Khusus Mode 2 (Photo Blur)
├── 🎵 Hand_Tracking.mp3   # Audio Musik Khusus Mode 4 (Hand Tracking Portal)
└── 📄 README.md           # Dokumentasi Lengkap Project
```

---

## 🚀 Cara Instalasi & Menjalankan

### Opsi A: Menggunakan Live Server (Node.js) — *Direkomendasikan*

1. **Clone Repository**:
   ```bash
   git clone https://github.com/mzkyzak/mediapipe-hand-terdeteksi-kamera.git
   cd mediapipe-hand-terdeteksi-kamera
   ```

2. **Install Live Server** *(jika belum ada)*:
   ```bash
   npm install -g live-server
   ```

3. **Jalankan Aplikasi**:
   ```bash
   live-server
   ```
   Aplikasi akan otomatis terbuka di browser pada URL `http://127.0.0.1:8080`.

---

### Opsi B: Menggunakan Python Server

1. **Jalankan script Python bawaan**:
   ```bash
   python python_server.py
   ```
2. Buka browser dan kunjungi `http://localhost:8000`.

---

## ⚙️ Kustomisasi & Pengaturan

### 1️⃣ Mengubah Nama Suara TTS (Mode 1)
Nama panggilan dapat diubah langsung melalui **Sidebar Panel Mode 1** di web secara interaktif. Jika ingin mengubah nilai default di source code:
1. Buka `script.js`
2. Cari objek `customFingerNames`:
   ```javascript
   let customFingerNames = {
     0: "Tinju",
     1: "Satu",
     2: "Dua",
     3: "Tiga",
     4: "Empat",
     5: "Taufiq" // Ubah nama default 5 jari di sini
   };
   ```

## 📜 Lisensi

Project ini dikembangkan di bawah lisensi **MIT License**. Bebas untuk dipelajari, dimodifikasi, dan dikembangkan lebih lanjut.

---

<p align="center">
  Dibuat dengan ❤️ oleh <strong>mzkyzak</strong> — Computer Vision 
</p>
