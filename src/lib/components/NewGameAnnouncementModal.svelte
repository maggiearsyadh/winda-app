<script>
  let { isOpen = $bindable(false), onPlayNow, onClose } = $props();

  let dontShowAgain = $state(false);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      closeModal();
    }
  }

  function closeModal() {
    if (onClose) {
      onClose(dontShowAgain);
    } else {
      isOpen = false;
    }
  }

  function playLaunchChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.28);
      });
    } catch (e) {}
  }

  function handlePlayClick() {
    playLaunchChime();
    setTimeout(() => {
      if (onPlayNow) {
        onPlayNow(dontShowAgain);
      } else {
        isOpen = false;
      }
    }, 200);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="announcement-backdrop"
    onclick={handleBackdropClick}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") handleBackdropClick(e);
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="announcement-title"
    tabindex="-1"
  >
    <div class="announcement-card">
      <!-- Close Button Top Right -->
      <button
        type="button"
        class="announcement-close-btn"
        onclick={closeModal}
        aria-label="Close"
        title="Close"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Visual Hero Banner with winda_stumble.svg -->
      <div class="announcement-hero-banner">
        <div class="hero-sparkle-bg"></div>

        <!-- Badge -->
        <div class="hero-badge-pill">
          <span>NEW GAME</span>
        </div>

        <!-- Character Hero (winda_stumble.svg) -->
        <div class="hero-character-wrap">
          <img
            src="/winda_stumble.svg"
            alt="Winda Stumble"
            class="hero-character-img"
          />
        </div>
      </div>

      <!-- Main Body Content -->
      <div class="announcement-body">
        <h2 id="announcement-title" class="announcement-title">
          Block Blast Puzzle is here
        </h2>

        <p class="announcement-desc">
          <strong>Arcade Zone Winda</strong>. Take a short break after exams,
          relax, and clear rows and columns on an 8x8 grid.
        </p>

        <!-- Feature Points -->
        <div class="feature-bullets">
          <div class="bullet-item">
            <div class="bullet-icon-box bg-purple-soft">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  fill-opacity="0.3"
                />
                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  fill-opacity="0.3"
                />
                <rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  fill-opacity="0.3"
                />
                <rect
                  x="14"
                  y="14"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div class="bullet-text">
              <strong>Brain teaser after exams</strong>
              <span>No time pressure—play casually whenever you want.</span>
            </div>
          </div>

          <div class="bullet-item">
            <div class="bullet-icon-box bg-amber-soft">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div class="bullet-text">
              <strong>Chain combo blasts</strong>
              <span>Clear multiple lines for bonus points and fun sounds.</span>
            </div>
          </div>

          <div class="bullet-item">
            <div class="bullet-icon-box bg-emerald-soft">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="bullet-text">
              <strong>Your favorite companion</strong>
              <span>Winduy and Maggie cheer you on with live reactions.</span>
            </div>
          </div>
        </div>

        <!-- Don't Show Again Checkbox -->
        <label class="dont-show-checkbox">
          <input type="checkbox" bind:checked={dontShowAgain} />
          <span>Don't show this again</span>
        </label>

        <!-- Actions -->
        <div class="announcement-actions">
          <button type="button" class="btn-play-now" onclick={handlePlayClick}>
            <span>Play Now</span>
            <span class="btn-arrow">→</span>
          </button>

          <button type="button" class="btn-dismiss" onclick={closeModal}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Backdrop ── */
  .announcement-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ── Modal Card ── */
  .announcement-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: #ffffff;
    border-radius: 28px;
    box-shadow:
      0 25px 60px -10px rgba(139, 92, 246, 0.35),
      0 10px 25px -5px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.8) inset;
    overflow: hidden;
    animation: popUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
  }

  /* ── Close Button ── */
  .announcement-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 10;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.25);
    color: #ffffff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
    transition: all 0.2s ease;
  }

  .announcement-close-btn:hover {
    background: rgba(0, 0, 0, 0.45);
    transform: scale(1.08) rotate(90deg);
  }

  /* ── Hero Banner ── */
  .announcement-hero-banner {
    position: relative;
    background: linear-gradient(135deg, #7c3aed 0%, #9333ea 45%, #c026d3 100%);
    padding: 22px 20px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }

  .hero-sparkle-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
        circle at 20% 30%,
        rgba(255, 255, 255, 0.25) 0,
        transparent 40%
      ),
      radial-gradient(
        circle at 80% 70%,
        rgba(253, 224, 71, 0.2) 0,
        transparent 40%
      );
    pointer-events: none;
  }

  /* ── Badge ── */
  .hero-badge-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #ffffff;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    padding: 4px 13px;
    border-radius: 999px;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    margin-bottom: 8px;
    animation: gentlePulse 2s ease-in-out infinite;
  }

  /* ── Character Hero Wrap ── */
  .hero-character-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 155px;
  }

  .hero-character-img {
    height: 100%;
    max-height: 155px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.28));
    animation: gentleFloat 3s ease-in-out infinite alternate;
  }

  /* ── Body ── */
  .announcement-body {
    padding: 20px 22px 18px;
    display: flex;
    flex-direction: column;
  }

  .announcement-title {
    margin: 0 0 6px;
    font-size: 1.28rem;
    font-weight: 900;
    color: #1e1b4b;
    text-align: center;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .announcement-desc {
    margin: 0 0 16px;
    font-size: 0.85rem;
    color: #475569;
    line-height: 1.45;
    text-align: center;
  }

  .announcement-desc strong {
    color: #7c3aed;
  }

  /* ── Feature Bullets ── */
  .feature-bullets {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 11px 13px;
  }

  .bullet-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bullet-icon-box {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .bg-purple-soft {
    background: #f3e8ff;
    border: 1px solid #e9d5ff;
    color: #8b5cf6;
  }

  .bg-amber-soft {
    background: #fef3c7;
    border: 1px solid #fde68a;
    color: #d97706;
  }

  .bg-emerald-soft {
    background: #d1fae5;
    border: 1px solid #a7f3d0;
    color: #059669;
  }

  .bullet-text {
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .bullet-text strong {
    font-size: 0.82rem;
    font-weight: 800;
    color: #0f172a;
  }

  .bullet-text span {
    font-size: 0.73rem;
    color: #64748b;
    line-height: 1.3;
  }

  /* ── Don't Show Again ── */
  .dont-show-checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 14px;
    cursor: pointer;
    user-select: none;
  }

  .dont-show-checkbox input {
    cursor: pointer;
    accent-color: #8b5cf6;
    width: 15px;
    height: 15px;
  }

  /* ── Actions ── */
  .announcement-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-play-now {
    width: 100%;
    padding: 12px 20px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    box-shadow: 0 10px 22px -4px rgba(139, 92, 246, 0.45);
    transition: all 0.22s ease;
  }

  .btn-play-now:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px -4px rgba(139, 92, 246, 0.55);
    background: linear-gradient(135deg, #9333ea 0%, #8b5cf6 50%, #7c3aed 100%);
  }

  .btn-play-now:active {
    transform: translateY(1px);
  }

  .btn-arrow {
    font-size: 1.1rem;
    transition: transform 0.2s ease;
  }

  .btn-play-now:hover .btn-arrow {
    transform: translateX(4px);
  }

  .btn-dismiss {
    width: 100%;
    padding: 9px;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.18s ease;
  }

  .btn-dismiss:hover {
    background: #f1f5f9;
    color: #475569;
  }

  /* ── Keyframe Animations ── */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popUp {
    0% {
      opacity: 0;
      transform: scale(0.88) translateY(24px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes gentlePulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.03);
    }
  }

  @keyframes gentleFloat {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-6px);
    }
  }

  /* ── Mobile responsiveness ── */
  @media (max-width: 480px) {
    .announcement-card {
      max-width: 100%;
      border-radius: 24px;
    }

    .announcement-body {
      padding: 18px 18px 16px;
    }

    .announcement-title {
      font-size: 1.18rem;
    }

    .feature-bullets {
      padding: 10px 12px;
      gap: 8px;
    }
  }
</style>
