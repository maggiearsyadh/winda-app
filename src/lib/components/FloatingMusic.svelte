<script>
  import { subscribeAudio, togglePlayPause, audioState } from '$lib/audioManager.js';
  import { moodSection } from '$lib/data/content.js';

  let isPlaying = $state(audioState.isPlaying);
  let currentMoodId = $state(audioState.currentMoodId);
  let currentTitle = $state(audioState.currentTitle);

  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
      currentMoodId = state.currentMoodId;
      currentTitle = state.currentTitle;
    });
  });

  let currentMood = $derived(
    currentMoodId ? moodSection.moods.find(m => m.id === currentMoodId) : null
  );

  function handleToggle() {
    togglePlayPause();
  }
</script>

{#if currentMoodId}
  <aside class="floating-music-wrap" aria-label="Floating Music Controller">
    <button
      type="button"
      class="floating-music-btn"
      class:is-playing={isPlaying}
      onclick={handleToggle}
      aria-label={isPlaying ? 'Jeda musik' : 'Putar musik'}
      style="--accent-glow: {currentMood?.activeColor || '#BA4965'};"
    >
      <!-- Vinyl Disc / Note Icon with Rotation -->
      <div class="vinyl-disc" class:spin={isPlaying}>
        <span class="disc-emoji">🎵</span>
      </div>

      <!-- Animated Sound Wave Bars when playing -->
      {#if isPlaying}
        <div class="sound-wave" aria-hidden="true">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
        </div>
      {/if}

      <!-- Song Label & Pause/Play Indicator -->
      <div class="music-label-wrap">
        <span class="status-indicator">
          {isPlaying ? 'Pause' : 'Play'}
        </span>
        <span class="music-title">
          {currentMood?.title || currentTitle || 'Music'}
        </span>
      </div>

      <!-- Play / Pause Icon Pill -->
      <div class="action-icon-pill">
        {#if isPlaying}
          <!-- Pause Bars Icon -->
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
          </svg>
        {:else}
          <!-- Play Triangle Icon -->
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        {/if}
      </div>
    </button>
  </aside>
{/if}

<style>
  .floating-music-wrap {
    position: fixed;
    bottom: max(20px, env(safe-area-inset-bottom, 20px));
    right: 18px;
    z-index: 300; /* Floats above modals (z-index 150/200) */
    animation: float-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes float-in {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .floating-music-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 4px 14px 4px 6px;
    border-radius: 999px;
    border: 1.5px solid rgba(255, 255, 255, 0.22);
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: #FFFFFF;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.2s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .floating-music-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35), 0 0 16px var(--accent-glow);
    background: rgba(15, 23, 42, 0.95);
  }

  .floating-music-btn:active {
    transform: scale(0.96);
  }

  /* ── Vinyl Disc ── */
  .vinyl-disc {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: radial-gradient(circle, #2d3748 30%, #1a202c 70%, #000000 100%);
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .disc-emoji {
    font-size: 0.85rem;
    line-height: 1;
  }

  .vinyl-disc.spin {
    animation: rotate-disc 3.5s linear infinite;
  }

  @keyframes rotate-disc {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Sound Wave Bars ── */
  .sound-wave {
    display: inline-flex;
    align-items: center;
    gap: 2.5px;
    height: 14px;
    margin-left: 2px;
  }

  .bar {
    width: 2.5px;
    height: 100%;
    background: var(--accent-glow, #38bdf8);
    border-radius: 2px;
    animation: wave-bar 1s ease-in-out infinite alternate;
  }

  .bar-1 { animation-delay: 0.1s; height: 60%; }
  .bar-2 { animation-delay: 0.3s; height: 100%; }
  .bar-3 { animation-delay: 0.2s; height: 75%; }

  @keyframes wave-bar {
    0% { transform: scaleY(0.3); }
    100% { transform: scaleY(1); }
  }

  /* ── Title & Status Wrap ── */
  .music-label-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
    min-width: 0;
    max-width: 90px;
  }

  .status-indicator {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent-glow, #93c5fd);
  }

  .music-title {
    font-size: 0.76rem;
    font-weight: 600;
    color: #FFFFFF;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* ── Action Icon Pill ── */
  .action-icon-pill {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 2px;
    flex-shrink: 0;
  }

  .floating-music-btn:hover .action-icon-pill {
    background: rgba(255, 255, 255, 0.28);
  }
</style>
