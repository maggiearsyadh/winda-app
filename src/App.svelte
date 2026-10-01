<script>
  import './app.css';

  import Header          from '$lib/components/Header.svelte';
  import FeelingCard     from '$lib/components/FeelingCard.svelte';
  import StatsAndQuiz    from '$lib/components/StatsAndQuiz.svelte';
  import MusicPlayerCard from '$lib/components/MusicPlayerCard.svelte';
  import CarouselDots    from '$lib/components/CarouselDots.svelte';

  // Interactive Modals
  import MoodModal       from '$lib/components/MoodModal.svelte';
  import QuizModal       from '$lib/components/QuizModal.svelte';
  import NewFeatureModal from '$lib/components/NewFeatureModal.svelte';

  let isMoodOpen = $state(false);
  let isQuizOpen = $state(false);
  let isNewFeatureOpen = $state(false);

  $effect(() => {
    try {
      const seen = localStorage.getItem('has_seen_bubble_update_v1');
      if (!seen) {
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
</script>

<div class="figma-app-container">
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
</div>

<!-- Interactive Modals -->
<MoodModal bind:isOpen={isMoodOpen} />
<QuizModal bind:isOpen={isQuizOpen} />
<NewFeatureModal
  bind:isOpen={isNewFeatureOpen}
  onTryNow={handleTryBubbleNow}
/>

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
