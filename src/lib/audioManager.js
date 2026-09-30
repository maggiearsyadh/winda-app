import { Howl, Howler } from 'howler';

// Shared state
export const audioState = {
  currentMoodId: null,
  currentTitle: null,
  isPlaying: false,
  isMuted: false,
};

// Listeners for reactivity across components
const listeners = new Set();
function notify() {
  listeners.forEach(fn => fn(audioState));
}

export function subscribeAudio(fn) {
  listeners.add(fn);
  fn(audioState);
  return () => listeners.delete(fn);
}

let currentSound = null;

/**
 * Play song for specific mood with smooth crossfade
 */
export function playMoodSong(moodId, audioSrc, moodTitle = '') {
  if (!audioSrc) return;

  // If already playing the exact same song, keep playing
  if (audioState.currentMoodId === moodId && currentSound && currentSound.playing()) {
    return;
  }

  // 1. Smoothly fade out previous track over 1000ms
  if (currentSound) {
    const prevSound = currentSound;
    try {
      const vol = prevSound.volume();
      if (vol > 0) {
        prevSound.fade(vol, 0, 1000);
      }
      setTimeout(() => {
        try { prevSound.stop(); } catch (e) {}
      }, 1100);
    } catch (e) {}
  }

  // 2. Update state
  audioState.currentMoodId = moodId;
  audioState.currentTitle = moodTitle;
  audioState.isPlaying = true;
  notify();

  // 3. Create new Howl instance
  currentSound = new Howl({
    src: [audioSrc],
    html5: true,     // Fast streaming without decoding delay
    loop: true,      // Continuous looping
    volume: 0,       // Start at 0 for fade-in
    onloaderror: (id, err) => {
      console.warn(`[AudioManager] File "${audioSrc}" belum ada di public/audio/`, err);
      audioState.isPlaying = false;
      notify();
    },
    onplayerror: (id, err) => {
      console.warn('[AudioManager] Autoplay blocked or play error:', err);
      if (currentSound) {
        currentSound.once('unlock', () => {
          if (currentSound) currentSound.play();
        });
      }
    }
  });

  // 4. Play and smoothly fade-in volume to 0.7
  currentSound.play();
  currentSound.fade(0, 0.7, 1000);
}

/**
 * Toggle play / pause
 */
export function togglePlayPause() {
  if (!currentSound) return false;

  if (currentSound.playing()) {
    currentSound.pause();
    audioState.isPlaying = false;
  } else {
    currentSound.play();
    audioState.isPlaying = true;
  }
  notify();
  return audioState.isPlaying;
}

/**
 * Toggle global mute
 */
export function toggleMute() {
  audioState.isMuted = !audioState.isMuted;
  Howler.mute(audioState.isMuted);
  notify();
  return audioState.isMuted;
}

/**
 * Stop music with smooth fade-out
 */
export function stopMusic() {
  if (currentSound) {
    try {
      const vol = currentSound.volume();
      currentSound.fade(vol, 0, 800);
      setTimeout(() => {
        try { currentSound.stop(); } catch (e) {}
      }, 900);
    } catch (e) {}
  }
  audioState.isPlaying = false;
  notify();
}
