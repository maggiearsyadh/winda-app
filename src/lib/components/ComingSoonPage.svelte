<script>
  import { onMount } from 'svelte';
  import { couple } from '$lib/data/content.js';
  import { togglePlayPause, subscribeAudio } from '$lib/audioManager.js';

  let { onBack } = $props();

  let isPlaying = $state(false);
  let currentTitle = $state('');
  let hasTrack = $state(false);

  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
      currentTitle = state.currentTitle || '';
      hasTrack = !!state.currentMoodId;
    });
  });

  let taskCount = $state(15);
  let activeBoxId = $state('today');
  let isNotifOpen = $state(false);

  onMount(() => {
    try {
      const raw = localStorage.getItem('winda_kanban_tasks_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          taskCount = parsed.length;
        }
      }
    } catch (e) {}
  });

  const boxes = [
    {
      id: 'today',
      title: 'Today',
      count: '15',
      label: 'Task',
      icon: 'calendar',
      sub: 'To-Do List & Priority',
      href: '#/kanban',
      isActiveFeature: true
    },
    {
      id: 'calculator',
      title: 'Calculator Scientific',
      count: '0',
      label: 'Task',
      badge: 'SOON',
      svgIcon: '/winda_stumble.svg',
      sub: 'Kalkulator BEP & Margin',
      isActiveFeature: false
    },
    {
      id: 'podomoro',
      title: 'Podomoro',
      count: '0',
      label: 'Task',
      badge: 'SOON',
      svgIcon: '/stumble_maggie.svg',
      sub: 'Ide Fitur Baru',
      isActiveFeature: false
    }
  ];

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#/';
    }
  }

  function handleBoxClick(box) {
    activeBoxId = box.id;
    if (box.href) {
      window.location.hash = box.href;
    }
  }
</script>

<div class="workout-layout-page">
  <!-- Top Navigation Bar (Reference Layout: Big Title on Left, Action Pill on Right) -->
  <header class="workout-header">
    <div class="header-left-col">
      <div class="user-greeting-row">
        <div class="avatar-circle">
          <svg viewBox="0 0 40 40" width="36" height="36" class="avatar-svg">
            <circle cx="20" cy="20" r="19" fill="#FEA0A0" />
            <path d="M12 38 C12 30, 28 30, 28 38" fill="#FFFFFF" stroke="#111" stroke-width="1.2" />
            <path d="M17 30 L20 34 L23 30" fill="none" stroke="#111" stroke-width="1.2" />
            <path d="M11 18 C10 28, 9 34, 13 36 C14 30, 14 26, 14 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
            <path d="M29 18 C30 28, 31 34, 27 36 C26 30, 26 26, 26 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
            <ellipse cx="20" cy="20" rx="6.5" ry="7.5" fill="#FFE5D1" stroke="#111" stroke-width="1.2" />
            <path d="M13 18 C14 13, 26 13, 27 18 C25 15, 23 16, 20 16 C17 16, 15 15, 13 18 Z" fill="#5A2E17" stroke="#111" stroke-width="1.2" />
            <circle cx="17.8" cy="19.5" r="0.9" fill="#111" />
            <circle cx="22.2" cy="19.5" r="0.9" fill="#111" />
            <path d="M18.8 23 C19.5 24, 20.5 24, 21.2 23" fill="none" stroke="#111" stroke-width="1" stroke-linecap="round" />
          </svg>
        </div>
        <span class="greeting-text">Hiiii, {couple.her || 'Winda'}</span>
      </div>
      <h1 class="page-headline">Tasks</h1>
    </div>

    <div class="header-right-tools">
      {#if hasTrack}
        <button
          type="button"
          class="round-action-btn"
          onclick={togglePlayPause}
          aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
          title={isPlaying ? `Memutar lagu ${currentTitle}` : 'Musik dijeda'}
        >
          <span class="disc-vinyl" class:is-spinning={isPlaying}>💿</span>
        </button>
      {/if}

      <button
        type="button"
        class="round-action-btn"
        onclick={handleBack}
        title="Kembali ke Beranda"
        aria-label="Kembali ke Beranda"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
    </div>
  </header>

  <!-- 1. Top Featured Hero Card: Blue #BBE7EF Today Card (Reference: "AIDONG - Immersive sensory training") -->
  <section class="hero-card-section">
    <button
      type="button"
      class="hero-blue-card"
      onclick={() => handleBoxClick(boxes[0])}
      aria-label="Buka Today Task Management"
    >
      <!-- Top Row inside Blue Card: Translucent Badge & Round Icon -->
      <div class="hero-top-row">
        <span class="hero-pill-badge">TODAY</span>

        <div class="hero-icon-disc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F3302" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <circle cx="8" cy="15" r="1" fill="#1F3302"></circle>
            <circle cx="12" cy="15" r="1" fill="#1F3302"></circle>
            <circle cx="16" cy="15" r="1" fill="#1F3302"></circle>
          </svg>
        </div>
      </div>

      <!-- Main Text in Blue Card -->
      <div class="hero-body">
        <h2 class="hero-title">
          {taskCount ? String(taskCount).padStart(2, '0') : '04'} Active Tasks
        </h2>
        <p class="hero-subtitle">
          To-Do List &bull; mau ngapain aja hari ini An?
        </p>
      </div>

      <!-- Bottom action prompt inside Blue Card -->
      <div class="hero-footer-row">
        <span class="hero-action-link">
          <span>Buka Kanban Board</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </span>
      </div>

      <!-- Soft Decorative Organic Waves (Reference style) -->
      <div class="hero-wave-deco"></div>
    </button>
  </section>

  <!-- 2. Middle Card: Workout Progress Style Overview Card (Reference: "Workout Progress 12 Exercise left [75%]") -->
  <!-- <section class="progress-section">
    <a href="#/kanban" class="progress-overview-card">
      <div class="progress-text-col">
        <h3 class="progress-title">Winda's Total Task</h3>
        <p class="progress-subtitle">
          {taskCount ? taskCount : 0} Tasks recorded &bull; Priority tracking
        </p>
      </div> -->

      <!-- Circular Progress Ring (Matches the 75% teal ring in reference) -->
      <!-- <div class="progress-ring-box">
        <svg viewBox="0 0 44 44" class="progress-ring-svg">
          <circle cx="22" cy="22" r="17" class="ring-bg" />
          <circle cx="22" cy="22" r="17" class="ring-active" stroke-dasharray="106.8" stroke-dashoffset="26.7" />
        </svg>
        <span class="progress-percent-val">75%</span>
      </div>
    </a>
  </section> -->

  <!-- 3. Bottom Section: Muscles Workload Style Grid (Reference: "Muscles workload" 2-col cards) -->
  <section class="workload-section">
    <div class="workload-heading-row">
      <h2 class="workload-title">Feature & Tools</h2>
      <p class="workload-sub">Pilih fitur atau alat bantu yang ingin digunakan</p>
    </div>

    <!-- 2-Column Grid of 3D Pop-Out Cards (Catalog Reference Style) -->
    <div class="workload-grid">
      {#each boxes.slice(1) as box}
        <button
          type="button"
          class="workload-card"
          onclick={() => handleBoxClick(box)}
        >
          <!-- Top Right Badge (Matches -5% pill in reference) -->
          {#if box.badge}
            <span class="card-badge">{box.badge}</span>
          {/if}

          <!-- Character Illustration: Pops out crossing over the top border -->
          {#if box.svgIcon}
            <div class="card-character-stage">
              <img
                src={box.svgIcon}
                alt={box.title}
                class="popout-character-img"
              />
            </div>
          {:else}
            <div class="card-icon-canvas">
              <div class="icon-round-disc">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3E5C06" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
          {/if}

          <!-- Bottom Card Labels: Title and Subtitle -->
          <div class="card-bottom-labels">
            <h3 class="card-title-text">{box.title}</h3>
            <span class="card-sub-text">{box.sub}</span>
          </div>

          <!-- Bottom Floating Action Button (Matches round heart disc in reference) -->
          <div class="card-bottom-action-disc" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#18181B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Notification Dropdown / Modal -->
  {#if isNotifOpen}
    <button type="button" class="notif-toast-banner" onclick={() => isNotifOpen = false}>
      <span class="notif-bell-icon">🔔</span>
      <div class="notif-text-wrap">
        <strong>Pemberitahuan Winda</strong>
        <p>Semua fitur baru sedang dirancang. Tell Him kalau ada request! 😉</p>
      </div>
    </button>
  {/if}
</div>

<style>
  /* ── Page Canvas (Clean White Matching Reference) ── */
  .workout-layout-page {
    width: 100%;
    max-width: 100%;
    min-height: 100dvh;
    padding: max(var(--sp-4), var(--sat)) 18px max(96px, var(--sab));
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: #FFFFFF;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
    animation: fadeInPage 0.22s ease-out;
    position: relative;
    overflow-x: hidden;
  }

  .workout-layout-page :global(*),
  .workout-layout-page button,
  .workout-layout-page h1,
  .workout-layout-page h2,
  .workout-layout-page h3,
  .workout-layout-page span,
  .workout-layout-page p,
  .workout-layout-page a {
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes fadeInPage {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Header: Top Navigation (Workout Title + Action Disc) ── */
  .workout-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
    width: 100%;
    box-sizing: border-box;
  }

  .header-left-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-greeting-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .avatar-circle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  .avatar-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .greeting-text {
    font-size: 0.84rem;
    font-weight: 700;
    color: #4A5568;
    letter-spacing: -0.01em;
  }

  .page-headline {
    font-size: 2.1rem;
    font-weight: 800;
    color: #111827;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.025em;
  }

  .header-right-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
  }

  .round-action-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .round-action-btn:hover {
    transform: scale(1.06);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .round-action-btn:active {
    transform: scale(0.95);
  }

  .disc-vinyl {
    font-size: 1.15rem;
    display: inline-block;
  }

  .disc-vinyl.is-spinning {
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── 1. Hero Blue Card (#BBE7EF) – Exact match to reference top card ── */
  .hero-card-section {
    width: 100%;
    margin-bottom: 16px;
  }

  .hero-blue-card {
    width: 100%;
    background: #AED035;
    border: none;
    border-radius: 28px;
    padding: 22px 20px 20px;
    min-height: 168px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 10px 28px rgba(125, 160, 20, 0.22);
    cursor: pointer;
    text-align: left;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  .hero-blue-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 34px rgba(125, 160, 20, 0.3);
  }

  .hero-blue-card:active {
    transform: scale(0.985);
  }

  .hero-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 2;
    margin-bottom: 14px;
  }

  .hero-pill-badge {
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: #1F3003;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: 999px;
    display: inline-block;
  }

  .hero-icon-disc {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(26, 48, 4, 0.1);
  }

  .hero-body {
    position: relative;
    z-index: 2;
    margin-bottom: 12px;
  }

  .hero-title {
    font-size: 1.55rem;
    font-weight: 800;
    color: #162402;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0 0 6px;
  }

  .hero-subtitle {
    font-size: 0.84rem;
    font-weight: 600;
    color: #2E4506;
    line-height: 1.35;
    margin: 0;
  }

  .hero-footer-row {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
  }

  .hero-action-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.76rem;
    font-weight: 800;
    color: #162402;
    background: rgba(255, 255, 255, 0.85);
    padding: 5px 12px;
    border-radius: 999px;
    backdrop-filter: blur(4px);
    transition: background 0.15s;
  }

  .hero-blue-card:hover .hero-action-link {
    background: #FFFFFF;
  }

  /* Decorative soft circle waves matching reference */
  .hero-wave-deco {
    position: absolute;
    right: -30px;
    top: -20px;
    width: 170px;
    height: 170px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(174, 208, 53, 0) 75%);
    pointer-events: none;
    z-index: 1;
  }

  /* ── 2. Progress Overview Card (Reference: "Workout Progress 12 Exercise left [75%]") ── */
  .progress-section {
    width: 100%;
    margin-bottom: 24px;
  }

  .progress-overview-card {
    background: #f5f0e9;
    border-radius: 22px;
    border: 1px solid #ECE2D5;
    padding: 16px 18px;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.035);
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-decoration: none;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  .progress-overview-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  }

  .progress-text-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #111827;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .progress-subtitle {
    font-size: 0.78rem;
    font-weight: 600;
    color: #6B7280;
    margin: 0;
  }

  /* Circular Ring */
  .progress-ring-box {
    width: 44px;
    height: 44px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .progress-ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: #E2D7C8;
    stroke-width: 3.5;
  }

  .ring-active {
    fill: none;
    stroke: #92B919;
    stroke-width: 3.5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.4s ease;
  }

  .progress-percent-val {
    position: absolute;
    font-size: 0.68rem;
    font-weight: 800;
    color: #273A05;
  }

  /* ── 3. Bottom Section: Muscles Workload Grid (Reference Layout) ── */
  .workload-section {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .workload-heading-row {
    margin-bottom: 14px;
  }

  .workload-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.015em;
    margin: 0 0 3px;
  }

  .workload-sub {
    font-size: 0.8rem;
    font-weight: 500;
    color: #6B7280;
    margin: 0;
  }

  .workload-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 14px;
    row-gap: 48px;
    margin-top: 52px;
    margin-bottom: 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .workload-card {
    background: #FFFFFF;
    border: 1.5px solid #F0ECE4;
    border-radius: 26px;
    padding: 0 12px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
    transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease, border-color 0.22s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .workload-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.08);
    border-color: #E2DDD3;
  }

  .workload-card:active {
    transform: scale(0.97);
  }

  /* Badge in top right corner (like -5% / -10% in reference) */
  .card-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #18181B;
    color: #FFFFFF;
    font-size: 0.62rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
    letter-spacing: 0.03em;
    z-index: 4;
  }

  /* Stage where the character stands and pops out over the top border */
  .card-character-stage {
    position: relative;
    width: 100%;
    height: 108px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-top: -48px;
    z-index: 2;
    pointer-events: none;
  }

  .popout-character-img {
    height: 138px;
    max-width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.14));
    transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .workload-card:hover .popout-character-img {
    transform: translateY(-5px) scale(1.06);
  }

  .card-icon-canvas {
    width: 100%;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  .icon-round-disc {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #EAE3D6;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  /* Labels */
  .card-bottom-labels {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    margin-top: 10px;
    z-index: 2;
  }

  .card-title-text {
    font-size: 0.88rem;
    font-weight: 800;
    color: #111827;
    margin: 0;
    line-height: 1.25;
    word-break: break-word;
  }

  .card-sub-text {
    font-size: 0.72rem;
    font-weight: 700;
    color: #4B5563;
    line-height: 1.25;
    margin-top: 2px;
  }

  /* Floating round heart button overlapping bottom border (like reference) */
  .card-bottom-action-disc {
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #ECE7DE;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .workload-card:hover .card-bottom-action-disc {
    transform: translateX(-50%) scale(1.1);
    background: #FAF7F2;
  }

  /* ── Notification Banner Toast ── */
  .notif-toast-banner {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 380px;
    background: #FFFFFF;
    border-radius: 16px;
    padding: 12px 16px;
    border: 1px solid #E5E7EB;
    text-align: left;
    font-family: inherit;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
  }

  .notif-bell-icon {
    font-size: 1.4rem;
  }

  .notif-text-wrap strong {
    display: block;
    font-size: 0.84rem;
    color: #111827;
    margin-bottom: 2px;
  }

  .notif-text-wrap p {
    font-size: 0.74rem;
    color: #6B7280;
    margin: 0;
    line-height: 1.35;
  }
</style>
