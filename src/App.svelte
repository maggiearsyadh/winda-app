<script>
  import './app.css';

  import Header          from '$lib/components/Header.svelte';
  import FeelingCard     from '$lib/components/FeelingCard.svelte';
  import StatsAndQuiz    from '$lib/components/StatsAndQuiz.svelte';
  import MusicPlayerCard from '$lib/components/MusicPlayerCard.svelte';
  import CarouselDots    from '$lib/components/CarouselDots.svelte';
  import ComingSoonPage  from '$lib/components/ComingSoonPage.svelte';
  import KanbanBoard     from '$lib/components/KanbanBoard.svelte';
  import PeriodTrackerPage from '$lib/components/PeriodTrackerPage.svelte';
  import GalleryPage     from '$lib/components/GalleryPage.svelte';

  // Interactive Modals & Floating Tools
  import MoodModal       from '$lib/components/MoodModal.svelte';
  import QuizModal       from '$lib/components/QuizModal.svelte';
  import ApologyModal    from '$lib/components/ApologyModal.svelte';
  import FloatingMusic   from '$lib/components/FloatingMusic.svelte';
  import NewGameAnnouncementModal from '$lib/components/NewGameAnnouncementModal.svelte';
  import ExamRageShredderModal from '$lib/components/ExamRageShredderModal.svelte';

  let currentRoute = $state(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/');
  let isMoodOpen = $state(false);
  let isQuizOpen = $state(false);
  let quizInitialScreen = $state('select-character');
  let isApologyOpen = $state(false);
  let isAnnouncementOpen = $state(false);
  let isShredderOpen = $state(false);

  let hasCheckedAnnouncement = false;

  function triggerAnnouncementCheck() {
    if (hasCheckedAnnouncement || isAnnouncementOpen || isQuizOpen) return;
    try {
      const isHidden = localStorage.getItem('winda_hide_block_blast_popup_v1');
      const isSeenThisSession = sessionStorage.getItem('winda_seen_block_blast_popup_v1');
      if (!isHidden && !isSeenThisSession) {
        hasCheckedAnnouncement = true;
        setTimeout(() => {
          const unlocked = localStorage.getItem('winda_app_locked_prank_v1');
          if (unlocked === 'unlocked' && !isApologyOpen) {
            isAnnouncementOpen = true;
          }
        }, 650);
      }
    } catch (e) {}
  }

  $effect(() => {
    const handleHash = () => {
      currentRoute = window.location.hash || '#/';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  });

  $effect(() => {
    try {
      const unlocked = localStorage.getItem('winda_app_locked_prank_v1');
      if (unlocked !== 'unlocked') {
        // App is locked until unlocked by password
        const timer = setTimeout(() => {
          isApologyOpen = true;
        }, 400);
        return () => clearTimeout(timer);
      } else {
        triggerAnnouncementCheck();
      }
    } catch (e) {
      triggerAnnouncementCheck();
    }
  });

  // When lock modal closes, check if we can show new game announcement
  $effect(() => {
    if (!isApologyOpen) {
      try {
        const unlocked = localStorage.getItem('winda_app_locked_prank_v1');
        if (unlocked === 'unlocked') {
          triggerAnnouncementCheck();
        }
      } catch (e) {}
    }
  });

  function openMood() {
    isMoodOpen = true;
  }

  function openShredder() {
    isShredderOpen = true;
  }

  function openQuiz() {
    quizInitialScreen = 'select-character';
    isQuizOpen = true;
  }

  function handleCloseAnnouncement(dontShowAgain) {
    isAnnouncementOpen = false;
    try {
      sessionStorage.setItem('winda_seen_block_blast_popup_v1', 'true');
      if (dontShowAgain) {
        localStorage.setItem('winda_hide_block_blast_popup_v1', 'true');
      }
    } catch (e) {}
  }

  function handlePlayNowFromAnnouncement(dontShowAgain) {
    handleCloseAnnouncement(dontShowAgain);
    quizInitialScreen = 'blast';
    isQuizOpen = true;
  }

  function goHome() {
    window.location.hash = '#/';
  }
</script>

<div class="figma-app-container">
  {#if currentRoute === '#/coming-soon'}
    <!-- Dedicated Coming Soon Page View -->
    <ComingSoonPage onBack={goHome} />
  {:else if currentRoute === '#/kanban'}
    <!-- Dedicated Kanban Board View -->
    <KanbanBoard onBack={goHome} />
  {:else if currentRoute === '#/period'}
    <!-- Dedicated Period Tracker Page View -->
    <PeriodTrackerPage onBack={goHome} />
  {:else if currentRoute === '#/gallery'}
    <!-- Dedicated Gallery Page View -->
    <GalleryPage onBack={goHome} />
  {:else}
    <!-- Top Header Navigation -->
    <Header />

    <!-- Main Content -->
    <main id="main-content">
      <!-- 1. Character & HOW'S YOUR FEELING Card -->
      <FeelingCard
        onConsultationClick={openMood}
        onShredderClick={openShredder}
      />

      <!-- 2. Middle Row: BE AWARE ! (Lottie) + QUIZ ABOUT ED -->
      <StatsAndQuiz
        onQuizClick={openQuiz}
      />

      <!-- 3. Music Player Card (Matches Mood Color & Corner Screws) -->
      <MusicPlayerCard />

      <!-- 4. Bottom Carousel Indicators -->
      <CarouselDots activeIndex={1} />
    </main>
  {/if}
</div>

<!-- Interactive Modals -->
<MoodModal bind:isOpen={isMoodOpen} />
<QuizModal bind:isOpen={isQuizOpen} initialScreen={quizInitialScreen} />
<ApologyModal bind:isOpen={isApologyOpen} />
<NewGameAnnouncementModal
  bind:isOpen={isAnnouncementOpen}
  onPlayNow={handlePlayNowFromAnnouncement}
  onClose={handleCloseAnnouncement}
/>
<ExamRageShredderModal bind:isOpen={isShredderOpen} />

<!-- Always-Accessible Floating Music Controller -->
<FloatingMusic />

<style>
  .figma-app-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    padding-bottom: max(var(--sp-4), var(--sab));
    font-family: 'Urbanist', var(--font-sans);
  }

  .figma-app-container :global(*) {
    font-family: inherit;
  }

  :global(#main-content) {
    display: flex;
    flex-direction: column;
    position: relative;
  }
</style>
