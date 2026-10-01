<script>
  import { subscribeAudio, togglePlayPause, audioState } from '$lib/audioManager.js';

  let { mood, onBack, onClose, onSwitchToDraw } = $props();

  let isMusicPlaying = $state(audioState.isPlaying);

  $effect(() => {
    return subscribeAudio(state => {
      isMusicPlaying = state.isPlaying;
    });
  });

  // 25 Bubbles (5x5 grid)
  const TOTAL_BUBBLES = 15;
  const SECRET_ICONS = [ '✨', '🌸', '🐸', '🦋', '🍭', '🧸', '💆‍♀️', '🍀', '🧁', '⭐', '☕', '🥐', '🍓', '🎀', '🧸', '🌼', '🍯', '☀️', '🍡', '🫂',];

  // Array of bubble objects
  let bubbles = $state(
    Array.from({ length: TOTAL_BUBBLES }, (_, i) => ({
      id: i,
      popped: false,
      icon: SECRET_ICONS[i % SECRET_ICONS.length]
    }))
  );

  let poppedCount = $derived(bubbles.filter(b => b.popped).length);
  let isAllPopped = $derived(poppedCount === TOTAL_BUBBLES);

  // Realistic synthesized pop sound via Web Audio API
  function playPopAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch variation: 450Hz - 680Hz ramping down rapidly like a real popping air bubble
      const freq = 460 + Math.random() * 220;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.07);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // Audio autoplay policy fallback
    }

    // Gentle tactile haptic vibration for mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(18);
      } catch (err) {}
    }
  }

  function handlePop(index) {
    if (bubbles[index].popped) return;
    bubbles[index].popped = true;
    playPopAudio();
  }

  function handleReset() {
    // Shuffled new hidden icons
    const shuffled = [...SECRET_ICONS].sort(() => Math.random() - 0.5);
    bubbles = Array.from({ length: TOTAL_BUBBLES }, (_, i) => ({
      id: i,
      popped: false,
      icon: shuffled[i % shuffled.length]
    }));
    playPopAudio();
  }
</script>

<div class="bubble-wrap-container">
  <!-- Header -->
  <header class="bubble-header">
    <div class="bubble-badge" style="--glow: {mood?.activeColor || '#BA4965'};">
      <span> Anti-Stress Bubble Wrap</span>
    </div>
    <!-- <h3 class="bubble-title">
      Pecahin Semua Bubble
    </h3> -->
    <p class="bubble-sub">
      Pop semua bubble nya
    </p>
  </header>

  <!-- Status / Counter Row -->
  <div class="counter-bar">
    <div class="counter-pill">
      <span class="counter-label">Pecah:</span>
      <span class="counter-val" style="color: {mood?.activeColor || '#BA4965'};">
        {poppedCount} / {TOTAL_BUBBLES}
      </span>
    </div>

    <!-- Quick Music Pause/Play toggle -->
    <button
      type="button"
      class="bubble-music-btn"
      class:is-active={isMusicPlaying}
      onclick={togglePlayPause}
      aria-label={isMusicPlaying ? 'Jeda musik latar' : 'Putar musik latar'}
    >
      <span class="bubble-music-icon">{isMusicPlaying ? '' : ''}</span>
      <span>{isMusicPlaying ? 'Musik: On' : 'Musik: Off'}</span>
    </button>

    <button
      type="button"
      class="refill-btn"
      onclick={handleReset}
      aria-label="Ambil bubble wrap baru"
    >
      <span>↻ Ganti Baru</span>
    </button>
  </div>

  <!-- Bubble Wrap Sheet Card -->
  <div
    class="bubble-sheet-card"
    style="--mood-theme: {mood?.activeColor || '#6D9C3F'};"
  >
    <!-- Background plastic shine texture -->
    <div class="sheet-highlight-grid"></div>

    <div class="bubbles-grid" role="group" aria-label="Sheet bubble wrap interaktif">
      {#each bubbles as bubble, index}
        <button
          type="button"
          class="bubble-item"
          class:is-popped={bubble.popped}
          onclick={() => handlePop(index)}
          aria-label={bubble.popped ? `Gelembung ${index + 1} sudah pecah` : `Pecahkan gelembung ${index + 1}`}
        >
          {#if bubble.popped}
            <span class="popped-icon" aria-hidden="true">{bubble.icon}</span>
            <span class="pop-crinkle" aria-hidden="true"></span>
          {:else}
            <!-- 3D Specular Shiny Bubble Light -->
            <span class="bubble-shine" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Celebration Banner when all popped -->
    {#if isAllPopped}
      <div class="celebrate-banner">
        <span class="celebrate-emoji">🎉</span>
        <div class="celebrate-text">
          <p>Semoga beban pikiran makin enteng & rileks hehehe</p>
        </div>
        <button
          type="button"
          class="celebrate-again-btn"
          onclick={handleReset}
          style="background-color: {mood?.activeColor || '#BA4965'};"
        >
          Play Again 
        </button>
      </div>
    {/if}
  </div>

  <!-- Switcher to Drawing (if she ever feels like doodling) -->
  {#if onSwitchToDraw}
    <div class="draw-switch-row">
      <button
        type="button"
        class="switch-draw-link"
        onclick={onSwitchToDraw}
      >
        <span> Atau mau coba coret-coret kanvas? Klik di sini</span>
      </button>
    </div>
  {/if}

  <!-- Footer Actions -->
  <footer class="bubble-footer-actions">
    <button
      type="button"
      class="action-back-btn"
      onclick={onBack}
    >
      ← Kembali
    </button>
    <button
      type="button"
      class="action-done-btn"
      onclick={onClose}
      style="--btn-color: {mood?.activeColor || '#BA4965'};"
    >
      Selesai & Beranda
    </button>
  </footer>
</div>

<style>
  .bubble-wrap-container {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    animation: fade-in 0.3s ease-out both;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Header ── */
  .bubble-header {
    text-align: center;
  }

  .bubble-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(186, 73, 101, 0.1);
    color: #1e293b;
    font-size: 0.76rem;
    font-weight: 700;
    margin-bottom: var(--sp-2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }


  .bubble-sub {
    font-family: var(--font-sans);
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.35;
    margin: 0;
  }

  /* ── Counter Bar ── */
  .counter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--sp-1);
  }

  .counter-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.84rem;
    font-weight: 700;
  }

  .counter-label {
    color: #64748b;
  }

  .counter-val {
    font-variant-numeric: tabular-nums;
  }

  .bubble-music-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-family: var(--font-sans);
    font-size: 0.74rem;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 999px;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, transform 0.1s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .bubble-music-btn.is-active {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.3);
    color: #2563eb;
  }

  .bubble-music-btn:hover {
    background: #e2e8f0;
  }

  .bubble-music-btn:active {
    transform: scale(0.95);
  }

  .bubble-music-icon {
    font-size: 0.85rem;
  }

  .refill-btn {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 8px;
    transition: color 0.15s, background-color 0.15s;
  }

  .refill-btn:hover {
    color: #0f172a;
    background-color: #f1f5f9;
  }

  /* ── Bubble Sheet Card (Realistic Translucent Look) ── */
  .bubble-sheet-card {
    position: relative;
    background: linear-gradient(135deg, #eef5ff 0%, #e2ecfa 100%);
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    padding: 16px 12px;
    box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.9), 0 8px 24px rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }

  .bubbles-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    justify-items: center;
    align-items: center;
  }

  /* ── Individual Bubble (3D Glassmorphism) ── */
  .bubble-item {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    outline: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    
    /* 3D Round inflated bubble gradient */
    background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.95) 0%, rgba(200, 225, 255, 0.6) 45%, rgba(135, 180, 240, 0.7) 100%);
    box-shadow: 
      0 4px 10px rgba(70, 120, 200, 0.25),
      inset 0 -3px 6px rgba(0, 50, 150, 0.2),
      inset 0 3px 6px rgba(255, 255, 255, 0.9);
  }

  .bubble-item:hover:not(.is-popped) {
    transform: scale(1.06);
    box-shadow: 
      0 6px 14px rgba(70, 120, 200, 0.35),
      inset 0 -3px 6px rgba(0, 50, 150, 0.25),
      inset 0 3px 6px rgba(255, 255, 255, 0.95);
  }

  .bubble-item:active:not(.is-popped) {
    transform: scale(0.92);
  }

  /* Glass specular shine spot */
  .bubble-shine {
    position: absolute;
    top: 6px;
    left: 8px;
    width: 14px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    transform: rotate(-30deg);
    pointer-events: none;
  }

  /* ── Popped Bubble State ── */
  .bubble-item.is-popped {
    background: #dbe7f5;
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.12),
      inset 0 -1px 2px rgba(255, 255, 255, 0.6);
    transform: scale(0.92);
    cursor: default;
    animation: pop-bounce 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28) both;
  }

  @keyframes pop-bounce {
    0% { transform: scale(1.08); }
    50% { transform: scale(0.85); }
    100% { transform: scale(0.92); }
  }

  .popped-icon {
    font-size: 1.15rem;
    animation: icon-appear 0.25s ease-out both;
  }

  @keyframes icon-appear {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .pop-crinkle {
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 1.5px dashed rgba(100, 140, 190, 0.35);
    pointer-events: none;
  }

  /* ── Celebration Overlay Card ── */
  .celebrate-banner {
    position: absolute;
    inset: 12px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px;
    gap: 8px;
    animation: celebrate-pop 0.35s cubic-bezier(0.2, 1.2, 0.3, 1) both;
    z-index: 10;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  @keyframes celebrate-pop {
    from {
      opacity: 0;
      transform: scale(0.85);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .celebrate-emoji {
    font-size: 2.2rem;
  }


  .celebrate-text p {
    font-family: var(--font-sans);
    font-size: 0.82rem;
    color: #64748b;
    margin: 0;
  }

  .celebrate-again-btn {
    border: none;
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.86rem;
    font-weight: 700;
    padding: 8px 20px;
    border-radius: 999px;
    cursor: pointer;
    margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.15s;
  }

  .celebrate-again-btn:active {
    transform: scale(0.95);
  }

  /* ── Switcher Link to Canvas ── */
  .draw-switch-row {
    display: flex;
    justify-content: center;
    margin-top: -4px;
  }

  .switch-draw-link {
    border: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 0.78rem;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 4px 8px;
    transition: color 0.15s;
  }

  .switch-draw-link:hover {
    color: #0f172a;
  }

  /* ── Footer Actions ── */
  .bubble-footer-actions {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: var(--sp-3);
    margin-top: var(--sp-1);
  }

  .action-back-btn {
    padding: 12px 14px;
    border-radius: 14px;
    border: 1.5px solid #e2e8f0;
    background: #FFFFFF;
    color: #475569;
    font-family: var(--font-sans);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .action-back-btn:hover {
    background-color: #f8fafc;
  }

  .action-done-btn {
    padding: 12px 16px;
    border-radius: 14px;
    border: none;
    background-color: var(--btn-color, #BA4965);
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    transition: transform 0.15s, opacity 0.15s;
  }

  .action-done-btn:active {
    transform: scale(0.97);
  }
</style>
