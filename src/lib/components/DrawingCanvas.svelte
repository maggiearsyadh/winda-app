<script>
  import { onMount } from 'svelte';

  let { mood, onBack, onClose } = $props();

  let canvasEl = $state(null);
  let ctx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  let moodColor = $derived(mood?.activeColor || '#BA4965');
  let currentColor = $state('#BA4965');
  let brushSize = $state(5); // 3 (small), 6 (medium), 12 (large)
  let isEraser = $state(false);

  // Undo history stack
  let history = $state([]);
  let canUndo = $derived(history.length > 0);

  $effect(() => {
    currentColor = moodColor;
  });

  // Color palette: Mood color + cute colors + black + white
  let palette = $derived([
    moodColor,
    '#FF6B8B', // Pink
    '#FFAA00', // Gold/Amber
    '#22C55E', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#111827', // Black
  ]);

  // Specific prompt per mood
  const prompts = {
    anger: 'Coret-coret biar keselnya ilang!',
    happy: 'Gambarkan atau tulis hal yang bikin kamu happy today',
    fear: 'Gambarkan hal yang menenangkan hati kamu.. u are safe here',
    sad: 'Biasanya klo Winda sedih, dia akan gambar bulan sabit, coba ',
  };

  onMount(() => {
    initCanvas();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  function initCanvas() {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;

    ctx = canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);

    // Initial fill background white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function handleResize() {
    if (!canvasEl) return;
    // Save current drawing image before resize
    const data = canvasEl.toDataURL();
    initCanvas();
    const img = new Image();
    img.src = data;
    img.onload = () => {
      const rect = canvasEl.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  }

  function saveSnapshot() {
    if (!canvasEl) return;
    if (history.length >= 20) {
      history.shift();
    }
    history.push(canvasEl.toDataURL());
  }

  function handlePointerDown(e) {
    if (!canvasEl || !ctx) return;
    canvasEl.setPointerCapture(e.pointerId);
    isDrawing = true;

    saveSnapshot();

    const rect = canvasEl.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.arc(lastX, lastY, (isEraser ? brushSize * 2.5 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? '#FFFFFF' : currentColor;
    ctx.fill();
  }

  function handlePointerMove(e) {
    if (!isDrawing || !canvasEl || !ctx) return;

    const rect = canvasEl.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : currentColor;
    ctx.lineWidth = isEraser ? brushSize * 2.5 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
  }

  function handlePointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    try {
      canvasEl.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }

  function handleUndo() {
    if (history.length === 0 || !canvasEl || !ctx) return;
    const previous = history.pop();
    const rect = canvasEl.getBoundingClientRect();
    const img = new Image();
    img.src = previous;
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  }

  function handleClear() {
    if (!canvasEl || !ctx) return;
    saveSnapshot();
    const rect = canvasEl.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function handleDownload() {
    if (!canvasEl) return;
    const link = document.createElement('a');
    link.download = `doodle-${mood?.id || 'mood'}-${Date.now()}.png`;
    link.href = canvasEl.toDataURL('image/png');
    link.click();
  }
</script>

<div class="drawing-step-container">
  <!-- Header -->
  <header class="draw-header">
    <div class="draw-badge" style="background-color: {mood?.activeColor || '#BA4965'}22; color: {mood?.activeColor || '#BA4965'};">
      <span>🎨 Mood Drawing Canvas</span>
    </div>
    <!-- <h4 class="draw-title">
      Ekspresikan Perasaan dengan cara gambar
    </h4> -->
    <p class="draw-prompt">
      {prompts[mood?.id] || 'Gambarkan apa saja yang sedang kamu rasakan hari ini:'}
    </p>
  </header>

  <!-- Interactive Touch Canvas -->
  <div class="canvas-outer-frame">
    <canvas
      bind:this={canvasEl}
      class="drawing-canvas"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
    ></canvas>
  </div>

  <!-- Drawing Toolbar -->
  <div class="drawing-toolbar">
    <!-- Color Swatches -->
    <div class="palette-row" role="radiogroup" aria-label="Pilih warna">
      {#each palette as color}
        <button
          type="button"
          class="color-btn"
          class:is-active={!isEraser && currentColor === color}
          style="background-color: {color};"
          onclick={() => { isEraser = false; currentColor = color; }}
          aria-label="Warna {color}"
        ></button>
      {/each}

      <!-- Eraser Tool -->
      <button
        type="button"
        class="tool-btn eraser-btn"
        class:is-active={isEraser}
        onclick={() => (isEraser = !isEraser)}
        aria-label="Penghapus"
        title="Penghapus"
      >
        🧹
      </button>
    </div>

    <!-- Brush Sizes & Actions Row -->
    <div class="actions-row">
      <!-- Brush Size Options -->
      <div class="size-group">
        <button
          type="button"
          class="size-btn"
          class:is-active={brushSize === 3}
          onclick={() => (brushSize = 3)}
          aria-label="Kuas kecil"
          title="Kecil"
        >
          <span class="dot dot-sm"></span>
        </button>
        <button
          type="button"
          class="size-btn"
          class:is-active={brushSize === 6}
          onclick={() => (brushSize = 6)}
          aria-label="Kuas sedang"
          title="Sedang"
        >
          <span class="dot dot-md"></span>
        </button>
        <button
          type="button"
          class="size-btn"
          class:is-active={brushSize === 12}
          onclick={() => (brushSize = 12)}
          aria-label="Kuas tebal"
          title="Tebal"
        >
          <span class="dot dot-lg"></span>
        </button>
      </div>

      <!-- Undo & Clear Actions -->
      <div class="history-group">
        <button
          type="button"
          class="tool-btn action-icon-btn"
          disabled={!canUndo}
          onclick={handleUndo}
          aria-label="Undo"
          title="Kembalikan coretan"
        >
          ↩️
        </button>
        <button
          type="button"
          class="tool-btn action-icon-btn"
          onclick={handleClear}
          aria-label="Bersihkan kanvas"
          title="Hapus semua"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>

  <!-- Bottom Buttons -->
  <div class="draw-footer-buttons">
    <button
      type="button"
      class="download-btn"
      onclick={handleDownload}
    >
      <span>Save Gambar</span>
    </button>

    <div class="nav-actions-row">
      <button
        type="button"
        class="secondary-btn"
        onclick={onBack}
      >
        ◀ Back ke Pesan
      </button>

      <button
        type="button"
        class="primary-btn"
        onclick={onClose}
      >
        Selesai ✓
      </button>
    </div>
  </div>
</div>

<style>
  .drawing-step-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    animation: fade-in 0.25s ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .draw-header {
    text-align: center;
    margin-bottom: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .draw-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: var(--fw-extra);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .draw-prompt {
    font-size: 0.8rem;
    color: #4b5563;
    line-height: 1.35;
    max-width: 320px;
    margin: 0 auto;
    font-weight: 500;
  }

  /* ── Canvas Touch Frame ── */
  .canvas-outer-frame {
    width: 100%;
    max-width: 100%;
    height: clamp(155px, 24vh, 195px);
    background: #FFFFFF;
    border: 2px solid #E2E8F0;
    border-radius: 16px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04), inset 0 2px 4px rgba(0, 0, 0, 0.02);
    overflow: hidden;
    position: relative;
    margin-bottom: 10px;
    box-sizing: border-box;
  }

  .drawing-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    touch-action: none; /* Prevents mobile scroll while drawing */
    user-select: none;
    -webkit-user-select: none;
  }

  /* ── Toolbar ── */
  .drawing-toolbar {
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 8px 10px;
    margin-bottom: 10px;
    box-sizing: border-box;
  }

  .palette-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    flex-wrap: wrap;
    box-sizing: border-box;
  }

  .color-btn {
    width: 24px;
    height: 24px;
    min-width: 24px !important;
    min-height: 24px !important;
    max-width: 24px;
    max-height: 24px;
    padding: 0 !important;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    transition: transform 0.15s ease, border-color 0.15s ease;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .color-btn:hover {
    transform: scale(1.15);
  }

  .color-btn.is-active {
    border-color: #0F172A;
    transform: scale(1.18);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  .tool-btn {
    width: 28px;
    height: 28px;
    min-width: 28px !important;
    min-height: 28px !important;
    max-width: 28px;
    max-height: 28px;
    padding: 0 !important;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .tool-btn:hover:not(:disabled) {
    background: #F1F5F9;
    transform: scale(1.05);
  }

  .tool-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .eraser-btn.is-active {
    background: #FEF3C7;
    border-color: #D97706;
    transform: scale(1.08);
  }

  /* ── Actions Row ── */
  .actions-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid #E2E8F0;
    width: 100%;
    box-sizing: border-box;
  }

  .size-group {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .size-btn {
    width: 26px;
    height: 26px;
    min-width: 26px !important;
    min-height: 26px !important;
    max-width: 26px;
    max-height: 26px;
    padding: 0 !important;
    border-radius: 7px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .size-btn.is-active {
    background: #0F172A;
    border-color: #0F172A;
  }

  .size-btn.is-active .dot {
    background: #FFFFFF;
  }

  .dot {
    border-radius: 50%;
    background: #475569;
  }

  .dot-sm { width: 3px; height: 3px; }
  .dot-md { width: 6px; height: 6px; }
  .dot-lg { width: 9px; height: 9px; }

  .history-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-icon-btn {
    width: 28px;
    height: 28px;
    min-width: 28px !important;
    min-height: 28px !important;
    max-width: 28px;
    max-height: 28px;
    font-size: 0.8rem;
    padding: 0 !important;
    box-sizing: border-box;
  }

  /* ── Bottom Buttons ── */
  .draw-footer-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .download-btn {
    background: #289250;
    color: #FFFFFF;
    font-weight: var(--fw-bold);
    font-size: 0.82rem;
    padding: 8px 16px;
    border-radius: var(--radius-pill);
    border: none;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(37, 99, 235, 0.22);
    transition: transform 0.15s ease, filter 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 38px !important;
    width: 100%;
    box-sizing: border-box;
  }

  .download-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .nav-actions-row {
    display: flex;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .secondary-btn {
    flex: 1;
    background: #F1F5F9;
    color: #475569;
    font-weight: var(--fw-bold);
    font-size: 0.78rem;
    padding: 8px 10px;
    border-radius: var(--radius-pill);
    border: 1px solid #CBD5E1;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    min-height: 38px !important;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .secondary-btn:hover {
    background: #E2E8F0;
    transform: translateY(-1px);
  }

  .primary-btn {
    flex: 1;
    background: var(--clr-btn-black);
    color: #FFFFFF;
    font-weight: var(--fw-bold);
    font-size: 0.78rem;
    padding: 8px 10px;
    border-radius: var(--radius-pill);
    border: none;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
    transition: filter 0.15s ease, transform 0.15s ease;
    min-height: 38px !important;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .primary-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
</style>
