<script>
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';

  let {
    currentBody,
    currentHat,
    currentOutfit,
    currentHatStyle,
    currentOutfitStyle,
    characterName = 'Pip',
    onBack
  } = $props();

  // ── Game States: 'ready' | 'playing' | 'gameover' ──
  let gameState = $state('ready');
  let scoreDistance = $state(0);
  let berriesCollected = $state(0);
  let highScore = $state(0);
  let isNewHighScore = $state(false);

  // ── Physics & World Constants ──
  const GAME_WIDTH = 560; // virtual width
  const GAME_HEIGHT = 340; // virtual height
  const GROUND_Y = 240; // player feet baseline on ground
  const GRAVITY = 0.38; // lowered from 0.58 for floatier, farther jump
  const JUMP_FORCE = -10.5; // tuned jump force
  const PLAYER_WIDTH = 58;
  const PLAYER_HEIGHT = 92;

  // ── Player State ──
  let playerY = $state(GROUND_Y - PLAYER_HEIGHT);
  let velocityY = $state(0);
  let isGrounded = $state(true);
  let isDucking = $state(false);
  let playerRotation = $state(0);
  let runStepTimer = $state(0);
  let runWobbleAngle = $state(0);

  // ── Game Loop Variables ──
  let animationFrameId = null;
  let lastTimestamp = 0;
  let gameSpeed = $state(3.0); // reduced from 4.2 for more comfortable reaction time
  let distanceCounter = 0;

  // Parallax offsets
  let bgSkyOffset = $state(0);
  let bgTreesOffset = $state(0);
  let groundOffset = $state(0);

  // Obstacles & Collectibles
  let obstacles = $state([]);
  let collectibles = $state([]);
  let dustParticles = $state([]);

  let nextSpawnDistance = 0;
  let isHoldingJump = false;

  // ── Web Audio Synthesizer ──
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playJumpSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  function playCollectSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.06);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  function playHitSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  // ── Lifecycle & LocalStorage ──
  onMount(() => {
    try {
      const savedHigh = localStorage.getItem('winda_forest_runner_highscore_v1');
      if (savedHigh) highScore = parseInt(savedHigh, 10) || 0;
    } catch (e) {}

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onDestroy(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  });

  // ── Game Controls ──
  function handleKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      triggerJump();
    } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      isDucking = true;
    }
  }

  function handleKeyUp(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      isHoldingJump = false;
      // Cut jump short if released early for responsive jump control
      if (velocityY < -3) {
        velocityY *= 0.5;
      }
    } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      isDucking = false;
    }
  }

  function triggerJump() {
    if (gameState === 'ready') {
      startGame();
      return;
    }
    if (gameState === 'gameover') {
      restartGame();
      return;
    }
    if (isGrounded && gameState === 'playing') {
      velocityY = JUMP_FORCE;
      isGrounded = false;
      isHoldingJump = true;
      playJumpSound();
      spawnDustParticles(65, GROUND_Y - 4);
    }
  }

  function handleJumpPress(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    triggerJump();
  }

  function handleJumpRelease(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isHoldingJump = false;
    if (velocityY < -3) {
      velocityY *= 0.5;
    }
  }

  function handleDuckPress(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (gameState === 'ready') {
      startGame();
      return;
    }
    if (gameState === 'gameover') {
      restartGame();
      return;
    }
    isDucking = true;
  }

  function handleDuckRelease(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDucking = false;
  }

  function handleStageClick(e) {
    if (e.target && e.target.closest && e.target.closest('.underground-control-btn, .runner-top-bar button, .game-overlay-banner button')) {
      return;
    }
    triggerJump();
  }

  // ── Particle System ──
  function spawnDustParticles(x, y) {
    for (let i = 0; i < 4; i++) {
      dustParticles.push({
        id: Math.random(),
        x: x + (Math.random() * 12 - 6),
        y: y,
        vx: -(Math.random() * 2 + 1.5),
        vy: -(Math.random() * 1.5 + 0.5),
        size: Math.random() * 5 + 4,
        alpha: 0.7
      });
    }
  }

  // ── Game Management ──
  function startGame() {
    gameState = 'playing';
    scoreDistance = 0;
    distanceCounter = 0;
    berriesCollected = 0;
    gameSpeed = 3.0; // comfortable relaxed base speed
    obstacles = [];
    collectibles = [];
    dustParticles = [];
    playerY = GROUND_Y - PLAYER_HEIGHT;
    velocityY = 0;
    isGrounded = true;
    isDucking = false;
    isNewHighScore = false;
    nextSpawnDistance = 12; // Spawns first obstacle right at 12m (~0.8s into game)!
    lastTimestamp = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
    triggerJump();
  }

  function restartGame() {
    startGame();
  }

  // ── Main Game Loop ──
  function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    const dt = Math.min((timestamp - lastTimestamp) / 16.66, 2.5); // normalized delta time
    lastTimestamp = timestamp;

    updatePhysics(dt);
    updateObstaclesAndCollectibles(dt);
    updateParallax(dt);
    checkCollisions();

    // Score and speed increment
    distanceCounter += 0.22 * dt;
    scoreDistance = Math.floor(distanceCounter);

    // Subtle gentle speed scaling
    if (scoreDistance > 300) {
      gameSpeed = 3.0 + Math.min((scoreDistance - 300) * 0.002, 1.8);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function updatePhysics(dt) {
    // Gravity & Jump Physics
    velocityY += GRAVITY * dt;
    playerY += velocityY * dt;

    if (playerY >= GROUND_Y - (isDucking ? PLAYER_HEIGHT * 0.68 : PLAYER_HEIGHT)) {
      playerY = GROUND_Y - (isDucking ? PLAYER_HEIGHT * 0.68 : PLAYER_HEIGHT);
      velocityY = 0;
      if (!isGrounded) {
        // Just landed
        isGrounded = true;
        spawnDustParticles(65, GROUND_Y - 4);
      }
    }

    // Player Wobble & Tilt Animation
    if (isGrounded) {
      runStepTimer += 0.3 * dt;
      runWobbleAngle = Math.sin(runStepTimer) * 4.5;
      playerRotation = runWobbleAngle;
    } else {
      // Airborne tilt: tilted up when ascending, downward when falling
      playerRotation = Math.max(-18, Math.min(22, velocityY * 2.8));
    }

    // Update Dust Particles
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 0.045 * dt;
      if (p.alpha <= 0) {
        dustParticles.splice(i, 1);
      }
    }
  }

  function updateParallax(dt) {
    bgSkyOffset = (bgSkyOffset + gameSpeed * 0.12 * dt) % 560;
    bgTreesOffset = (bgTreesOffset + gameSpeed * 0.45 * dt) % 560;
    groundOffset = (groundOffset + gameSpeed * dt) % 560;
  }

  function updateObstaclesAndCollectibles(dt) {
    // Move existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= gameSpeed * dt;
      if (ob.x < -80) {
        obstacles.splice(i, 1);
      }
    }

    // Move existing collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const col = collectibles[i];
      col.x -= gameSpeed * dt;
      col.floatAngle = (col.floatAngle || 0) + 0.08 * dt;
      col.y = col.baseY + Math.sin(col.floatAngle) * 4;
      if (col.x < -60) {
        collectibles.splice(i, 1);
      }
    }

    // Spawn new obstacles & collectibles frequently (every ~1.2s - 2.0s)
    if (scoreDistance >= nextSpawnDistance) {
      spawnRandomObstacle();
      const baseGap = Math.max(16, 26 - Math.min(scoreDistance * 0.02, 10));
      const variance = Math.floor(Math.random() * 10);
      nextSpawnDistance = scoreDistance + baseGap + variance;
    }
  }

  function spawnRandomObstacle() {
    const types = ['log', 'mushroom', 'mushroom_double'];
    if (scoreDistance > 25) {
      types.push('bee');
      if (scoreDistance > 80) types.push('bee');
    }

    const type = types[Math.floor(Math.random() * types.length)];
    let width = 38;
    let height = 36;
    let y = GROUND_Y - height;

    if (type === 'log') {
      width = 44;
      height = 32;
      y = GROUND_Y - height;
    } else if (type === 'mushroom') {
      width = 34;
      height = 36;
      y = GROUND_Y - height;
    } else if (type === 'mushroom_double') {
      width = 54;
      height = 42;
      y = GROUND_Y - height;
    } else if (type === 'bee') {
      width = 34;
      height = 30;
      y = GROUND_Y - 82; // Flying high enough so ducking smoothly glides underneath
    }

    obstacles.push({
      id: Math.random(),
      type,
      x: GAME_WIDTH + 20,
      y,
      width,
      height
    });

    // Strawberry spawn: high frequency for reward & fun
    const randBerry = Math.random();
    if (randBerry < 0.35) {
      // 3-berry arc right after obstacle
      spawnStrawberryArc(GAME_WIDTH + (type === 'bee' ? 95 : 45));
    } else if (randBerry < 0.72) {
      // Single strawberry floating directly above obstacle or near ground
      const berryY = type === 'bee' ? GROUND_Y - 26 : GROUND_Y - height - 42;
      collectibles.push({
        id: Math.random(),
        type: 'strawberry',
        x: GAME_WIDTH + (type === 'bee' ? 80 : 25),
        baseY: berryY,
        y: berryY,
        floatAngle: 0,
        width: 24,
        height: 26
      });
    }
  }

  function spawnStrawberryArc(startX) {
    for (let i = 0; i < 3; i++) {
      const x = startX + i * 36;
      const arcY = GROUND_Y - 45 - Math.sin((i / 2) * Math.PI) * 25;
      collectibles.push({
        id: Math.random(),
        type: 'strawberry',
        x,
        baseY: arcY,
        y: arcY,
        floatAngle: i * 0.4,
        width: 24,
        height: 26
      });
    }
  }

  function checkCollisions() {
    // Player Hitbox (generous, forgiving for cozy feel)
    const pX = 65 + 14;
    const pY = playerY + 12;
    const pW = PLAYER_WIDTH - 28;
    const pH = (isDucking ? PLAYER_HEIGHT * 0.6 : PLAYER_HEIGHT) - 18;

    // Check Obstacles
    for (const ob of obstacles) {
      const oX = ob.x + 8;
      const oY = ob.y + 6;
      const oW = ob.width - 16;
      const oH = ob.height - 12;

      if (
        pX < oX + oW &&
        pX + pW > oX &&
        pY < oY + oH &&
        pY + pH > oY
      ) {
        gameOver();
        return;
      }
    }

    // Check Collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const col = collectibles[i];
      const cX = col.x;
      const cY = col.y;
      const cW = col.width;
      const cH = col.height;

      if (
        pX < cX + cW &&
        pX + pW > cX &&
        pY < cY + cH &&
        pY + pH > cY
      ) {
        // Collect!
        collectibles.splice(i, 1);
        berriesCollected += 1;
        playCollectSound();
      }
    }
  }

  function gameOver() {
    gameState = 'gameover';
    playHitSound();

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Check high score
    const totalScore = scoreDistance + berriesCollected * 10;
    if (totalScore > highScore) {
      highScore = totalScore;
      isNewHighScore = true;
      try {
        localStorage.setItem('winda_forest_runner_highscore_v1', highScore.toString());
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }
</script>

<!-- ── RUNNER GAME VIEWPORT ── -->
<div class="runner-card-root">
  <!-- Top Navigation & Score Header -->
  <header class="runner-top-bar">
    <button
      type="button"
      class="runner-nav-btn"
      onclick={onBack}
      aria-label="Kembali ke kustomisasi"
      title="Kembali"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <div class="runner-hud-scores">
      <div class="hud-stat-pill distance-pill">
        <span class="hud-icon">🌲</span>
        <span class="hud-val">{scoreDistance}m</span>
      </div>
      <div class="hud-stat-pill berry-pill">
        <span class="hud-icon">🍓</span>
        <span class="hud-val">{berriesCollected}</span>
      </div>
      <div class="hud-stat-pill high-pill">
        <span class="hud-icon">🏆</span>
        <span class="hud-val">{highScore}</span>
      </div>
    </div>
  </header>

  <!-- Interactive Game Area (Touch / Click to Jump) -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="game-stage-screen"
    role="button"
    tabindex="0"
    onclick={handleStageClick}
    aria-label="Area permainan, ketuk untuk melompat"
  >
    <!-- Background Layer 1: Sky & Clouds (Slow Parallax) -->
    <div
      class="parallax-layer bg-sky"
      style="background-position-x: -{bgSkyOffset}px;"
    ></div>

    <!-- Background Layer 2: Distant Pine Forest Silhouettes -->
    <div
      class="parallax-layer bg-forest"
      style="background-position-x: -{bgTreesOffset}px;"
    ></div>

    <!-- Ground Track & Underground Stratum Layer (Parallax) -->
    <div
      class="parallax-layer ground-track"
      style="background-position-x: -{groundOffset}px;"
    ></div>

    <!-- Collectibles (Strawberries 🍓) -->
    {#each collectibles as item (item.id)}
      <div
        class="game-entity entity-berry"
        style="left: {item.x}px; top: {item.y}px; width: {item.width}px; height: {item.height}px;"
      >
        <svg viewBox="0 0 32 32" class="berry-svg">
          <!-- Strawberry Leaf -->
          <path d="M16 4 C14 2 11 3 10 5 C12 6 15 6 16 7 C17 6 20 6 22 5 C21 3 18 2 16 4 Z" fill="#4ADE80"/>
          <!-- Strawberry Body -->
          <path d="M8 11 C8 7 24 7 24 11 C24 20 18 27 16 28 C14 27 8 20 8 11 Z" fill="#EF4444"/>
          <!-- Seeds -->
          <circle cx="12" cy="12" r="1" fill="#FEF08A"/>
          <circle cx="20" cy="12" r="1" fill="#FEF08A"/>
          <circle cx="16" cy="16" r="1" fill="#FEF08A"/>
          <circle cx="13" cy="20" r="1" fill="#FEF08A"/>
          <circle cx="19" cy="20" r="1" fill="#FEF08A"/>
        </svg>
      </div>
    {/each}

    <!-- Obstacles (Logs, Mushrooms, Bees) -->
    {#each obstacles as ob (ob.id)}
      <div
        class="game-entity entity-obstacle"
        style="left: {ob.x}px; top: {ob.y}px; width: {ob.width}px; height: {ob.height}px;"
      >
        {#if ob.type === 'log'}
          <!-- Cute Wood Log Stump with Sprout -->
          <svg viewBox="0 0 44 32" class="obstacle-svg">
            <rect x="2" y="8" width="40" height="22" rx="7" fill="#854D0E"/>
            <ellipse cx="22" cy="8" rx="20" ry="7" fill="#A16207"/>
            <ellipse cx="22" cy="8" rx="14" ry="4" fill="#CA8A04"/>
            <!-- Little green sprout -->
            <path d="M14 8 Q10 2 12 1 Q16 1 15 8 Z" fill="#84CC16"/>
          </svg>
        {:else if ob.type === 'mushroom'}
          <!-- Cute Polkadot Mushroom -->
          <svg viewBox="0 0 34 36" class="obstacle-svg">
            <path d="M12 20 L12 34 C12 35 22 35 22 34 L22 20 Z" fill="#FEF3C7"/>
            <path d="M2 20 C2 7 32 7 32 20 C28 22 6 22 2 20 Z" fill="#E11D48"/>
            <circle cx="10" cy="14" r="2.5" fill="#FFFFFF"/>
            <circle cx="24" cy="14" r="2.5" fill="#FFFFFF"/>
            <circle cx="17" cy="10" r="2" fill="#FFFFFF"/>
          </svg>
        {:else if ob.type === 'mushroom_double'}
          <!-- Double Mushroom Cluster -->
          <svg viewBox="0 0 54 42" class="obstacle-svg">
            <!-- Small mushroom -->
            <path d="M8 26 L8 40 C8 41 16 41 16 40 L16 26 Z" fill="#FEF3C7"/>
            <path d="M2 26 C2 15 22 15 22 26 Z" fill="#FB7185"/>
            <!-- Big mushroom -->
            <path d="M28 20 L28 40 C28 41 42 41 42 40 L42 20 Z" fill="#FEF3C7"/>
            <path d="M18 20 C18 6 52 6 52 20 Z" fill="#E11D48"/>
            <circle cx="30" cy="13" r="3" fill="#FFFFFF"/>
            <circle cx="44" cy="14" r="2.5" fill="#FFFFFF"/>
          </svg>
        {:else if ob.type === 'bee'}
          <!-- Flying Cute Honeybee -->
          <svg viewBox="0 0 32 28" class="obstacle-svg bee-flying">
            <!-- Wings -->
            <ellipse cx="14" cy="6" rx="6" ry="5" fill="#E0F2FE" opacity="0.85"/>
            <ellipse cx="20" cy="6" rx="5" ry="4" fill="#E0F2FE" opacity="0.85"/>
            <!-- Body -->
            <ellipse cx="16" cy="17" rx="12" ry="9" fill="#FACC15"/>
            <!-- Stripes -->
            <path d="M13 8 L13 26 M19 8 L19 26" stroke="#1E293B" stroke-width="3"/>
            <!-- Eye -->
            <circle cx="8" cy="15" r="2" fill="#0F172A"/>
          </svg>
        {/if}
      </div>
    {/each}

    <!-- Running Dust Puffs -->
    {#each dustParticles as p (p.id)}
      <div
        class="dust-particle"
        style="left: {p.x}px; top: {p.y}px; width: {p.size}px; height: {p.size}px; opacity: {p.alpha};"
      ></div>
    {/each}

    <!-- ── Player Avatar Character (Exact Customized SVG Layers Scaled) ── -->
    <div
      class="runner-player-container"
      class:is-ducking={isDucking}
      style="top: {playerY}px; transform: rotate({playerRotation}deg);"
    >
      <div class="runner-char-scaler">
        <!-- Layer 1: Body SVG -->
        <img
          src={currentBody.file}
          alt={currentBody.name}
          class="runner-layer char-body-img"
        />

        <!-- Layer 2: Outfit SVG -->
        {#if currentOutfit && currentOutfit.file}
          <img
            src={currentOutfit.file}
            alt={currentOutfit.name}
            class="runner-layer char-outfit-img"
            style={currentOutfitStyle}
          />
        {/if}

        <!-- Layer 3: Hat SVG -->
        {#if currentHat && currentHat.file}
          <img
            src={currentHat.file}
            alt={currentHat.name}
            class="runner-layer char-hat-img"
            style={currentHatStyle}
          />
        {/if}
      </div>
    </div>

    <!-- ── Underground Tactile Control Deck (Thumb friendly on mobile/portrait) ── -->
    <div class="underground-controls-bar">
      <!-- Duck / Slide Button -->
      <button
        type="button"
        class="underground-control-btn duck-btn"
        class:is-active={isDucking}
        onpointerdown={handleDuckPress}
        onpointerup={handleDuckRelease}
        onpointercancel={handleDuckRelease}
        aria-label="Tunduk di bawah lebah"
      >
        <span class="ctrl-icon">🍃</span>
        <div class="ctrl-labels">
          <span class="ctrl-main-txt">TUNDUK</span>
          <span class="ctrl-sub-txt">[↓]</span>
        </div>
      </button>

      <!-- Jump Button -->
      <button
        type="button"
        class="underground-control-btn jump-btn"
        class:is-active={!isGrounded}
        onpointerdown={handleJumpPress}
        onpointerup={handleJumpRelease}
        onpointercancel={handleJumpRelease}
        aria-label="Lompat hindari rintangan"
      >
        <span class="ctrl-icon">🐾</span>
        <div class="ctrl-labels">
          <span class="ctrl-main-txt">LOMPAT</span>
          <span class="ctrl-sub-txt">[↑]</span>
        </div>
      </button>
    </div>

    <!-- ── Screen Overlays: Ready & Game Over ── -->
    {#if gameState === 'ready'}
      <div class="game-overlay-banner">
        <div class="ready-modal-box">
          <!-- <span class="ready-badge">🏃 ENDLESS RUNNER</span> -->
          <h3 class="ready-title">Lets Run, {characterName}!</h3>
          <!-- <p class="ready-desc">Ketuk tombol di bawah atau tekan <strong>Spasi</strong> untuk melompat!</p> -->
          <button type="button" class="btn-play-action" onclick={startGame}>
            <span>Start Running!</span>
          </button>
        </div>
      </div>
    {:else if gameState === 'gameover'}
      <div class="game-overlay-banner">
        <div class="gameover-modal-box">
          <span class="gameover-emoji"></span>
          <h3 class="gameover-title">Game Over WLEEEE</h3>

          {#if isNewHighScore}
            <div class="highscore-badge-shine">New Record !</div>
          {/if}

          <div class="gameover-stats-grid">
            <div class="stat-box">
              <span class="stat-lbl">Jarak Lari</span>
              <span class="stat-num">{scoreDistance}m</span>
            </div>
            <div class="stat-box">
              <span class="stat-lbl">Stroberi</span>
              <span class="stat-num">{berriesCollected} 🍓</span>
            </div>
          </div>

          <div class="gameover-actions">
            <button type="button" class="btn-play-action" onclick={restartGame}>
              <span>Try Again 🔄</span>
            </button>
            <button type="button" class="btn-secondary-action" onclick={onBack}>
              <span>Ganti Baju 👗</span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Mobile Bottom Control Hint -->
  <!-- <footer class="runner-footer-hint">
    <span>💡 Sentuh tombol LOMPAT & TUNDUK di bawah • Kumpulkan 🍓</span>
  </footer> -->
</div>

<style>
  .runner-card-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #FDFBF7;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }

  /* ── Top Bar ── */
  .runner-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px 8px;
    z-index: 20;
    background: #FAF6EF;
    border-bottom: 1.5px solid #EFE8DA;
  }

  .runner-nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #E7DFD1;
    color: #292524;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }

  .runner-nav-btn:hover {
    background: #F5EFE6;
    transform: scale(1.08);
  }

  .runner-hud-scores {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hud-stat-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #FFFFFF;
    border: 1.5px solid #EFE8DA;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 0.8rem;
    font-weight: 800;
    color: #44403C;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  .hud-val {
    letter-spacing: -0.01em;
  }

  .distance-pill {
    color: #15803D;
    border-color: #BBF7D0;
  }

  .berry-pill {
    color: #E11D48;
    border-color: #FECDD3;
  }

  .high-pill {
    color: #B45309;
    border-color: #FDE68A;
  }

  /* ── Interactive Stage Screen ── */
  .game-stage-screen {
    flex: 1;
    position: relative;
    background: #E8F4F8;
    overflow: hidden;
    cursor: pointer;
    touch-action: manipulation;
  }

  /* Parallax Layers */
  .parallax-layer {
    position: absolute;
    width: 100%;
    left: 0;
    pointer-events: none;
  }

  /* Layer 1: Sky with Clouds */
  .bg-sky {
    top: 0;
    height: 180px;
    background-image: radial-gradient(circle at 50% 30%, #FFFFFF 15%, transparent 60%),
      radial-gradient(circle at 15% 45%, #FFFFFF 12%, transparent 55%),
      radial-gradient(circle at 85% 40%, #FFFFFF 14%, transparent 55%);
    background-repeat: repeat-x;
    background-size: 560px 180px;
    opacity: 0.8;
  }

  /* Layer 2: Distant Pine Hills Silhouette */
  .bg-forest {
    top: 100px;
    height: 140px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='140' viewBox='0 0 560 140'%3E%3Cpath d='M0 140 L0 80 Q40 50 80 80 T160 70 T240 85 T320 60 T400 80 T480 65 T560 80 L560 140 Z' fill='%23C7E2C3' opacity='0.7'/%3E%3Cpath d='M0 140 L0 100 Q50 80 100 95 T200 85 T300 100 T400 90 T500 105 T560 95 L560 140 Z' fill='%23A4D1A0' opacity='0.9'/%3E%3C/svg%3E");
    background-repeat: repeat-x;
    background-size: 560px 140px;
  }

  /* Ground Track with Grass, Wildflowers & Rich Underground Geological Stratum */
  .ground-track {
    position: absolute;
    left: 0;
    right: 0;
    top: 240px;
    bottom: 0;
    width: 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='480' viewBox='0 0 560 480'%3E%3Cdefs%3E%3ClinearGradient id='soilGrad' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23785133'/%3E%3Cstop offset='25%25' stop-color='%23633E20'/%3E%3Cstop offset='55%25' stop-color='%234F2E14'/%3E%3Cstop offset='100%25' stop-color='%23381E0B'/%3E%3C/linearGradient%3E%3ClinearGradient id='gemEmerald' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%236EE7B7'/%3E%3Cstop offset='100%25' stop-color='%23059669'/%3E%3C/linearGradient%3E%3ClinearGradient id='gemAmethyst' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23E9D5FF'/%3E%3Cstop offset='100%25' stop-color='%237E22CE'/%3E%3C/linearGradient%3E%3ClinearGradient id='gemRuby' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23FECDD3'/%3E%3Cstop offset='100%25' stop-color='%23BE123C'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='560' height='480' fill='url(%23soilGrad)'/%3E%3Crect width='560' height='12' fill='%235D9B43'/%3E%3Cpath d='M0 12 Q10 16 20 12 T40 12 T60 12 T80 12 T100 12 T120 12 T140 12 T160 12 T180 12 T200 12 T220 12 T240 12 T260 12 T280 12 T300 12 T320 12 T340 12 T360 12 T380 12 T400 12 T420 12 T440 12 T460 12 T480 12 T500 12 T520 12 T540 12 T560 12' fill='%234D8534'/%3E%3Ccircle cx='35' cy='6' r='3' fill='%23FDE047'/%3E%3Ccircle cx='95' cy='6' r='2.5' fill='%23FFFFFF'/%3E%3Ccircle cx='180' cy='6' r='3' fill='%23F472B6'/%3E%3Ccircle cx='270' cy='6' r='2.5' fill='%23FDE047'/%3E%3Ccircle cx='360' cy='6' r='3' fill='%23F472B6'/%3E%3Ccircle cx='450' cy='6' r='2.5' fill='%23FFFFFF'/%3E%3Ccircle cx='515' cy='6' r='3' fill='%23FDE047'/%3E%3Cpath d='M30 14 Q25 35 32 50 T28 75' stroke='%234A2D16' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3Cpath d='M32 50 Q42 62 45 70' stroke='%234A2D16' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Cpath d='M160 14 Q168 40 162 65 T170 95' stroke='%234A2D16' stroke-width='3.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M310 14 Q305 32 312 55 T304 80' stroke='%234A2D16' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3Cpath d='M470 14 Q475 42 468 70 T474 105' stroke='%234A2D16' stroke-width='3.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M468 70 Q455 85 450 92' stroke='%234A2D16' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Cellipse cx='75' cy='45' rx='7' ry='4' fill='%23926744' opacity='0.7'/%3E%3Cellipse cx='225' cy='52' rx='9' ry='5' fill='%23926744' opacity='0.6'/%3E%3Cellipse cx='390' cy='48' rx='6' ry='4' fill='%23926744' opacity='0.7'/%3E%3Cellipse cx='530' cy='56' rx='8' ry='5' fill='%23926744' opacity='0.6'/%3E%3Cpath d='M100 130 Q120 120 140 135' stroke='%23381F0C' stroke-width='2' stroke-dasharray='4,4' fill='none'/%3E%3Cg transform='translate(80, 115)'%3E%3Ccircle cx='12' cy='12' r='12' fill='%235A381B'/%3E%3Cpath d='M12 2 A10 10 0 1 1 2 12 A8 8 0 1 1 12 6 A6 6 0 1 1 8 12 A4 4 0 1 1 12 10' fill='none' stroke='%23E6D5B8' stroke-width='2' stroke-linecap='round'/%3E%3C/g%3E%3Cg transform='translate(340, 120)'%3E%3Cpath d='M10 8 C6 4 0 7 4 12 C0 17 6 20 10 16 L32 16 C36 20 42 17 38 12 C42 7 36 4 32 8 Z' fill='%23EFE5D0' opacity='0.85'/%3E%3C/g%3E%3Cg transform='translate(200, 190)'%3E%3Cpolygon points='10,0 20,7 16,22 4,22 0,7' fill='url(%23gemEmerald)'/%3E%3Cpolygon points='10,0 15,7 10,22 5,7' fill='%23A7F3D0' opacity='0.6'/%3E%3Ccircle cx='7' cy='5' r='1.5' fill='%23FFFFFF'/%3E%3C/g%3E%3Cg transform='translate(440, 210)'%3E%3Cpolygon points='8,0 16,8 8,24 0,8' fill='url(%23gemRuby)'/%3E%3Cpolygon points='8,0 12,8 8,24' fill='%23FDA4AF' opacity='0.7'/%3E%3Ccircle cx='6' cy='6' r='1.2' fill='%23FFFFFF'/%3E%3C/g%3E%3Cg transform='translate(50, 260)'%3E%3Cpolygon points='6,0 12,6 9,22 3,22 0,6' fill='url(%23gemAmethyst)'/%3E%3Cpolygon points='14,4 19,9 17,20 12,20 10,9' fill='url(%23gemAmethyst)' opacity='0.85'/%3E%3Ccircle cx='5' cy='5' r='1.2' fill='%23FFFFFF'/%3E%3C/g%3E%3Cg transform='translate(280, 240)'%3E%3Cellipse cx='26' cy='18' rx='24' ry='15' fill='%23271408'/%3E%3Cpath d='M20 22 C18 14 26 10 28 16 C30 20 34 22 38 20' fill='none' stroke='%23FB7185' stroke-width='6' stroke-linecap='round'/%3E%3Ccircle cx='24' cy='12' r='1.5' fill='%23000000'/%3E%3Ccircle cx='24.5' cy='11.5' r='0.6' fill='%23FFFFFF'/%3E%3Ccircle cx='27' cy='13' r='1' fill='%23F43F5E'/%3E%3C/g%3E%3Cpath d='M0 320 Q140 310 280 325 T560 315' stroke='%232E1607' stroke-width='3' opacity='0.5' fill='none'/%3E%3Cpath d='M0 390 Q160 400 320 385 T560 395' stroke='%23221005' stroke-width='3.5' opacity='0.5' fill='none'/%3E%3Ccircle cx='140' cy='350' r='2.5' fill='%23FACC15'/%3E%3Ccircle cx='146' cy='354' r='2' fill='%23FACC15'/%3E%3Ccircle cx='370' cy='340' r='2.5' fill='%23FACC15'/%3E%3Ccircle cx='377' cy='343' r='1.8' fill='%23FACC15'/%3E%3Ccircle cx='490' cy='365' r='3' fill='%23FACC15'/%3E%3C/svg%3E");
    background-repeat: repeat-x;
    background-size: 560px 480px;
    background-color: #381E0B;
    border-top: 3.5px solid #386620;
    box-shadow: inset 0 8px 16px rgba(0, 0, 0, 0.25);
  }

  /* ── Underground Tactile Controller Bar ── */
  .underground-controls-bar {
    position: absolute;
    bottom: 12px;
    left: 14px;
    right: 14px;
    display: flex;
    gap: 12px;
    z-index: 25;
    pointer-events: auto;
  }

  .underground-control-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 52px;
    border-radius: 18px;
    border: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    transition: transform 0.08s ease, filter 0.12s ease, box-shadow 0.12s ease;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3);
  }

  .underground-control-btn:active,
  .underground-control-btn.is-active {
    transform: translateY(3px) scale(0.97);
    filter: brightness(0.92);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  }

  .duck-btn {
    background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
    color: #FFFFFF;
    border: 2px solid #FCD34D;
  }

  .jump-btn {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: #FFFFFF;
    border: 2px solid #6EE7B7;
  }

  .ctrl-icon {
    font-size: 1.4rem;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
  }

  .ctrl-labels {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.15;
  }

  .ctrl-main-txt {
    font-size: 0.92rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .ctrl-sub-txt {
    font-size: 0.65rem;
    font-weight: 700;
    opacity: 0.88;
  }

  /* ── Entities (Obstacles & Berries) ── */
  .game-entity {
    position: absolute;
    pointer-events: none;
    z-index: 10;
  }

  .obstacle-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.15));
  }

  .bee-flying {
    animation: beeFloat 0.3s ease-in-out infinite alternate;
  }

  @keyframes beeFloat {
    from { transform: translateY(-2px); }
    to { transform: translateY(3px); }
  }

  .entity-berry {
    filter: drop-shadow(0 3px 6px rgba(225, 29, 72, 0.25));
    animation: berryPulse 0.8s ease-in-out infinite alternate;
  }

  @keyframes berryPulse {
    from { transform: scale(0.96); }
    to { transform: scale(1.06); }
  }

  .berry-svg {
    width: 100%;
    height: 100%;
  }

  /* Dust Particle */
  .dust-particle {
    position: absolute;
    background: #EAE3D2;
    border-radius: 50%;
    pointer-events: none;
    z-index: 8;
  }

  /* ── Player Character Container ── */
  .runner-player-container {
    position: absolute;
    left: 65px;
    width: 58px;
    height: 92px;
    pointer-events: none;
    z-index: 12;
    transform-origin: bottom center;
    transition: transform 0.08s ease-out;
  }

  .runner-player-container.is-ducking {
    height: 58px;
    transform: scaleY(0.7) !important;
  }

  /* Exactly replicates the 200px x 320px customizer stage, scaled down to 58x92 */
  .runner-char-scaler {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 200px;
    height: 320px;
    transform: translateX(-50%) scale(0.2875);
    transform-origin: bottom center;
    pointer-events: none;
  }

  .runner-layer {
    pointer-events: none;
    user-select: none;
  }

  .char-body-img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: contain;
    z-index: 2;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12));
  }

  .char-outfit-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 4;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));
  }

  .char-hat-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 6;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.16));
  }

  /* ── Overlay Modal Banners (Ready & Game Over) ── */
  .game-overlay-banner {
    position: absolute;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 16px;
    animation: fadeInModal 0.2s ease-out;
  }

  .ready-modal-box,
  .gameover-modal-box {
    background: #FFFFFF;
    border-radius: 28px;
    padding: 22px 24px;
    text-align: center;
    max-width: 310px;
    width: 100%;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ready-badge {
    background: #DCFCE7;
    color: #15803D;
    font-size: 0.68rem;
    font-weight: 900;
    padding: 3px 10px;
    border-radius: 999px;
    letter-spacing: 0.05em;
  }

  .ready-title,
  .gameover-title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 900;
    color: #1C1917;
  }

  .ready-desc {
    margin: 0;
    font-size: 0.82rem;
    color: #78716C;
    line-height: 1.4;
  }

  .gameover-emoji {
    font-size: 2.2rem;
    line-height: 1;
  }

  .highscore-badge-shine {
    background: linear-gradient(135deg, #FEF08A, #F59E0B);
    color: #78350F;
    font-size: 0.72rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }

  .gameover-stats-grid {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 4px;
  }

  .stat-box {
    flex: 1;
    background: #FAF6EF;
    border: 1px solid #EFE8DA;
    border-radius: 16px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-lbl {
    font-size: 0.68rem;
    color: #8C827A;
    font-weight: 700;
  }

  .stat-num {
    font-size: 1.15rem;
    font-weight: 900;
    color: #1C1917;
  }

  .btn-play-action {
    width: 100%;
    background: #10B981;
    color: #FFFFFF;
    border: none;
    border-radius: 999px;
    padding: 12px 20px;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
    transition: transform 0.15s, background 0.15s;
    margin-top: 6px;
  }

  .btn-play-action:hover {
    background: #059669;
    transform: translateY(-2px);
  }

  .gameover-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .btn-secondary-action {
    width: 100%;
    background: #FAF6EF;
    color: #44403C;
    border: 1px solid #EFE8DA;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 0.88rem;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }

  .btn-secondary-action:hover {
    background: #EFE8DA;
    transform: translateY(-1px);
  }

  /* ── Bottom Hint Footer ── */
  .runner-footer-hint {
    background: #FAF6EF;
    border-top: 1px solid #EFE8DA;
    padding: 8px 16px;
    text-align: center;
    font-size: 0.72rem;
    font-weight: 700;
    color: #78716C;
  }
</style>
