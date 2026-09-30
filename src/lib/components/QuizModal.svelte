<script>
  let { isOpen = $bindable(false), onClose } = $props();

  // Step 1: Root Question
  const rootQuestion = {
    q: 'How\'s energimu dan harimu sejauh ini, An? ',
    sub: 'Pilih yang paling menggambarkan kondisimu saat ini:',
    options: [
      { text: 'Baterai 100%', branch: 'fun', emoji: '⚡' },
      { text: 'Agak low-batt', branch: 'lowbatt', emoji: '🪫' },
      { text: 'Pusing tugas', branch: 'task', emoji: '📚' },
      { text: 'Lagi overthinking', branch: 'overthinking', emoji: '💭' }
    ]
  };

  // Step 2: Adaptive Questions & Motivations
  const branchData = {
    fun: {
      type: 'math',
      badge: 'Pertanyaan Matematika Cepat',
      q: 'Karena baterai lagi 100% coba asah otak dikit : 7 × 8 berapa? ',
      sub: 'Jawab cepat tanpa kalkulator dekk:',
      options: [
        { text: '54', isCorrect: false, feedback: 'Belajar lagi dek hahahah ' },
        { text: '56', isCorrect: true, feedback: 'Pinter banget 7 × 8 = 56 ' },
        { text: '58', isCorrect: false, feedback: 'Belajar lagi dek hahahah ' },
        { text: 'Ga tau, yang penting Maggie ganteng dan sholeh ', isCorrect: true, feedback: 'Jawaban paling benar dan kamu fans Maggie' }
      ],
      note: 'always keep your energy high and your head higher'
    },
    lowbatt: {
      type: 'quiz',
      badge: 'Pertanyaan Self-Care',
      q: 'Lagi low-batt ya, apa hal yang paling benar dilakukan saat energimu habis?',
      sub: 'Pilih tindakan yang paling bijak untuk diri kamu:',
      options: [
        { text: 'Maksa begadang sambil nahan pusing', isCorrect: false, feedback: 'Jangan dipaksain yaa, Healtiness matters more' },
        { text: 'istirahat cukup, dan biarkan energi kamu recharge ', isCorrect: true, feedback: 'Pintar cekalii' },
        { text: 'Skip makan dan overthinking sendirian', isCorrect: false, feedback: 'Waduh ga boleh skip makan yaa' }
      ],
      note: 'istirahat yang nyaman recharge energi u sampai pulih '
    },
    task: {
      type: 'free_pass',
      badge: 'Bebas Quiz Spesial Tugas',
      q: 'Gada pertanyaan, soalnya lagi banyak tugas ',
      sub: 'Tugasmu udah banyak dan bikin pusing, jadi di sesi ini ga usah mikir kuis lagi. Kamu otomatis dapat nilai benar gratis dari Maggie',
      options: [
        { text: 'Makasih Maggie pengertian banget', isCorrect: true, feedback: 'Sama-sama,semungkuyy nugasnya' },
        { text: 'Langsung mau istirahat sejenak ', isCorrect: true, feedback: 'Pinter jangan lupa minum air dan rileks ' }
      ],
      note: 'Semungkuyy nugasnya jangan lupa istirahat, i will always dukung kamu '
    },
    overthinking: {
      type: 'motivation',
      badge: 'Afirmasi & Motivasi Khusus',
      q: 'Take a deep breath An... ',
      sub: 'Karena lagi OVT ga ada soal kuis di sini, cuma ada pesan penyemangat buat kamu:',
      motivationText: 'Badai pasti berlalu kan ga selamanya ada badai di lautan. You\'re going to be okay',
      options: [
        { text: 'Makasih udah selalu ingatin aku ', isCorrect: true, feedback: 'as always, Proud of you and everything will be okay' },
        { text: 'Aku tarik nafas dan coba lebih tenang ', isCorrect: true, feedback: 'Proud of you An, everything will be okay' }
      ],
      note: 'Tarik nafas... you are safe and everything will be fine '
    }
  };

  // State: step 1 = root, step 2 = branch, step 3 = score result
  let step = $state(1);
  let selectedBranch = $state(null);
  let score = $state(0);
  let answerFeedback = $state('');

  let currentBranchData = $derived.by(() => {
    if (selectedBranch && branchData[selectedBranch]) {
      return branchData[selectedBranch];
    }
    return null;
  });

  function handleRootChoice(branchKey) {
    selectedBranch = branchKey;
    score = 50; // Points for honesty in Step 1
    step = 2;
  }

  function handleBranchChoice(option) {
    if (option.isCorrect) {
      score += 50; // Total 100
    }
    answerFeedback = option.feedback;
    step = 3;
  }

  function handleBackToRoot() {
    step = 1;
    selectedBranch = null;
    score = 0;
  }

  function handleReset() {
    step = 1;
    selectedBranch = null;
    score = 0;
    answerFeedback = '';
  }

  function handleClose() {
    isOpen = false;
    handleReset();
    if (onClose) onClose();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Love Quiz Modal"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="modal-box">
      <!-- Close Button -->
      <button
        type="button"
        class="modal-close-btn"
        aria-label="Tutup kuis"
        onclick={handleClose}
      >
        ✕
      </button>

      {#if step === 1}
        <!-- STEP 1: ROOT QUESTION -->
        <header class="quiz-header">
          <div class="badge-pill">
            <span>Pertanyaan 1 dari 2</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: 50%;"></div>
          </div>
          <h2 class="modal-question">{rootQuestion.q}</h2>
          <p class="modal-question-sub">{rootQuestion.sub}</p>
        </header>

        <div class="options-list">
          {#each rootQuestion.options as opt, i}
            <button
              type="button"
              class="option-btn"
              onclick={() => handleRootChoice(opt.branch)}
            >
              <span class="opt-letter">{String.fromCharCode(65 + i)}</span>
              <span class="opt-text">{opt.text}</span>
            </button>
          {/each}
        </div>

      {:else if step === 2 && currentBranchData}
        <!-- STEP 2: ADAPTIVE BRANCH QUESTION -->
        <header class="quiz-header">
          <div class="badge-pill">
            <span>{currentBranchData.badge} • Pertanyaan 2 dari 2</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: 100%;"></div>
          </div>
          <h2 class="modal-question">{currentBranchData.q}</h2>
          <p class="modal-question-sub">{currentBranchData.sub}</p>
        </header>

        <!-- Optional Motivation Card for Overthinking -->
        {#if currentBranchData.motivationText}
          <div class="motivation-box">
            <div class="motivation-quote-icon">💌</div>
            <p class="motivation-text">{currentBranchData.motivationText}</p>
          </div>
        {/if}

        <div class="options-list">
          {#each currentBranchData.options as opt, i}
            <button
              type="button"
              class="option-btn"
              onclick={() => handleBranchChoice(opt)}
            >
              <span class="opt-letter">{String.fromCharCode(65 + i)}</span>
              <span class="opt-text">{opt.text}</span>
            </button>
          {/each}

          <button
            type="button"
            class="back-step-btn"
            onclick={handleBackToRoot}
          >
            ◀ Ganti pilihan sebelumnya
          </button>
        </div>

      {:else if step === 3}
        <!-- STEP 3: PURE SCORE RESULT VIEW (NO VOUCHER) -->
        <div class="score-result-view">
          <div class="result-badge-wrap">
            <span class="result-badge">🎉 Kuis Selesai</span>
          </div>

          <!-- Score Circle -->
          <div class="score-display-circle" class:is-perfect={score === 100}>
            <span class="score-number">{score}</span>
            <span class="score-total">/100</span>
          </div>

          <h3 class="result-title">
            {score === 100 ? 'Hebat Banget' : 'Tetap Keren'}
          </h3>

          {#if answerFeedback}
            <div class="feedback-card">
              <p class="feedback-quote">"{answerFeedback}"</p>
            </div>
          {/if}

          {#if currentBranchData?.note}
            <p class="result-note">{currentBranchData.note}</p>
          {/if}

          <!-- Action Buttons -->
          <div class="result-actions">
            <button
              type="button"
              class="reroll-btn"
              onclick={handleReset}
            >
              ↺ Main Lagi
            </button>

            <button
              type="button"
              class="close-done-btn"
              onclick={handleClose}
            >
              Tutup Kuis ✓
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(var(--sp-4), var(--sat)) var(--sp-4) max(var(--sp-4), var(--sab));
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-box {
    position: relative;
    width: 100%;
    max-width: 420px;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    overflow-x: hidden;
    background: #FFFFFF;
    border-radius: 28px;
    padding: 24px 18px 20px;
    box-shadow: 0 24px 60px rgba(0, 30, 80, 0.25);
    animation: pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    scrollbar-width: thin;
    box-sizing: border-box;
  }

  .modal-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    min-width: 36px !important;
    min-height: 36px !important;
    border-radius: 50%;
    background: #F1F5F9;
    color: #4b5563;
    font-size: 1.1rem;
    font-weight: var(--fw-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    transition: background 0.15s ease, transform 0.15s ease;
    z-index: 10;
    box-sizing: border-box;
  }

  .modal-close-btn:hover {
    background: #E2E8F0;
    transform: scale(1.08);
  }

  /* ── Quiz Header & Progress ── */
  .quiz-header {
    text-align: center;
    margin-bottom: 14px;
  }

  .badge-pill {
    display: inline-block;
    background: #FFF0ED;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--clr-dice-orange);
    text-transform: none;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }

  .progress-bar-track {
    width: 100%;
    height: 5px;
    background: #F1F5F9;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 14px;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--clr-dice-orange);
    border-radius: 10px;
    transition: width 0.3s ease;
  }

  .modal-question {
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.35;
    margin-bottom: 4px;
    font-family: var(--font-sans);
  }

  .modal-question-sub {
    font-size: 0.76rem;
    color: #64748B;
    margin: 0 auto;
    max-width: 300px;
    line-height: 1.35;
  }

  /* ── Motivation Box (Overthinking) ── */
  .motivation-box {
    background: linear-gradient(135deg, #FFF1F2 0%, #FFF8EE 100%);
    border: 1px solid #FECDD3;
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 12px;
    text-align: left;
    display: flex;
    gap: 10px;
    box-sizing: border-box;
  }

  .motivation-quote-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .motivation-text {
    font-size: 0.78rem;
    color: #881337;
    line-height: 1.45;
    font-weight: 500;
    margin: 0;
  }

  /* ── Options List ── */
  .options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #F8FAFC;
    border: 1.5px solid #E2E8F0;
    border-radius: 14px;
    padding: 10px 14px;
    text-align: left;
    transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    cursor: pointer;
    min-height: unset !important;
    min-width: unset !important;
    width: 100%;
    box-sizing: border-box;
  }

  .option-btn:hover {
    border-color: var(--clr-dice-orange);
    background: #FFFFFF;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
  }

  .opt-letter {
    width: 26px;
    height: 26px;
    min-width: 26px !important;
    min-height: 26px !important;
    border-radius: 50%;
    background: #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .option-btn:hover .opt-letter {
    background: var(--clr-dice-orange);
    color: #FFFFFF;
  }

  .opt-text {
    font-size: 0.8rem;
    font-weight: 500;
    color: #1E293B;
    line-height: 1.35;
  }

  .back-step-btn {
    background: none;
    border: none;
    color: #64748B;
    font-size: 0.76rem;
    font-weight: 600;
    padding: 6px;
    cursor: pointer;
    transition: color 0.15s ease;
    margin-top: 4px;
    min-height: unset !important;
    min-width: unset !important;
    width: 100%;
    text-align: center;
  }

  .back-step-btn:hover {
    color: var(--clr-dice-orange);
  }

  /* ── Score Result View ── */
  .score-result-view {
    text-align: center;
    position: relative;
    animation: fade-in 0.3s ease-out both;
    padding: 6px 4px 4px;
  }

  .result-badge-wrap {
    margin-bottom: 12px;
  }

  .result-badge {
    display: inline-block;
    background: #FEF3C7;
    color: #B45309;
    border: 1px solid #FDE68A;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .score-display-circle {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
    border: 3px solid var(--clr-dice-orange);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    box-shadow: 0 4px 14px rgba(220, 100, 30, 0.18);
  }

  .score-display-circle.is-perfect {
    border-color: #22C55E;
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.2);
  }

  .score-number {
    font-size: 1.55rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1;
  }

  .score-total {
    font-size: 0.68rem;
    font-weight: 600;
    color: #64748B;
    margin-top: 2px;
  }

  .result-title {
    font-family: var(--font-sans);
    font-size: 1.15rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 10px;
    line-height: 1.3;
  }

  .feedback-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 12px;
    box-sizing: border-box;
  }

  .feedback-quote {
    font-size: 0.8rem;
    color: #334155;
    font-weight: 500;
    font-style: italic;
    line-height: 1.4;
    margin: 0;
  }

  .result-note {
    font-size: 0.78rem;
    color: #64748B;
    line-height: 1.4;
    margin-bottom: 16px;
    padding: 0 6px;
  }

  /* ── Action Buttons ── */
  .result-actions {
    display: flex;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .reroll-btn {
    flex: 1;
    background: #F1F5F9;
    color: #475569;
    font-weight: var(--fw-bold);
    font-size: 0.8rem;
    padding: 10px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid #CBD5E1;
    cursor: pointer;
    min-height: 40px !important;
    min-width: unset !important;
    transition: background 0.15s ease, transform 0.15s ease;
    box-sizing: border-box;
  }

  .reroll-btn:hover {
    background: #E2E8F0;
    transform: translateY(-1px);
  }

  .close-done-btn {
    flex: 1;
    background: #0F172A;
    color: #FFFFFF;
    font-weight: var(--fw-bold);
    font-size: 0.8rem;
    padding: 10px 14px;
    border-radius: var(--radius-pill);
    border: none;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.2);
    min-height: 40px !important;
    min-width: unset !important;
    transition: filter 0.15s ease, transform 0.15s ease;
    box-sizing: border-box;
  }

  .close-done-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
</style>
