<script>
  let { activeIndex = 1 } = $props();
</script>

<div class="carousel-dots-wrap" aria-label="Indikator halaman">
  <span class="dot-pill" class:is-active={activeIndex === 0}></span>
  <span class="dot-pill" class:is-active={activeIndex === 1}></span>
  <span class="dot-pill" class:is-active={activeIndex === 2}></span>
</div>

<style>
  .carousel-dots-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: var(--sp-4) 0 max(var(--sp-6), var(--sab));
  }

  .dot-pill {
    width: 36px;
    height: 5px;
    border-radius: var(--radius-pill);
    background-color: #E6E1FA;
    transition: background-color 0.2s ease, width 0.2s ease;
  }

  .dot-pill.is-active {
    background-color: var(--clr-primary);
  }
</style>
