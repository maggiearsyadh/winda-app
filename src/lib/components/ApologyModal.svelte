<script>
  let { isOpen = $bindable(false) } = $props();
  // ==============================================================
  // 🔑 SET PASSWORD DI SINI:
  // ==============================================================
  const PASSWORDS = [
    "windalucupermatacalli" // <-- ganti dengan password yang kamu mau
  ];

  let inputPhrase = $state('');
  let isWrong = $state(false);
  let errorMessage = $state('');
  let isSuccess = $state(false);
  let showClue = $state(false);
  let showPassword = $state(false);
  let attempts = $state(0);

  const funnyTaunts = [
    "Wrong password",
  ];

  function handleSubmit() {
    const cleanedInput = inputPhrase.trim().toLowerCase();

    if (!cleanedInput) {
      errorMessage = "Please enter the password!";
      isWrong = true;
      triggerShake();
      return;
    }

    const isMatch = PASSWORDS.some(p => p.toLowerCase() === cleanedInput);

    if (isMatch) {
      // BERHASIL DIBUKA!
      isSuccess = true;
      isWrong = false;
      errorMessage = '';

      try {
        localStorage.setItem("winda_app_locked_prank_v1", "unlocked");
      } catch (e) {}

      setTimeout(() => {
        isOpen = false;
        isSuccess = false;
        inputPhrase = '';
      }, 2000);
    } else {
      // SALAH PASSWORD
      attempts++;
      isWrong = true;
      errorMessage = funnyTaunts[(attempts - 1) % funnyTaunts.length];
      triggerShake();
    }
  }

  function triggerShake() {
    const el = document.querySelector('.lock-card');
    if (el) {
      el.classList.remove('shake-anim');
      void el.offsetWidth; // trigger reflow
      el.classList.add('shake-anim');
    }
  }

  function toggleClue() {
    showClue = !showClue;
  }
</script>

{#if isOpen}
  <div
    class="lock-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Aplikasi Terkunci Butuh Password"
    tabindex="-1"
  >
    <div class="lock-card">
      {#if isSuccess}
        <!-- State Berhasil Terbuka -->
        <div class="unlock-success-box">
          <div class="unlock-icon-anim"></div>
          <h2 class="unlock-title">Access Granted</h2>
          <p class="unlock-subtitle">
             Acces granted
          </p>
          <div class="success-progress-bar">
            <div class="bar-fill"></div>
          </div>
        </div>
      {:else}
        <!-- Form Kunci Aplikasi (Prank Screen) -->
        
          <!-- <span>System got locked</span> -->
        

        <!-- <div class="lock-icon-wrapper">
          <div class="lock-big-disc">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E11D48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        </div> -->

        <h2 class="lock-heading">System Got Lock</h2>
        <p class="lock-desc">
          Developer has locked this page. Please enter the correct password to continue:
        </p>

        <!-- Input Form -->
        <form class="lock-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div class="input-wrapper" class:has-error={isWrong}>
            <input
              type={showPassword ? "text" : "password"}
              class="pass-input"
              placeholder="Enter password..."
              bind:value={inputPhrase}
              autocomplete="off"
            />
            <button
              type="button"
              class="btn-eye"
              onclick={() => showPassword = !showPassword}
              title={showPassword ? "Sembunyikan" : "Tampilkan teks"}
              aria-label="Toggle password view"
            >
              {showPassword ? "" : ""}
            </button>
          </div>

          {#if errorMessage}
            <div class="error-pill">
              <span>⚠️ {errorMessage}</span>
            </div>
          {/if}

          <!-- Submit Button -->
          <button type="submit" class="btn-unlock-submit">
            <span>Submit </span>
          </button>
        </form>

       
      {/if}
    </div>
  </div>
{/if}

<style>
  .lock-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: fadeIn 0.25s ease-out both;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .lock-card {
    position: relative;
    width: 100%;
    max-width: 375px;
    background: #FFFFFF;
    border-radius: 28px;
    padding: 26px 20px 22px;
    text-align: center;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    animation: popUp 0.32s cubic-bezier(0.16, 1.25, 0.3, 1) both;
    box-sizing: border-box;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes popUp {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(12px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Shake Animation when wrong password */
  :global(.shake-anim) {
    animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-3px, 0, 0); }
    20%, 80% { transform: translate3d(5px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
    40%, 60% { transform: translate3d(5px, 0, 0); }
  }

  .lock-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #FFE4E6;
    color: #BE123C;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 999px;
    margin-bottom: 16px;
  }

  .lock-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #E11D48;
    animation: pulseDot 1.5s infinite;
  }

  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.3); }
  }

  .lock-icon-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
  }

  .lock-big-disc {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #FFF1F2;
    border: 2px solid #FFE4E6;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(225, 29, 72, 0.15);
  }

  .lock-heading {
    font-size: 1.35rem;
    font-weight: 800;
    color: #111827;
    margin: 0 0 6px;
    letter-spacing: -0.015em;
  }

  .lock-desc {
    font-size: 0.82rem;
    color: #4B5563;
    line-height: 1.45;
    margin: 0 0 18px;
  }

  .lock-desc strong {
    color: #BE123C;
    font-weight: 800;
  }

  .lock-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: #F9FAFB;
    border: 1.5px solid #E5E7EB;
    border-radius: 14px;
    padding: 2px 8px 2px 14px;
    transition: all 0.18s ease;
  }

  .input-wrapper:focus-within {
    background: #FFFFFF;
    border-color: #BE123C;
    box-shadow: 0 0 0 3px rgba(190, 18, 60, 0.12);
  }

  .input-wrapper.has-error {
    border-color: #E11D48;
    background: #FFF1F2;
  }

  .pass-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.88rem;
    font-weight: 600;
    color: #111827;
    padding: 10px 0;
    outline: none;
    min-height: 40px;
  }

  .pass-input::placeholder {
    color: #9CA3AF;
    font-weight: 500;
  }

  .btn-eye {
    border: none;
    background: transparent;
    font-size: 1.05rem;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: background 0.15s;
  }

  .btn-eye:hover {
    background: #F3F4F6;
  }

  .error-pill {
    background: #FFE4E6;
    border-radius: 8px;
    padding: 6px 10px;
    color: #BE123C;
    font-size: 0.74rem;
    font-weight: 700;
    animation: fadeIn 0.2s ease;
  }

  .btn-unlock-submit {
    width: 100%;
    background: #111827;
    color: #FFFFFF;
    border: none;
    border-radius: 14px;
    padding: 12px;
    font-size: 0.88rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s ease;
    box-shadow: 0 4px 14px rgba(17, 24, 39, 0.18);
  }

  .btn-unlock-submit:hover {
    background: #000000;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(17, 24, 39, 0.25);
  }

  .btn-unlock-submit:active {
    transform: scale(0.98);
  }

  /* Clue Section */
  .clue-section {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .btn-clue-toggle {
    background: transparent;
    border: none;
    font-size: 0.75rem;
    font-weight: 700;
    color: #6B7280;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.15s;
  }

  .btn-clue-toggle:hover {
    color: #BE123C;
  }

  .clue-box {
    background: #F3F4F6;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 0.74rem;
    color: #374151;
    line-height: 1.4;
    animation: fadeIn 0.2s ease;
  }

  /* Success Unlocked Animation */
  .unlock-success-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 0;
    animation: popUp 0.3s cubic-bezier(0.16, 1.25, 0.3, 1) both;
  }

  .unlock-icon-anim {
    font-size: 3.5rem;
    margin-bottom: 8px;
    animation: bounceUnlock 0.8s cubic-bezier(0.2, 1.5, 0.4, 1);
  }

  @keyframes bounceUnlock {
    0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
    60% { transform: scale(1.2) rotate(10deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .unlock-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: #059669;
    letter-spacing: -0.01em;
    margin: 0 0 6px;
  }

  .unlock-subtitle {
    font-size: 0.82rem;
    color: #4B5563;
    line-height: 1.4;
    margin: 0 0 16px;
  }

  .success-progress-bar {
    width: 100%;
    height: 6px;
    background: #E5E7EB;
    border-radius: 999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #10B981;
    width: 0%;
    animation: progressFill 1.8s linear forwards;
  }

  @keyframes progressFill {
    from { width: 0%; }
    to { width: 100%; }
  }
</style>
