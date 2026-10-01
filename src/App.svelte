<script>
  import './app.css';

  import Header          from '$lib/components/Header.svelte';
  import FeelingCard     from '$lib/components/FeelingCard.svelte';
  import StatsAndQuiz    from '$lib/components/StatsAndQuiz.svelte';
  import MusicPlayerCard from '$lib/components/MusicPlayerCard.svelte';
  import CarouselDots    from '$lib/components/CarouselDots.svelte';
  import ComingSoonPage  from '$lib/components/ComingSoonPage.svelte';

  // Interactive Modals & Floating Tools
  import MoodModal       from '$lib/components/MoodModal.svelte';
  import QuizModal       from '$lib/components/QuizModal.svelte';
  import NewFeatureModal from '$lib/components/NewFeatureModal.svelte';
  import FloatingMusic   from '$lib/components/FloatingMusic.svelte';

  let currentRoute = $state(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/');
  let isMoodOpen = $state(false);
  let isQuizOpen = $state(false);
  let isNewFeatureOpen = $state(false);

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
      const seen = localStorage.getItem('has_seen_bubble_update_v1');
      if (!seen && currentRoute !== '#/coming-soon') {
        // Delay slightly for smooth page entrance
        const timer = setTimeout(() => {
          isNewFeatureOpen = true;
        }, 550);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  });

  function openMood() {
    isMoodOpen = true;
  }

  function openQuiz() {
    isQuizOpen = true;
  }

  function handleTryBubbleNow() {
    isMoodOpen = true;
  }

  function goHome() {
    window.location.hash = '#/';
  }
</script>

<div class="figma-app-container">
  {#if currentRoute === '#/coming-soon'}
    <!-- Dedicated Coming Soon Page View -->
    <ComingSoonPage onBack={goHome} />
  {:else}
    <!-- Top Header Navigation -->
    <Header />

    <!-- Main Content -->
    <main id="main-content">
      <!-- 1. Character & HOW'S YOUR FEELING Card -->
      <FeelingCard
        onConsultationClick={openMood}
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
<QuizModal bind:isOpen={isQuizOpen} />
<NewFeatureModal
  bind:isOpen={isNewFeatureOpen}
  onTryNow={handleTryBubbleNow}
/>

<!-- Always-Accessible Floating Music Controller -->
<FloatingMusic />

<style>
  .figma-app-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    padding-bottom: max(var(--sp-4), var(--sab));
  }

  :global(#main-content) {
    display: flex;
    flex-direction: column;
    position: relative;
  }
</style>
