<script>
  import { onMount } from 'svelte';
  import confetti from 'canvas-confetti';

  let { isOpen = $bindable(false), onClose } = $props();

  // ── Configuration Data ──
  const BODIES = [
    {
      id: 'fox',
      name: 'Maggie si Rubah',
      preview: '/avatar/bodies/FOX.svg',
      file: '/avatar/bodies/FOX.svg',
      width: 191,
      height: 335
    },
    {
      id: 'kodok',
      name: 'Winduy si Kodok',
      preview: '/avatar/bodies/KODOK.svg',
      file: '/avatar/bodies/KODOK.svg',
      width: 191,
      height: 335
    }
  ];

  const HATS = [
    { id: null, name: 'Tanpa Topi', icon: '🚫' },
    {
      id: 'witch',
      name: 'Topi Penyihir',
      preview: '/avatar/hats/HAT_WITCH.svg',
      file: '/avatar/hats/HAT_WITCH.svg',
      top: '-10px',
      width: '108px'
    },
    {
      id: 'baseball',
      name: 'Topi Baseball',
      preview: '/avatar/hats/HAT_BASEBALL.svg',
      file: '/avatar/hats/HAT_BASEBALL.svg',
      top: '10px',
      width: '136px'
    },
    {
      id: 'coyboy',
      name: 'Topi Koboi',
      preview: '/avatar/hats/HAT_COYBOY.svg',
      file: '/avatar/hats/HAT_COYBOY.svg',
      top: '1px',
      width: '144px'
    },
    {
      id: 'magician',
      name: 'Topi Pesulap',
      preview: '/avatar/hats/HAT_MAGICIAN.svg',
      file: '/avatar/hats/HAT_MAGICIAN.svg',
      top: '-20px',
      width: '130px'
    },
    {
      id: 'proyek',
      name: 'Helm Proyek',
      preview: '/avatar/hats/HAT_PROYEK.svg',
      file: '/avatar/hats/HAT_PROYEK.svg',
      top: '8px',
      width: '142px'
    },
    {
      id: 'viking',
      name: 'Helm Viking',
      preview: '/avatar/hats/HAT_VIKING.svg',
      file: '/avatar/hats/HAT_VIKING.svg',
      top: '-10px',
      width: '150px'
    }
  ];

  const OUTFITS = [
    { id: null, name: 'Tanpa Baju', icon: '🚫' },
    {
      id: 'witch',
      name: 'Jubah Penyihir',
      preview: '/avatar/outfit/WITCH.svg',
      file: '/avatar/outfit/WITCH.svg',
      top: '160px',
      width: '146px'
    },
    {
      id: 'hoddie',
      name: 'Jaket Hoodie',
      preview: '/avatar/outfit/HODDIE.svg',
      file: '/avatar/outfit/HODDIE.svg',
      top: '163px',
      width: '148px'
    },
    {
      id: 'detective',
      name: 'Jas Detektif',
      preview: '/avatar/outfit/DETECTIVE.svg',
      file: '/avatar/outfit/DETECTIVE.svg',
      top: '165px',
      width: '155px'
    },
    {
      id: 'baseball',
      name: 'Jersey Baseball',
      preview: '/avatar/outfit/BASEBALL.svg',
      file: '/avatar/outfit/BASEBALL.svg',
      top: '165px',
      width: '148px'
    },
    {
      id: 'cowboy',
      name: 'Baju Koboi',
      preview: '/avatar/outfit/COWBOY.svg',
      file: '/avatar/outfit/COWBOY.svg',
      top: '165px',
      width: '148px'
    },
    {
      id: 'magician',
      name: 'Tuksedo Pesulap',
      preview: '/avatar/outfit/MAGICIAN.svg',
      file: '/avatar/outfit/MAGICIAN.svg',
      top: '163px',
      width: '160px'
    },
    {
      id: 'viking',
      name: 'Baju Viking',
      preview: '/avatar/outfit/VIKING.svg',
      file: '/avatar/outfit/VIKING.svg',
      top: '161px',
      width: '148px'
    }
  ];

  // ── State ──
  let activeTab = $state('hats'); // 'bodies' | 'hats' | 'outfit'
  let characterName = $state('Pip');
  let isEditingName = $state(false);
  let nameInputEl = $state(null);

  let selectedBodyId = $state('fox');
  let selectedHatId = $state('witch');
  let selectedOutfitId = $state('witch');

  let toastMessage = $state('');
  let toastTimer = null;

  // Screen Mode: 'select-character' (Who Will You Be?) | 'customize' (Dress-up Studio)
  let currentScreen = $state('select-character');

  $effect(() => {
    if (isOpen) {
      currentScreen = 'select-character';
    }
  });

  function handlePickBaseCharacter(bodyId) {
    if (selectedBodyId === bodyId) {
      goToCustomize();
      return;
    }
    selectedBodyId = bodyId;
    if (bodyId === 'kodok' && (characterName === 'Pip' || characterName === 'Maggie')) {
      characterName = 'Winduy';
    } else if (bodyId === 'fox' && (characterName === 'Winduy' || characterName === 'Pip')) {
      characterName = 'Maggie';
    }
    playPopSound();
  }

  function goToCustomize() {
    playSuccessChime();
    currentScreen = 'customize';
  }

  function goBackToSelection() {
    playPopSound();
    currentScreen = 'select-character';
  }

  // Selected Object Lookups
  let currentBody = $derived(BODIES.find(b => b.id === selectedBodyId) || BODIES[0]);
  let currentHat = $derived(HATS.find(h => h.id === selectedHatId));
  let currentOutfit = $derived(OUTFITS.find(o => o.id === selectedOutfitId));

  // Current Hat & Outfit Styles for the Active Body
  let currentHatStyle = $derived.by(() => {
    if (!currentHat || !currentHat.file) return null;
    return `top: ${currentHat.top}; width: ${currentHat.width};`;
  });

  let currentOutfitStyle = $derived.by(() => {
    if (!currentOutfit || !currentOutfit.file) return null;
    return `top: ${currentOutfit.top}; width: ${currentOutfit.width};`;
  });

  // ── Procedural Web Audio ──
  function playPopSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // C5 -> E5 -> G5 chord
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  }

  // ── Lifecycle & LocalStorage ──
  onMount(() => {
    loadSavedAvatar();
  });

  function loadSavedAvatar() {
    try {
      const saved = localStorage.getItem('winda_custom_avatar_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) characterName = parsed.name;
        if (parsed.bodyId) selectedBodyId = parsed.bodyId;
        if (parsed.hatId !== undefined) selectedHatId = parsed.hatId;
        if (parsed.outfitId !== undefined) selectedOutfitId = parsed.outfitId;
      }
    } catch (e) {}
  }

  function handleSave() {
    try {
      const data = {
        name: characterName.trim() || 'Pip',
        bodyId: selectedBodyId,
        hatId: selectedHatId,
        outfitId: selectedOutfitId,
        updatedAt: Date.now()
      };
      localStorage.setItem('winda_custom_avatar_v1', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('winda-avatar-updated', { detail: data }));
    } catch (e) {}

    playSuccessChime();
    confetti({
      particleCount: 45,
      spread: 65,
      origin: { y: 0.6 }
    });

    showToast(`Karakter ${characterName} tersimpan! `);
  }

  function showToast(msg) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
    }, 2400);
  }

  function handleSelectBody(id) {
    selectedBodyId = id;
    playPopSound();
  }

  function handleSelectHat(id) {
    selectedHatId = id;
    playPopSound();
  }

  function handleSelectOutfit(id) {
    selectedOutfitId = id;
    playPopSound();
  }

  function randomizeAll() {
    const randomBody = BODIES[Math.floor(Math.random() * BODIES.length)].id;
    const randomHat = HATS[Math.floor(Math.random() * HATS.length)].id;
    const randomOutfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id;

    selectedBodyId = randomBody;
    selectedHatId = randomHat;
    selectedOutfitId = randomOutfit;
    playPopSound();
    showToast('Tampilan diacak! 🎲');
  }

  function handleEditNameToggle() {
    isEditingName = !isEditingName;
    if (isEditingName) {
      setTimeout(() => nameInputEl?.focus(), 50);
    }
  }

  function handleNameBlur() {
    isEditingName = false;
    if (!characterName.trim()) characterName = 'Pip';
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') {
      handleNameBlur();
    }
  }

  function handleClose() {
    isOpen = false;
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
    aria-label="Character Customizer Modal"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="customizer-card">

      {#if currentScreen === 'select-character'}
        <!-- ── SCREEN 1: WHO WILL YOU BE? (Character Selection Screen) ── -->
        <div class="who-screen-container">
          <!-- Top Bar -->
          <header class="who-top-bar">
            <button
              type="button"
              class="stage-nav-btn"
              onclick={handleClose}
              aria-label="Tutup"
              title="Tutup"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <h2 class="who-title">Who Will You Be?</h2>
            <div class="header-placeholder-btn"></div>
          </header>

          <!-- Character Cards Row (Half-body Bust Portrait Crop) -->
          <div class="who-cards-wrapper">
            {#each BODIES as body}
              <button
                type="button"
                class="character-choice-box"
                onclick={() => handlePickBaseCharacter(body.id)}
                aria-label={`Pilih ${body.name}`}
              >
                <div
                  class="character-bust-card"
                  class:is-active={selectedBodyId === body.id}
                >
                  <div class="bust-cropper">
                    <img
                      src={body.file}
                      alt={body.name}
                      class="bust-character-img"
                      class:is-kodok-bust={body.id === 'kodok'}
                    />
                  </div>
                </div>
                <span
                  class="character-choice-name"
                  class:is-active={selectedBodyId === body.id}
                >
                  {body.name}
                </span>
              </button>
            {/each}
          </div>

          <!-- Bottom CTA to Customize -->
          <div class="who-footer-cta">
            <button
              type="button"
              class="btn-start-customize"
              onclick={goToCustomize}
            >
              <span>Kustomisasi Karakter</span>
              <span class="cta-arrow">→</span>
            </button>
          </div>
        </div>

      {:else}
        <!-- ── SCREEN 2: DRESS-UP CUSTOMIZATION STUDIO ── -->
        <header class="stage-top-bar">
          <button
            type="button"
            class="stage-nav-btn"
            onclick={goBackToSelection}
            aria-label="Kembali ke pilihan karakter"
            title="Kembali"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

        <!-- Character Editable Name -->
        <div class="stage-name-wrapper">
          {#if isEditingName}
            <input
              bind:this={nameInputEl}
              bind:value={characterName}
              class="stage-name-input"
              maxlength="16"
              onblur={handleNameBlur}
              onkeydown={handleNameKeyDown}
            />
          {:else}
            <button
              type="button"
              class="stage-name-btn"
              onclick={handleEditNameToggle}
              title="Klik untuk ubah nama"
            >
              <span class="stage-name-text">{characterName}</span>
              <span class="pencil-icon">✏️</span>
            </button>
          {/if}
        </div>

        <!-- Save Button with Orange Checkmark Circle (Matching Reference) -->
        <button type="button" class="stage-save-btn" onclick={handleSave} aria-label="Simpan karakter">
          <span class="save-label">Save</span>
          <span class="save-check-circle">✓</span>
        </button>
      </header>

      <!-- ── SECTION 2: UPPER CHARACTER PREVIEW STAGE ── -->
      <section class="character-preview-section">
        <div class="character-viewport">
          <!-- Background Scenic Forest/Hills Silhouette -->
          <div class="scenic-backdrop">
            <svg class="trees-svg" viewBox="0 0 320 220" fill="none" preserveAspectRatio="none">
              <path d="M-10 220 L-10 110 Q30 90 70 115 Q110 140 150 110 Q200 80 250 105 Q290 125 330 100 L330 220 Z" fill="#F4EFE6" opacity="0.6"/>
              <path d="M-10 220 L-10 145 Q40 130 90 145 Q140 160 190 138 Q240 115 330 150 L330 220 Z" fill="#EAE2D5" opacity="0.8"/>
            </svg>
          </div>

          <!-- Layered Character Display -->
          <div class="character-stage-wrapper">
            <!-- Layer 1: Body SVG -->
            <img
              src={currentBody.file}
              alt={currentBody.name}
              class="char-layer char-body-img"
            />

            <!-- Layer 2: Outfit SVG (Over the Body) -->
            {#if currentOutfit && currentOutfit.file}
              <img
                src={currentOutfit.file}
                alt={currentOutfit.name}
                class="char-layer char-outfit-img"
                style={currentOutfitStyle}
              />
            {/if}

            <!-- Layer 3: Hat SVG (On Top of Head) -->
            {#if currentHat && currentHat.file}
              <img
                src={currentHat.file}
                alt={currentHat.name}
                class="char-layer char-hat-img"
                style={currentHatStyle}
              />
            {/if}
          </div>
        </div>

        <!-- Circular Category Dock (Matching Reference Image icons row) -->
        <nav class="circular-category-dock" aria-label="Kategori kustomisasi">
          <!-- Tab 1: Karakter -->
          <button
            type="button"
            class="circle-tab-btn"
            class:is-active={activeTab === 'bodies'}
            onclick={() => activeTab = 'bodies'}
            aria-label="Kategori Karakter"
            title="Karakter"
          >
            <span class="circle-icon">👤</span>
          </button>

          <!-- Tab 2: Topi -->
          <button
            type="button"
            class="circle-tab-btn"
            class:is-active={activeTab === 'hats'}
            onclick={() => activeTab = 'hats'}
            aria-label="Kategori Topi"
            title="Topi"
          >
            <span class="circle-icon">🎩</span>
          </button>

          <!-- Tab 3: Baju -->
          <button
            type="button"
            class="circle-tab-btn"
            class:is-active={activeTab === 'outfit'}
            onclick={() => activeTab = 'outfit'}
            aria-label="Kategori Baju"
            title="Baju"
          >
            <span class="circle-icon">👕</span>
          </button>
        </nav>
      </section>

      <!-- ── SECTION 3: BOTTOM SELECTION GRID (Item Selection Cards) ── -->
      <section class="bottom-selector-section">
        <div class="bottom-selector-header">
          <span class="selector-title">
            {#if activeTab === 'hats'}
              Pilih Aksesoris Topi
            {:else if activeTab === 'outfit'}
              Pilih Baju / Kostum
            {:else}
              Pilih Karakter Dasar
            {/if}
          </span>
          <button type="button" class="btn-randomize" onclick={randomizeAll} title="Acak tampilan">
            🎲 Acak
          </button>
        </div>

        <div class="items-grid-scroll">
          {#if activeTab === 'hats'}
            {#each HATS as hat}
              <button
                type="button"
                class="item-card-box"
                class:is-active={selectedHatId === hat.id}
                onclick={() => handleSelectHat(hat.id)}
                aria-label={hat.name}
              >
                {#if selectedHatId === hat.id}
                  <div class="check-badge">✓</div>
                {/if}

                {#if hat.file}
                  <img src={hat.preview} alt={hat.name} class="item-icon-img" />
                {:else}
                  <span class="item-icon-emoji">{hat.icon}</span>
                {/if}
                <span class="item-caption">{hat.name}</span>
              </button>
            {/each}

          {:else if activeTab === 'outfit'}
            {#each OUTFITS as outfit}
              <button
                type="button"
                class="item-card-box"
                class:is-active={selectedOutfitId === outfit.id}
                onclick={() => handleSelectOutfit(outfit.id)}
                aria-label={outfit.name}
              >
                {#if selectedOutfitId === outfit.id}
                  <div class="check-badge">✓</div>
                {/if}

                {#if outfit.file}
                  <img src={outfit.preview} alt={outfit.name} class="item-icon-img outfit-preview" />
                {:else}
                  <span class="item-icon-emoji">{outfit.icon}</span>
                {/if}
                <span class="item-caption">{outfit.name}</span>
              </button>
            {/each}

          {:else}
            {#each BODIES as body}
              <button
                type="button"
                class="item-card-box body-card-box"
                class:is-active={selectedBodyId === body.id}
                onclick={() => handleSelectBody(body.id)}
                aria-label={body.name}
              >
                {#if selectedBodyId === body.id}
                  <div class="check-badge">✓</div>
                {/if}

                <img src={body.preview} alt={body.name} class="item-icon-img body-preview" />
                <span class="item-caption">{body.name}</span>
              </button>
            {/each}
          {/if}
        </div>
      </section>

        <!-- Feedback Toast -->
        {#if toastMessage}
          <div class="customizer-toast" role="status">
            {toastMessage}
          </div>
        {/if}
      {/if}

    </div>
  </div>
{/if}

<style>
  /* ── Modal Overlay ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(17, 24, 39, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(var(--sat, 12px), 12px) 14px max(var(--sab, 12px), 12px);
    box-sizing: border-box;
    animation: fadeInModal 0.22s ease-out;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes fadeInModal {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ── Customizer Container Card ── */
  .customizer-card {
    width: 100%;
    max-width: 440px;
    height: 94dvh;
    max-height: 780px;
    background: #FDFBF7;
    border-radius: 32px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  @media (max-width: 480px) {
    .customizer-card {
      max-width: 100%;
      height: 98dvh;
      border-radius: 28px;
    }
  }

  /* ── Screen 1: Who Will You Be? (Character Selection Screen) ── */
  .who-screen-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 18px 20px 24px;
    box-sizing: border-box;
    justify-content: space-between;
    animation: fadeInScreen 0.22s ease-out;
  }

  @keyframes fadeInScreen {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .who-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
  }

  .who-title {
    margin: 0;
    font-size: 1.55rem;
    font-weight: 900;
    color: #1C1917;
    letter-spacing: -0.02em;
    text-align: center;
  }

  .header-placeholder-btn {
    width: 36px;
    height: 36px;
  }

  .who-cards-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 20px 4px;
    flex: 1;
  }

  .character-choice-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .character-choice-box:hover {
    transform: translateY(-4px);
  }

  .character-bust-card {
    width: 145px;
    height: 145px;
    aspect-ratio: 1;
    background: #FAF5EB;
    border-radius: 30px;
    border: 3.5px solid transparent;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .character-bust-card.is-active {
    border-color: #10B981;
    background: #FFFDF9;
    box-shadow: 0 10px 26px rgba(16, 185, 129, 0.25);
    transform: scale(1.04);
  }

  .bust-cropper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
  }

  .bust-character-img {
    width: 145%;
    height: auto;
    object-fit: contain;
    margin-top: 10px;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.08));
    transition: transform 0.2s ease;
  }

  .bust-character-img.is-kodok-bust {
    margin-top: -16px;
  }

  .character-choice-box:hover .bust-character-img {
    transform: scale(1.06);
  }

  .character-choice-name {
    margin-top: 14px;
    font-size: 0.95rem;
    font-weight: 800;
    color: #8C827A;
    transition: color 0.2s;
    text-align: center;
  }

  .character-choice-name.is-active {
    color: #10B981;
    font-weight: 900;
  }

  .who-footer-cta {
    display: flex;
    justify-content: center;
    padding-top: 10px;
  }

  .btn-start-customize {
    width: 100%;
    max-width: 320px;
    background: #10B981;
    color: #FFFFFF;
    border: none;
    border-radius: 999px;
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
    transition: transform 0.18s, background 0.18s, box-shadow 0.18s;
  }

  .btn-start-customize:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
  }

  .btn-start-customize:active {
    transform: translateY(0);
  }

  .cta-arrow {
    font-size: 1.15rem;
    line-height: 1;
    transition: transform 0.15s;
  }

  .btn-start-customize:hover .cta-arrow {
    transform: translateX(4px);
  }

  /* ── Bottom Selector Section (Grid on Bottom) ── */
  .bottom-selector-section {
    padding: 12px 16px 14px;
    background: #FFFFFF;
    border-top: 1.5px solid #F0EAE0;
    box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 0 auto;
    border-radius: 28px 28px 0 0;
  }

  .bottom-selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
  }

  .selector-title {
    font-size: 0.76rem;
    font-weight: 800;
    color: #78716C;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-randomize {
    background: #F7F3EB;
    border: 1px solid #E7DFD1;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 0.72rem;
    font-weight: 800;
    color: #44403C;
    cursor: pointer;
    transition: transform 0.15s, background 0.15s;
  }

  .btn-randomize:hover {
    background: #EFE8DA;
    transform: scale(1.05);
  }

  /* Grid Scroll Container */
  .items-grid-scroll {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-height: 142px;
    overflow-y: auto;
    padding: 2px 2px 6px;
    scrollbar-width: thin;
    scrollbar-color: #D6CEBE transparent;
  }

  @media (max-width: 380px) {
    .items-grid-scroll {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Item Selection Box Card */
  .item-card-box {
    position: relative;
    aspect-ratio: 1;
    background: #FFFFFF;
    border-radius: 18px;
    border: 2px solid #EBE4D5;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
  }

  .item-card-box:hover {
    transform: translateY(-2px);
    border-color: #FDBA74;
    box-shadow: 0 6px 16px rgba(249, 115, 22, 0.12);
  }

  .item-card-box.is-active {
    border-color: #EA580C;
    box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2), 0 6px 18px rgba(234, 88, 12, 0.15);
  }

  /* Checkmark Badge on Active Card */
  .check-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #EA580C;
    color: #FFFFFF;
    font-size: 0.64rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(234, 88, 12, 0.4);
  }

  .item-icon-img {
    width: 60%;
    height: 60%;
    object-fit: contain;
    transition: transform 0.15s ease;
  }

  .item-card-box:hover .item-icon-img {
    transform: scale(1.08);
  }

  .item-icon-img.outfit-preview {
    width: 68%;
    height: 68%;
  }

  .item-icon-img.body-preview {
    width: 72%;
    height: 72%;
  }

  .item-icon-emoji {
    font-size: 1.5rem;
  }

  .item-caption {
    font-size: 0.6rem;
    font-weight: 700;
    color: #78716C;
    margin-top: 3px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* ── Character Preview Section (Upper Viewport) ── */
  .character-preview-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* Stage Top Navigation Bar */
  .stage-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 6px;
    z-index: 10;
  }

  .stage-nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: transparent;
    border: none;
    color: #292524;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
  }

  .stage-nav-btn:hover {
    background: #EFE8DA;
    transform: scale(1.08);
  }

  /* Editable Character Name */
  .stage-name-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stage-name-btn {
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 12px;
    transition: background 0.15s;
  }

  .stage-name-btn:hover {
    background: #EFE8DA;
  }

  .stage-name-text {
    font-size: 1.35rem;
    font-weight: 900;
    color: #1C1917;
    letter-spacing: -0.02em;
  }

  .pencil-icon {
    font-size: 0.85rem;
    opacity: 0.6;
  }

  .stage-name-input {
    font-size: 1.2rem;
    font-weight: 900;
    color: #1C1917;
    text-align: center;
    background: #FFFFFF;
    border: 2px solid #EA580C;
    border-radius: 12px;
    padding: 3px 10px;
    max-width: 140px;
    outline: none;
    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.18);
  }

  /* Save Button with Orange Checkmark Circle (Matching Reference Image) */
  .stage-save-btn {
    background: transparent;
    color: #1C1917;
    border: none;
    padding: 4px 6px;
    font-size: 0.95rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    transition: transform 0.15s, opacity 0.15s;
  }

  .stage-save-btn:hover {
    transform: scale(1.05);
    opacity: 0.9;
  }

  .save-label {
    letter-spacing: -0.01em;
  }

  .save-check-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #EA580C;
    color: #FFFFFF;
    font-size: 0.72rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 8px rgba(234, 88, 12, 0.4);
  }

  /* ── Character Viewport & Layering Stage ── */
  .character-viewport {
    flex: 1;
    min-height: 0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .scenic-backdrop {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    pointer-events: none;
    z-index: 1;
  }

  .trees-svg {
    width: 100%;
    height: 100%;
  }

  /* Layering Container */
  .character-stage-wrapper {
    position: relative;
    width: 200px;
    height: 320px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 3;
    animation: idleBreathe 3.5s ease-in-out infinite;
    transform-origin: bottom center;
  }

  @keyframes idleBreathe {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-4px) scale(1.012);
    }
  }

  /* Character Layers */
  .char-layer {
    pointer-events: none;
    user-select: none;
  }

  /* Body Image */
  .char-body-img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.1));
    z-index: 2;
  }

  /* Outfit Image */
  .char-outfit-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 4;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));
    transition: top 0.2s ease, width 0.2s ease;
  }

  /* Hat Image */
  .char-hat-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 6;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.16));
    transition: top 0.2s ease, width 0.2s ease;
  }

  /* ── Circular Category Tabs Dock (Matching Reference Image) ── */
  .circular-category-dock {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 6px 16px 12px;
    z-index: 10;
  }

  .circle-tab-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .circle-tab-btn:hover {
    background: #FFFFFF;
    transform: translateY(-2px) scale(1.06);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .circle-tab-btn.is-active {
    background: #FFFFFF;
    border-color: #EA580C;
    transform: scale(1.15);
    box-shadow: 0 6px 16px rgba(234, 88, 12, 0.22);
  }

  .circle-icon {
    font-size: 1.35rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Toast Notification ── */
  .customizer-toast {
    position: absolute;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(28, 25, 23, 0.92);
    color: #FFFFFF;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 800;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    z-index: 100;
    animation: toastPop 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    pointer-events: none;
    white-space: nowrap;
    backdrop-filter: blur(6px);
  }

  @keyframes toastPop {
    from { opacity: 0; transform: translate(-50%, 10px) scale(0.9); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
  }
</style>
