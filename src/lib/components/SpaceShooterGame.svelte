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
    onBack,
    onSwitchGame
  } = $props();

  // ── Game States: 'ready' | 'playing' | 'gameover' ──
  let gameState = $state('ready');
  let score = $state(0);
  let highScore = $state(0);
  let isNewHighScore = $state(false);
  let lives = $state(3);
  let wave = $state(1);
  let enemiesDefeated = $state(0);

  // ── Virtual World Dimensions ──
  const GAME_WIDTH = 380;
  const GAME_HEIGHT = 560;

  // ── Player Ship State ──
  const SHIP_WIDTH = 64;
  const SHIP_HEIGHT = 68;
  let playerX = $state(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
  let playerY = $state(GAME_HEIGHT - 105);
  let targetPlayerX = GAME_WIDTH / 2 - SHIP_WIDTH / 2;
  let shipTilt = $state(0);
  let isInvulnerable = $state(false);
  let invulnerableTimer = 0;
  let hasShield = $state(false);
  let weaponType = $state('normal'); // 'normal' | 'triple'
  let weaponTimer = 0;
  let isAutoFiring = $state(true);

  // ── Game Entities ──
  let bullets = $state([]);
  let enemyBullets = $state([]);
  let enemies = $state([]);
  let powerups = $state([]);
  let particles = $state([]);
  let scorePopups = $state([]);
  let stars = $state([]);

  // ── Input & Loop State ──
  let keys = { left: false, right: false, fire: false };
  let animationFrameId = null;
  let lastTimestamp = 0;
  let lastFireTime = 0;
  let fireRateMs = 180; // Rapid fire
  let enemySpawnTimer = 0;
  let waveAnnounceText = $state('');
  let waveAnnounceTimer = $state(0);

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

  function playLaserSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  function playExplosionSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  function playPowerupSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.15, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
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
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  // ── Starfield Initialization ──
  function initStars() {
    const list = [];
    for (let i = 0; i < 55; i++) {
      list.push({
        id: i,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() < 0.25 ? 2.5 : Math.random() < 0.5 ? 1.8 : 1.2,
        speed: Math.random() * 1.5 + 0.8,
        opacity: Math.random() * 0.6 + 0.4
      });
    }
    stars = list;
  }

  // ── Lifecycle & LocalStorage ──
  onMount(() => {
    try {
      const saved = localStorage.getItem('winda_space_shooter_highscore_v1');
      if (saved) highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    initStars();
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

  // ── Keyboard Controls ──
  function handleKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      keys.left = true;
    } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      keys.right = true;
    } else if (e.code === 'Space') {
      e.preventDefault();
      keys.fire = true;
      if (gameState === 'ready') startGame();
      else if (gameState === 'gameover') restartGame();
    }
  }

  function handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = false;
    } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = false;
    } else if (e.code === 'Space') {
      keys.fire = false;
    }
  }

  // ── Pointer & Touch Controls (Direct Drag & Buttons) ──
  function handlePointerDown(e) {
    if (gameState === 'ready') {
      startGame();
      return;
    }
    if (gameState === 'gameover') {
      restartGame();
      return;
    }
    updatePointerPosition(e);
  }

  function handlePointerMove(e) {
    if (gameState !== 'playing') return;
    if (e.buttons > 0 || e.pointerType === 'touch') {
      updatePointerPosition(e);
    }
  }

  function updatePointerPosition(e) {
    const stage = e.currentTarget.closest('.space-stage-screen') || e.currentTarget;
    const rect = stage.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    targetPlayerX = Math.max(10, Math.min(GAME_WIDTH - SHIP_WIDTH - 10, relX - SHIP_WIDTH / 2));
  }

  function moveLeft() {
    targetPlayerX = Math.max(10, targetPlayerX - 45);
  }

  function moveRight() {
    targetPlayerX = Math.min(GAME_WIDTH - SHIP_WIDTH - 10, targetPlayerX + 45);
  }

  // ── Game Management ──
  function startGame() {
    gameState = 'playing';
    score = 0;
    lives = 3;
    wave = 1;
    enemiesDefeated = 0;
    isNewHighScore = false;
    isInvulnerable = false;
    hasShield = false;
    weaponType = 'normal';
    weaponTimer = 0;
    playerX = GAME_WIDTH / 2 - SHIP_WIDTH / 2;
    targetPlayerX = playerX;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    powerups = [];
    particles = [];
    scorePopups = [];
    enemySpawnTimer = 0;
    lastTimestamp = performance.now();
    lastFireTime = 0;
    triggerWaveBanner(1);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function restartGame() {
    startGame();
  }

  function triggerWaveBanner(w) {
    waveAnnounceText = `MISSION ${w}`;
    waveAnnounceTimer = 85;
  }

  // ── Main Game Loop ──
  function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    const dt = Math.min((timestamp - lastTimestamp) / 16.66, 2.2);
    lastTimestamp = timestamp;

    updateStars(dt);
    updatePlayer(dt, timestamp);
    updateBullets(dt);
    updateEnemies(dt);
    updateEnemyBullets(dt);
    updatePowerups(dt);
    updateParticles(dt);
    updatePopups(dt);
    checkCollisions();

    // Wave Progression
    if (enemiesDefeated >= wave * 8) {
      wave += 1;
      enemiesDefeated = 0;
      triggerWaveBanner(wave);
      playPowerupSound();
    }

    if (waveAnnounceTimer > 0) {
      waveAnnounceTimer -= dt;
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // ── Subsystem Updates ──
  function updateStars(dt) {
    for (let s of stars) {
      s.y += s.speed * dt * 1.5;
      if (s.y > GAME_HEIGHT) {
        s.y = 0;
        s.x = Math.random() * GAME_WIDTH;
      }
    }
  }

  function updatePlayer(dt, timestamp) {
    // Keyboard steering
    if (keys.left) {
      targetPlayerX = Math.max(10, targetPlayerX - 6.5 * dt);
    }
    if (keys.right) {
      targetPlayerX = Math.min(GAME_WIDTH - SHIP_WIDTH - 10, targetPlayerX + 6.5 * dt);
    }

    // Smooth lerp to target position
    const diff = targetPlayerX - playerX;
    playerX += diff * 0.25 * dt;

    // Banking tilt animation
    shipTilt = Math.max(-14, Math.min(14, diff * 1.5));

    // Invulnerability timer
    if (isInvulnerable) {
      invulnerableTimer -= dt;
      if (invulnerableTimer <= 0) {
        isInvulnerable = false;
      }
    }

    // Powerup weapon timer
    if (weaponType !== 'normal') {
      weaponTimer -= dt;
      if (weaponTimer <= 0) {
        weaponType = 'normal';
      }
    }

    // Auto / Keyboard fire
    if (isAutoFiring || keys.fire) {
      if (timestamp - lastFireTime > fireRateMs) {
        firePlayerLaser();
        lastFireTime = timestamp;
      }
    }
  }

  function firePlayerLaser() {
    playLaserSound();
    const gunY = playerY + 8;
    const centerX = playerX + SHIP_WIDTH / 2;

    if (weaponType === 'triple') {
      // Triple blaster
      bullets.push({ id: Math.random(), x: centerX - 18, y: gunY, vx: -1.2, vy: -10, color: '#38BDF8' });
      bullets.push({ id: Math.random(), x: centerX - 2, y: gunY - 4, vx: 0, vy: -10.5, color: '#F43F5E' });
      bullets.push({ id: Math.random(), x: centerX + 14, y: gunY, vx: 1.2, vy: -10, color: '#38BDF8' });
    } else {
      // Dual lasers
      bullets.push({ id: Math.random(), x: centerX - 14, y: gunY, vx: 0, vy: -9.5, color: '#38BDF8' });
      bullets.push({ id: Math.random(), x: centerX + 10, y: gunY, vx: 0, vy: -9.5, color: '#38BDF8' });
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += (b.vx || 0) * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -10 || b.x > GAME_WIDTH + 10) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    enemySpawnTimer += dt;
    const spawnRate = Math.max(38, 70 - wave * 4); // Spawns faster in higher waves
    if (enemySpawnTimer > spawnRate) {
      spawnEnemy();
      enemySpawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.age += dt;

      // Enemy flight behavior
      if (e.pattern === 'zigzag') {
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.age * 0.08) * 35;
      } else if (e.pattern === 'dive') {
        e.y += e.vy * dt * 1.35;
        e.x += Math.sin(e.age * 0.05) * 1.5 * dt;
      } else {
        // Straight downward
        e.y += e.vy * dt;
      }

      // Enemy shooting (chance based on wave)
      if (Math.random() < 0.007 * wave && e.y < playerY - 60) {
        enemyBullets.push({
          id: Math.random(),
          x: e.x + e.width / 2 - 2,
          y: e.y + e.height,
          vy: 4.2 + wave * 0.2
        });
      }

      // Escaped off bottom
      if (e.y > GAME_HEIGHT + 40) {
        enemies.splice(i, 1);
      }
    }
  }

  function spawnEnemy() {
    const types = [
      { type: 'beetle', width: 34, height: 30, hp: 1, points: 100, pattern: 'zigzag', vy: 1.8 + wave * 0.15 },
      { type: 'saucer', width: 38, height: 26, hp: 1, points: 150, pattern: 'straight', vy: 2.3 + wave * 0.18 },
      { type: 'jelly', width: 32, height: 32, hp: 1, points: 200, pattern: 'dive', vy: 2.1 + wave * 0.2 }
    ];

    // Mini-boss Dreadnought every 5 waves or high score
    if (wave >= 3 && Math.random() < 0.2) {
      types.push({ type: 'boss', width: 52, height: 44, hp: 3, points: 400, pattern: 'zigzag', vy: 1.2 });
    }

    const t = types[Math.floor(Math.random() * types.length)];
    const startX = Math.random() * (GAME_WIDTH - t.width - 40) + 20;

    enemies.push({
      id: Math.random(),
      type: t.type,
      x: startX,
      baseX: startX,
      y: -40,
      width: t.width,
      height: t.height,
      hp: t.hp,
      points: t.points,
      pattern: t.pattern,
      vy: t.vy,
      age: 0
    });
  }

  function updateEnemyBullets(dt) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.y += eb.vy * dt;
      if (eb.y > GAME_HEIGHT + 20) {
        enemyBullets.splice(i, 1);
      }
    }
  }

  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += 2.0 * dt;
      p.pulse = (p.pulse || 0) + 0.1 * dt;
      if (p.y > GAME_HEIGHT + 30) {
        powerups.splice(i, 1);
      }
    }
  }

  function spawnPowerup(x, y) {
    const kinds = ['triple', 'shield', 'strawberry'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    powerups.push({
      id: Math.random(),
      type: kind,
      x,
      y,
      pulse: 0
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.fade * dt;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function spawnExplosion(x, y, color = '#F59E0B') {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 3,
        alpha: 1,
        fade: Math.random() * 0.05 + 0.04,
        color: Math.random() < 0.4 ? '#FFFFFF' : Math.random() < 0.7 ? color : '#EF4444'
      });
    }
  }

  function updatePopups(dt) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const pop = scorePopups[i];
      pop.y -= 1.2 * dt;
      pop.alpha -= 0.04 * dt;
      if (pop.alpha <= 0) {
        scorePopups.splice(i, 1);
      }
    }
  }

  function addScorePopup(text, x, y, color = '#FACC15') {
    scorePopups.push({
      id: Math.random(),
      text,
      x,
      y,
      alpha: 1,
      color
    });
  }

  // ── Collision Detection ──
  function checkCollisions() {
    // 1. Player Bullets vs Enemies
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (
          b.x < e.x + e.width &&
          b.x + 6 > e.x &&
          b.y < e.y + e.height &&
          b.y + 14 > e.y
        ) {
          // Hit enemy
          bullets.splice(bi, 1);
          e.hp -= 1;
          spawnExplosion(b.x, b.y, '#38BDF8');

          if (e.hp <= 0) {
            // Destroyed!
            playExplosionSound();
            spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, '#F59E0B');
            score += e.points;
            enemiesDefeated += 1;
            addScorePopup(`+${e.points}`, e.x + 8, e.y);

            // Chance to spawn powerup
            if (Math.random() < 0.22) {
              spawnPowerup(e.x + e.width / 2 - 12, e.y);
            }

            enemies.splice(ei, 1);
          }
          break;
        }
      }
    }

    // 2. Player vs Powerups
    const shipBox = {
      x: playerX + 8,
      y: playerY + 8,
      w: SHIP_WIDTH - 16,
      h: SHIP_HEIGHT - 12
    };

    for (let pi = powerups.length - 1; pi >= 0; pi--) {
      const p = powerups[pi];
      if (
        shipBox.x < p.x + 28 &&
        shipBox.x + shipBox.w > p.x &&
        shipBox.y < p.y + 28 &&
        shipBox.y + shipBox.h > p.y
      ) {
        powerups.splice(pi, 1);
        playPowerupSound();

        if (p.type === 'triple') {
          weaponType = 'triple';
          weaponTimer = 650; // ~10 seconds
          addScorePopup('TRIPLE BLASTER! ⚡', shipBox.x, shipBox.y - 15, '#38BDF8');
        } else if (p.type === 'shield') {
          hasShield = true;
          addScorePopup('SHIELD ACTIVE! 🛡️', shipBox.x, shipBox.y - 15, '#10B981');
        } else if (p.type === 'strawberry') {
          score += 250;
          addScorePopup('+250 🍓', shipBox.x, shipBox.y - 15, '#F43F5E');
        }
      }
    }

    // 3. Enemy Bullets vs Player
    if (!isInvulnerable) {
      for (let ebi = enemyBullets.length - 1; ebi >= 0; ebi--) {
        const eb = enemyBullets[ebi];
        if (
          shipBox.x < eb.x + 8 &&
          shipBox.x + shipBox.w > eb.x &&
          shipBox.y < eb.y + 12 &&
          shipBox.y + shipBox.h > eb.y
        ) {
          enemyBullets.splice(ebi, 1);
          playerHit();
          break;
        }
      }
    }

    // 4. Enemy Ships vs Player
    if (!isInvulnerable) {
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (
          shipBox.x < e.x + e.width - 6 &&
          shipBox.x + shipBox.w > e.x + 6 &&
          shipBox.y < e.y + e.height - 4 &&
          shipBox.y + shipBox.h > e.y + 4
        ) {
          spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, '#EF4444');
          enemies.splice(ei, 1);
          playerHit();
          break;
        }
      }
    }
  }

  function playerHit() {
    if (hasShield) {
      // Shield absorbs hit
      hasShield = false;
      isInvulnerable = true;
      invulnerableTimer = 60;
      playPowerupSound();
      spawnExplosion(playerX + SHIP_WIDTH / 2, playerY + SHIP_HEIGHT / 2, '#10B981');
      addScorePopup('SHIELD BROKEN!', playerX, playerY - 10, '#34D399');
      return;
    }

    playHitSound();
    spawnExplosion(playerX + SHIP_WIDTH / 2, playerY + SHIP_HEIGHT / 2, '#EF4444');
    lives -= 1;

    if (lives <= 0) {
      gameOver();
    } else {
      isInvulnerable = true;
      invulnerableTimer = 90; // ~1.5 seconds invulnerability
      weaponType = 'normal';
    }
  }

  function gameOver() {
    gameState = 'gameover';
    playExplosionSound();

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      try {
        localStorage.setItem('winda_space_shooter_highscore_v1', highScore.toString());
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.55 } });
      } catch (e) {}
    }
  }
</script>

<!-- ── GALAXY SHOOTER GAME VIEWPORT ── -->
<div class="space-card-root">
  <!-- Top Retro HUD Header -->
  <header class="space-top-bar">
    <button
      type="button"
      class="space-nav-btn"
      onclick={onBack}
      aria-label="Kembali"
      title="Kembali"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <div class="space-hud-scores">
      <div class="space-hud-pill score-pill">
        <span class="hud-tag">SCORE</span>
        <span class="hud-val">{score}</span>
      </div>
      <div class="space-hud-pill lives-pill">
        <span class="hud-tag">LIVES</span>
        <span class="hud-hearts">
          {#each Array(Math.max(0, lives)) as _}
            ❤️
          {/each}
        </span>
      </div>
      <div class="space-hud-pill high-pill">
        <span class="hud-tag">HI</span>
        <span class="hud-val">{highScore}</span>
      </div>
    </div>
  </header>

  <!-- Interactive Space Screen -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="space-stage-screen"
    role="button"
    tabindex="0"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    aria-label="Area luar angkasa, geser pesawat untuk bergerak"
  >
    <!-- Deep Space Starfield -->
    <div class="space-starfield">
      {#each stars as s (s.id)}
        <div
          class="space-star"
          style="left: {s.x}px; top: {s.y}px; width: {s.size}px; height: {s.size}px; opacity: {s.opacity};"
        ></div>
      {/each}
    </div>

    <!-- Wave Announcement Banner -->
    {#if waveAnnounceTimer > 0}
      <div class="wave-announcement" style="opacity: {Math.min(1, waveAnnounceTimer / 25)};">
        <span class="wave-glow-text">{waveAnnounceText}</span>
      </div>
    {/if}

    <!-- Player Bullets -->
    {#each bullets as b (b.id)}
      <div
        class="space-bullet"
        style="left: {b.x}px; top: {b.y}px; background: {b.color};"
      ></div>
    {/each}

    <!-- Enemy Plasma Bullets -->
    {#each enemyBullets as eb (eb.id)}
      <div
        class="enemy-plasma-bullet"
        style="left: {eb.x}px; top: {eb.y}px;"
      ></div>
    {/each}

    <!-- Alien Enemies -->
    {#each enemies as e (e.id)}
      <div
        class="space-alien alien-{e.type}"
        style="left: {e.x}px; top: {e.y}px; width: {e.width}px; height: {e.height}px;"
      >
        {#if e.type === 'beetle'}
          <!-- Neon Beetle Alien (Galaga classic) -->
          <svg viewBox="0 0 34 30" class="alien-svg">
            <path d="M17 2 L26 9 L28 18 L24 28 L17 24 L10 28 L6 18 L8 9 Z" fill="#F43F5E"/>
            <path d="M14 11 L20 11 L17 19 Z" fill="#FFE4E6"/>
            <!-- Glowing Eyes -->
            <circle cx="12" cy="10" r="2.5" fill="#38BDF8"/>
            <circle cx="22" cy="10" r="2.5" fill="#38BDF8"/>
            <!-- Antennae -->
            <path d="M10 5 L6 1 M24 5 L28 1" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"/>
          </svg>
        {:else if e.type === 'saucer'}
          <!-- Cyan Flying Saucer -->
          <svg viewBox="0 0 38 26" class="alien-svg">
            <!-- Dome -->
            <ellipse cx="19" cy="8" rx="8" ry="6" fill="#38BDF8" opacity="0.9"/>
            <circle cx="19" cy="8" r="2.5" fill="#FFFFFF"/>
            <!-- Saucer Rim -->
            <ellipse cx="19" cy="15" rx="17" ry="6" fill="#0EA5E9"/>
            <ellipse cx="19" cy="15" rx="14" ry="4" fill="#38BDF8"/>
            <!-- Lights -->
            <circle cx="8" cy="15" r="1.5" fill="#FACC15"/>
            <circle cx="19" cy="17" r="1.5" fill="#FACC15"/>
            <circle cx="30" cy="15" r="1.5" fill="#FACC15"/>
          </svg>
        {:else if e.type === 'jelly'}
          <!-- Galactic Jellyfish -->
          <svg viewBox="0 0 32 32" class="alien-svg">
            <!-- Bell head -->
            <path d="M4 16 C4 6 28 6 28 16 C28 18 4 18 4 16 Z" fill="#A855F7"/>
            <circle cx="11" cy="13" r="2.2" fill="#FDE047"/>
            <circle cx="21" cy="13" r="2.2" fill="#FDE047"/>
            <!-- Tentacles -->
            <path d="M7 18 Q6 26 8 30 M13 18 Q14 27 12 30 M19 18 Q18 27 20 30 M25 18 Q26 26 24 30" stroke="#C084FC" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        {:else if e.type === 'boss'}
          <!-- Boss Dreadnought -->
          <svg viewBox="0 0 52 44" class="alien-svg boss-svg">
            <polygon points="26,2 48,16 44,38 26,42 8,38 4,16" fill="#F59E0B" stroke="#FDE68A" stroke-width="2"/>
            <polygon points="26,10 40,20 26,34 12,20" fill="#EF4444"/>
            <circle cx="26" cy="22" r="5" fill="#38BDF8"/>
            <circle cx="26" cy="22" r="2" fill="#FFFFFF"/>
          </svg>
        {/if}
      </div>
    {/each}

    <!-- Powerups (Floating Items) -->
    {#each powerups as p (p.id)}
      <div
        class="space-powerup"
        style="left: {p.x}px; top: {p.y}px;"
      >
        {#if p.type === 'triple'}
          <div class="powerup-badge badge-triple">⚡</div>
        {:else if p.type === 'shield'}
          <div class="powerup-badge badge-shield">🛡️</div>
        {:else}
          <div class="powerup-badge badge-berry">🍓</div>
        {/if}
      </div>
    {/each}

    <!-- Pixel Particles -->
    {#each particles as pt (pt.id)}
      <div
        class="space-particle"
        style="left: {pt.x}px; top: {pt.y}px; width: {pt.size}px; height: {pt.size}px; opacity: {pt.alpha}; background: {pt.color};"
      ></div>
    {/each}

    <!-- Floating Score Popups -->
    {#each scorePopups as sp (sp.id)}
      <div
        class="score-popup"
        style="left: {sp.x}px; top: {sp.y}px; opacity: {sp.alpha}; color: {sp.color};"
      >
        {sp.text}
      </div>
    {/each}

    <!-- ── Player Spaceship with Customized Character in Cockpit ── -->
    <div
      class="player-spaceship-pod"
      class:is-hit-blink={isInvulnerable}
      style="left: {playerX}px; top: {playerY}px; width: {SHIP_WIDTH}px; height: {SHIP_HEIGHT}px; transform: rotate({shipTilt}deg);"
    >
      <!-- Shield Bubble Effect -->
      {#if hasShield}
        <div class="ship-shield-bubble"></div>
      {/if}

      <!-- Animated Thruster Flame -->
      <div class="ship-thruster-flame">
        <div class="flame-core"></div>
      </div>

      <!-- Spaceship Metal Hull Frame (SVG) -->
      <svg viewBox="0 0 64 68" class="spaceship-hull-svg">
        <!-- Wings & Fins -->
        <polygon points="32,6 62,48 50,62 32,54 14,62 2,48" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
        <!-- Wing Accents -->
        <polygon points="32,12 48,46 32,40 16,46" fill="#0EA5E9"/>
        <!-- Laser Blaster Cannons -->
        <rect x="4" y="32" width="4" height="18" rx="2" fill="#F43F5E"/>
        <rect x="56" y="32" width="4" height="18" rx="2" fill="#F43F5E"/>
        <!-- Cockpit Glass Outer Ring -->
        <circle cx="32" cy="30" r="17" fill="none" stroke="#38BDF8" stroke-width="2.5"/>
      </svg>

      <!-- Glass Cockpit with Customized Avatar Pilot -->
      <div class="cockpit-dome-window">
        <!-- Exact Scaled Character Pilot (Head & Bust inside cockpit) -->
        <div
          class="cockpit-pilot-scaler"
          class:is-kodok={currentBody?.id === 'kodok'}
          class:is-fox={currentBody?.id === 'fox'}
        >
          <!-- Layer 1: Body SVG -->
          <img
            src={currentBody.file}
            alt={currentBody.name}
            class="pilot-layer char-body-img"
          />

          <!-- Layer 2: Outfit SVG -->
          {#if currentOutfit && currentOutfit.file}
            <img
              src={currentOutfit.file}
              alt={currentOutfit.name}
              class="pilot-layer char-outfit-img"
              style={currentOutfitStyle}
            />
          {/if}

          <!-- Layer 3: Hat SVG -->
          {#if currentHat && currentHat.file}
            <img
              src={currentHat.file}
              alt={currentHat.name}
              class="pilot-layer char-hat-img"
              style={currentHatStyle}
            />
          {/if}
        </div>

        <!-- Glass Canopy Reflection Highlights -->
        <div class="cockpit-glass-glare"></div>
      </div>
    </div>

    <!-- ── Overlays: Ready & Game Over ── -->
    {#if gameState === 'ready'}
      <div class="space-overlay-banner">
        <div class="space-modal-box">
          <span class="arcade-badge">👾</span>
          <h3 class="arcade-title">GALAXY DEFENDER</h3>
          <p class="arcade-sub">Kapten {characterName}, siapkan meriam laser!</p>
          <div class="arcade-instructions">
            <span>👉 <strong>Geser / Drag layar</strong> untuk gerak</span>
            <span>⚡ Laser otomatis menembak alien</span>
          </div>
          <button type="button" class="btn-space-play" onclick={startGame}>
            <span>START MISSION 🚀</span>
          </button>
        </div>
      </div>
    {:else if gameState === 'gameover'}
      <div class="space-overlay-banner">
        <div class="space-modal-box gameover-box">
          <span class="gameover-arcade-icon">💥</span>
          <h3 class="arcade-title gameover-title-text">MISSION FAILED</h3>

          {#if isNewHighScore}
            <div class="space-high-badge">🏆 NEW HIGH SCORE! 🏆</div>
          {/if}

          <div class="arcade-score-summary">
            <div class="arcade-stat-item">
              <span class="stat-tag">FINAL SCORE</span>
              <span class="stat-number">{score}</span>
            </div>
            <div class="arcade-stat-item">
              <span class="stat-tag">MISSION REACHED</span>
              <span class="stat-number">WAVE {wave}</span>
            </div>
          </div>

          <div class="gameover-btn-group">
            <button type="button" class="btn-space-play" onclick={restartGame}>
              <span>TRY AGAIN 🔄</span>
            </button>
            {#if onSwitchGame}
              <button type="button" class="btn-space-secondary" onclick={onSwitchGame}>
                <span>GANTI GAME 🎮</span>
              </button>
            {/if}
            <button type="button" class="btn-space-secondary" onclick={onBack}>
              <span>GANTI BAJU 👗</span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Touch Navigation Controls Deck -->
  <footer class="space-footer-controller">
    <button
      type="button"
      class="ctrl-touch-btn"
      onpointerdown={moveLeft}
      aria-label="Gerak ke kiri"
    >
      <span>◀ KIRI</span>
    </button>

    <button
      type="button"
      class="ctrl-touch-btn fire-toggle-btn"
      class:is-active={isAutoFiring}
      onclick={() => isAutoFiring = !isAutoFiring}
      aria-label="Toggle auto-fire"
    >
      <span>{isAutoFiring ? '⚡ AUTO FIRE ON' : '🎯 MANUAL FIRE'}</span>
    </button>

    <button
      type="button"
      class="ctrl-touch-btn"
      onpointerdown={moveRight}
      aria-label="Gerak ke kanan"
    >
      <span>KANAN ▶</span>
    </button>
  </footer>
</div>

<style>
  .space-card-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #090D16;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* ── Retro HUD Top Bar ── */
  .space-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 8px;
    z-index: 20;
    background: #0F172A;
    border-bottom: 2px solid #1E293B;
  }

  .space-nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #1E293B;
    border: 1px solid #334155;
    color: #F8FAFC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, background 0.15s;
  }

  .space-nav-btn:hover {
    background: #334155;
    transform: scale(1.08);
  }

  .space-hud-scores {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .space-hud-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #1E293B;
    border: 1.5px solid #334155;
    border-radius: 12px;
    padding: 3px 8px;
    min-width: 58px;
  }

  .hud-tag {
    font-size: 0.58rem;
    font-weight: 800;
    color: #94A3B8;
    letter-spacing: 0.05em;
  }

  .hud-val {
    font-size: 0.88rem;
    font-weight: 900;
    color: #F8FAFC;
    font-family: monospace;
    letter-spacing: 0.02em;
  }

  .score-pill {
    border-color: #0284C7;
  }

  .score-pill .hud-val {
    color: #38BDF8;
  }

  .high-pill {
    border-color: #D97706;
  }

  .high-pill .hud-val {
    color: #FBBF24;
  }

  .hud-hearts {
    font-size: 0.72rem;
    letter-spacing: -2px;
  }

  /* ── Space Stage Screen ── */
  .space-stage-screen {
    flex: 1;
    position: relative;
    background: #050811;
    overflow: hidden;
    cursor: crosshair;
    touch-action: none;
  }

  /* Starfield */
  .space-starfield {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .space-star {
    position: absolute;
    background: #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
  }

  /* Wave Announcement */
  .wave-announcement {
    position: absolute;
    top: 35%;
    left: 0;
    right: 0;
    text-align: center;
    pointer-events: none;
    z-index: 25;
  }

  .wave-glow-text {
    font-size: 1.8rem;
    font-weight: 900;
    color: #FACC15;
    letter-spacing: 0.15em;
    text-shadow: 0 0 16px rgba(250, 204, 21, 0.8), 0 0 32px rgba(234, 88, 12, 0.6);
  }

  /* Bullets */
  .space-bullet {
    position: absolute;
    width: 4px;
    height: 16px;
    border-radius: 2px;
    pointer-events: none;
    box-shadow: 0 0 8px currentColor;
    z-index: 12;
  }

  .enemy-plasma-bullet {
    position: absolute;
    width: 6px;
    height: 10px;
    border-radius: 50%;
    background: #EF4444;
    box-shadow: 0 0 10px #F43F5E;
    pointer-events: none;
    z-index: 12;
  }

  /* Aliens */
  .space-alien {
    position: absolute;
    pointer-events: none;
    z-index: 14;
    transition: transform 0.05s linear;
  }

  .alien-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.6));
  }

  .boss-svg {
    filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.8));
  }

  /* Powerups */
  .space-powerup {
    position: absolute;
    width: 28px;
    height: 28px;
    pointer-events: none;
    z-index: 16;
  }

  .powerup-badge {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    background: rgba(15, 23, 42, 0.85);
    border: 2px solid #F59E0B;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.7);
    animation: pulseBadge 0.6s ease-in-out infinite alternate;
  }

  .badge-triple {
    border-color: #38BDF8;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
  }

  .badge-shield {
    border-color: #10B981;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
  }

  @keyframes pulseBadge {
    from { transform: scale(0.92); }
    to { transform: scale(1.12); }
  }

  /* Particles & Popups */
  .space-particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 18;
  }

  .score-popup {
    position: absolute;
    font-size: 0.85rem;
    font-weight: 900;
    pointer-events: none;
    z-index: 22;
    text-shadow: 0 0 8px currentColor;
  }

  /* ── Spaceship & Pilot Container ── */
  .player-spaceship-pod {
    position: absolute;
    pointer-events: none;
    z-index: 20;
    transition: transform 0.08s ease-out;
  }

  .is-hit-blink {
    animation: shipBlink 0.15s ease-in-out infinite alternate;
  }

  @keyframes shipBlink {
    from { opacity: 0.3; }
    to { opacity: 1; }
  }

  .spaceship-hull-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    filter: drop-shadow(0 4px 10px rgba(14, 165, 233, 0.4));
  }

  .ship-shield-bubble {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2.5px solid #10B981;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.4) 100%);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
    z-index: 8;
    pointer-events: none;
  }

  /* Thruster Flame */
  .ship-thruster-flame {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 18px;
    background: linear-gradient(to bottom, #F59E0B, #EF4444, transparent);
    border-radius: 50% 50% 80% 80%;
    filter: drop-shadow(0 0 8px #F97316);
    animation: flamePulse 0.12s ease-in-out infinite alternate;
    z-index: 1;
  }

  .flame-core {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 10px;
    background: #FFFFFF;
    border-radius: 50%;
  }

  @keyframes flamePulse {
    from { transform: translateX(-50%) scaleY(0.85); }
    to { transform: translateX(-50%) scaleY(1.25); }
  }

  /* Cockpit Dome Window & Pilot */
  .cockpit-dome-window {
    position: absolute;
    top: 13px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #1E293B 0%, #090D16 85%);
    border: 2px solid #38BDF8;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.8), inset 0 0 8px rgba(0, 0, 0, 0.8);
    z-index: 10;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  /* Scaler for Character inside Cockpit Dome */
  .cockpit-pilot-scaler {
    position: absolute;
    top: -4px;
    left: 50%;
    width: 191px;
    height: 335px;
    transform: translateX(-50%) scale(0.24);
    transform-origin: top center;
    pointer-events: none;
    transition: transform 0.12s ease;
  }

  .cockpit-pilot-scaler.is-kodok {
    top: -12px;
    transform: translateX(-50%) scale(0.27);
  }

  .cockpit-pilot-scaler.is-fox {
    top: -4px;
    transform: translateX(-50%) scale(0.24);
  }

  .pilot-layer {
    pointer-events: none;
    user-select: none;
  }

  .char-body-img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: contain;
    z-index: 2;
  }

  .char-outfit-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 4;
  }

  .char-hat-img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    z-index: 6;
  }

  .cockpit-glass-glare {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 60%);
    pointer-events: none;
    z-index: 15;
  }

  /* ── Overlays: Ready & Game Over ── */
  .space-overlay-banner {
    position: absolute;
    inset: 0;
    background: rgba(5, 8, 17, 0.78);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 18px;
  }

  .space-modal-box {
    background: #0F172A;
    border: 2px solid #38BDF8;
    border-radius: 24px;
    padding: 24px 20px;
    text-align: center;
    width: 100%;
    max-width: 320px;
    box-shadow: 0 0 30px rgba(56, 189, 248, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .arcade-badge {
    background: #1E293B;
    color: #38BDF8;
    border: 1px solid #0284C7;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .arcade-title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 900;
    color: #F8FAFC;
    letter-spacing: 0.04em;
    text-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
  }

  .arcade-sub {
    margin: 0;
    font-size: 0.85rem;
    color: #94A3B8;
    font-weight: 600;
  }

  .arcade-instructions {
    background: #1E293B;
    border-radius: 14px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.76rem;
    color: #CBD5E1;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
  }

  .btn-space-play {
    width: 100%;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    color: #FFFFFF;
    border: 2px solid #38BDF8;
    border-radius: 999px;
    padding: 12px 20px;
    font-size: 0.95rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(14, 165, 233, 0.45);
    transition: transform 0.12s, filter 0.12s;
  }

  .btn-space-play:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  .gameover-box {
    border-color: #EF4444;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
  }

  .gameover-arcade-icon {
    font-size: 2.2rem;
  }

  .gameover-title-text {
    color: #F87171;
    text-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
  }

  .space-high-badge {
    background: #FEF3C7;
    color: #92400E;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 900;
  }

  .arcade-score-summary {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .arcade-stat-item {
    flex: 1;
    background: #1E293B;
    border-radius: 14px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-tag {
    font-size: 0.62rem;
    font-weight: 800;
    color: #94A3B8;
  }

  .stat-number {
    font-size: 1.15rem;
    font-weight: 900;
    color: #F8FAFC;
    font-family: monospace;
  }

  .gameover-btn-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .btn-space-secondary {
    width: 100%;
    background: #1E293B;
    color: #F8FAFC;
    border: 1px solid #475569;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-space-secondary:hover {
    background: #334155;
  }

  /* ── Bottom Touch Controller Deck ── */
  .space-footer-controller {
    background: #0F172A;
    border-top: 2px solid #1E293B;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 20;
  }

  .ctrl-touch-btn {
    flex: 1;
    height: 44px;
    background: #1E293B;
    border: 1.5px solid #334155;
    border-radius: 14px;
    color: #F8FAFC;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.08s, background 0.12s;
  }

  .ctrl-touch-btn:active {
    transform: scale(0.96);
    background: #334155;
  }

  .fire-toggle-btn {
    flex: 1.3;
    border-color: #0284C7;
    color: #38BDF8;
  }

  .fire-toggle-btn.is-active {
    background: #0369A1;
    color: #FFFFFF;
    border-color: #38BDF8;
  }
</style>
