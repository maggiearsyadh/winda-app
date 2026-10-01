<script>
  let { onBack } = $props();

  const features = [
    {
     
      title: 'To-Do List & Priority Tugas',
      desc: 'Catat tugas kuliah, bagi prioritas penting biar nugas lebih teratur (drag n drop)',
      // badge: 'Coming Soon',
      color: '#3B82F6'
    },
    {
      
      title: 'Timer Belajar Pomodoro',
      desc: 'Timer fokus 25 menit nugas, plus 5 menit istirahat',
      // badge: 'Coming Soon',
      color: '#10B981'
    },
    {
      
      title: 'Calculator for Management Student',
      desc: 'Hitungan cepat untuk rumus bisnis, BEP (Break Even Point), margin, atau tugas kuliah manajemen',
      // badge: 'Coming Soon',
      color: '#F59E0B'
    }
  ];

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#/';
    }
  }
</script>

<div class="coming-soon-page">
  <!-- Top Navigation Bar -->
  <header class="page-top-nav">
    <button
      type="button"
      class="back-pill-btn"
      onclick={handleBack}
      aria-label="Kembali ke beranda"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Kembali</span>
    </button>

  
  </header>

  <!-- Hero Section -->
  <div class="page-hero">
    <!-- <div class="lottie-hero-wrap">
      <iframe
        src="https://lottie.host/embed/9173b89e-723d-41e3-a278-230218ecf1f3/aRAlNWMjTf.lottie"
        title="Coming Soon Lottie"
        class="lottie-hero-frame"
        frameborder="0"
      ></iframe>
    </div> -->

    <h1 class="page-title">Fitur Baru is cominggg</h1>
    <p class="page-sub">
      Ada ide fitur lain yang kamu mau? tell him 😏
    </p>
  </div>

  <!-- Feature Cards List -->
  <main class="features-container">
    {#each features as f}
      <article class="feature-card" style="--accent-clr: {f.color};">
        <div class="feature-card-header">
          <!-- <div class="icon-circle">
            <span>{f.icon}</span>
          </div> -->
          <!-- <span class="status-pill">{f.badge}</span> -->
        </div>

        <div class="feature-body">
          <h2 class="feature-title">{f.title}</h2>
          <p class="feature-desc">{f.desc}</p>
        </div>
      </article>
    {/each}
  </main>

  <!-- Bottom Action -->
  <footer class="page-footer">
    <!-- <button
      type="button"
      class="return-home-btn"
      onclick={handleBack}
    >
      <span>← Kembali ke Beranda</span>
    </button> -->
  </footer>
</div>

<style>
  .coming-soon-page {
    width: 100%;
    min-height: 100dvh;
    padding: max(var(--sp-4), var(--sat)) var(--sp-4) max(var(--sp-6), var(--sab));
    display: flex;
    flex-direction: column;
    animation: page-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    box-sizing: border-box;

    /* Background image from public/bg.jfif */
    background-image: url('/bg.jfif');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    background-attachment: fixed;
  }

  @keyframes page-fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Top Nav ── */
  .page-top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-4);
  }

  .back-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 999px;
    background: #FFFFFF;
    border: 1.5px solid #ece7df;
    color: #1e293b;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: background-color 0.15s, transform 0.15s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .back-pill-btn:hover {
    background: #f8fafc;
    transform: translateX(-2px);
  }

  .back-pill-btn:active {
    transform: scale(0.96);
  }

  .nav-brand-badge {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(186, 73, 101, 0.1);
    color: #BA4965;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  /* ── Hero ── */
  .page-hero {
    text-align: center;
    margin-bottom: var(--sp-6);
  }

  .lottie-hero-wrap {
    width: 140px;
    height: 130px;
    margin: 0 auto var(--sp-2);
    border-radius: 20px;
    overflow: hidden;
  }

  .lottie-hero-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    display: block;
  }

  .page-title {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    color: #dedfe2;
    line-height: 1.2;
    margin: 0 0 6px;
    letter-spacing: -0.01em;
  }

  .page-sub {
    font-family: var(--font-sans);
    font-size: 0.88rem;
    color: #e7edf6;
    line-height: 1.4;
    margin: 0;
  }

  /* ── Feature Cards ── */
  .features-container {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    margin-bottom: var(--sp-6);
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1.5px solid rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    padding: 16px 18px;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .feature-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  .feature-card-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .status-pill {
    font-family: var(--font-sans);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--accent-clr, #3b82f6);
    background: rgba(59, 130, 246, 0.12);
    padding: 4px 10px;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .feature-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .feature-title {
    font-family: var(--font-sans);
    font-size: 1.02rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    line-height: 1.3;
  }

  .feature-desc {
    font-family: var(--font-sans);
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.45;
    margin: 0;
  }

  /* ── Footer ── */
  .page-footer {
    margin-top: auto;
    display: flex;
    justify-content: center;
    padding-top: var(--sp-2);
  }
</style>
