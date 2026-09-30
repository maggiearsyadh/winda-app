<script>
  import { moodSection } from '$lib/data/content.js';
  import {
    playMoodSong,
    togglePlayPause,
    subscribeAudio,
    audioState
  } from '$lib/audioManager.js';

  let currentMoodId = $state(audioState.currentMoodId || null);
  let isPlaying = $state(audioState.isPlaying);

  // Extension fallback (.png, .jpg, .jpeg, .webp)
  const candidateExts = ['.png', '.jpg', '.jpeg', '.webp'];
  let extIndex = $state(0);
  let coverFailed = $state(false);

  // Subscribe to global audio state
  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
      if (state.currentMoodId) {
        currentMoodId = state.currentMoodId;
      }
    });
  });

  // Current mood object (null until user selects a mood)
  let currentMood = $derived(
    currentMoodId ? moodSection.moods.find(m => m.id === currentMoodId) : null
  );

  // Compute resolved cover source
  let resolvedCover = $derived.by(() => {
    if (!currentMood?.cover) return null;
    const basePath = currentMood.cover.replace(/\.[^/.]+$/, '');
    if (extIndex === 0) return currentMood.cover;
    return `${basePath}${candidateExts[extIndex - 1]}`;
  });

  function handleImageError() {
    if (extIndex < candidateExts.length) {
      extIndex++;
    } else {
      coverFailed = true;
    }
  }

  $effect(() => {
    // Reset attempt whenever mood changes
    if (currentMoodId) {
      extIndex = 0;
      coverFailed = false;
    }
  });

  function handlePlayPause() {
    if (!currentMood) return;
    if (!audioState.currentMoodId) {
      // First time play
      playMoodSong(currentMood.id, currentMood.audioSrc, currentMood.songTitle || currentMood.title);
    } else {
      togglePlayPause();
    }
  }

  function handleNext() {
    if (!currentMood) return;
    const list = moodSection.moods;
    const idx = list.findIndex(m => m.id === currentMoodId);
    const nextIdx = (idx + 1) % list.length;
    const nextMood = list[nextIdx];
    playMoodSong(nextMood.id, nextMood.audioSrc, nextMood.songTitle || nextMood.title);
  }

  function handlePrev() {
    if (!currentMood) return;
    const list = moodSection.moods;
    const idx = list.findIndex(m => m.id === currentMoodId);
    const prevIdx = (idx - 1 + list.length) % list.length;
    const prevMood = list[prevIdx];
    playMoodSong(prevMood.id, prevMood.audioSrc, prevMood.songTitle || prevMood.title);
  }
</script>

{#if currentMood}
<section class="music-player-section" aria-label="Music Player">
  <div
    class="music-card"
    style="--card-bg: {currentMood.bgColor || currentMood.activeColor || '#DC9917'};"
  >
    <!-- 4 Corner Rivets / Screws matching Figma -->
    <div class="corner-screw top-left" aria-hidden="true"></div>
    <div class="corner-screw top-right" aria-hidden="true"></div>
    <div class="corner-screw bottom-left" aria-hidden="true"></div>
    <div class="corner-screw bottom-right" aria-hidden="true"></div>

    <!-- Left: Album Cover Photo -->
    <div class="album-cover-wrap">
      {#if resolvedCover && !coverFailed}
        <img
          src={resolvedCover}
          alt={currentMood.songTitle || currentMood.title}
          class="album-cover-img"
          onerror={handleImageError}
        />
      {:else}
        <!-- Fallback if photo is not ready yet: clean matching frog avatar artwork -->
        <div class="cover-fallback">
          <img
            src={currentMood.src}
            alt={currentMood.title}
            class="fallback-frog-img"
          />
        </div>
      {/if}
    </div>

    <!-- Right: Controls & Song Info -->
    <div class="music-details-wrap">
      <!-- Playback Controls -->
      <div class="controls-row">
        <!-- Previous Track Button -->
        <button
          type="button"
          class="ctrl-icon-btn"
          onclick={handlePrev}
          aria-label="Lagu sebelumnya"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <!-- Vertical bar + Left Triangle |◀ -->
            <rect x="3" y="4" width="3" height="16" rx="1" />
            <polygon points="21,4 8,12 21,20" />
          </svg>
        </button>

        <!-- Center Play/Pause Circle Button -->
        <button
          type="button"
          class="play-circle-btn"
          onclick={handlePlayPause}
          aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
        >
          {#if isPlaying}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="4" height="16" rx="1.5" />
              <rect x="15" y="4" width="4" height="16" rx="1.5" />
            </svg>
          {:else}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          {/if}
        </button>

        <!-- Next Track Button -->
        <button
          type="button"
          class="ctrl-icon-btn"
          onclick={handleNext}
          aria-label="Lagu berikutnya"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <!-- Right Triangle + Vertical bar ▶| -->
            <polygon points="3,4 16,12 3,20" />
            <rect x="18" y="4" width="3" height="16" rx="1" />
          </svg>
        </button>
      </div>

      <!-- Song Metadata -->
      <div class="song-info">
        <h3 class="song-title">
          {currentMood.songTitle || `${currentMood.title} Song`}
        </h3>
        <p class="song-artist">
          {currentMood.artist || 'Special for you'}
        </p>
      </div>
    </div>
  </div>
</section>
{/if}

<style>
  .music-player-section {
    padding: 0 var(--sp-4);
    margin-top: var(--sp-2);
    margin-bottom: var(--sp-4);
    display: flex;
    justify-content: center;
    animation: musicSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes musicSlideUp {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .music-card {
    position: relative;
    width: 100%;
    max-width: 408px;
    height: 148px;
    background-color: var(--card-bg, #DC9917);
    border-radius: 24px;
    display: flex;
    align-items: center;
    padding: 14px;
    gap: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transition: background-color 0.4s ease, transform 0.2s ease;
    overflow: hidden;
    user-select: none;
  }

  /* ── 4 Corner Rivets / Screws matching Figma ── */
  .corner-screw {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #FFFFFF;
    border: 2px solid rgba(0, 0, 0, 0.18);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
    z-index: 2;
    pointer-events: none;
  }

  .corner-screw.top-left {
    top: 9px;
    left: 9px;
  }

  .corner-screw.top-right {
    top: 9px;
    right: 9px;
  }

  .corner-screw.bottom-left {
    bottom: 9px;
    left: 9px;
  }

  .corner-screw.bottom-right {
    bottom: 9px;
    right: 9px;
  }

  /* ── Left Album Cover ── */
  .album-cover-wrap {
    width: 120px;
    height: 120px;
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
    background-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    position: relative;
  }

  .album-cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
  }

  .fallback-frog-img {
    width: 78%;
    height: 78%;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15));
  }

  /* ── Right Content ── */
  .music-details-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    min-width: 0;
    padding-right: 6px;
  }

  /* ── Controls Row ── */
  .controls-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .ctrl-icon-btn {
    background: none;
    border: none;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 6px;
    transition: transform 0.15s ease, opacity 0.15s ease;
    opacity: 0.95;
    -webkit-tap-highlight-color: transparent;
  }

  .ctrl-icon-btn:hover {
    transform: scale(1.12);
    opacity: 1;
  }

  .ctrl-icon-btn:active {
    transform: scale(0.92);
  }

  /* White Circle Play Button */
  .play-circle-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background-color: #FFFFFF;
    color: #0F172A;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }

  .play-circle-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .play-circle-btn:active {
    transform: scale(0.94);
  }

  /* ── Song Metadata ── */
  .song-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .song-title {
    font-family: var(--font-sans);
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.25;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-artist {
    font-family: var(--font-sans);
    font-size: 0.72rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.82);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
