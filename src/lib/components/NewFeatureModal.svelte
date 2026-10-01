<script>
  let { isOpen = $bindable(false), onTryNow } = $props();

  // 3 Mini preview bubbles inside the announcement modal for instant fun!
  let miniBubbles = $state([
    { id: 1, popped: false, icon: '🌸' },
    { id: 2, popped: false, icon: '🫧' },
    { id: 3, popped: false, icon: '🐸' }
  ]);

  function playMiniPop() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = 520 + Math.random() * 200;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }
  }

  function handleMiniPop(index) {
    if (miniBubbles[index].popped) return;
    miniBubbles[index].popped = true;
    playMiniPop();
  }

  function handleDismiss() {
    try {
      localStorage.setItem('has_seen_bubble_update_v1', 'true');
    } catch (e) {}
    isOpen = false;
  }

  function handleActionTry() {
    try {
      localStorage.setItem('has_seen_bubble_update_v1', 'true');
    } catch (e) {}
    isOpen = false;
    if (onTryNow) onTryNow();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="feature-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Pengumuman Fitur Baru"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) handleDismiss();
    }}
  >
    <div class="feature-card">
      <!-- Close Button -->
      <button
        type="button"
        class="close-feature-btn"
        onclick={handleDismiss}
        aria-label="Tutup pengumuman"
      >
        ✕
      </button>

      <!-- Badge -->
      <div class="new-pill">
        <!-- <span class="sparkle">✨</span> -->
        <span>NEW FEATURE</span>
      </div>

      <!-- Icon & Title -->
      <div class="title-group">
        <div class="bubble-mascot-orb">
          <span class="mascot-emoji">🫧</span>
        </div>
        <h3 class="feature-title">Fitur Baru </h3>
        <p class="feature-desc">
          Sekarang ada <strong>Anti-Stress Bubble Wrap</strong>! Kamu bisa pecah-pecahkan gelembung <em>pop</em> renyah buat hilangin stres, & overthinking 
        </p>
      </div>

      <!-- Mini Interactive Demo Preview -->
      <div class="mini-demo-box">
        <p class="demo-tip">Cobain tes pencet di sini:</p>
        <div class="mini-bubbles-row">
          {#each miniBubbles as b, idx}
            <button
              type="button"
              class="mini-bubble-btn"
              class:is-popped={b.popped}
              onclick={() => handleMiniPop(idx)}
              aria-label="Tes pop bubble"
            >
              {#if b.popped}
                <span class="mini-icon">{b.icon}</span>
              {:else}
                <span class="mini-shine"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons-group">
        <button
          type="button"
          class="try-now-btn"
          onclick={handleActionTry}
        >
          <span>Coba Sekarang </span>
        </button>

        <button
          type="button"
          class="skip-btn"
          onclick={handleDismiss}
        >
          Nanti Saja
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .feature-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .feature-card {
    position: relative;
    width: 100%;
    max-width: 380px;
    background: #FFFFFF;
    border-radius: 28px;
    padding: 28px 20px 24px;
    text-align: center;
    box-shadow: 0 24px 60px rgba(0, 30, 80, 0.25);
    animation: pop-up 0.35s cubic-bezier(0.2, 1.1, 0.3, 1) both;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
  }

  @keyframes pop-up {
    from {
      opacity: 0;
      transform: scale(0.88) translateY(14px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .close-feature-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s, color 0.15s;
  }

  .close-feature-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  /* Badge */
  .new-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
  }

  .bubble-mascot-orb {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #dbeafe 60%, #93c5fd 100%);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.28), inset 0 2px 4px #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    animation: float 2.5s ease-in-out infinite alternate;
  }

  @keyframes float {
    from { transform: translateY(0); }
    to { transform: translateY(-6px); }
  }

  .mascot-emoji {
    font-size: 2rem;
  }

  .feature-title {
    font-family: var(--font-heading);
    font-size: 1.25rem;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }

  .feature-desc {
    font-family: var(--font-sans);
    font-size: 0.84rem;
    color: #475569;
    line-height: 1.45;
    margin: 0 0 16px;
    padding: 0 4px;
  }

  .feature-desc strong {
    color: #0f172a;
  }

  /* Mini Demo Box */
  .mini-demo-box {
    width: 100%;
    background: #f8fafc;
    border: 1.5px dashed #cbd5e1;
    border-radius: 16px;
    padding: 12px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .demo-tip {
    font-family: var(--font-sans);
    font-size: 0.74rem;
    font-weight: 600;
    color: #64748b;
    margin: 0;
  }

  .mini-bubbles-row {
    display: flex;
    gap: 12px;
  }

  .mini-bubble-btn {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    outline: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #cfe3ff 45%, #9ec5fe 100%);
    box-shadow: 0 3px 8px rgba(70, 120, 200, 0.25), inset 0 2px 4px #ffffff;
    transition: transform 0.1s ease;
  }

  .mini-bubble-btn:hover:not(.is-popped) {
    transform: scale(1.08);
  }

  .mini-bubble-btn:active:not(.is-popped) {
    transform: scale(0.92);
  }

  .mini-shine {
    position: absolute;
    top: 5px;
    left: 7px;
    width: 10px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    transform: rotate(-30deg);
  }

  .mini-bubble-btn.is-popped {
    background: #e2e8f0;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.12);
    transform: scale(0.92);
    cursor: default;
  }

  .mini-icon {
    font-size: 1rem;
    animation: pop-icon 0.2s ease-out both;
  }

  @keyframes pop-icon {
    from { transform: scale(0.3); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* Actions */
  .action-buttons-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .try-now-btn {
    width: 100%;
    padding: 13px 18px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.28);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .try-now-btn:active {
    transform: scale(0.98);
  }

  .skip-btn {
    border: none;
    background: transparent;
    color: #64748b;
    font-family: var(--font-sans);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    padding: 6px;
    transition: color 0.15s;
  }

  .skip-btn:hover {
    color: #0f172a;
  }
</style>
