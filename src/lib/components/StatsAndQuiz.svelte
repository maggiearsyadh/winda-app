<script>
  let { onQuizClick } = $props();

  let isRolling = $state(false);

  // 8 orange dice scattered around matching the Figma screenshot
  const diceList = [
    { top: '35%', left: '12%', rot: '-10deg', mark: '¿', delay: '0s' },
    { top: '20%', left: '44%', rot: '8deg', mark: '?', delay: '0.06s' },
    { top: '22%', right: '16%', rot: '14deg', mark: '?', delay: '0.12s' },
    { top: '48%', left: '28%', rot: '12deg', mark: '?', delay: '0.04s' },
    { top: '46%', right: '34%', rot: '-15deg', mark: '¿', delay: '0.09s' },
    { bottom: '15%', left: '8%', rot: '6deg', mark: '?', delay: '0.03s' },
    { bottom: '12%', left: '42%', rot: '-8deg', mark: '?', delay: '0.11s' },
    { bottom: '14%', right: '12%', rot: '18deg', mark: '?', delay: '0.07s' },
  ];

  function handleDiceClick() {
    if (isRolling) return;
    isRolling = true;
    setTimeout(() => {
      isRolling = false;
      if (onQuizClick) onQuizClick();
    }, 550);
  }
</script>

<section class="stats-quiz-row">
  <!-- Left Card: BE AWARE ! (Lottie Animation) -->
  <article class="cream-card lottie-card">
    <div class="card-header-lottie">
      <h3 class="card-title-main">Coming soon! buat fitur ini</h3>
    </div>

    <!-- Lottie Animation Container -->
    <div class="lottie-wrap">
      <iframe
        src="https://lottie.host/embed/9173b89e-723d-41e3-a278-230218ecf1f3/aRAlNWMjTf.lottie"
        title="Be Aware Lottie Animation"
        class="lottie-iframe"
        loading="lazy"
        frameborder="0"
      ></iframe>
    </div>
  </article>

  <!-- Right Card: QUIZ ABOUT ED -->
  <article class="cream-card quiz-card">
    <h2 class="card-title-main text-center">Play Quiz</h2>

    <!-- Interactive dice playground -->
    <button
      type="button"
      class="dice-playground"
      class:rolling={isRolling}
      onclick={handleDiceClick}
      aria-label="Kocok dadu dan buka kuis cinta"
    >
      {#each diceList as dice}
        <div
          class="orange-die"
          class:is-rolling={isRolling}
          style="
            top: {dice.top || 'auto'};
            bottom: {dice.bottom || 'auto'};
            left: {dice.left || 'auto'};
            right: {dice.right || 'auto'};
            --base-rot: {dice.rot};
            --roll-delay: {dice.delay};
            transform: rotate({dice.rot});
          "
        >
          <span class="die-mark">{dice.mark}</span>
        </div>
      {/each}
    </button>
  </article>
</section>

<style>
  .stats-quiz-row {
    padding: var(--sp-4);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-3);
  }

  .cream-card {
    background-color: var(--clr-card-cream);
    border-radius: var(--radius-lg);
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    min-height: 180px;
  }

  .card-title-main {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: #000000;
    letter-spacing: 0.04em;
    line-height: 1;
    margin-bottom: 4px;
    font-weight: 800;
  }

  /* ── Left Lottie Card ── */
  .lottie-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .card-header-lottie {
    margin-bottom: var(--sp-1);
  }

  .lottie-wrap {
    flex: 1;
    width: 100%;
    min-height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .lottie-iframe {
    width: 100%;
    height: 100%;
    min-height: 130px;
    border: none;
    outline: none;
    background: transparent;
    display: block;
    overflow: hidden;
  }

  /* ── Right Quiz Card ── */
  .quiz-card {
    position: relative;
    overflow: hidden;
  }

  .text-center {
    text-align: center;
  }

  .dice-playground {
    position: relative;
    flex: 1;
    width: 100%;
    border: none;
    background: none;
    cursor: pointer;
    min-height: 120px;
    padding: 0;
  }

  .orange-die {
    position: absolute;
    width: 26px;
    height: 26px;
    background: var(--clr-dice-orange);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-family: var(--font-sans);
    font-weight: 900;
    box-shadow: 1px 2px 6px rgba(0, 0, 0, 0.16);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease, box-shadow 0.2s ease;
  }

  .dice-playground:hover .orange-die {
    filter: brightness(1.1);
    box-shadow: 0 4px 10px rgba(220, 100, 30, 0.3);
  }

  .orange-die.is-rolling {
    animation: dice-tumble 0.52s cubic-bezier(0.25, 1, 0.5, 1) both;
    animation-delay: var(--roll-delay, 0s);
  }

  @keyframes dice-tumble {
    0% {
      transform: rotate(var(--base-rot, 0deg)) scale(1);
    }
    30% {
      transform: rotate(calc(var(--base-rot, 0deg) + 120deg)) scale(1.3) translateY(-8px);
    }
    60% {
      transform: rotate(calc(var(--base-rot, 0deg) + 240deg)) scale(1.15) translateX(4px);
    }
    85% {
      transform: rotate(calc(var(--base-rot, 0deg) + 330deg)) scale(1.05) translateY(2px);
    }
    100% {
      transform: rotate(calc(var(--base-rot, 0deg) + 360deg)) scale(1);
    }
  }

  .die-mark {
    font-size: 15px;
    line-height: 1;
    pointer-events: none;
  }
</style>
