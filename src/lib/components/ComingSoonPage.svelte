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
      id: 'goals',
      title: 'Excel (coming soon)',
      count: '0',
      label: 'Task',
      icon: 'users',
      sub: 'Timer Pomodoro 25m',
      isActiveFeature: false
    },
    {
      id: 'on_hold',
      title: 'Calculator Scientific',
      count: '0',
      label: 'Task',
      icon: 'hourglass',
      sub: 'Kalkulator BEP & Margin',
      isActiveFeature: false
    },
    {
      id: 'past_due',
      title: 'Podomoro',
      count: '0',
      label: 'Task',
      icon: 'search_calendar',
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

<div class="coming-soon-pastel-page">
  <!-- Top Welcome & Profile Navigation Header (Synced with Main Page) -->
  <header class="app-header-sync">
    <div class="user-row">
      <div class="user-profile">
        <!-- Cartoon girl avatar from Main Page -->
        <div class="avatar-circle">
          <svg viewBox="0 0 40 40" width="40" height="40" class="avatar-svg">
            <!-- Background circle teal -->
            <circle cx="20" cy="20" r="19" fill="#FEA0A0" />
            <!-- Shirt -->
            <path d="M12 38 C12 30, 28 30, 28 38" fill="#FFFFFF" stroke="#111" stroke-width="1.2" />
            <path d="M17 30 L20 34 L23 30" fill="none" stroke="#111" stroke-width="1.2" />
            <!-- Hair Back -->
            <path d="M11 18 C10 28, 9 34, 13 36 C14 30, 14 26, 14 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
            <path d="M29 18 C30 28, 31 34, 27 36 C26 30, 26 26, 26 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
            <!-- Face -->
            <ellipse cx="20" cy="20" rx="6.5" ry="7.5" fill="#FFE5D1" stroke="#111" stroke-width="1.2" />
            <!-- Hair Front -->
            <path d="M13 18 C14 13, 26 13, 27 18 C25 15, 23 16, 20 16 C17 16, 15 15, 13 18 Z" fill="#5A2E17" stroke="#111" stroke-width="1.2" />
            <!-- Eyes -->
            <circle cx="17.8" cy="19.5" r="0.9" fill="#111" />
            <circle cx="22.2" cy="19.5" r="0.9" fill="#111" />
            <!-- Smile -->
            <path d="M18.8 23 C19.5 24, 20.5 24, 21.2 23" fill="none" stroke="#111" stroke-width="1" stroke-linecap="round" />
          </svg>
        </div>

        <span class="greeting-text">
          Hiiii, {couple.her || 'Winda'}
        </span>
      </div>

      <!-- Action Items (Right) -->
      <div class="header-right-tools">
        {#if hasTrack}
          <button
            type="button"
            class="header-music-disc"
            onclick={togglePlayPause}
            aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
            title={isPlaying ? `Memutar lagu ${currentTitle}` : 'Musik dijeda'}
          >
            <span class="disc-vinyl" class:is-spinning={isPlaying}>
              💿
            </span>
            {#if isPlaying}
              <span class="music-wave-dot"></span>
            {/if}
          </button>
        {/if}

        <button
          type="button"
          class="header-action-disc"
          onclick={handleBack}
          title="Kembali ke Beranda"
          aria-label="Kembali ke Beranda"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Big Headline: Start today's tasks. -->
  <div class="headline-container">
    <h1 class="start-tasks-title">
      <span class="muted-word">Winda's</span> Task Management.
    </h1>
    <p class="headline-sub">
      mau ngapain aja hari ini An?
    </p>
  </div>

  <!-- 4 Boxes Grid (Exact 2x2 Layout from Reference Image) -->
  <main class="four-boxes-grid">
    {#each boxes as box}
      <button
        type="button"
        class="stat-box-card"
        class:is-active-box={activeBoxId === box.id}
        onclick={() => handleBoxClick(box)}
      >
        <!-- Top Row: Round Icon + Title -->
        <div class="box-top-row">
          <div class="box-icon-disc">
            {#if box.icon === 'calendar'}
              <!-- Calendar Icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6C99" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <circle cx="8" cy="15" r="1" fill="#3B6C99"></circle>
                <circle cx="12" cy="15" r="1" fill="#3B6C99"></circle>
                <circle cx="16" cy="15" r="1" fill="#3B6C99"></circle>
              </svg>
            {:else if box.icon === 'users'}
              <!-- Users / Goals Icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6C99" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            {:else if box.icon === 'hourglass'}
              <!-- Hourglass Icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6C99" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 22h14"></path>
                <path d="M5 2h14"></path>
                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
              </svg>
            {:else}
              <!-- Past Due Calendar Search Icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6C99" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <circle cx="14" cy="16" r="2.5"></circle>
                <line x1="16" y1="18" x2="18" y2="20"></line>
              </svg>
            {/if}
          </div>
          <span class="box-title-text">{box.title}</span>
        </div>

        <!-- Bottom Row: Count + Label -->
        <div class="box-bottom-stat">
          <span class="box-count-number">{box.id === 'today' ? (taskCount ? String(taskCount).padStart(2, '0') : box.count) : box.count}</span>
          <span class="box-unit-label">{box.label}</span>
        </div>

        <!-- Subtle Organic Wave in Background (Matching image) -->
        <div class="card-wave-bg"></div>
      </button>
    {/each}
  </main>

  <!-- Bottom Tasks Section (Matching Image 2) -->
  <section class="bottom-tasks-section">
    <div class="section-header-row">
      <h2 class="section-title-text">Today's tasks</h2>
      <a href="#/kanban" class="view-all-link">View All</a>
    </div>

    <!-- Active Task Card (Exec Oversight style) -->
    <div class="exec-task-card">
      <div class="exec-card-left">
        <span class="task-time-badge">All Day</span>
        <h3 class="exec-task-title">Winda's Total Task</h3>
        <p class="exec-task-subtitle">See total task</p>

        <a href="#/kanban" class="open-kanban-link">
          <span>Kanban Board</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>

      <!-- Multiple User Avatars (Right) -->
      <div class="exec-card-avatars">
        <div class="mini-overlap-avatar avatar-1">
          <svg viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="15" fill="#E8B4B8" />
            <circle cx="16" cy="13" r="6" fill="#6B3322" />
            <path d="M8 28 C8 21, 24 21, 24 28" fill="#F87171" />
          </svg>
        </div>
        <div class="mini-overlap-avatar avatar-2">
          <svg viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="15" fill="#C5D3E8" />
            <circle cx="16" cy="13" r="6" fill="#1E293B" />
            <path d="M8 28 C8 21, 24 21, 24 28" fill="#3B82F6" />
          </svg>
        </div>
      </div>
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
  /* ── Pastel Green Page Canvas (Exact match to reference style) ── */
  .coming-soon-pastel-page {
    width: 100%;
    max-width: 100%;
    min-height: 100dvh;
    padding: max(var(--sp-4), var(--sat)) 16px max(90px, var(--sab));
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: #DFECDA; /* Pastel Green Background Requested */
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
    animation: pastel-fade-in 0.25s ease-out;
    position: relative;
    overflow-x: hidden;
  }

  .coming-soon-pastel-page :global(*),
  .coming-soon-pastel-page button,
  .coming-soon-pastel-page h1,
  .coming-soon-pastel-page h2,
  .coming-soon-pastel-page h3,
  .coming-soon-pastel-page span,
  .coming-soon-pastel-page p,
  .coming-soon-pastel-page a {
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes pastel-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }


  /* ── Header Synced with Main Page ── */
  .app-header-sync {
    padding: 0 0 16px 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }

  .user-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar-circle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .avatar-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .greeting-text {
    font-size: 0.88rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.01em;
  }

  .header-right-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-action-disc,
  .header-music-disc {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1.5px solid rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .header-action-disc:hover,
  .header-music-disc:hover {
    transform: scale(1.08);
  }

  .header-action-disc:active,
  .header-music-disc:active {
    transform: scale(0.95);
  }

  .disc-vinyl {
    font-size: 1.15rem;
    display: inline-block;
    transition: transform 0.2s ease;
  }

  .disc-vinyl.is-spinning {
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .music-wave-dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    border: 1.5px solid #FFFFFF;
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* ── Big Headline: Start today's tasks. ── */
  .headline-container {
    margin-bottom: 18px;
  }

  .start-tasks-title {
    font-size: 1.62rem;
    font-weight: 700;
    color: #18181B;
    line-height: 1.25;
    letter-spacing: -0.02em;
    margin: 0 0 4px;
    word-break: normal;
  }

  .muted-word {
    color: #557549; /* Soft tint of green matching pastel palette */
    opacity: 0.85;
  }

  .headline-sub {
    font-size: 0.82rem;
    font-weight: 500;
    color: #4A5F45;
    margin: 0;
  }

  /* ── 4 Boxes Grid: Exact Replica of Image 2 ── */
  .four-boxes-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 22px;
    width: 100%;
    box-sizing: border-box;
  }

  .stat-box-card {
    background: #f6fff6;
    border: none;
    border-radius: 20px;
    padding: 13px 11px 11px;
    min-height: 126px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 4px 16px rgba(45, 65, 40, 0.04);
    cursor: pointer;
    text-align: left;
    position: relative;
    overflow: hidden;
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    min-width: 0;
  }

  .stat-box-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(45, 65, 40, 0.08);
  }

  .stat-box-card:active {
    transform: scale(0.97);
  }

  .stat-box-card.is-active-box {
    box-shadow: 0 6px 20px rgba(45, 65, 40, 0.09), inset 0 0 0 1.5px #6D9C3F;
  }

  /* Subtle Organic Wave Watermark Inside Card (Image 2 style) */
  .card-wave-bg {
    position: absolute;
    right: -20px;
    bottom: -20px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(223, 236, 218, 0.5) 0%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
  }

  /* Top Row inside Card */
  .box-top-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    position: relative;
    z-index: 1;
    min-width: 0;
    width: 100%;
  }

  .box-icon-disc {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 50%;
    background: #EDF4EA;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .box-title-text {
    font-size: 0.77rem;
    font-weight: 700;
    color: #18181B;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    flex: 1;
    min-width: 0;
  }

  /* Bottom Row inside Card: Count + Label */
  .box-bottom-stat {
    display: flex;
    align-items: baseline;
    gap: 5px;
    margin-top: auto;
    position: relative;
    z-index: 1;
  }

  .box-count-number {
    font-size: 1.85rem;
    font-weight: 700;
    color: #18181B;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .box-unit-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: #71717A;
  }

  /* ── Bottom Section: Today's tasks + Exec Oversight Card ── */
  .bottom-tasks-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .section-title-text {
    font-size: 1.15rem;
    font-weight: 800;
    color: #18181B;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .view-all-link {
    font-size: 0.82rem;
    font-weight: 700;
    color: #436137;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .view-all-link:hover {
    opacity: 0.75;
  }

  /* White Bottom Task Card */
  .exec-task-card {
    background: #FFFFFF;
    border-radius: 26px;
    padding: 20px 20px;
    box-shadow: 0 6px 24px rgba(45, 65, 40, 0.05);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
    transition: transform 0.15s;
  }

  .exec-task-card:hover {
    transform: translateY(-2px);
  }

  .exec-card-left {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }

  .task-time-badge {
    font-size: 0.72rem;
    font-weight: 700;
    color: #557549;
    letter-spacing: 0.02em;
  }

  .exec-task-title {
    font-size: 1.18rem;
    font-weight: 800;
    color: #18181B;
    letter-spacing: -0.015em;
    margin: 0;
    line-height: 1.25;
  }

  .exec-task-subtitle {
    font-size: 0.8rem;
    color: #71717A;
    margin: 0 0 10px;
  }

  .open-kanban-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #DFECDA;
    color: #2F4D24;
    font-size: 0.74rem;
    font-weight: 800;
    text-decoration: none;
    width: fit-content;
    transition: background 0.15s, transform 0.15s;
  }

  .open-kanban-link:hover {
    background: #CFE2C8;
    transform: translateX(2px);
  }

  .exec-card-avatars {
    display: flex;
    align-items: center;
    position: relative;
    flex-shrink: 0;
    padding-top: 6px;
  }

  .mini-overlap-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #FFFFFF;
    overflow: hidden;
    background: #E4E4E7;
  }

  .avatar-2 {
    margin-left: -10px;
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
    border: none;
    text-align: left;
    font-family: inherit;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    cursor: pointer;
    animation: toastPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes toastPop {
    from { opacity: 0; transform: translate(-50%, 15px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .notif-bell-icon {
    font-size: 1.4rem;
  }

  .notif-text-wrap strong {
    font-size: 0.85rem;
    color: #18181B;
    display: block;
    margin-bottom: 2px;
  }

  .notif-text-wrap p {
    font-size: 0.74rem;
    color: #71717A;
    margin: 0;
    line-height: 1.35;
  }
</style>
