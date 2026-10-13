<script>
  import { onMount } from "svelte";
  import confetti from "canvas-confetti";

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

      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.14, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch (e) {}
  }

  function handlePlayClick() {
    playLaunchChime();

    // Confetti celebration
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"],
      });
    } catch (e) {}

    setTimeout(() => {
      if (onPlayNow) {
        onPlayNow(dontShowAgain);
      } else {
        isOpen = false;
      }
    }, 280);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="announcement-backdrop"
    onclick={handleBackdropClick}
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
        aria-label="Tutup pengumuman"
        title="Tutup"
      >
        <svg
          width="20"
          height="20"
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

      <!-- Visual Hero Banner with 3D Glossy Floating Blocks -->
      <div class="announcement-hero-banner">
        <div class="hero-sparkle-bg"></div>

        <!-- Badge -->
        <div class="hero-badge-pill">
          <!-- <span class="sparkle-icon">✨</span> -->
          <span>New Game!</span>
        </div>

        <!-- Animated Floating Polyomino Blocks -->
        <div class="hero-blocks-showcase">
          <div class="floating-block block-pink">
            <span class="block-shine"></span>
          </div>
          <div class="floating-block block-amber">
            <span class="block-shine"></span>
          </div>
          <div class="floating-block block-cyan">
            <span class="block-shine"></span>
          </div>
          <div class="floating-block block-purple center-hero-poly">
            <span class="block-shine"></span>
            <div class="hero-icon-center">🧩</div>
          </div>
          <div class="floating-block block-green">
            <span class="block-shine"></span>
          </div>
        </div>

        <!-- <div class="hero-mini-tags">
          <span class="mini-tag">🔥 Grid 8×8</span>
          <span class="mini-tag">⚡ Combo Blast</span>
          <span class="mini-tag">🐸 Winduy & Maggie</span>
        </div> -->
      </div>

      <!-- Main Body Content -->
      <div class="announcement-body">
        <h2 id="announcement-title" class="announcement-title">
           Block Blast Puzzle IS HEREE
        </h2>

        <p class="announcement-desc">
           <strong>Arcade Zone Winda</strong>. TAKE A SHORT BRAKE AFTER EXAM
        </p>

        <!-- Feature Points -->
        <div class="feature-bullets">
          <div class="bullet-item">
            <div class="bullet-icon-box bg-purple-soft">🧩</div>
            <div class="bullet-text">
              <strong>Brain teaser refreshing after EXAMS</strong>
              <span>Play whenever you want.</span>
            </div>
          </div>

          <div class="bullet-item">
            <div class="bullet-icon-box bg-amber-soft">🔥</div>
            <div class="bullet-text">
              <strong>Fun Combo Blasts</strong>
              <span
                >Fun combination explosions with melodic sounds and exciting
                particles every time a row explodes.</span
              >
            </div>
          </div>

          <div class="bullet-item">
            <div class="bullet-icon-box bg-emerald-soft">🦊</div>
            <div class="bullet-text">
              <strong>With your favorite characters</strong>
              <span>Winduy & Maggie cheer you on directly</span>
            </div>
          </div>
        </div>

        <!-- Don't Show Again Checkbox -->
        <label class="dont-show-checkbox">
          <input type="checkbox" bind:checked={dontShowAgain} />
          <span>Jangan tampilkan lagi</span>
        </label>

        <!-- Actions -->
        <div class="announcement-actions">
          <button type="button" class="btn-play-now" onclick={handlePlayClick}>
            <span class="btn-play-icon">🎮</span>
            <span>Mainkan Sekarang!</span>
            <span class="btn-arrow">→</span>
          </button>

          <button type="button" class="btn-dismiss" onclick={closeModal}>
            Nanti Saja
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
    max-width: 440px;
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
    width: 36px;
    height: 36px;
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
    padding: 28px 20px 22px;
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
    gap: 6px;
    background: rgba(255, 255, 255, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    padding: 5px 14px;
    border-radius: 999px;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    margin-bottom: 14px;
    animation: gentlePulse 2s ease-in-out infinite;
  }

  .sparkle-icon {
    font-size: 0.85rem;
  }

  /* ── Floating Blocks Showcase ── */
  .hero-blocks-showcase {
    position: relative;
    width: 220px;
    height: 76px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .floating-block {
    position: absolute;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .block-shine {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 42%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.55),
      rgba(255, 255, 255, 0)
    );
    border-radius: 10px 10px 0 0;
    pointer-events: none;
  }

  .block-pink {
    background: #f43f5e;
    left: 12px;
    top: 8px;
    transform: rotate(-14deg);
    animation: floatLeft 3s ease-in-out infinite alternate;
  }

  .block-amber {
    background: #f59e0b;
    left: 54px;
    top: 24px;
    transform: rotate(8deg);
    animation: floatSlow 3.4s ease-in-out infinite alternate;
  }

  .center-hero-poly {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #8b5cf6;
    border: 2px solid rgba(255, 255, 255, 0.5);
    z-index: 3;
    animation: floatCenter 2.6s ease-in-out infinite alternate;
    box-shadow: 0 10px 24px rgba(139, 92, 246, 0.5);
  }

  .hero-icon-center {
    font-size: 1.7rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .block-cyan {
    background: #06b6d4;
    right: 52px;
    top: 22px;
    transform: rotate(-10deg);
    animation: floatSlow 3.2s ease-in-out infinite alternate-reverse;
  }

  .block-green {
    background: #10b981;
    right: 12px;
    top: 6px;
    transform: rotate(16deg);
    animation: floatRight 3.1s ease-in-out infinite alternate;
  }

  /* ── Hero Mini Tags ── */
  .hero-mini-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .mini-tag {
    font-size: 0.68rem;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.22);
    color: #f8fafc;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* ── Body ── */
  .announcement-body {
    padding: 22px 24px 20px;
    display: flex;
    flex-direction: column;
  }

  .announcement-title {
    margin: 0 0 8px;
    font-size: 1.35rem;
    font-weight: 900;
    color: #1e1b4b;
    text-align: center;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .announcement-desc {
    margin: 0 0 18px;
    font-size: 0.88rem;
    color: #475569;
    line-height: 1.5;
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
    margin-bottom: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 12px 14px;
  }

  .bullet-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bullet-icon-box {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .bg-purple-soft {
    background: #f3e8ff;
    border: 1px solid #e9d5ff;
  }

  .bg-amber-soft {
    background: #fef3c7;
    border: 1px solid #fde68a;
  }

  .bg-emerald-soft {
    background: #d1fae5;
    border: 1px solid #a7f3d0;
  }

  .bullet-text {
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .bullet-text strong {
    font-size: 0.84rem;
    font-weight: 800;
    color: #0f172a;
  }

  .bullet-text span {
    font-size: 0.74rem;
    color: #64748b;
    line-height: 1.3;
  }

  /* ── Don't Show Again ── */
  .dont-show-checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.76rem;
    color: #64748b;
    margin-bottom: 16px;
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
    padding: 13px 20px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
    color: #ffffff;
    font-size: 0.98rem;
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

  .btn-play-icon {
    font-size: 1.15rem;
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
    padding: 10px;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 12px;
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

  @keyframes floatCenter {
    0% {
      transform: translateY(0) scale(1);
    }
    100% {
      transform: translateY(-7px) scale(1.03);
    }
  }

  @keyframes floatLeft {
    0% {
      transform: translateY(0) rotate(-14deg);
    }
    100% {
      transform: translateY(-5px) rotate(-10deg);
    }
  }

  @keyframes floatRight {
    0% {
      transform: translateY(0) rotate(16deg);
    }
    100% {
      transform: translateY(-6px) rotate(20deg);
    }
  }

  @keyframes floatSlow {
    0% {
      transform: translateY(0) rotate(0deg);
    }
    100% {
      transform: translateY(-4px) rotate(4deg);
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
      font-size: 1.2rem;
    }

    .feature-bullets {
      padding: 10px 12px;
      gap: 8px;
    }
  }
</style>
