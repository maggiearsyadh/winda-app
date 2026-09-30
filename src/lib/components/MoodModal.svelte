<script>
  import { moodSection, couple } from '$lib/data/content.js';
  import { playMoodSong, togglePlayPause, subscribeAudio } from '$lib/audioManager.js';
  import DrawingCanvas from '$lib/components/DrawingCanvas.svelte';
  import AngerTutorial from '$lib/components/AngerTutorial.svelte';

  let { isOpen = $bindable(false), onClose } = $props();

  let selectedMood = $state(null);
  let step = $state('PICK'); // 'PICK' | 'RESULT'
  let isPlaying = $state(false);

  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
    });
  });

  function handleSelect(mood) {
    selectedMood = mood;
    step = 'RESULT';
    if (mood.audioSrc) {
      playMoodSong(mood.id, mood.audioSrc, mood.title);
    }
  }

  function handleReset() {
    selectedMood = null;
    step = 'PICK';
  }

  function handleClose() {
    isOpen = false;
    step = 'PICK';
    if (onClose) onClose();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="How is your feeling modal"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="modal-box" class:is-draw-step={step === 'DRAW' || step === 'ANGER_TUTORIAL'}>
      <!-- Close button (✕) -->
      <button
        type="button"
        class="modal-close-btn"
        aria-label="Tutup modal"
        onclick={handleClose}
      >
        ✕
      </button>

      {#if step === 'PICK'}
        <!-- STEP 1: PICK MOOD -->
        <header class="modal-header">
          <div class="modal-badge" aria-hidden="true">
            <span>🐸 Daily Froggie Mood</span>
          </div>
          <h2 class="modal-title">HOW’S YOUR FEELING?</h2>
          <p class="modal-sub">
            Hi {couple.her || 'Winda'}! Pilih kodok yang paling mewakili perasaan kamu today:
          </p>
        </header>

        <div class="mood-pills-container" role="radiogroup" aria-label="Pilih mood kodok">
          <div class="mood-pills-row top-row">
            {#each moodSection.moods.slice(0, 3) as mood}
              <button
                type="button"
                class="mood-pill-btn {mood.id === 'happy' ? 'is-active-style' : ''}"
                onclick={() => handleSelect(mood)}
                aria-label="Pilih mood {mood.title}"
                style="--active-glow: {mood.activeColor};"
              >
                <div class="pill-avatar-wrap">
                  <img
                    src={mood.src}
                    alt={mood.title}
                    width="44"
                    height="44"
                    loading="lazy"
                    decoding="async"
                    class="pill-avatar-img"
                  />
                </div>
                <span class="pill-label">{mood.title}</span>
              </button>
            {/each}
          </div>

          <div class="mood-pills-row bottom-row">
            {#each moodSection.moods.slice(3, 4) as mood}
              <button
                type="button"
                class="mood-pill-btn"
                onclick={() => handleSelect(mood)}
                aria-label="Pilih mood {mood.title}"
                style="--active-glow: {mood.activeColor};"
              >
                <div class="pill-avatar-wrap">
                  <img
                    src={mood.src}
                    alt={mood.title}
                    width="44"
                    height="44"
                    loading="lazy"
                    decoding="async"
                    class="pill-avatar-img"
                  />
                </div>
                <span class="pill-label">{mood.title}</span>
              </button>
            {/each}
          </div>
        </div>

      {:else if step === 'RESULT' && selectedMood}
        <!-- STEP 2: REVEAL REACTION & MESSAGE -->
        <div class="result-view">
          <div class="result-badge" aria-hidden="true" style="color: {selectedMood.activeColor};">
            <span>{selectedMood.tag}</span>
          </div>

          <div class="result-frog-circle" style="border-color: {selectedMood.activeColor};">
            <img
              src={selectedMood.src}
              alt={selectedMood.title}
              width="140"
              height="140"
              class="result-big-frog"
            />
          </div>

          <h3 class="result-title">
            Hari ini kamu merasa: <span style="color: {selectedMood.activeColor};">{selectedMood.title}</span>!
          </h3>

          <div class="result-bubble">
            <p class="result-quote">
              "{selectedMood.message}"
            </p>
          </div>

          <!-- Music Player Pill Badge -->
          {#if selectedMood.audioSrc}
            <button
              type="button"
              class="mood-music-pill"
              onclick={togglePlayPause}
              aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
            >
              <span class="music-disc-icon" class:is-playing={isPlaying}>
                🎵
              </span>
              <span class="music-info-text">
                {isPlaying ? `Lagu ${selectedMood.title} sedang berputar` : 'Musik Dijeda (Klik untuk putar)'}
              </span>
              <span class="music-play-pause-btn">
                {isPlaying ? '⏸' : '▶'}
              </span>
            </button>
          {/if}

          <div class="result-buttons">
            <div class="result-actions-row">
              <button
                type="button"
                class="continue-btn"
                onclick={handleClose}
              >
                Tutup & Beranda
              </button>

              <button
                type="button"
                class="next-draw-btn"
                onclick={() => {
                  if (selectedMood?.id === 'anger') {
                    step = 'ANGER_TUTORIAL';
                  } else {
                    step = 'DRAW';
                  }
                }}
                aria-label="Lanjut ke langkah berikutnya"
                style="--mood-btn-glow: {selectedMood.activeColor || '#BA4965'};"
              >
                <span>Next</span>
                <svg class="next-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>

            <button
              type="button"
              class="change-mood-btn"
              onclick={handleReset}
            >
              ↺ Pilih mood lain
            </button>
          </div>
        </div>

      {:else if step === 'ANGER_TUTORIAL' && selectedMood}
        <!-- SPECIAL STEP FOR ANGER: TUTORIAL BERHENTI MARAH -->
        <AngerTutorial
          mood={selectedMood}
          onNext={() => (step = 'DRAW')}
          onBack={() => (step = 'RESULT')}
        />

      {:else if step === 'DRAW' && selectedMood}
        <!-- STEP: TOUCH SCREEN DRAWING CANVAS -->
        <DrawingCanvas
          mood={selectedMood}
          onBack={() => {
            if (selectedMood?.id === 'anger') {
              step = 'ANGER_TUTORIAL';
            } else {
              step = 'RESULT';
            }
          }}
          onClose={handleClose}
        />
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(var(--sp-4), var(--sat)) var(--sp-4) max(var(--sp-4), var(--sab));
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-box {
    position: relative;
    width: 100%;
    max-width: 440px;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    overflow-x: hidden;
    background: #FFFFFF;
    border-radius: 28px;
    padding: var(--sp-6) var(--sp-4) var(--sp-6);
    box-shadow: 0 24px 60px rgba(0, 30, 80, 0.25);
    text-align: center;
    animation: pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    scrollbar-width: thin;
    box-sizing: border-box;
  }

  .modal-box.is-draw-step {
    padding: 20px 14px 18px;
  }

  .modal-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #4b5563;
    font-size: 1.15rem;
    font-weight: var(--fw-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, transform 0.15s ease;
    z-index: 10;
  }

  .modal-close-btn:hover {
    background: #E2E8F0;
    transform: scale(1.08);
  }

  .modal-header {
    margin-bottom: var(--sp-6);
  }

  .modal-badge {
    display: inline-block;
    background: var(--clr-primary-light);
    padding: 4px 14px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-xs);
    font-weight: var(--fw-extra);
    color: var(--clr-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--sp-2);
  }

  .modal-title {
    font-family: var(--font-heading);
    font-size: clamp(1.8rem, 6vw, 2.3rem);
    color: #111827;
    letter-spacing: 0.03em;
    line-height: 1.1;
    margin-bottom: var(--sp-2);
    font-weight: 900;
  }

  .modal-sub {
    font-size: var(--fs-sm);
    color: #4b5563;
    font-weight: var(--fw-medium);
    line-height: 1.45;
    max-width: 320px;
    margin: 0 auto;
  }

  /* ── Mood Pills Layout matching reference ── */
  .mood-pills-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: var(--sp-2) 0 var(--sp-4);
    width: 100%;
  }

  .mood-pills-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .top-row {
    flex-wrap: wrap;
  }

  .bottom-row {
    justify-content: center;
  }

  .mood-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #A482F8;
    color: #FFFFFF;
    border-radius: 9999px;
    padding: 5px 18px 5px 5px;
    border: none;
    box-shadow: 0 4px 12px rgba(164, 130, 248, 0.28);
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, background 0.2s ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    flex: 0 1 auto;
    min-width: 105px;
    justify-content: flex-start;
  }

  /* Happy pill matches reference highlighted state */
  .mood-pill-btn.is-active-style {
    background: #DA9B06;
    box-shadow: 0 8px 22px rgba(218, 155, 6, 0.45);
    transform: translateY(-2px);
  }

  .mood-pill-btn:hover {
    transform: translateY(-3px) scale(1.04);
    box-shadow: 0 8px 24px var(--active-glow, rgba(164, 130, 248, 0.5));
  }

  .mood-pill-btn:active {
    transform: translateY(1px) scale(0.98);
  }

  .pill-avatar-wrap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: transparent;
  }

  .pill-avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    transition: transform 0.2s ease;
  }

  .mood-pill-btn:hover .pill-avatar-img {
    transform: scale(1.08);
  }

  .pill-label {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 0.95rem;
    color: #FFFFFF;
    letter-spacing: 0.02em;
    padding-right: 4px;
  }

  /* ── STEP 2 ── */
  .result-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: fade-in 0.3s ease-out both;
  }

  .result-badge {
    display: inline-block;
    background: var(--clr-primary-light);
    padding: 4px 16px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-xs);
    font-weight: var(--fw-extra);
    color: var(--clr-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--sp-3);
  }

  .result-frog-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: #ffffff;
    border: 3px solid var(--clr-primary);
    box-shadow: 0 8px 24px rgba(112, 82, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--sp-3);
  }

  .result-big-frog {
    max-width: 82%;
    max-height: 82%;
    object-fit: contain;
  }

  .result-title {
    font-size: 1.15rem;
    font-weight: var(--fw-bold);
    color: #111827;
    margin-bottom: var(--sp-3);
  }

  .result-title span {
    color: var(--clr-primary);
    font-weight: var(--fw-black);
  }

  .result-bubble {
    background: #F8F9FA;
    border: 1.5px solid #E2E8F0;
    border-radius: 18px;
    padding: var(--sp-4) var(--sp-5);
    margin-bottom: var(--sp-5);
    max-width: 360px;
  }

  .result-quote {
    font-size: var(--fs-sm);
    color: #374151;
    font-weight: var(--fw-medium);
    line-height: 1.6;
    font-style: italic;
  }

  .mood-music-pill {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: var(--radius-pill);
    padding: 6px 14px;
    font-size: 0.78rem;
    color: #475569;
    font-weight: var(--fw-bold);
    margin-bottom: var(--sp-4);
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    max-width: 320px;
    width: 100%;
  }

  .mood-music-pill:hover {
    background: #E2E8F0;
    transform: translateY(-1px);
  }

  .music-disc-icon {
    font-size: 1rem;
    display: inline-block;
    transition: transform 0.2s ease;
  }

  .music-disc-icon.is-playing {
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .music-info-text {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .music-play-pause-btn {
    font-size: 0.85rem;
    color: #0f172a;
    padding-left: 4px;
  }

  .result-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    width: 100%;
    max-width: 320px;
  }

  .result-actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .continue-btn {
    flex: 1;
    background-color: var(--clr-btn-black);
    color: #ffffff;
    font-weight: var(--fw-bold);
    font-size: 0.8rem;
    padding: 12px 14px;
    border-radius: var(--radius-pill);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    transition: transform 0.15s ease, filter 0.15s ease;
    min-height: 44px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
  }

  .continue-btn:hover {
    filter: brightness(1.2);
    transform: translateY(-2px);
  }

  .next-draw-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--mood-btn-glow, var(--clr-primary));
    color: #ffffff;
    font-weight: var(--fw-bold);
    font-size: 0.88rem;
    padding: 12px 16px;
    border-radius: var(--radius-pill);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
    min-height: 44px;
    white-space: nowrap;
  }

  .next-draw-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }

  .next-arrow-icon {
    transition: transform 0.2s ease;
  }

  .next-draw-btn:hover .next-arrow-icon {
    transform: translateX(3px);
  }

  .change-mood-btn {
    background: none;
    border: none;
    color: #6b7280;
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    padding: var(--sp-1);
    cursor: pointer;
    transition: color 0.15s ease;
    min-height: 40px;
  }

  .change-mood-btn:hover {
    color: var(--clr-primary);
  }
</style>
