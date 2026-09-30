<script>
  let {onConsultationClick } = $props();
</script>

<section class="feeling-section" aria-label="Bagian How's your feeling">
  <!-- Yellow smiling character banner -->
  <div class="character-wrap">
    <img
      src="/SENYUM (1).svg"
      alt="Yellow smile character waving"
      width="318"
      height="146"
      class="character-svg-img"
    />
  </div>

  <!-- Cream Card Container -->
  <div class="feeling-card">
    <h1 class="feeling-title">
      HOW’S YOUR FEELING
    </h1>

    <div class="action-buttons">
      <!-- Complaint button -->
      

      <!-- Consultation button (opens Mood Frogs!) -->
      <button
        type="button"
        class="black-action-btn"
        onclick={onConsultationClick}
        aria-label="Konsultasi mood kodok"
      >
        <span>Choose Mood</span>
        <svg class="plus-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  </div>
</section>

<style>
  .feeling-section {
    position: relative;
    padding: 0 var(--sp-4);
    margin-top: var(--sp-6);
  }

  /* ── Character peeking from behind the card (static) ── */
  .character-wrap {
    display: flex;
    justify-content: center;
    position: relative;
    margin-bottom: -33px;
    z-index: 1;
  }

  .character-svg-img {
    width: 270px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.05));
    /* Statis, tanpa animasi */
  }

  /* ── Main Cream Card (in front of character) ── */
  .feeling-card {
    background-color: #f5f0e9;
    border-radius: var(--radius-lg);
    padding: var(--sp-10) var(--sp-4) var(--sp-6);
    text-align: center;
    position: relative;
    z-index: 2;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  }

  .feeling-title {
    font-family: var(--font-heading);
    font-size: clamp(2rem, 8vw, 2.2rem);
    letter-spacing: 0.04em;
    color: #000000;
    line-height: 1;
    margin-bottom: var(--sp-5);
    font-weight: 900;
  }

  /* ── Two black buttons ── */
  .action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
  }

  .black-action-btn {
    flex: 1;
    max-width: 175px;
    height: 48px;
    background-color: var(--clr-btn-black);
    color: #ffffff;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: var(--fw-semi);
    border-radius: var(--radius-pill);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    transition: transform 0.15s ease, background 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .black-action-btn:hover {
    background-color: var(--clr-btn-black-hov);
    transform: translateY(-1px);
  }

  .black-action-btn:active {
    transform: translateY(1px);
  }

  .plus-icon {
    flex-shrink: 0;
    margin-left: 6px;
  }
</style>
