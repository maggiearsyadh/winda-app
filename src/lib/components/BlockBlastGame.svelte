<script>
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';

  let {
    currentBody,
    currentHat,
    currentOutfit,
    currentHatStyle,
    currentOutfitStyle,
    characterName = 'Winduy',
    onBack,
    onSwitchGame
  } = $props();

  // ── Grid Dimensions ──
  const GRID_SIZE = 8; // 8x8 Block Blast standard

  // ── Game States ──
  let gameState = $state('playing'); // 'playing' | 'gameover'
  let score = $state(0);
  let highScore = $state(0);
  let isNewHighScore = $state(false);
  let comboCount = $state(0);
  let linesClearedTotal = $state(0);

  // 8x8 Board Matrix
  let grid = $state(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  // Floating Popups & Particle Effects
  let scorePopups = $state([]);
  let mascotMood = $state('happy'); // 'happy' | 'cheer' | 'worried' | 'gameover'
  let mascotMessage = $state('susun baloknya!');
  let mascotMessageTimer = null;

  // Board Element reference for coordinate tracking
  let boardEl = $state(null);

  // ── Polyomino Block Shapes Database ──
  const SHAPES_DB = [
    // 1-Block
    {
      name: 'dot',
      color: '#F43F5E',
      matrix: [[1]]
    },
    // 2-Blocks
    {
      name: 'h2',
      color: '#F59E0B',
      matrix: [[1, 1]]
    },
    {
      name: 'v2',
      color: '#F59E0B',
      matrix: [[1], [1]]
    },
    // 3-Blocks Lines
    {
      name: 'h3',
      color: '#10B981',
      matrix: [[1, 1, 1]]
    },
    {
      name: 'v3',
      color: '#10B981',
      matrix: [[1], [1], [1]]
    },
    // 3-Blocks Mini-L
    {
      name: 'corner_tl',
      color: '#06B6D4',
      matrix: [
        [1, 1],
        [1, 0]
      ]
    },
    {
      name: 'corner_tr',
      color: '#06B6D4',
      matrix: [
        [1, 1],
        [0, 1]
      ]
    },
    {
      name: 'corner_bl',
      color: '#06B6D4',
      matrix: [
        [1, 0],
        [1, 1]
      ]
    },
    {
      name: 'corner_br',
      color: '#06B6D4',
      matrix: [
        [0, 1],
        [1, 1]
      ]
    },
    // 4-Blocks Square
    {
      name: 'square2x2',
      color: '#8B5CF6',
      matrix: [
        [1, 1],
        [1, 1]
      ]
    },
    // 4-Blocks Lines
    {
      name: 'h4',
      color: '#EC4899',
      matrix: [[1, 1, 1, 1]]
    },
    {
      name: 'v4',
      color: '#EC4899',
      matrix: [[1], [1], [1], [1]]
    },
    // 4-Blocks T-Shapes
    {
      name: 't_up',
      color: '#3B82F6',
      matrix: [
        [1, 1, 1],
        [0, 1, 0]
      ]
    },
    {
      name: 't_down',
      color: '#3B82F6',
      matrix: [
        [0, 1, 0],
        [1, 1, 1]
      ]
    },
    {
      name: 't_left',
      color: '#3B82F6',
      matrix: [
        [1, 0],
        [1, 1],
        [1, 0]
      ]
    },
    {
      name: 't_right',
      color: '#3B82F6',
      matrix: [
        [0, 1],
        [1, 1],
        [0, 1]
      ]
    },
    // 4-Blocks L-Shapes
    {
      name: 'l_tall_1',
      color: '#14B8A6',
      matrix: [
        [1, 0],
        [1, 0],
        [1, 1]
      ]
    },
    {
      name: 'l_tall_2',
      color: '#14B8A6',
      matrix: [
        [0, 1],
        [0, 1],
        [1, 1]
      ]
    },
    {
      name: 'l_wide_1',
      color: '#14B8A6',
      matrix: [
        [1, 1, 1],
        [1, 0, 0]
      ]
    },
    {
      name: 'l_wide_2',
      color: '#14B8A6',
      matrix: [
        [1, 1, 1],
        [0, 0, 1]
      ]
    },
    // 5-Blocks Line
    {
      name: 'h5',
      color: '#EF4444',
      matrix: [[1, 1, 1, 1, 1]]
    },
    {
      name: 'v5',
      color: '#EF4444',
      matrix: [[1], [1], [1], [1], [1]]
    },
    // 3x3 Giant Square
    {
      name: 'square3x3',
      color: '#6366F1',
      matrix: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ]
    }
  ];

  // ── Tray State (3 Active Slots) ──
  let trayShapes = $state([null, null, null]);
  let selectedTrayIndex = $state(null); // for tap-to-place
  let hoverCell = $state(null); // { r, c }
  let isDragging = $state(false);
  let dragShape = $state(null);
  let dragIndex = $state(null);
  let dragPos = $state({ x: 0, y: 0 });

  // ── Web Audio Synthesizer (Zero External Audio Files) ──
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

  function playPopSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  function playPlaceSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  function playBlastSound(combo = 1) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Pentatonic scale arpeggio rising with combo
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      const rootIndex = Math.min(scale.length - 3, (combo - 1) * 2);

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = scale[Math.min(scale.length - 1, rootIndex + i)];
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.22, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.28);
      }
    } catch (e) {}
  }

  function playGameOverSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [440, 392, 349.23, 293.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.18, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.22);
      });
    } catch (e) {}
  }

  // ── Shape Generation & Tray Management ──
  function generateNewTray() {
    const newShapes = [];
    for (let i = 0; i < 3; i++) {
      const randShape = SHAPES_DB[Math.floor(Math.random() * SHAPES_DB.length)];
      newShapes.push({
        id: Math.random(),
        ...randShape,
        placed: false,
        rows: randShape.matrix.length,
        cols: randShape.matrix[0].length
      });
    }
    trayShapes = newShapes;
    selectedTrayIndex = null;

    // Check if player has valid moves left
    checkGameOver();
  }

  // ── Placement & Validation Logic ──
  function canPlaceShape(matrix, startR, startC) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Boundary check
    if (startR < 0 || startC < 0 || startR + rows > GRID_SIZE || startC + cols > GRID_SIZE) {
      return false;
    }

    // Overlap check
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] === 1) {
          if (grid[startR + r][startC + c] !== null) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function getShapeTargetCells(matrix, startR, startC) {
    const cells = [];
    const rows = matrix.length;
    const cols = matrix[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] === 1) {
          const br = startR + r;
          const bc = startC + c;
          if (br >= 0 && br < GRID_SIZE && bc >= 0 && bc < GRID_SIZE) {
            cells.push({ r: br, c: bc });
          }
        }
      }
    }
    return cells;
  }

  function placeShapeAt(shape, trayIdx, startR, startC) {
    if (!canPlaceShape(shape.matrix, startR, startC)) return false;

    playPlaceSound();

    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    let blockCount = 0;

    // Put blocks into grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape.matrix[r][c] === 1) {
          grid[startR + r][startC + c] = {
            id: Math.random(),
            color: shape.color,
            isClearing: false
          };
          blockCount++;
        }
      }
    }

    // Points for placing blocks
    score += blockCount * 10;

    // Mark tray shape as placed
    trayShapes[trayIdx].placed = true;
    selectedTrayIndex = null;
    hoverCell = null;

    // Check for full rows and columns to blast
    clearLines();

    // Check if tray is empty -> spawn 3 new shapes
    if (trayShapes.every(s => s.placed)) {
      setTimeout(() => {
        generateNewTray();
      }, 250);
    } else {
      checkGameOver();
    }

    return true;
  }

  // ── Line Blast Clearing Mechanism ──
  function clearLines() {
    const fullRows = [];
    const fullCols = [];

    // 1. Check Rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    // 2. Check Columns
    for (let c = 0; c < GRID_SIZE; c++) {
      let isColFull = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] === null) {
          isColFull = false;
          break;
        }
      }
      if (isColFull) fullCols.push(c);
    }

    const totalLines = fullRows.length + fullCols.length;

    if (totalLines > 0) {
      comboCount += 1;
      linesClearedTotal += totalLines;

      // Animate cleared cells
      const cellsToClear = new Set();
      fullRows.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r},${c}`);
      });
      fullCols.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r},${c}`);
      });

      // Mark clearing animation
      cellsToClear.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        if (grid[r][c]) {
          grid[r][c].isClearing = true;
        }
      });

      // Score calculation
      const lineBaseScore = totalLines * 120;
      const comboBonus = comboCount > 1 ? comboCount * 150 : 0;
      const turnScore = lineBaseScore + comboBonus;
      score += turnScore;

      // Sound & feedback
      playBlastSound(comboCount);

      // Popup Announcement
      let popupText = `+${turnScore}`;
      if (totalLines >= 3) popupText = `TRIPLE BLAST! +${turnScore} ⚡`;
      else if (totalLines === 2) popupText = `DOUBLE BLAST! +${turnScore} 🔥`;
      else if (comboCount > 1) popupText = `COMBO x${comboCount}! +${turnScore} 🎉`;

      addScorePopup(popupText, '#F59E0B');

      // Mascot reaction
      setMascotReaction('cheer', getCheerMessage(comboCount, totalLines));

      if (totalLines >= 2 || comboCount >= 2) {
        confetti({
          particleCount: 40 + totalLines * 25,
          spread: 65,
          origin: { y: 0.6 }
        });
      }

      // Clear after visual pop animation
      setTimeout(() => {
        cellsToClear.forEach(key => {
          const [r, c] = key.split(',').map(Number);
          grid[r][c] = null;
        });
        checkBoardFullness();
      }, 240);
    } else {
      // Reset combo if no line cleared
      comboCount = 0;
      checkBoardFullness();
    }
  }

  function checkBoardFullness() {
    let filledCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] !== null) filledCount++;
      }
    }
    const percent = filledCount / 64;
    if (percent > 0.7) {
      setMascotReaction('worried', 'Hayo box mulai penuh, be carefull! 😰');
    } else if (mascotMood !== 'cheer') {
      mascotMood = 'happy';
    }
  }

  function getCheerMessage(combo, lines) {
    if (lines >= 3) return 'TRIPLE BLAST! ';
    if (combo >= 4) return `COMBO ${combo}! `;
    if (combo >= 2) return `COMBO x${combo}! `;
    if (lines === 2) return 'DOUBLE BLAST! ';
    return 'BLAST! ';
  }

  function setMascotReaction(mood, msg) {
    mascotMood = mood;
    mascotMessage = msg;
    if (mascotMessageTimer) clearTimeout(mascotMessageTimer);
    mascotMessageTimer = setTimeout(() => {
      mascotMood = 'happy';
      mascotMessage = 'susun baloknya!';
    }, 3200);
  }

  function addScorePopup(text, color = '#F59E0B') {
    const id = Math.random();
    scorePopups = [...scorePopups, { id, text, color }];
    setTimeout(() => {
      scorePopups = scorePopups.filter(p => p.id !== id);
    }, 1100);
  }

  // ── Game Over Checking ──
  function checkGameOver() {
    const remainingShapes = trayShapes.filter(s => s && !s.placed);
    if (remainingShapes.length === 0) return;

    let canMove = false;

    for (let shape of remainingShapes) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlaceShape(shape.matrix, r, c)) {
            canMove = true;
            break;
          }
        }
        if (canMove) break;
      }
      if (canMove) break;
    }

    if (!canMove) {
      triggerGameOver();
    }
  }

  function triggerGameOver() {
    gameState = 'gameover';
    mascotMood = 'gameover';
    mascotMessage = 'Yhaahaha game overrr';
    playGameOverSound();

    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      try {
        localStorage.setItem('winda_block_blast_highscore_v1', highScore.toString());
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}
    }
  }

  function restartGame() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    score = 0;
    comboCount = 0;
    linesClearedTotal = 0;
    gameState = 'playing';
    isNewHighScore = false;
    mascotMood = 'happy';
    mascotMessage = 'mulai lagi, susun baloknya!';
    generateNewTray();
  }

  // ── Drag & Drop and Tap Interaction Handlers ──
  function handleTrayItemSelect(idx) {
    if (!trayShapes[idx] || trayShapes[idx].placed) return;
    playPopSound();
    if (selectedTrayIndex === idx) {
      selectedTrayIndex = null;
    } else {
      selectedTrayIndex = idx;
    }
  }

  function handleBoardCellClick(r, c) {
    if (selectedTrayIndex === null) return;
    const shape = trayShapes[selectedTrayIndex];
    if (!shape || shape.placed) return;

    // Calculate top-left so shape is centered or top-left at clicked cell
    const targetR = Math.max(0, Math.min(GRID_SIZE - shape.rows, r));
    const targetC = Math.max(0, Math.min(GRID_SIZE - shape.cols, c));

    if (canPlaceShape(shape.matrix, targetR, targetC)) {
      placeShapeAt(shape, selectedTrayIndex, targetR, targetC);
    } else {
      // Direct click check
      if (canPlaceShape(shape.matrix, r, c)) {
        placeShapeAt(shape, selectedTrayIndex, r, c);
      } else {
        playPopSound();
      }
    }
  }

  // Pointer Drag Handlers (Smooth Universal Touch & Mouse Drag)
  function handleTrayPointerDown(e, idx) {
    const shape = trayShapes[idx];
    if (!shape || shape.placed || gameState !== 'playing') return;

    isDragging = true;
    dragIndex = idx;
    dragShape = shape;
    selectedTrayIndex = idx;
    dragPos = { x: e.clientX, y: e.clientY };
  }

  function handleWindowPointerMove(e) {
    if (!isDragging || !dragShape) return;
    dragPos = { x: e.clientX, y: e.clientY };

    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;

    // Lifted finger offset (~50px up so finger doesn't obscure placement)
    const touchX = e.clientX;
    const touchY = e.clientY - 45;

    if (
      touchX >= rect.left &&
      touchX <= rect.right &&
      touchY >= rect.top &&
      touchY <= rect.bottom
    ) {
      const col = Math.floor((touchX - rect.left) / cellSize);
      const row = Math.floor((touchY - rect.top) / cellSize);

      // Center shape around touch point
      const offsetR = Math.floor(dragShape.rows / 2);
      const offsetC = Math.floor(dragShape.cols / 2);
      hoverCell = {
        r: Math.max(0, Math.min(GRID_SIZE - dragShape.rows, row - offsetR)),
        c: Math.max(0, Math.min(GRID_SIZE - dragShape.cols, col - offsetC))
      };
    } else {
      hoverCell = null;
    }
  }

  function handleWindowPointerUp(e) {
    if (!isDragging) return;

    if (dragShape && hoverCell && dragIndex !== null) {
      if (canPlaceShape(dragShape.matrix, hoverCell.r, hoverCell.c)) {
        placeShapeAt(dragShape, dragIndex, hoverCell.r, hoverCell.c);
      }
    }

    isDragging = false;
    dragShape = null;
    dragIndex = null;
    hoverCell = null;
  }

  // ── Derived Preview Cells ──
  let activePreviewCells = $derived.by(() => {
    let targetShape = null;
    let targetR = null;
    let targetC = null;

    if (isDragging && dragShape && hoverCell) {
      targetShape = dragShape;
      targetR = hoverCell.r;
      targetC = hoverCell.c;
    } else if (selectedTrayIndex !== null && hoverCell) {
      targetShape = trayShapes[selectedTrayIndex];
      targetR = hoverCell.r;
      targetC = hoverCell.c;
    }

    if (!targetShape || targetR === null || targetC === null) return [];

    const isValid = canPlaceShape(targetShape.matrix, targetR, targetC);
    const cells = getShapeTargetCells(targetShape.matrix, targetR, targetC);

    return cells.map(cell => ({
      ...cell,
      isValid,
      color: targetShape.color
    }));
  });

  onMount(() => {
    try {
      const saved = localStorage.getItem('winda_block_blast_highscore_v1');
      if (saved) highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    generateNewTray();

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerUp);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    }
    if (mascotMessageTimer) clearTimeout(mascotMessageTimer);
  });
</script>

<!-- ── BLOCK BLAST GAME VIEWPORT ── -->
<div class="blockblast-card-root">
  <!-- Top Bar with Scores & Mascot Header -->
  <header class="blast-top-bar">
    <button
      type="button"
      class="blast-nav-btn"
      onclick={onBack}
      aria-label="Kembali"
      title="Kembali ke menu"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <div class="blast-scores-deck">
      <div class="blast-score-box current-score-box">
        <span class="score-tag">SCORE</span>
        <span class="score-num">{score}</span>
      </div>

      <div class="blast-score-box high-score-box">
        <span class="score-tag">BEST</span>
        <span class="score-num">{highScore}</span>
      </div>
    </div>
  </header>

  <!-- Interactive Mascot Companion Stage -->
  <div class="mascot-companion-bar">
    <div class="mascot-avatar-circle" class:is-cheering={mascotMood === 'cheer'}>
      <img
        src={currentBody.file}
        alt={currentBody.name}
        class="mascot-layer char-body-img"
      />
      {#if currentOutfit && currentOutfit.file}
        <img
          src={currentOutfit.file}
          alt={currentOutfit.name}
          class="mascot-layer char-outfit-img"
          style={currentOutfitStyle}
        />
      {/if}
      {#if currentHat && currentHat.file}
        <img
          src={currentHat.file}
          alt={currentHat.name}
          class="mascot-layer char-hat-img"
          style={currentHatStyle}
        />
      {/if}
    </div>

    <!-- Speech Reaction Bubble -->
    <div class="mascot-speech-bubble" class:bubble-cheer={mascotMood === 'cheer'} class:bubble-worried={mascotMood === 'worried'}>
      <span class="bubble-text">{mascotMessage}</span>
      {#if comboCount > 1}
        <span class="combo-flame-pill">🔥 x{comboCount}</span>
      {/if}
    </div>
  </div>

  <!-- ── 8x8 Block Blast Game Board ── -->
  <main class="blast-board-wrapper">
    <div
      bind:this={boardEl}
      class="blast-grid-board"
      role="grid"
      aria-label="Papan 8x8 Block Blast"
    >
      {#each Array(GRID_SIZE) as _, r}
        {#each Array(GRID_SIZE) as _, c}
          {@const cell = grid[r][c]}
          {@const preview = activePreviewCells.find(p => p.r === r && p.c === c)}

          <div
            class="blast-cell"
            class:has-block={cell !== null}
            class:is-clearing={cell?.isClearing}
            class:is-preview={preview !== undefined}
            class:preview-valid={preview?.isValid}
            class:preview-invalid={preview && !preview.isValid}
            style={cell ? `background-color: ${cell.color}; box-shadow: 0 4px 10px ${cell.color}66;` : preview ? `border-color: ${preview.isValid ? preview.color : '#EF4444'}; background: ${preview.isValid ? preview.color + '44' : '#EF444433'};` : ''}
            onclick={() => handleBoardCellClick(r, c)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBoardCellClick(r, c); }}
            onpointerenter={() => { if (selectedTrayIndex !== null) hoverCell = { r, c }; }}
            role="button"
            tabindex="0"
          >
            {#if cell}
              <!-- 3D Gloss Specular Top Highlight -->
              <div class="block-bevel-shine"></div>
            {/if}
          </div>
        {/each}
      {/each}

      <!-- Floating Score Popups Over Board -->
      {#each scorePopups as p (p.id)}
        <div class="blast-score-popup" style="color: {p.color};">
          {p.text}
        </div>
      {/each}
    </div>
  </main>

  <!-- ── Tray with 3 Shape Choices ── -->
  <footer class="blast-tray-deck">
    <div class="tray-shapes-row">
      {#each trayShapes as shape, idx (shape ? shape.id : idx)}
        <div
          class="tray-slot"
          class:is-empty={!shape || shape.placed}
          class:is-selected={selectedTrayIndex === idx}
          onclick={() => handleTrayItemSelect(idx)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTrayItemSelect(idx); }}
          onpointerdown={(e) => handleTrayPointerDown(e, idx)}
          role="button"
          tabindex="0"
          aria-label="Pilih balok"
        >
          {#if shape && !shape.placed}
            <div
              class="shape-matrix-preview"
              style="grid-template-columns: repeat({shape.cols}, 1fr);"
            >
              {#each shape.matrix as row}
                {#each row as val}
                  {#if val === 1}
                    <div
                      class="mini-tray-block"
                      style="background-color: {shape.color};"
                    ></div>
                  {:else}
                    <div class="mini-tray-empty"></div>
                  {/if}
                {/each}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <span class="tray-instruction-hint">💡 Tarik balok ke papan, atau ketuk balok lalu ketuk papan</span>
  </footer>

  <!-- ── Floating Dragged Shape Clone (Under Pointer) ── -->
  {#if isDragging && dragShape}
    <div
      class="floating-drag-ghost"
      style="left: {dragPos.x}px; top: {dragPos.y - 45}px; grid-template-columns: repeat({dragShape.cols}, 1fr);"
    >
      {#each dragShape.matrix as row}
        {#each row as val}
          {#if val === 1}
            <div class="ghost-block" style="background-color: {dragShape.color};"></div>
          {:else}
            <div class="ghost-empty"></div>
          {/if}
        {/each}
      {/each}
    </div>
  {/if}

  <!-- ── Game Over Modal Overlay ── -->
  {#if gameState === 'gameover'}
    <div class="blast-modal-overlay">
      <div class="blast-gameover-card">
        <!-- <span class="blast-gameover-icon">🧩</span> -->
        <h3 class="blast-gameover-title">GAME OVER!</h3>

        {#if isNewHighScore}
          <div class="blast-new-record-pill">🏆 New Record 🏆</div>
        {/if}

        <div class="blast-stats-grid">
          <div class="blast-stat-box">
            <span class="stat-lbl">SCORE</span>
            <span class="stat-val">{score}</span>
          </div>
          <div class="blast-stat-box">
            <span class="stat-lbl">CLEARED LINE</span>
            <span class="stat-val">{linesClearedTotal}</span>
          </div>
        </div>

        <div class="blast-actions-group">
          <button type="button" class="btn-blast-primary" onclick={restartGame}>
            <span>MAIN LAGI 🔄</span>
          </button>
          {#if onSwitchGame}
            <button type="button" class="btn-blast-secondary" onclick={onSwitchGame}>
              <span>GANTI GAME 🎮</span>
            </button>
          {/if}
          <button type="button" class="btn-blast-secondary" onclick={onBack}>
            <span>KEMBALI 🚪</span>
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .blockblast-card-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #18181B; /* Sleek dark neon backdrop for vibrant blocks */
    color: #F4F4F5;
    position: relative;
    overflow: hidden;
    user-select: none;
    touch-action: none;
    box-sizing: border-box;
    font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* ── Header Top Bar ── */
  .blast-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 8px;
    background: #27272A;
    border-bottom: 2px solid #3F3F46;
    z-index: 10;
  }

  .blast-nav-btn {
    background: #3F3F46;
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F4F4F5;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .blast-nav-btn:hover {
    background: #52525B;
    transform: scale(1.05);
  }

  .blast-scores-deck {
    display: flex;
    gap: 10px;
  }

  .blast-score-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #18181B;
    border: 1.5px solid #3F3F46;
    border-radius: 14px;
    padding: 4px 14px;
    min-width: 60px;
  }

  .current-score-box {
    border-color: #F59E0B;
  }

  .current-score-box .score-num {
    color: #FBBF24;
  }

  .high-score-box {
    border-color: #38BDF8;
  }

  .high-score-box .score-num {
    color: #38BDF8;
  }

  .score-tag {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #A1A1AA;
  }

  .score-num {
    font-size: 1.12rem;
    font-weight: 900;
    line-height: 1.1;
  }

  /* ── Mascot Companion Stage ── */
  .mascot-companion-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 18px;
    background: #202024;
    border-bottom: 1.5px solid #27272A;
  }

  .mascot-avatar-circle {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #27272A;
    border: 2px solid #52525B;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mascot-avatar-circle.is-cheering {
    transform: scale(1.15) rotate(-6deg);
    border-color: #F59E0B;
  }

  .mascot-layer {
    position: absolute;
    pointer-events: none;
  }

  .char-body-img {
    width: 90%;
    height: 90%;
    object-fit: contain;
  }

  .char-outfit-img {
    width: 68%;
    top: 36%;
    left: 16%;
    object-fit: contain;
  }

  .char-hat-img {
    width: 65%;
    top: 4%;
    left: 18%;
    object-fit: contain;
  }

  .mascot-speech-bubble {
    flex: 1;
    background: #27272A;
    border: 1.5px solid #3F3F46;
    border-radius: 16px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .bubble-cheer {
    border-color: #F59E0B;
    background: #2D2418;
  }

  .bubble-worried {
    border-color: #EF4444;
    background: #2A181A;
  }

  .bubble-text {
    font-size: 0.8rem;
    font-weight: 800;
    color: #F4F4F5;
  }

  .combo-flame-pill {
    font-size: 0.72rem;
    font-weight: 900;
    color: #F59E0B;
    background: #3B2B11;
    border: 1px solid #F59E0B;
    padding: 2px 8px;
    border-radius: 999px;
    animation: flamePulse 0.4s ease-in-out infinite alternate;
  }

  @keyframes flamePulse {
    from { transform: scale(0.95); }
    to { transform: scale(1.12); }
  }

  /* ── 8x8 Board Grid ── */
  .blast-board-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    box-sizing: border-box;
    position: relative;
  }

  .blast-grid-board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    gap: 5px;
    background: #202024;
    padding: 8px;
    border-radius: 20px;
    border: 2px solid #3F3F46;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    width: min(88vw, 360px);
    height: min(88vw, 360px);
    position: relative;
    box-sizing: border-box;
  }

  .blast-cell {
    background: #27272A;
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    transition: transform 0.12s ease, background-color 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .blast-cell.has-block {
    transform: scale(1);
    animation: popPlace 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popPlace {
    0% { transform: scale(0.6); }
    100% { transform: scale(1); }
  }

  .blast-cell.is-clearing {
    animation: blastCellPop 0.24s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  }

  @keyframes blastCellPop {
    0% { transform: scale(1); filter: brightness(2); }
    50% { transform: scale(1.25); filter: brightness(2.5); }
    100% { transform: scale(0); opacity: 0; }
  }

  .blast-cell.is-preview {
    border-width: 2px;
    border-style: dashed;
    transform: scale(0.96);
  }

  .block-bevel-shine {
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    height: 38%;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent);
    border-radius: 6px 6px 3px 3px;
    pointer-events: none;
  }

  /* Score Popup Announcements */
  .blast-score-popup {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.4rem;
    font-weight: 900;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
    pointer-events: none;
    z-index: 50;
    white-space: nowrap;
    animation: floatUpFade 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  }

  @keyframes floatUpFade {
    0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
    20% { opacity: 1; transform: translate(-50%, -15px) scale(1.15); }
    80% { opacity: 1; transform: translate(-50%, -35px) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50px) scale(0.9); }
  }

  /* ── Bottom Tray (3 Slots) ── */
  .blast-tray-deck {
    background: #202024;
    border-top: 2px solid #3F3F46;
    padding: 10px 14px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10;
  }

  .tray-shapes-row {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    max-width: 380px;
    gap: 8px;
  }

  .tray-slot {
    flex: 1;
    height: 80px;
    background: #27272A;
    border: 2px solid #3F3F46;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    transition: all 0.18s ease;
    touch-action: none;
  }

  .tray-slot:active {
    cursor: grabbing;
  }

  .tray-slot.is-selected {
    border-color: #F59E0B;
    background: #3B2B11;
    box-shadow: 0 0 14px rgba(245, 158, 11, 0.45);
    transform: translateY(-3px);
  }

  .tray-slot.is-empty {
    opacity: 0.25;
    cursor: default;
    border-style: dashed;
  }

  .shape-matrix-preview {
    display: grid;
    gap: 3px;
    padding: 6px;
    pointer-events: none;
  }

  .mini-tray-block {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
  }

  .mini-tray-empty {
    width: 16px;
    height: 16px;
  }

  .tray-instruction-hint {
    font-size: 0.7rem;
    color: #A1A1AA;
    text-align: center;
    letter-spacing: 0.02em;
  }

  /* ── Floating Dragged Ghost (Under Finger) ── */
  .floating-drag-ghost {
    position: fixed;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    display: grid;
    gap: 4px;
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6));
    animation: dragPop 0.1s ease-out forwards;
  }

  @keyframes dragPop {
    from { transform: translate(-50%, -50%) scale(0.9); }
    to { transform: translate(-50%, -50%) scale(1.1); }
  }

  .ghost-block {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .ghost-empty {
    width: 32px;
    height: 32px;
  }

  /* ── Game Over Modal ── */
  .blast-modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(9, 9, 11, 0.85);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    z-index: 100;
    animation: fadeInModal 0.2s ease-out;
  }

  .blast-gameover-card {
    width: 100%;
    max-width: 320px;
    background: #27272A;
    border: 2px solid #52525B;
    border-radius: 26px;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  }

  .blast-gameover-icon {
    font-size: 2.8rem;
    margin-bottom: 4px;
  }

  .blast-gameover-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 900;
    color: #F4F4F5;
  }

  .blast-gameover-sub {
    margin: 6px 0 16px;
    font-size: 0.82rem;
    color: #A1A1AA;
  }

  .blast-new-record-pill {
    background: #F59E0B;
    color: #000000;
    font-size: 0.78rem;
    font-weight: 900;
    padding: 4px 14px;
    border-radius: 999px;
    margin-bottom: 14px;
    animation: flamePulse 0.4s ease-in-out infinite alternate;
  }

  .blast-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    width: 100%;
    margin-bottom: 18px;
  }

  .blast-stat-box {
    background: #18181B;
    border: 1px solid #3F3F46;
    border-radius: 14px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
  }

  .stat-lbl {
    font-size: 0.66rem;
    font-weight: 800;
    color: #A1A1AA;
    letter-spacing: 0.05em;
  }

  .stat-val {
    font-size: 1.15rem;
    font-weight: 900;
    color: #FBBF24;
  }

  .blast-actions-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .btn-blast-primary {
    background: linear-gradient(135deg, #F59E0B, #D97706);
    color: #000000;
    border: none;
    border-radius: 14px;
    padding: 12px;
    font-size: 0.95rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .btn-blast-primary:active {
    transform: scale(0.97);
  }

  .btn-blast-secondary {
    background: #3F3F46;
    color: #F4F4F5;
    border: 1px solid #52525B;
    border-radius: 14px;
    padding: 10px;
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.1s;
  }

  .btn-blast-secondary:hover {
    background: #52525B;
  }
</style>
