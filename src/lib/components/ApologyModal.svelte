<script>
  let { isOpen = $bindable(false) } = $props();

  let forgiven = $state(false);
  let poutCount = $state(0);

  const poutResponses = [
    "tebus kesalahan pake apa aja hari ini, tell him..",
    "jangan kesel lama-lama dong hahahaha",
    "aplikasi ga bisa dibuka sebelum click maafin",
    "tebus kesalahan pake apa aja hari ini, tell him..",
    "aplikasi ga bisa dibuka sebelum click maafin",
  ];

  function handlePout() {
    poutCount = (poutCount + 1) % poutResponses.length;
  }

  function handleForgive() {
    forgiven = true;
    try {
      localStorage.setItem("has_seen_apology_oct2", "true");
    } catch (e) {}

    setTimeout(() => {
      isOpen = false;
      forgiven = false;
    }, 1800);
  }

  function handleDismiss() {
    try {
      localStorage.setItem("has_seen_apology_oct2", "true");
    } catch (e) {}
    isOpen = false;
  }
</script>

{#if isOpen}
  <div
    class="apology-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Pesan Permintaan Maaf dari Maggie"
    tabindex="-1"
  >
    <div class="apology-card">
      {#if forgiven}
        <!-- Celebration state when forgiven -->
        <div class="forgiven-state">
          <div class="heart-pulse-icon">😏😎</div>
          <h3 class="forgive-title">YEEEY DIMAAFIN </h3>
        </div>
      {:else}
        <!-- Main Apology Content -->
        <div class="apology-badge">
          <span>plsss forgive him</span>
        </div>

        <!-- Lottie Animation -->
        <div class="apology-lottie-wrap">
          <iframe
            src="https://lottie.host/embed/85ff89ca-11d4-4df6-8db9-593e058a0b02/vpOMS56T7w.lottie"
            title="Apology Lottie Animation"
            class="apology-lottie-frame"
            frameborder="0"
          ></iframe>
        </div>

        <h3 class="apology-title">SORRYYY</h3>

        <p class="apology-letter">
          last night bener-bener <strong
            >ngga sengaja ketiduran </strong
          >... mata udah nggak kuat banget dan tiba-tiba langsung blank 
        </p>

        <div class="guilt-box">
          <p class="guilt-text">
            dont be mad, today siap nebus kesalahan
          </p>
        </div>

        <!-- Penebus Dosa Vouchers -->
        <!-- <div class="remedy-list">
          <div class="remedy-item">
            <span class="remedy-icon"></span>
            <span class="remedy-text">Bebas palak jajan / minuman </span>
          </div>
          <div class="remedy-item">
            <span class="remedy-icon"></span>
            <span class="remedy-text">Tell him what to do</span>
          </div>
          <div class="remedy-item">
            <span class="remedy-icon"></span>
            <span class="remedy-text"
              >Dengerin curhatan kamu all day</span
            >
          </div>
        </div> -->

        {#if poutCount > 0}
          <div class="pout-notice">
            <p>{poutResponses[poutCount - 1]}</p>
          </div>
        {/if}

        <!-- Actions -->
        <div class="apology-actions">
          <button type="button" class="forgive-btn" onclick={handleForgive}>
            <span>Dimaafin dehh </span>
          </button>

          <button type="button" class="pout-btn" onclick={handlePout}>
            <span>Masih agak kesel dikit 😤</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .apology-backdrop {
    position: fixed;
    inset: 0;
    z-index: 250;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .apology-card {
    position: relative;
    width: 100%;
    max-width: 390px;
    max-height: calc(100dvh - 36px);
    overflow-y: auto;
    background: #ffffff;
    border-radius: 28px;
    padding: 26px 20px 22px;
    text-align: center;
    box-shadow: 0 24px 60px rgba(0, 30, 80, 0.25);
    animation: pop-up 0.35s cubic-bezier(0.2, 1.15, 0.3, 1) both;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    scrollbar-width: thin;
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


  .apology-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: 999px;
    background: rgba(186, 73, 101, 0.1);
    color: #ba4965;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }



  .apology-title {
    font-family: var(--font-heading);
    font-size: 1.35rem;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }

  .apology-letter {
    font-family: var(--font-sans);
    font-size: 0.86rem;
    color: #475569;
    line-height: 1.45;
    margin: 0 0 12px;
    padding: 0 4px;
  }

  .apology-letter strong {
    color: #be123c;
  }

  .guilt-box {
    width: 100%;
    background: #fff1f2;
    border: 1px dashed #f43f5e;
    border-radius: 14px;
    padding: 10px 12px;
    margin-bottom: 14px;
    box-sizing: border-box;
  }

  .guilt-text {
    font-family: var(--font-sans);
    font-size: 0.8rem;
    color: #881337;
    line-height: 1.35;
    margin: 0;
    font-weight: 500;
  }


  .pout-notice {
    width: 100%;
    background: #fef3c7;
    border-radius: 12px;
    padding: 8px 12px;
    margin-bottom: 12px;
    animation: fade-in 0.2s ease-out both;
  }

  .pout-notice p {
    font-family: var(--font-sans);
    font-size: 0.78rem;
    font-weight: 600;
    color: #92400e;
    margin: 0;
  }

  .apology-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .forgive-btn {
    width: 100%;
    padding: 13px 18px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
    color: #ffffff;
    font-family: var(--font-sans);
    font-size: 0.94rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(225, 29, 72, 0.28);
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }

  .forgive-btn:active {
    transform: scale(0.98);
  }

  .pout-btn {
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

  .pout-btn:hover {
    color: #be123c;
  }

  /* Forgiven Celebration State */
  .forgiven-state {
    padding: 24px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: pop-up 0.3s ease-out both;
  }

  .heart-pulse-icon {
    font-size: 3rem;
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.15);
    }
  }

  .forgive-title {
    font-family: var(--font-heading);
    font-size: 1.4rem;
    color: #be123c;
    margin: 4px 0 0;
  }

  .forgive-sub {
    font-family: var(--font-sans);
    font-size: 0.88rem;
    color: #475569;
    line-height: 1.45;
    margin: 0;
  }
</style>
