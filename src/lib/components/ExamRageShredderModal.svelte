<script>
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';

  let { isOpen = $bindable(false), onClose } = $props();

  // State
  let ventingText = $state('');
  let destructionMode = $state('shredder'); // 'shredder' | 'fire' | 'blackhole'
  let phase = $state('input'); // 'input' | 'destroying' | 'cleared'
  let destroyedCount = $state(0);
  let audioCtx = null;

  // Preset venting chips
  const PRESET_CHIPS = [
    'Soal susah dan banyak',
    'Waktu ujian kurang',
    'Otak udah lelah'
  ];

  // Mascot comforting quotes
  const HEALING_QUOTES = [
    'Beban ujian resmi lenyap jadi abu time to rebahan dan jajan enak',
    'U DID A GREAT JOB! Apapun hasilnya, U hebat sudah berjuang sampai akhir',
    'Selesai sudah stres, GOOD JOB , Now Time to jajan enak dan tidur.',
  ];
  let currentQuote = $state(HEALING_QUOTES[0]);

  onMount(() => {
    try {
      const saved = localStorage.getItem('winda_destroyed_exams_count');
      if (saved) destroyedCount = parseInt(saved, 10) || 0;
    } catch (e) {}
  });

  onDestroy(() => {
    stopSound();
  });

  function getAudioCtx() {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) audioCtx = new AudioClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ── Procedural Web Audio Sound Effects ──
  let activeAudioNodes = [];

  function stopSound() {
    activeAudioNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    activeAudioNodes = [];
  }

  // 1. Shredder Grinding & Crunching Sound
  function playShredderSound() {
    stopSound();
    const ctx = getAudioCtx();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 2.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    // Motor hum
    const motorOsc = ctx.createOscillator();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.setValueAtTime(120, ctx.currentTime);

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.12, ctx.currentTime);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.25, ctx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.7);

    whiteNoise.connect(filter);
    filter.connect(mainGain);
    motorOsc.connect(motorGain);
    motorGain.connect(mainGain);
    mainGain.connect(ctx.destination);

    whiteNoise.start();
    motorOsc.start();

    activeAudioNodes.push(whiteNoise, motorOsc, mainGain);
  }

  // 2. Fire Crackling & Burning Sound
  function playFireSound() {
    stopSound();
    const ctx = getAudioCtx();
    if (!ctx) return;

    // Wind roar
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise for fire whoosh
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // Occasional pops / crackles
    for (let i = 0; i < 12; i++) {
      const popTime = ctx.currentTime + Math.random() * 2.4;
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(600 + Math.random() * 1200, popTime);
      popGain.gain.setValueAtTime(0.18, popTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.05);

      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(popTime);
      popOsc.stop(popTime + 0.06);
      activeAudioNodes.push(popOsc, popGain);
    }

    activeAudioNodes.push(noise, gain);
  }

  // 3. Black Hole Cosmic Gravity Singularity Sound
  function playBlackHoleSound() {
    stopSound();
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 2.6);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(160, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 2.6);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.8);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc2.start();

    activeAudioNodes.push(osc, osc2, gain);
  }

  // 4. Peaceful Relief Chime
  function playReliefChime() {
    stopSound();
    const ctx = getAudioCtx();
    if (!ctx) return;

    const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.85);
    });
  }

  function addChipText(chip) {
    if (ventingText.trim()) {
      ventingText += ', ' + chip;
    } else {
      ventingText = chip;
    }
  }

  function startDestruction() {
    if (!ventingText.trim()) {
      ventingText = 'Semua soal ujian maut & materi bikin pusing!';
    }

    phase = 'destroying';

    if (destructionMode === 'shredder') {
      playShredderSound();
    } else if (destructionMode === 'fire') {
      playFireSound();
    } else if (destructionMode === 'blackhole') {
      playBlackHoleSound();
    }

    // Complete destruction after animation
    setTimeout(() => {
      phase = 'cleared';
      destroyedCount++;
      currentQuote = HEALING_QUOTES[Math.floor(Math.random() * HEALING_QUOTES.length)];

      try {
        localStorage.setItem('winda_destroyed_exams_count', destroyedCount.toString());
      } catch (e) {}

      playReliefChime();

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#38BDF8']
        });
      } catch (e) {}
    }, 2800);
  }

  function resetToVentAgain() {
    ventingText = '';
    phase = 'input';
  }

  function handleClose() {
    stopSound();
    if (onClose) onClose();
    isOpen = false;
  }
</script>

{#if isOpen}
  <div
    class="rage-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="rage-modal-title"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget && phase !== 'destroying') handleClose(); }}
  >
    <div class="rage-card" class:mode-fire={destructionMode === 'fire' && phase === 'destroying'} class:mode-blackhole={destructionMode === 'blackhole' && phase === 'destroying'}>
      
      <!-- Top Bar -->
      <header class="rage-header">
        <div class="header-left">
          <span class="rage-badge">EXAM RAGE SHREDDER</span>
          <span class="destroyed-counter">Dimusnahkan: {destroyedCount}x</span>
        </div>
        {#if phase !== 'destroying'}
          <button
            type="button"
            class="btn-close-rage"
            onclick={handleClose}
            aria-label="Tutup"
            title="Tutup"
          >
            ✕
          </button>
        {/if}
      </header>

      <!-- Main Stage Container -->
      <div class="rage-stage-body">
        {#if phase === 'input'}
          <!-- ── PHASE 1: VIRTUAL EXAM SHEET INPUT ── -->
          <div class="input-screen">
            <h2 id="rage-modal-title" class="rage-title">Tulis & BUANG Beban Ujian</h2>
            <!-- <p class="rage-subtitle">Ketik semua keluh kesah, nama matkul, atau soal ujian yang bikin pusing di bawah ini:</p> -->

            <!-- Realistic Virtual Exam Paper -->
            <div class="exam-paper-container">
              <div class="exam-paper-header">
                <div class="exam-header-col">
                  <span class="exam-meta-label">MATA UJIAN:</span>
                  <span class="exam-meta-val">Today's Ujian</span>
                </div>
                <div class="exam-header-col">
                  <span class="exam-meta-label">PEJUANG:</span>
                  <span class="exam-meta-val">Winda Permatacalli</span>
                </div>
                <div class="exam-stamp-red">SCORE : PUYENG</div>
              </div>

              <textarea
                class="exam-textarea"
                bind:value={ventingText}
                placeholder="Tulis apa yang bikin pucing , Contoh: UJIAN SOAL (NAMA MATKUL) GILA BGTT blablalbla, dosen pelit nilai, ga tidur semalaman..."
                rows="4"
              ></textarea>

              <div class="paper-footer-line">
                <span class="exam-rule-note">*Kertas ini bakal MaggieGPT hancurkan tanpa sisa untuk melegakan otak</span>
              </div>
            </div>

            <!-- Preset Quick Chips -->
            <div class="chips-row">
              <span class="chips-label">Tempel cepat:</span>
              {#each PRESET_CHIPS as chip}
                <button
                  type="button"
                  class="vent-chip"
                  onclick={() => addChipText(chip)}
                >
                  +{chip}
                </button>
              {/each}
            </div>

            <!-- Destruction Method Picker -->
            <div class="methods-selection">
              <span class="methods-title">Pilih Cara Pemusnahan:</span>
              <div class="methods-grid">
                <button
                  type="button"
                  class="method-btn"
                  class:is-active={destructionMode === 'shredder'}
                  onclick={() => destructionMode = 'shredder'}
                >
                  <span class="method-icon">🖨️</span>
                  <span class="method-name">Mesin Shredder</span>
                  <span class="method-desc">Digilas & disobek serpihan</span>
                </button>

                <button
                  type="button"
                  class="method-btn"
                  class:is-active={destructionMode === 'fire'}
                  onclick={() => destructionMode = 'fire'}
                >
                  <span class="method-icon">🔥</span>
                  <span class="method-name">Bakar Api Unggun</span>
                  <span class="method-desc">Hangus jadi abu hitam</span>
                </button>

                <button
                  type="button"
                  class="method-btn"
                  class:is-active={destructionMode === 'blackhole'}
                  onclick={() => destructionMode = 'blackhole'}
                >
                  <span class="method-icon">🌌</span>
                  <span class="method-name">Lubang Hitam</span>
                  <span class="method-desc">Disedot ke galaksi lain</span>
                </button>
              </div>
            </div>

            <!-- Main CTA Button -->
            <button
              type="button"
              class="btn-trigger-destroy"
              onclick={startDestruction}
            >
              <span>HANCURKAN SEKARANG! 💥</span>
            </button>
          </div>

        {:else if phase === 'destroying'}
          <!-- ── PHASE 2: DESTRUCTION ANIMATION SCENARIO ── -->
          <div class="destroying-stage {destructionMode}">
            
            {#if destructionMode === 'shredder'}
              <!-- SHREDDER MACHINE SCENARIO -->
              <div class="shredder-visual-wrap">
                <div class="shredder-top-body">
                  <div class="hazard-stripe-bar"></div>
                  <span class="shredder-label">HEAVY DUTY EXAM SHREDDER</span>
                  <div class="shredder-slot-mouth"></div>
                </div>

                <!-- Paper being pulled in -->
                <div class="paper-being-shredded">
                  <p class="shredded-text-preview">{ventingText}</p>
                </div>

                <!-- Shredded paper strips falling out below -->
                <div class="shred-strips-exit">
                  {#each Array(14) as _, i}
                    <div class="paper-strip strip-{i % 5}" style="animation-delay: {i * 0.15}s; left: {i * 7}%;"></div>
                  {/each}
                </div>

                <div class="shredder-bin-base">
                  <span class="bin-text">MENELAN & MENGHANCURKAN BEBAN...</span>
                </div>
              </div>

            {:else if destructionMode === 'fire'}
              <!-- CAMPFIRE BURNING SCENARIO -->
              <div class="fire-visual-wrap">
                <div class="fire-ember-particles">
                  {#each Array(16) as _, i}
                    <div class="ember" style="left: {Math.random() * 90}%; animation-delay: {Math.random() * 1.5}s;"></div>
                  {/each}
                </div>

                <!-- Paper burning & turning to ash -->
                <div class="paper-being-burned">
                  <div class="flame-overlay"></div>
                  <p class="burned-text-preview">{ventingText}</p>
                  <div class="char-edge"></div>
                </div>

                <!-- Bonfire Log Base -->
                <div class="bonfire-logs">
                  <div class="log log-1"></div>
                  <div class="log log-2"></div>
                  <div class="burning-core"></div>
                </div>

                <span class="fire-status-text">MEMBAKAR SEMUA STRES UJIAN...</span>
              </div>

            {:else if destructionMode === 'blackhole'}
              <!-- COSMIC BLACK HOLE GRAVITATIONAL VORTEX SCENARIO -->
              <div class="blackhole-visual-wrap">
                <div class="stars-bg"></div>
                
                <div class="blackhole-core">
                  <div class="accretion-disk"></div>
                  <div class="singularity"></div>
                </div>

                <!-- Paper spiraling into the vortex -->
                <div class="paper-being-vortexed">
                  <p class="vortex-text-preview">{ventingText}</p>
                </div>

                <span class="blackhole-status-text">DISEDOT KE DIMENSI LAIN...</span>
              </div>
            {/if}

          </div>

        {:else if phase === 'cleared'}
          <!-- ── PHASE 3: RELIEF & HEALING SCREEN ── -->
          <div class="cleared-screen">
            <div class="cleared-avatar-badge">
              <span class="sparkle-burst">✨</span>
              <img src="/avatar/bodies/FOX.svg" alt="Maggie" class="cleared-mascot-img" />
              <img src="/avatar/bodies/KODOK.svg" alt="Winduy" class="cleared-mascot-img kodok-img" />
            </div>

            <h3 class="cleared-title">lega bgtt! OFFICIALY FREE!</h3>
            <p class="cleared-quote">{currentQuote}</p>

            <div class="relief-metrics-card">
              <div class="relief-metric-item">
                <span class="m-val">100%</span>
                <span class="m-lbl">Beban Terhapus</span>
              </div>
              <div class="relief-metric-divider"></div>
              <div class="relief-metric-item">
                <span class="m-val">{destroyedCount}</span>
                <span class="m-lbl">Kertas Musnah</span>
              </div>
              <div class="relief-metric-divider"></div>
              <div class="relief-metric-item">
                <span class="m-val">Chill</span>
                <span class="m-lbl">Status Otak</span>
              </div>
            </div>

            <div class="cleared-actions">
              <button
                type="button"
                class="btn-cleared-again"
                onclick={resetToVentAgain}
              >
                <span>Hancurkan Beban Lainnya 📄</span>
              </button>

              <button
                type="button"
                class="btn-cleared-finish"
                onclick={handleClose}
              >
                <span>Sudah Cukup Lega, Lanjut Istirahat </span>
              </button>
            </div>
          </div>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── Overlay ── */
  .rage-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: rageFadeIn 0.25s ease-out;
  }

  /* ── Card ── */
  .rage-card {
    position: relative;
    width: 100%;
    max-width: 460px;
    background: #FFFFFF;
    border-radius: 28px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 92vh;
    transition: background 0.4s ease;
  }

  .rage-card.mode-fire {
    background: #18110D;
    color: #FFF7ED;
  }

  .rage-card.mode-blackhole {
    background: #090A15;
    color: #F8FAFC;
  }

  /* ── Header ── */
  .rage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1.5px solid #F1F5F9;
  }

  .mode-fire .rage-header,
  .mode-blackhole .rage-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rage-badge {
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: #DC2626;
    background: #FEE2E2;
    padding: 4px 10px;
    border-radius: 999px;
  }

  .destroyed-counter {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
  }

  .mode-fire .destroyed-counter,
  .mode-blackhole .destroyed-counter {
    color: #94A3B8;
  }

  .btn-close-rage {
    background: #F1F5F9;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: #64748B;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .btn-close-rage:hover {
    background: #E2E8F0;
    color: #0F172A;
  }

  /* ── Body ── */
  .rage-stage-body {
    padding: 18px 20px 22px;
    overflow-y: auto;
  }

  .input-screen {
    display: flex;
    flex-direction: column;
  }

  .rage-title {
    margin: 0 0 6px;
    font-size: 1.25rem;
    font-weight: 900;
    color: #0F172A;
    text-align: center;
  }

  .rage-subtitle {
    margin: 0 0 14px;
    font-size: 0.82rem;
    color: #64748B;
    text-align: center;
    line-height: 1.4;
  }

  /* ── Virtual Exam Paper ── */
  .exam-paper-container {
    background: #FFFDF9;
    border: 2px solid #E2E8F0;
    border-radius: 16px;
    padding: 14px 16px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
    position: relative;
    background-image: repeating-linear-gradient(
      transparent,
      transparent 26px,
      #E2E8F0 27px
    );
  }

  .exam-paper-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #CBD5E1;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }

  .exam-header-col {
    display: flex;
    flex-direction: column;
  }

  .exam-meta-label {
    font-size: 0.55rem;
    font-weight: 800;
    color: #94A3B8;
    letter-spacing: 0.05em;
  }

  .exam-meta-val {
    font-size: 0.55rem;
    font-weight: 800;
    color: #1E293B;
  }

  .exam-stamp-red {
    border: 2px solid #DC2626;
    color: #DC2626;
    font-weight: 900;
    font-size: 0.60rem;
    padding: 3px 8px;
    border-radius: 6px;
    transform: rotate(-10deg);
    letter-spacing: 0.06em;
  }

  .exam-textarea {
    width: 100%;
    background: transparent;
    border: none;
    resize: none;
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 27px;
    color: #334155;
    outline: none;
  }

  .paper-footer-line {
    margin-top: 6px;
    text-align: right;
  }

  .exam-rule-note {
    font-size: 0.65rem;
    color: #94A3B8;
    font-style: italic;
  }

  /* ── Preset Chips ── */
  .chips-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 12px 0 16px;
  }

  .chips-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748B;
  }

  .vent-chip {
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    color: #475569;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .vent-chip:hover {
    background: #E2E8F0;
    color: #0F172A;
    transform: translateY(-1px);
  }

  /* ── Destruction Methods ── */
  .methods-selection {
    display: flex;
    flex-direction: column;
    margin-bottom: 18px;
  }

  .methods-title {
    font-size: 0.8rem;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 8px;
  }

  .methods-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .method-btn {
    background: #F8FAFC;
    border: 2px solid #E2E8F0;
    border-radius: 14px;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .method-btn:hover {
    border-color: #CBD5E1;
    transform: translateY(-2px);
  }

  .method-btn.is-active {
    border-color: #EF4444;
    background: #FEF2F2;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }

  .method-icon {
    font-size: 1.4rem;
    margin-bottom: 4px;
  }

  .method-name {
    font-size: 0.75rem;
    font-weight: 800;
    color: #0F172A;
  }

  .method-desc {
    font-size: 0.62rem;
    color: #64748B;
    margin-top: 2px;
    line-height: 1.2;
  }

  /* ── CTA Trigger Button ── */
  .btn-trigger-destroy {
    width: 100%;
    padding: 14px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
    color: #FFFFFF;
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
    transition: all 0.2s ease;
  }

  .btn-trigger-destroy:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(220, 38, 38, 0.5);
  }

  .btn-trigger-destroy:active {
    transform: translateY(1px);
  }

  /* ── PHASE 2: DESTRUCTION ANIMATION ── */
  .destroying-stage {
    min-height: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border-radius: 20px;
  }

  /* 1. Shredder Visuals */
  .shredder-visual-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .shredder-top-body {
    width: 90%;
    background: #334155;
    border-radius: 16px 16px 0 0;
    padding: 12px 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    z-index: 5;
  }

  .hazard-stripe-bar {
    width: 100%;
    height: 10px;
    background: repeating-linear-gradient(
      -45deg,
      #F59E0B,
      #F59E0B 10px,
      #1E293B 10px,
      #1E293B 20px
    );
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .shredder-label {
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #F8FAFC;
    margin-bottom: 8px;
  }

  .shredder-slot-mouth {
    width: 82%;
    height: 12px;
    background: #0F172A;
    border: 2px solid #475569;
    border-radius: 4px;
  }

  .paper-being-shredded {
    width: 76%;
    background: #FFFDF9;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 10px;
    font-size: 0.78rem;
    color: #334155;
    animation: paperPullDown 2.7s ease-in forwards;
    z-index: 2;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  @keyframes paperPullDown {
    0% { transform: translateY(-40px); opacity: 1; }
    50% { transform: translateY(30px); }
    100% { transform: translateY(180px); opacity: 0; }
  }

  .shred-strips-exit {
    position: absolute;
    top: 150px;
    width: 76%;
    height: 120px;
    z-index: 3;
    pointer-events: none;
  }

  .paper-strip {
    position: absolute;
    width: 10px;
    height: 38px;
    background: #FFFDF9;
    border: 1px solid #CBD5E1;
    animation: stripFall 1s ease-out infinite;
    opacity: 0;
  }

  @keyframes stripFall {
    0% { transform: translateY(0) rotate(0); opacity: 1; }
    100% { transform: translateY(90px) rotate(45deg); opacity: 0; }
  }

  .shredder-bin-base {
    width: 90%;
    height: 90px;
    background: #1E293B;
    border-radius: 0 0 16px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }

  .bin-text {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #FBBF24;
    animation: pulseText 0.5s ease-in-out infinite alternate;
  }

  /* 2. Fire Visuals */
  .fire-visual-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 30px 0;
  }

  .fire-ember-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .ember {
    position: absolute;
    bottom: 40px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #F97316;
    box-shadow: 0 0 10px #F97316, 0 0 20px #EF4444;
    animation: emberRise 1.6s ease-out infinite;
  }

  @keyframes emberRise {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-160px) scale(0.2); opacity: 0; }
  }

  .paper-being-burned {
    width: 78%;
    background: #FFFDF9;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(249, 115, 22, 0.4);
    animation: paperBurnAsh 2.7s ease-in forwards;
  }

  @keyframes paperBurnAsh {
    0% {
      filter: brightness(1);
      transform: scale(1);
    }
    40% {
      filter: brightness(1.4) sepia(1) hue-rotate(-20deg);
    }
    80% {
      filter: brightness(0.4) contrast(2);
      transform: scale(0.9) translateY(10px);
    }
    100% {
      filter: brightness(0) blur(4px);
      transform: scale(0.6) translateY(20px);
      opacity: 0;
    }
  }

  .flame-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(239, 68, 68, 0.85) 0%,
      rgba(249, 115, 22, 0.6) 40%,
      rgba(251, 191, 36, 0.3) 70%,
      transparent 100%
    );
    animation: flameFlicker 0.2s ease-in-out infinite alternate;
  }

  @keyframes flameFlicker {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }

  .bonfire-logs {
    position: relative;
    width: 140px;
    height: 40px;
    margin-top: 10px;
  }

  .log {
    position: absolute;
    width: 120px;
    height: 18px;
    background: #78350F;
    border-radius: 10px;
  }

  .log-1 { transform: rotate(-15deg); }
  .log-2 { transform: rotate(15deg); right: 0; }

  .burning-core {
    position: absolute;
    top: -15px;
    left: 45px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: radial-gradient(circle, #FBBF24 0%, #EA580C 60%, transparent 100%);
    filter: blur(4px);
    animation: corePulse 0.3s ease-in-out infinite alternate;
  }

  @keyframes corePulse {
    from { transform: scale(0.9); }
    to { transform: scale(1.2); }
  }

  .fire-status-text {
    font-size: 0.78rem;
    font-weight: 800;
    color: #F97316;
    margin-top: 14px;
    letter-spacing: 0.05em;
  }

  /* 3. Black Hole Visuals */
  .blackhole-visual-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 30px 0;
  }

  .stars-bg {
    position: absolute;
    inset: 0;
    background-image: 
      radial-gradient(circle at 10% 20%, #FFFFFF 1px, transparent 1px),
      radial-gradient(circle at 80% 80%, #FFFFFF 1px, transparent 1px),
      radial-gradient(circle at 40% 70%, #A855F7 1.5px, transparent 1.5px),
      radial-gradient(circle at 70% 30%, #38BDF8 1.5px, transparent 1.5px);
    background-size: 80px 80px;
    opacity: 0.6;
  }

  .blackhole-core {
    position: relative;
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .accretion-disk {
    position: absolute;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #8B5CF6,
      #06B6D4,
      #EC4899,
      #8B5CF6
    );
    filter: blur(10px);
    animation: accretionSpin 2s linear infinite;
  }

  @keyframes accretionSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .singularity {
    position: relative;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: #000000;
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.8), 0 0 50px rgba(6, 182, 212, 0.5);
    z-index: 2;
  }

  .paper-being-vortexed {
    position: absolute;
    width: 65%;
    background: #FFFDF9;
    border-radius: 6px;
    padding: 10px;
    font-size: 0.72rem;
    color: #1E293B;
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    animation: vortexSwirl 2.7s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  @keyframes vortexSwirl {
    0% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
    60% {
      transform: scale(0.5) rotate(360deg) translateY(-20px);
      opacity: 0.8;
    }
    100% {
      transform: scale(0) rotate(1080deg);
      opacity: 0;
    }
  }

  .blackhole-status-text {
    font-size: 0.78rem;
    font-weight: 800;
    color: #A855F7;
    margin-top: 14px;
    letter-spacing: 0.05em;
  }

  /* ── PHASE 3: CLEARED & HEALING ── */
  .cleared-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 10px 4px;
    animation: ragePopUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .cleared-avatar-badge {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: -10px;
    margin-bottom: 12px;
  }

  .cleared-mascot-img {
    width: 64px;
    height: 80px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
  }

  .kodok-img {
    margin-left: -14px;
  }

  .sparkle-burst {
    position: absolute;
    top: -10px;
    font-size: 1.6rem;
    animation: pulseText 0.6s ease-in-out infinite alternate;
  }

  .cleared-title {
    margin: 0 0 8px;
    font-size: 1.3rem;
    font-weight: 900;
    color: #0F172A;
  }

  .cleared-quote {
    margin: 0 0 18px;
    font-size: 0.86rem;
    color: #475569;
    line-height: 1.5;
    max-width: 360px;
  }

  .relief-metrics-card {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 18px;
    padding: 12px 8px;
    margin-bottom: 20px;
  }

  .relief-metric-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .m-val {
    font-size: 1.05rem;
    font-weight: 900;
    color: #10B981;
  }

  .m-lbl {
    font-size: 0.68rem;
    font-weight: 700;
    color: #64748B;
    margin-top: 2px;
  }

  .relief-metric-divider {
    width: 1px;
    height: 28px;
    background: #CBD5E1;
  }

  .cleared-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .btn-cleared-again {
    padding: 12px;
    border-radius: 14px;
    border: 1.5px solid #CBD5E1;
    background: #FFFFFF;
    color: #1E293B;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .btn-cleared-again:hover {
    background: #F1F5F9;
    border-color: #94A3B8;
  }

  .btn-cleared-finish {
    padding: 13px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: #FFFFFF;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
    transition: all 0.18s ease;
  }

  .btn-cleared-finish:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(16, 185, 129, 0.45);
  }

  @keyframes rageFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes ragePopUp {
    from { transform: scale(0.9) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  @keyframes pulseText {
    from { transform: scale(0.95); opacity: 0.8; }
    to { transform: scale(1.05); opacity: 1; }
  }
</style>
