<script>
  let { mood, onNext, onBack } = $props();

  // Interactive Breathing Guide State
  let breathPhase = $state('Tarik Nafas ');
  let isBreathing = $state(true);

  // Cycle breath text every 4 seconds for a calming effect
  $effect(() => {
    if (!isBreathing) return;
    const phases = ['Tarik Nafas  (4s)', 'Tahan Sebentar... ', 'Hembuskan Perlahan (4s)', 'Rileks sejenak '];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % phases.length;
      breathPhase = phases[idx];
    }, 3500);

    return () => clearInterval(interval);
  });
</script>

<div class="anger-tutorial-container">
  <!-- Header -->
  <header class="tutorial-header">
    <div class="tutorial-badge">
      
    </div>
    <h3 class="tutorial-title">
      Take a deep breath first, An 
    </h3>
    <p class="tutorial-sub">
      Sebelum lanjut meluapkan rasa kesalmu, coba ikuti langkah kecil ini biar hatimu adem:
    </p>
  </header>

  <!-- Interactive Breathing Visualizer Card -->
  <div class="breathing-card">
    <div class="breathing-circle-wrap">
      <div class="pulse-ring ring-3"></div>
      <div class="pulse-ring ring-2"></div>
      <div class="pulse-ring ring-1"></div>
      <div class="center-breathe-orb">
        <span class="orb-icon">🫁</span>
      </div>
    </div>
    <div class="breath-instruction">
      <span class="phase-text">{breathPhase}</span>
      <span class="sub-phase">Ikuti irama lingkaran ini untuk menenangkan detak jantung</span>
    </div>
  </div>

  <!-- Tutorial Step Cards -->
  <div class="tutorial-steps-list">
    <!-- Step 1 -->
    <div class="step-card">
      <div class="step-num-badge">1</div>
      <div class="step-content">
        <h4 class="step-card-title">Berenti </h4>
        <p class="step-card-desc">Jangan kirim pesan, jangan telepon, jangan ambil keputusan</p>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="step-card">
      <div class="step-num-badge">2</div>
      <div class="step-content">
        <h4 class="step-card-title">Rilex  </h4>
        <p class="step-card-desc">Lepaskan kepalan tangan, turunkan bahu yang tegang, dan pejamkan mata sejenak.</p>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="step-card">
      <div class="step-num-badge">3</div>
      <div class="step-content">
        <h4 class="step-card-title">Remember</h4>
        <p class="step-card-desc">Everything will be fine</p>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="tutorial-actions">
    <button
      type="button"
      class="next-canvas-btn"
      onclick={onNext}
    >
      <span>Next Step </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </button>

    <button
      type="button"
      class="back-btn"
      onclick={onBack}
    >
      ◀ Kembali ke Pesan
    </button>
  </div>
</div>

<style>
  .anger-tutorial-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .tutorial-header {
    text-align: center;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  .tutorial-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: var(--fw-extra);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #BA496522;
    color: #BA4965;
    margin-bottom: 4px;
  }

  .tutorial-title {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: #111827;
    margin-bottom: 4px;
    font-weight: 800;
  }

  .tutorial-sub {
    font-size: 0.78rem;
    color: #4b5563;
    line-height: 1.35;
    max-width: 320px;
    margin: 0 auto;
    font-weight: 500;
  }

  /* ── Breathing Exercise Card ── */
  .breathing-card {
    width: 100%;
    background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%);
    border: 1px solid #FECDD3;
    border-radius: 16px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 10px;
    box-sizing: border-box;
  }

  .breathing-circle-wrap {
    position: relative;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid #BA4965;
    opacity: 0.3;
    animation: ring-pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .ring-1 { animation-delay: 0s; }
  .ring-2 { animation-delay: 0.8s; }
  .ring-3 { animation-delay: 1.6s; }

  @keyframes ring-pulse {
    0% { transform: scale(0.7); opacity: 0.8; }
    50% { transform: scale(1.15); opacity: 0.2; }
    100% { transform: scale(0.7); opacity: 0.8; }
  }

  .center-breathe-orb {
    position: relative;
    width: 38px;
    height: 38px;
    background: #BA4965;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(186, 73, 101, 0.35);
    z-index: 2;
    animation: orb-breathe 3.5s ease-in-out infinite;
  }

  @keyframes orb-breathe {
    0%, 100% { transform: scale(0.9); }
    50% { transform: scale(1.1); }
  }

  .orb-icon {
    font-size: 1.1rem;
  }

  .breath-instruction {
    display: flex;
    flex-direction: column;
    text-align: left;
    gap: 2px;
  }

  .phase-text {
    font-size: 0.88rem;
    font-weight: 800;
    color: #9F1239;
    letter-spacing: -0.01em;
  }

  .sub-phase {
    font-size: 0.72rem;
    color: #881337;
    line-height: 1.25;
  }

  /* ── Step Cards List ── */
  .tutorial-steps-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    margin-bottom: 12px;
    box-sizing: border-box;
  }

  .step-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 8px 12px;
    text-align: left;
    box-sizing: border-box;
  }

  .step-num-badge {
    width: 22px;
    height: 22px;
    min-width: 22px !important;
    min-height: 22px !important;
    border-radius: 50%;
    background: #BA4965;
    color: #FFFFFF;
    font-size: 0.72rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    box-sizing: border-box;
  }

  .step-content {
    flex: 1;
  }

  .step-card-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1E293B;
    margin-bottom: 2px;
  }

  .step-card-desc {
    font-size: 0.74rem;
    color: #64748B;
    line-height: 1.35;
    margin: 0;
  }

  /* ── Actions ── */
  .tutorial-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .next-canvas-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #BA4965;
    color: #FFFFFF;
    font-weight: var(--fw-bold);
    font-size: 0.84rem;
    padding: 9px 16px;
    border-radius: var(--radius-pill);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(186, 73, 101, 0.3);
    transition: transform 0.15s ease, filter 0.15s ease;
    min-height: 40px !important;
    width: 100%;
    box-sizing: border-box;
  }

  .next-canvas-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .back-btn {
    background: #F1F5F9;
    color: #475569;
    font-weight: var(--fw-bold);
    font-size: 0.78rem;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid #CBD5E1;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    min-height: 38px !important;
    width: 100%;
    box-sizing: border-box;
  }

  .back-btn:hover {
    background: #E2E8F0;
    transform: translateY(-1px);
  }
</style>
