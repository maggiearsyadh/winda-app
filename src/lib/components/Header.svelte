<script>
  import { couple } from '$lib/data/content.js';
  import { togglePlayPause, subscribeAudio } from '$lib/audioManager.js';

  let { activeTab = 'homepage' } = $props();

  let isPlaying = $state(false);
  let currentTitle = $state('');
  let hasTrack = $state(false);

  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
      currentTitle = state.currentTitle || '';
      hasTrack = !!state.currentMoodId;
    });
  });
</script>

<header class="app-header">
  <!-- Top Profile Row -->
  <div class="user-row">
    <div class="user-profile">
      <!-- Cartoon girl avatar -->
      <div class="avatar-circle">
        <svg viewBox="0 0 40 40" width="40" height="40" class="avatar-svg">
          <!-- Background circle teal -->
          <circle cx="20" cy="20" r="19" fill="#FEA0A0" />
          <!-- Shirt -->
          <path d="M12 38 C12 30, 28 30, 28 38" fill="#FFFFFF" stroke="#111" stroke-width="1.2" />
          <path d="M17 30 L20 34 L23 30" fill="none" stroke="#111" stroke-width="1.2" />
          <!-- Hair Back -->
          <path d="M11 18 C10 28, 9 34, 13 36 C14 30, 14 26, 14 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
          <path d="M29 18 C30 28, 31 34, 27 36 C26 30, 26 26, 26 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
          <!-- Face -->
          <ellipse cx="20" cy="20" rx="6.5" ry="7.5" fill="#FFE5D1" stroke="#111" stroke-width="1.2" />
          <!-- Hair Front -->
          <path d="M13 18 C14 13, 26 13, 27 18 C25 15, 23 16, 20 16 C17 16, 15 15, 13 18 Z" fill="#5A2E17" stroke="#111" stroke-width="1.2" />
          <!-- Eyes -->
          <circle cx="17.8" cy="19.5" r="0.9" fill="#111" />
          <circle cx="22.2" cy="19.5" r="0.9" fill="#111" />
          <!-- Smile -->
          <path d="M18.8 23 C19.5 24, 20.5 24, 21.2 23" fill="none" stroke="#111" stroke-width="1" stroke-linecap="round" />
        </svg>
      </div>

      <span class="greeting-text">
        Hiiii, {couple.her || 'Winda'}
      </span>
    </div>

    <!-- Right: Mini Music Disc / Controller -->
    {#if hasTrack}
      <button
        type="button"
        class="header-music-disc"
        onclick={togglePlayPause}
        aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
        title={isPlaying ? `Memutar lagu ${currentTitle}` : 'Musik dijeda'}
      >
        <span class="disc-vinyl" class:is-spinning={isPlaying}>
          💿
        </span>
        {#if isPlaying}
          <span class="music-wave-dot"></span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Navigation Row -->
  <div class="nav-row">
    <a href="#/period" class="nav-pill period-pill" aria-label="Buka Pelacak Siklus Haid">
      <span> Siklus Haid</span>
    </a>
  </div>
</header>

<style>
  .app-header {
    padding: max(var(--sp-4), var(--sat)) var(--sp-4) var(--sp-2);
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .user-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .avatar-circle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .greeting-text {
    font-size: 0.8rem;
    font-weight: var(--fw-semi);
    color: #111827;
    letter-spacing: -0.01em;
  }

  /* ── Header Music Disc Player ── */
  .header-music-disc {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .header-music-disc:hover {
    transform: scale(1.08);
  }

  .header-music-disc:active {
    transform: scale(0.95);
  }

  .disc-vinyl {
    font-size: 1.15rem;
    display: inline-block;
    transition: transform 0.2s ease;
  }

  .disc-vinyl.is-spinning {
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .music-wave-dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    border: 1.5px solid #FFFFFF;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }

  /* ── Nav Row ── */
  .nav-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .nav-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #FFFFFF;
    color: #334155;
    font-weight: 700;
    font-size: 0.78rem;
    padding: 6px 14px;
    height: 36px;
    border-radius: 999px;
    border: 1.5px solid #E2E8F0;
    text-decoration: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-pill:active {
    transform: scale(0.96);
  }

  .nav-pill.period-pill {
    background: #FFF1F2;
    color: #BE123C;
    border-color: #FECDD3;
  }

  .nav-pill.period-pill:hover {
    background: #FFE4E6;
  }

  .new-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6D9C3F;
    border: 1px solid #FFFFFF;
  }
</style>
