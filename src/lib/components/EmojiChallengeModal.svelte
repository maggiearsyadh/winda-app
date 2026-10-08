<script>
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';
  import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

  let { isOpen = false, onClose } = $props();

  // ── Game State ──
  let score = $state(0);
  let highScore = $state(0);
  let isModelLoading = $state(true);
  let loadingProgress = $state('Menyiapkan AI deteksi wajah & tangan...');
  let cameraActive = $state(false);
  let cameraError = $state('');

  // Target Mission
  let currentTarget = $state({
    emotion: { id: 'happy', label: 'Senyum Lebar', emoji: '😀' },
    gesture: { id: 'thumbs_up', label: 'Jempol', emoji: '👍' }
  });

  // Current Detection
  let detectedEmotion = $state({ id: 'neutral', label: 'Netral', emoji: '😐', confidence: 0 });
  let detectedGesture = $state({ id: 'none', label: 'Mencari tangan...', emoji: '🖐️' });
  let isMatch = $state(false);
  let holdProgress = $state(0); // 0 to 100%
  let streak = $state(0);

  // References
  let videoElement = $state(null);
  let stream = null;
  let animFrameId = null;
  let faceLandmarker = null;
  let handLandmarker = null;

  // Timing logic from Pyblur game.py
  const HOLD_DURATION_MS = 1000; // 1.0 second hold
  const MISMATCH_GRACE_MS = 500;  // 0.5 second grace period
  let matchStartTime = null;
  let lastMatchTime = null;
  let lastInferenceTime = 0;
  const INFERENCE_INTERVAL_MS = 80; // ~12-15 FPS inference for ultra-smooth mobile battery saving

  // Emotions List
  const EMOTIONS = [
    { id: 'happy', label: 'Senyum Lebar', emoji: '😀' },
    { id: 'surprise', label: 'Buka Mulut / Kaget', emoji: '😮' },
    { id: 'angry', label: 'Cemberut / Alis Turun', emoji: '😠' },
    { id: 'wink', label: 'Kedip 1 Mata', emoji: '😉' },
    { id: 'pucker', label: 'Manyun / Silly', emoji: '😙' }
  ];

  // Gestures List
  const GESTURES = [
    { id: 'thumbs_up', label: 'Jempol Ke Atas', emoji: '👍' },
    { id: 'peace', label: 'Peace 2 Jari', emoji: '✌️' },
    { id: 'open_hand', label: 'Telapak Terbuka', emoji: '👋' },
    { id: 'fist', label: 'Kepalan Tangan', emoji: '✊' }
  ];

  // ── Procedural Web Audio Synthesizer (Pyblur C5 -> E5 Chime) ──
  function playCorrectChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Tone 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.11);
      gain2.gain.setValueAtTime(0.22, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.11);
      osc2.stop(now + 0.35);
    } catch (e) {}
  }

  function pickRandomMission() {
    let nextEmotion, nextGesture;
    do {
      nextEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    } while (nextEmotion.id === currentTarget.emotion.id && EMOTIONS.length > 1);

    do {
      nextGesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    } while (nextGesture.id === currentTarget.gesture.id && GESTURES.length > 1);

    currentTarget = { emotion: nextEmotion, gesture: nextGesture };
    matchStartTime = null;
    lastMatchTime = null;
    holdProgress = 0;
  }

  // ── Initialize AI Models ──
  async function initVisionModels() {
    try {
      loadingProgress = 'Menyiapkan modul MediaPipe Web...';
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      loadingProgress = 'Memuat model ekspresi wajah...';
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      loadingProgress = 'Memuat model pengenal gestur tangan...';
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });

      isModelLoading = false;
      await startCamera();
    } catch (err) {
      console.error('Vision initialization error:', err);
      loadingProgress = 'Gagal memuat modul AI: ' + (err.message || 'Error');
      cameraError = 'Tidak dapat memuat model AI atau izin kamera ditolak.';
      isModelLoading = false;
    }
  }

  // ── Start Webcam Stream ──
  async function startCamera() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera.');
      }

      // Optimize resolution for mobile phones (smooth & battery-friendly)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 640 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          cameraActive = true;
          startProcessingLoop();
        };
      }
    } catch (err) {
      console.error('Webcam error:', err);
      cameraError = 'Mohon izinkan akses kamera untuk bermain Emoji Challenge.';
    }
  }

  // ── Geometric Gesture Heuristics (Pyblur gesture.py Port) ──
  function classifyGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return { id: 'none', label: 'Tunjukkan tangan', emoji: '🖐️' };
    }

    // Landmark indices:
    // Thumb: 1, 2, 3, 4 (tip)
    // Index: 5, 6, 7, 8 (tip)
    // Middle: 9, 10, 11, 12 (tip)
    // Ring: 13, 14, 15, 16 (tip)
    // Pinky: 17, 18, 19, 20 (tip)

    // In normalized coords, Y decreases towards top of screen!
    const indexFolded = landmarks[8].y > landmarks[6].y;
    const middleFolded = landmarks[12].y > landmarks[10].y;
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    const indexExtended = landmarks[8].y < landmarks[6].y;
    const middleExtended = landmarks[12].y < landmarks[10].y;
    const ringExtended = landmarks[16].y < landmarks[14].y;
    const pinkyExtended = landmarks[20].y < landmarks[18].y;

    // 1. Thumbs Up 👍: 4 main fingers folded, thumb tip high up
    const thumbUp = landmarks[4].y < landmarks[3].y && landmarks[4].y < landmarks[6].y;
    if (indexFolded && middleFolded && ringFolded && pinkyFolded && thumbUp) {
      return { id: 'thumbs_up', label: 'Jempol', emoji: '👍' };
    }

    // 2. Peace ✌️: Index & middle up, ring & pinky down
    if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
      return { id: 'peace', label: 'Peace 2 Jari', emoji: '✌️' };
    }

    // 3. Open Hand 👋: All 4 fingers extended
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return { id: 'open_hand', label: 'Telapak Terbuka', emoji: '👋' };
    }

    // 4. Fist ✊: All 4 fingers folded
    if (indexFolded && middleFolded && ringFolded && pinkyFolded) {
      return { id: 'fist', label: 'Kepalan Tangan', emoji: '✊' };
    }

    return { id: 'other', label: 'Posisikan jari...', emoji: '🖐️' };
  }

  // ── Face Emotion Heuristics from Blendshapes ──
  function classifyEmotion(blendshapes) {
    if (!blendshapes || blendshapes.length === 0) {
      return { id: 'none', label: 'Wajah tidak terdeteksi', emoji: '👤', confidence: 0 };
    }

    const map = {};
    for (const cat of blendshapes[0].categories) {
      map[cat.categoryName] = cat.score;
    }

    const smileLeft = map['mouthSmileLeft'] || 0;
    const smileRight = map['mouthSmileRight'] || 0;
    const jawOpen = map['jawOpen'] || 0;
    const browDownL = map['browDownLeft'] || 0;
    const browDownR = map['browDownRight'] || 0;
    const blinkL = map['eyeBlinkLeft'] || 0;
    const blinkR = map['eyeBlinkRight'] || 0;
    const pucker = map['mouthPucker'] || 0;

    // 1. Wink 😉
    if ((blinkL > 0.45 && blinkR < 0.2) || (blinkR > 0.45 && blinkL < 0.2)) {
      return { id: 'wink', label: 'Kedip 1 Mata', emoji: '😉', confidence: Math.max(blinkL, blinkR) };
    }

    // 2. Surprise 😮
    if (jawOpen > 0.38) {
      return { id: 'surprise', label: 'Buka Mulut / Kaget', emoji: '😮', confidence: jawOpen };
    }

    // 3. Pucker 😙
    if (pucker > 0.38) {
      return { id: 'pucker', label: 'Manyun / Silly', emoji: '😙', confidence: pucker };
    }

    // 4. Happy 😀
    const avgSmile = (smileLeft + smileRight) / 2;
    if (avgSmile > 0.40) {
      return { id: 'happy', label: 'Senyum Lebar', emoji: '😀', confidence: avgSmile };
    }

    // 5. Angry 😠
    const avgBrowDown = (browDownL + browDownR) / 2;
    if (avgBrowDown > 0.35) {
      return { id: 'angry', label: 'Cemberut / Alis Turun', emoji: '😠', confidence: avgBrowDown };
    }

    return { id: 'neutral', label: 'Ekspresi Netral', emoji: '😐', confidence: 0.5 };
  }

  // ── Main Game Loop with Pyblur Grace Period ──
  function startProcessingLoop() {
    function loop(timestamp) {
      if (!cameraActive || !videoElement) return;

      // Throttle AI inference for light mobile processing
      if (timestamp - lastInferenceTime >= INFERENCE_INTERVAL_MS && videoElement.readyState >= 2) {
        lastInferenceTime = timestamp;

        try {
          // Detect Face
          if (faceLandmarker) {
            const faceResult = faceLandmarker.detectForVideo(videoElement, timestamp);
            if (faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0) {
              detectedEmotion = classifyEmotion(faceResult.faceBlendshapes);
            }
          }

          // Detect Hand
          if (handLandmarker) {
            const handResult = handLandmarker.detectForVideo(videoElement, timestamp);
            if (handResult.landmarks && handResult.landmarks.length > 0) {
              detectedGesture = classifyGesture(handResult.landmarks[0]);
            } else {
              detectedGesture = { id: 'none', label: 'Tunjukkan tangan', emoji: '🖐️' };
            }
          }

          // ── Evaluate Match ──
          const emotionMatches = detectedEmotion.id === currentTarget.emotion.id;
          const gestureMatches = detectedGesture.id === currentTarget.gesture.id;
          const instantMatch = emotionMatches && gestureMatches;

          const now = Date.now();

          if (instantMatch) {
            isMatch = true;
            if (!matchStartTime) {
              matchStartTime = now;
            }
            lastMatchTime = now;
          } else {
            // Check Mismatch Grace Period (0.5s tolerance from Pyblur game.py)
            if (matchStartTime && lastMatchTime && (now - lastMatchTime <= MISMATCH_GRACE_MS)) {
              // Still within grace period!
              isMatch = true;
            } else {
              // Grace expired, reset
              isMatch = false;
              matchStartTime = null;
              lastMatchTime = null;
              holdProgress = 0;
            }
          }

          // Update Progress
          if (matchStartTime && isMatch) {
            const elapsed = now - matchStartTime;
            holdProgress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));

            // Completed 1.0s hold!
            if (elapsed >= HOLD_DURATION_MS) {
              score += 10;
              streak += 1;
              if (score > highScore) {
                highScore = score;
                try {
                  localStorage.setItem('winda_emoji_challenge_highscore', String(highScore));
                } catch (e) {}
              }

              playCorrectChime();
              confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.6 }
              });

              pickRandomMission();
            }
          } else {
            holdProgress = 0;
          }
        } catch (e) {
          // Frame skip tolerance
        }
      }

      animFrameId = requestAnimationFrame(loop);
    }

    animFrameId = requestAnimationFrame(loop);
  }

  // ── Lifecycle ──
  onMount(() => {
    try {
      const saved = localStorage.getItem('winda_emoji_challenge_highscore');
      if (saved) highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    initVisionModels();
  });

  onDestroy(() => {
    stopCamera();
  });

  function stopCamera() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    cameraActive = false;
  }

  function handleClose() {
    stopCamera();
    if (onClose) onClose();
  }
</script>

{#if isOpen}
  <div class="emoji-game-modal-overlay" role="dialog" aria-modal="true">
    <div class="emoji-game-modal-card">
      
      <!-- Top Bar: Title, Score Badge & Close Button -->
      <div class="modal-top-bar">
        <div class="top-title-group">
          
          <h2 class="game-title">Emoji Challenge 🎭</h2>
        </div>

        <div class="top-actions-group">
          <div class="score-pill">
            <span class="score-label">Score</span>
            <span class="score-val">{score}</span>
          </div>
          {#if highScore > 0}
            <div class="best-pill">
              <span>🏆 {highScore}</span>
            </div>
          {/if}

          <button
            type="button"
            class="modal-close-btn"
            onclick={handleClose}
            aria-label="Tutup Game"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Main Camera & HUD Stage -->
      <div class="camera-viewport-card">
        {#if isModelLoading}
          <div class="camera-placeholder loading-state">
            <div class="spinner-ring"></div>
            <p class="loading-desc">{loadingProgress}</p>
            <span class="loading-sub">Model AI berjalan langsung di HP/Laptop (ringan & aman)</span>
          </div>
        {:else if cameraError}
          <div class="camera-placeholder error-state">
            <span class="error-emoji">📷</span>
            <p class="error-title">{cameraError}</p>
            <button type="button" class="retry-btn" onclick={startCamera}>
              Coba Nyalakan Kamera
            </button>
          </div>
        {/if}

        <!-- Live Video Element (Mirrored horizontally for natural selfie view) -->
        <video
          bind:this={videoElement}
          class="camera-video"
          class:is-active={cameraActive}
          autoplay
          playsinline
          muted
        ></video>

        <!-- Floating Target Mission Banner at Top of Video -->
        {#if cameraActive}
          <div class="mission-hud-banner" class:is-holding={isMatch}>
            <div class="mission-intro-label">Tirukan pose ini An hahahaha (TAHAN 1 DETIK):</div>
            <div class="mission-targets-row">
              <div class="target-chip">
                <span class="target-emoji">{currentTarget.emotion.emoji}</span>
                <span class="target-name">{currentTarget.emotion.label}</span>
              </div>
              <span class="target-plus">+</span>
              <div class="target-chip">
                <span class="target-emoji">{currentTarget.gesture.emoji}</span>
                <span class="target-name">{currentTarget.gesture.label}</span>
              </div>
            </div>

            <!-- Hold Progress Bar -->
            <div class="hold-progress-track">
              <div
                class="hold-progress-fill"
                style="width: {holdProgress}%"
                class:is-full={holdProgress >= 100}
              ></div>
            </div>
          </div>
        {/if}

        <!-- Bottom Feedback Pill Status on Video -->
        {#if cameraActive}
          <div class="detection-status-dock">
            <!-- Face feedback -->
            <div
              class="detect-pill"
              class:is-matched={detectedEmotion.id === currentTarget.emotion.id}
            >
              <span>{detectedEmotion.emoji}</span>
              <span>{detectedEmotion.label}</span>
            </div>

            <!-- Hand feedback -->
            <div
              class="detect-pill"
              class:is-matched={detectedGesture.id === currentTarget.gesture.id}
            >
              <span>{detectedGesture.emoji}</span>
              <span>{detectedGesture.label}</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Bottom Hint & Fun Controls -->
      <div class="modal-bottom-dock">
        <!-- <p class="game-hint-text">
          💡 Tunjukkan wajah & tanganmu bersamaan ke kamera sampai bar hijau terisi penuh!
        </p> -->

        <button type="button" class="skip-mission-btn" onclick={pickRandomMission}>
          🎲 Ganti Emoji
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── Fullscreen Modal Overlay (Urbanist / Aesthetic ANA Design) ── */
  .emoji-game-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(17, 24, 39, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(var(--sat, 12px), 12px) max(var(--sar, 12px), 12px) max(var(--sab, 12px), 12px);
    box-sizing: border-box;
    animation: fadeInModal 0.2s ease-out;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes fadeInModal {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ── Modal Card Container (Clean White & Rounded) ── */
  .emoji-game-modal-card {
    width: 100%;
    max-width: 440px;
    max-height: 94dvh;
    background: #FFFFFF;
    border-radius: 28px;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
    border: 1px solid #ECE7DE;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  /* ── Top Bar ── */
  .modal-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #F3EFEA;
  }

  .top-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .game-badge-pill {
    font-size: 0.64rem;
    font-weight: 800;
    color: #065F46;
    background: #D1FAE5;
    padding: 2px 8px;
    border-radius: 999px;
    letter-spacing: 0.04em;
    width: fit-content;
  }

  .game-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: #111827;
    margin: 0;
    letter-spacing: -0.015em;
  }

  .top-actions-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-pill {
    background: #FEF3C7;
    border: 1px solid #FDE68A;
    border-radius: 999px;
    padding: 4px 10px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .score-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #92400E;
  }

  .score-val {
    font-size: 0.95rem;
    font-weight: 800;
    color: #78350F;
  }

  .best-pill {
    background: #F3F4F6;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 0.72rem;
    font-weight: 700;
    color: #4B5563;
  }

  .modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid #E5E7EB;
    background: #FFFFFF;
    color: #374151;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
  }

  .modal-close-btn:hover {
    background: #F3F4F6;
    transform: scale(1.05);
  }

  /* ── Camera Viewport Card ── */
  .camera-viewport-card {
    position: relative;
    width: 100%;
    height: 380px;
    background: #111827;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* Mirror for natural selfie reflection */
    display: none;
  }

  .camera-video.is-active {
    display: block;
  }

  /* ── Camera Placeholders ── */
  .camera-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    color: #FFFFFF;
  }

  .spinner-ring {
    width: 40px;
    height: 40px;
    border: 3.5px solid rgba(255, 255, 255, 0.2);
    border-top-color: #34D399;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 14px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-desc {
    font-size: 0.9rem;
    font-weight: 700;
    color: #F9FAFB;
    margin: 0 0 6px;
  }

  .loading-sub {
    font-size: 0.72rem;
    color: #9CA3AF;
  }

  .error-emoji {
    font-size: 2.2rem;
    margin-bottom: 10px;
  }

  .error-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: #FCA5A5;
    margin: 0 0 14px;
    max-width: 280px;
  }

  .retry-btn {
    background: #3B82F6;
    color: #FFFFFF;
    border: none;
    padding: 8px 18px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
  }

  /* ── Mission HUD Banner (Top of Video) ── */
  .mission-hud-banner {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 20px;
    padding: 10px 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 5;
    transition: transform 0.18s ease, border 0.18s ease;
    border: 2px solid transparent;
  }

  .mission-hud-banner.is-holding {
    border-color: #10B981;
    transform: scale(1.02);
  }

  .mission-intro-label {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #6B7280;
  }

  .mission-targets-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .target-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #F3F4F6;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #E5E7EB;
  }

  .target-emoji {
    font-size: 1.25rem;
  }

  .target-name {
    font-size: 0.78rem;
    font-weight: 800;
    color: #111827;
  }

  .target-plus {
    font-size: 0.9rem;
    font-weight: 800;
    color: #9CA3AF;
  }

  .hold-progress-track {
    width: 100%;
    height: 7px;
    background: #E5E7EB;
    border-radius: 999px;
    overflow: hidden;
  }

  .hold-progress-fill {
    height: 100%;
    background: #F59E0B;
    border-radius: 999px;
    transition: width 0.08s linear;
  }

  .hold-progress-fill.is-full {
    background: #10B981;
  }

  /* ── Detection Feedback Pills at Bottom of Video ── */
  .detection-status-dock {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    z-index: 5;
  }

  .detect-pill {
    flex: 1;
    background: rgba(17, 24, 39, 0.75);
    backdrop-filter: blur(6px);
    border-radius: 999px;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #E5E7EB;
    font-size: 0.72rem;
    font-weight: 700;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    transition: background 0.18s, border-color 0.18s, color 0.18s;
  }

  .detect-pill.is-matched {
    background: rgba(16, 185, 129, 0.9);
    border-color: #34D399;
    color: #FFFFFF;
  }

  /* ── Modal Bottom Dock ── */
  .modal-bottom-dock {
    padding: 14px 18px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #FAF7F2;
    border-top: 1px solid #ECE7DE;
  }

  .game-hint-text {
    font-size: 0.74rem;
    font-weight: 600;
    color: #6B7280;
    margin: 0;
    line-height: 1.35;
    flex: 1;
  }

  .skip-mission-btn {
    background: #FFFFFF;
    border: 1px solid #D1D5DB;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 0.76rem;
    font-weight: 800;
    color: #374151;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, transform 0.15s;
  }

  .skip-mission-btn:hover {
    background: #F3F4F6;
    transform: translateY(-1px);
  }
</style>
