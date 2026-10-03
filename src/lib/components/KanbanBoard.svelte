<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';

  let { onBack } = $props();

  const LOCAL_STORAGE_KEY = 'winda_kanban_tasks_v2';

  // 4 Columns matching Image 1 & Image 2
  const COLUMNS = [
    {
      id: 'todo',
      label: 'TO DO',
      accentColor: '#4E82B4', // Soft Blue
      bgBadge: '#F0F5FA',
      textColor: '#2C5882'
    },
    {
      id: 'in_progress',
      label: 'IN-PROGRESS',
      accentColor: '#D97D3E', // Soft Orange
      bgBadge: '#FCF5ED',
      textColor: '#8F481B'
    },
    {
      id: 'pending',
      label: 'PENDING',
      accentColor: '#C45959', // Soft Red
      bgBadge: '#FAF0F0',
      textColor: '#873131'
    },
    {
      id: 'completed',
      label: 'COMPLETED',
      accentColor: '#6D9C3F', // Soft Green (user requested)
      bgBadge: '#F2F7ED',
      textColor: '#446823'
    }
  ];

  const PRIORITIES = [
    { id: 'high', label: 'High', color: '#C45959', bg: '#FAF0F0', dotColor: '#C45959' },
    { id: 'med', label: 'Med', color: '#D97D3E', bg: '#FCF5ED', dotColor: '#D97D3E' },
    { id: 'low', label: 'Low', color: '#4E82B4', bg: '#F0F5FA', dotColor: '#4E82B4' }
  ];

  let tasks = $state(getInitialTasks());
  let layoutMode = $state('grid'); // 'grid' (2x2 like Image 2) | 'columns' (horizontal columns like Image 1)
  let activeMobileTab = $state('all'); // 'all' | 'todo' | 'in_progress' | 'review' | 'completed'

  let isAddModalOpen = $state(false);
  let isEditing = $state(false);
  let editingId = $state(null);

  // Form states
  let formTitle = $state('');
  let formDesc = $state('');
  let formPriority = $state('med');
  let formStatus = $state('todo');
  let formDueDate = $state('');
  let manualPrioritySet = $state(false);
  let isSaving = $state(false);

  // Drag and Drop state
  let draggedTaskId = $state(null);
  let dragOverColumnId = $state(null);
  let recentlyMovedTaskId = $state(null);

  // Celebration toast
  let showCelebration = $state(false);
  let celebrationText = $state('');

  // Delete confirmation modal state
  let isDeleteModalOpen = $state(false);
  let deleteConfirmId = $state(null);
  let deleteConfirmTitle = $state('');

  let realtimeChannel = null;

  function getInitialTasks() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const in3Days = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const in6Days = new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0];

    // return [
    //   {
    //     id: 'task-1',
    //     title: 'Conduct User Research',
    //     description: 'Develop a set of 10 open-ended questions that cover daily habits, pain points, and expectations for the project.',
    //     status: 'todo',
    //     priority: 'high',
    //     due_date: tomorrow,
    //     created_at: new Date().toISOString()
    //   },
    //   {
    //     id: 'task-2',
    //     title: 'API Integration & Frontend Sync',
    //     description: 'Integrate backend endpoints with frontend components to ensure seamless communication and data flow.',
    //     status: 'in_progress',
    //     priority: 'low',
    //     due_date: in6Days,
    //     created_at: new Date().toISOString()
    //   },
    //   {
    //     id: 'task-3',
    //     title: 'Finalize UI Style Guide',
    //     description: 'Define typography, color palette, iconography, and button styles. Ensure consistency with brand design system.',
    //     status: 'in_progress',
    //     priority: 'med',
    //     due_date: in3Days,
    //     created_at: new Date().toISOString()
    //   },
    //   {
    //     id: 'task-4',
    //     title: 'Fix Payment Gateway & Auth Errors',
    //     description: 'Debugged the payment flow integration to address edge cases and improve error messaging for users.',
    //     status: 'pending',
    //     priority: 'high',
    //     due_date: tomorrow,
    //     created_at: new Date().toISOString()
    //   },
    //   {
    //     id: 'task-5',
    //     title: 'Marketing Plan & Campaign Launch',
    //     description: 'Implement and execute pre-campaign strategies to build anticipation, engage target audience, and launch.',
    //     status: 'completed',
    //     priority: 'med',
    //     due_date: null,
    //     created_at: new Date().toISOString()
    //   }
    // ];

    return [];
  }

  function saveLocalTasks(taskList) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(taskList));
    } catch (e) {}
  }

  // Automatic priority adjustment from deadline
  function calculatePriorityFromDate(dateStr) {
    if (!dateStr) return 'low';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'high'; // Today or tomorrow or overdue -> High
    if (diffDays <= 4) return 'med';  // 2-4 days -> Med
    return 'low';                     // > 4 days -> Low
  }

  function handleDateChange(e) {
    formDueDate = e.target.value;
    if (formDueDate && !manualPrioritySet) {
      formPriority = calculatePriorityFromDate(formDueDate);
    }
  }

  function setPriorityManual(priorityId) {
    formPriority = priorityId;
    manualPrioritySet = true;
  }

  function getDueDateBadge(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Today', isToday: true };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', isTomorrow: true };
    }
    return { text: `${diffDays}d`, isNormal: true };
  }

  async function fetchTasks() {
    // 1. Instantly use local storage
    tasks = getInitialTasks();

    // 2. Silent background sync with Supabase
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        tasks = data.map(t => ({
          ...t,
          status: normalizeStatus(t.status),
          priority: normalizePriority(t.priority)
        }));
        saveLocalTasks(tasks);
      }
    } catch (e) {}
  }

  function normalizeStatus(st) {
    if (st === 'backlog') return 'todo';
    if (st === 'doing') return 'in_progress';
    if (st === 'review' || st === 'need_review') return 'pending';
    if (st === 'done') return 'completed';
    return st || 'todo';
  }

  function normalizePriority(pr) {
    if (pr === 'urgent') return 'high';
    if (pr === 'medium') return 'med';
    if (pr === 'chill') return 'low';
    return pr || 'med';
  }

  onMount(() => {
    fetchTasks();
    try {
      realtimeChannel = supabase
        .channel('kanban-channel-v2')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = { ...payload.new, status: normalizeStatus(payload.new.status) };
            if (!tasks.some(t => t.id === item.id)) {
              tasks = [item, ...tasks];
              saveLocalTasks(tasks);
            }
          } else if (payload.eventType === 'UPDATE') {
            const item = { ...payload.new, status: normalizeStatus(payload.new.status) };
            tasks = tasks.map(t => t.id === item.id ? item : t);
            saveLocalTasks(tasks);
          } else if (payload.eventType === 'DELETE') {
            tasks = tasks.filter(t => t.id !== payload.old.id);
            saveLocalTasks(tasks);
          }
        })
        .subscribe();
    } catch (e) {}
  });

  onDestroy(() => {
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel); } catch (e) {}
    }
  });

  // Modal actions
  function openCreateModal(defaultStatus = 'todo') {
    isEditing = false;
    editingId = null;
    formTitle = '';
    formDesc = '';
    formPriority = 'med';
    formStatus = defaultStatus;
    formDueDate = '';
    manualPrioritySet = false;
    isAddModalOpen = true;
  }

  function openEditModal(task) {
    isEditing = true;
    editingId = task.id;
    formTitle = task.title;
    formDesc = task.description || '';
    formPriority = task.priority || 'med';
    formStatus = task.status || 'todo';
    formDueDate = task.due_date || '';
    manualPrioritySet = true;
    isAddModalOpen = true;
  }

  async function handleSaveTask() {
    if (!formTitle.trim()) return;
    isSaving = true;

    try {
      if (isEditing && editingId) {
        tasks = tasks.map(t => t.id === editingId ? {
          ...t,
          title: formTitle.trim(),
          description: formDesc.trim(),
          priority: formPriority,
          status: formStatus,
          due_date: formDueDate || null
        } : t);

        saveLocalTasks(tasks);

        supabase
          .from('tasks')
          .update({
            title: formTitle.trim(),
            description: formDesc.trim(),
            priority: formPriority,
            status: formStatus,
            due_date: formDueDate || null
          })
          .eq('id', editingId)
          .then();
      } else {
        const newTask = {
          id: 'task-' + Date.now(),
          title: formTitle.trim(),
          description: formDesc.trim(),
          priority: formPriority,
          status: formStatus,
          due_date: formDueDate || null,
          created_at: new Date().toISOString()
        };

        tasks = [newTask, ...tasks];
        saveLocalTasks(tasks);

        supabase
          .from('tasks')
          .insert([{
            title: formTitle.trim(),
            description: formDesc.trim(),
            priority: formPriority,
            status: formStatus,
            due_date: formDueDate || null
          }])
          .select()
          .single()
          .then(({ data }) => {
            if (data) {
              tasks = tasks.map(t => t.id === newTask.id ? data : t);
              saveLocalTasks(tasks);
            }
          });
      }

      isAddModalOpen = false;
    } catch (e) {
      console.error(e);
    } finally {
      isSaving = false;
    }
  }

  async function updateTaskStatus(taskId, nextStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === nextStatus) return;

    if (nextStatus === 'completed') {
      celebrationText = `Task "${task.title}" Completed!`;
      showCelebration = true;
      setTimeout(() => { showCelebration = false; }, 3000);
    }

    recentlyMovedTaskId = taskId;
    setTimeout(() => {
      if (recentlyMovedTaskId === taskId) {
        recentlyMovedTaskId = null;
      }
    }, 450);

    tasks = tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t);
    saveLocalTasks(tasks);

    supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', taskId)
      .then();
  }

  function confirmDeleteTask(taskId, taskTitle) {
    deleteConfirmId = taskId;
    deleteConfirmTitle = taskTitle;
    isDeleteModalOpen = true;
  }

  function executeDelete() {
    if (!deleteConfirmId) return;
    const targetId = deleteConfirmId;
    tasks = tasks.filter(t => t.id !== targetId);
    saveLocalTasks(tasks);

    supabase
      .from('tasks')
      .delete()
      .eq('id', targetId)
      .then();

    isDeleteModalOpen = false;
    deleteConfirmId = null;
    deleteConfirmTitle = '';

    if (isAddModalOpen && editingId === targetId) {
      isAddModalOpen = false;
    }
  }

  function deleteTask(taskId, taskTitle) {
    confirmDeleteTask(taskId, taskTitle);
  }

  // Desktop Drag & Drop
  function handleDragStart(e, task) {
    draggedTaskId = task.id;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragEnd() {
    draggedTaskId = null;
    dragOverColumnId = null;
  }

  function handleDragOver(e, colId) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dragOverColumnId !== colId) {
      dragOverColumnId = colId;
    }
  }

  function handleDragLeave(e, colId) {
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverColumnId === colId) {
        dragOverColumnId = null;
      }
    }
  }

  function handleDrop(e, colId) {
    e.preventDefault();
    const taskId = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || draggedTaskId;
    dragOverColumnId = null;
    draggedTaskId = null;
    if (taskId) {
      updateTaskStatus(taskId, colId);
    }
  }

  // Mobile (HP) Touch Drag & Drop
  let touchDraggedTask = $state(null);
  let touchX = $state(0);
  let touchY = $state(0);
  let isTouchDragging = $state(false);
  let touchCardWidth = $state(0);
  let touchTimer = null;

  function handleTouchStart(e, task) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const cardEl = e.currentTarget;
    const rect = cardEl ? cardEl.getBoundingClientRect() : null;

    touchTimer = setTimeout(() => {
      touchDraggedTask = task;
      draggedTaskId = task.id;
      isTouchDragging = true;
      touchCardWidth = rect ? rect.width : 160;
      touchX = startX;
      touchY = startY;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (err) {}
      }
    }, 120);

    const onMove = (moveEvt) => {
      const currentTouch = moveEvt.touches[0];
      const deltaX = Math.abs(currentTouch.clientX - startX);
      const deltaY = Math.abs(currentTouch.clientY - startY);

      if (!isTouchDragging) {
        if (deltaX > 8 || deltaY > 8) {
          clearTimeout(touchTimer);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onEnd);
        }
        return;
      }

      if (moveEvt.cancelable) {
        moveEvt.preventDefault();
      }

      touchX = currentTouch.clientX;
      touchY = currentTouch.clientY;

      const el = document.elementFromPoint(currentTouch.clientX, currentTouch.clientY);
      const colEl = el?.closest('[data-column-id]');
      if (colEl) {
        const foundId = colEl.getAttribute('data-column-id');
        if (dragOverColumnId !== foundId) {
          dragOverColumnId = foundId;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(8); } catch (err) {}
          }
        }
      } else {
        dragOverColumnId = null;
      }
    };

    const onEnd = () => {
      clearTimeout(touchTimer);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);

      if (isTouchDragging && touchDraggedTask) {
        if (dragOverColumnId && dragOverColumnId !== touchDraggedTask.status) {
          updateTaskStatus(touchDraggedTask.id, dragOverColumnId);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(20); } catch (err) {}
          }
        }
      }

      isTouchDragging = false;
      touchDraggedTask = null;
      draggedTaskId = null;
      dragOverColumnId = null;
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
  }

  function getTasksForColumn(colId) {
    return tasks.filter(t => t.status === colId);
  }

  function getPriorityMeta(prId) {
    return PRIORITIES.find(p => p.id === prId) || PRIORITIES[1];
  }

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#/';
    }
  }
</script>

<div class="clean-kanban-root">
  <!-- Top Navigation & Controls Bar -->
  <header class="clean-top-nav">
    <button
      type="button"
      class="nav-pill-btn"
      onclick={handleBack}
      aria-label="Kembali ke beranda"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Kembali</span>
    </button>

    <!-- Layout Switcher: 2x2 Grid (Image 2) vs 4 Columns (Image 1) -->
    <div class="layout-toggle-group">
      <button
        type="button"
        class="layout-pill"
        class:is-active={layoutMode === 'grid'}
        onclick={() => layoutMode = 'grid'}
        title="Tampilan Grid 2x2 (seperti di HP)"
      >
        <span>Grid 2x2</span>
      </button>
      <button
        type="button"
        class="layout-pill"
        class:is-active={layoutMode === 'columns'}
        onclick={() => layoutMode = 'columns'}
        title="Tampilan Kolom Lebar"
      >
        <span>Kolom Lebar</span>
      </button>
    </div>

    <button
      type="button"
      class="primary-add-btn"
      onclick={() => openCreateModal('todo')}
      aria-label="Add task"
    >
      <span class="plus-sign">+</span>
      <span>Tugas</span>
    </button>
  </header>

  <!-- Title & Subtitle Banner (Styled matching Image 2 banner) -->
  <div class="board-branding-banner">
    <!-- <div class="banner-title-box">
      <h1 class="main-board-title">Kanban Board</h1>
    </div> -->
    <p class="main-board-sub">
      Winda's Tracking Task n Priority
    </p>
  </div>

  <!-- Celebration Floating Banner -->
  {#if showCelebration}
    <div class="celebration-toast">
      <span>{celebrationText}</span>
    </div>
  {/if}

  <!-- Mobile Quick Filter Tabs (Only shown when needed) -->
  <div class="mobile-filter-pills">
    <button
      type="button"
      class="filter-pill"
      class:is-active={activeMobileTab === 'all'}
      onclick={() => activeMobileTab = 'all'}
    >
      Semua ({tasks.length})
    </button>
    {#each COLUMNS as col}
      {@const count = getTasksForColumn(col.id).length}
      <button
        type="button"
        class="filter-pill"
        class:is-active={activeMobileTab === col.id}
        onclick={() => activeMobileTab = col.id}
      >
        <span class="col-pill-indicator" style="background-color: {col.accentColor};"></span>
        <span>{col.label} ({count})</span>
      </button>
    {/each}
  </div>

  <!-- Main Kanban Board Canvas (Dotted Grid Canvas from Image 1 & 2) -->
  <main class="kanban-canvas-container">
    <div
      class="kanban-layout-wrapper"
      class:mode-grid-2x2={layoutMode === 'grid'}
      class:mode-columns={layoutMode === 'columns'}
    >
      {#each COLUMNS as col}
        {@const colTasks = getTasksForColumn(col.id)}
        {@const isVisible = activeMobileTab === 'all' || activeMobileTab === col.id}

        {#if isVisible}
          <!-- Column Card Box -->
          <section
            class="clean-column-box"
            class:is-drag-target={dragOverColumnId === col.id}
            data-column-id={col.id}
            style="--col-accent: {col.accentColor};"
            ondragover={(e) => handleDragOver(e, col.id)}
            ondragenter={() => dragOverColumnId = col.id}
            ondragleave={(e) => handleDragLeave(e, col.id)}
            ondrop={(e) => handleDrop(e, col.id)}
            aria-label={col.label}
          >
            <!-- Column Header (Matches Image 1: left colored vertical bar + title + add & menu) -->
            <div class="column-top-header">
              <div class="header-left">
                <span class="vertical-color-bar" style="background-color: {col.accentColor};"></span>
                <h2 class="col-header-label">{col.label}</h2>
                <span class="col-counter-chip">{colTasks.length}</span>
              </div>
              <div class="header-right">
                <button
                  type="button"
                  class="col-icon-btn plus-btn"
                  onclick={() => openCreateModal(col.id)}
                  title="Add task to {col.label}"
                >
                  +
                </button>
                <button
                  type="button"
                  class="col-icon-btn dots-btn"
                  title="More options"
                >
                  ···
                </button>
              </div>
            </div>

            <!-- Task Cards Stack inside Column -->
            <div class="column-tasks-stack">
              {#if colTasks.length === 0}
                <div class="empty-column-state">
                  <p class="empty-text">No tasks yet</p>
                </div>
              {:else}
                {#each colTasks as task (task.id)}
                  {@render taskCard(task, col.id)}
                {/each}
              {/if}

              {#if dragOverColumnId === col.id && draggedTaskId && !colTasks.some(t => t.id === draggedTaskId)}
                <div class="drop-zone-indicator">
                  <span class="drop-zone-dot"></span>
                  <span>Lepas untuk pindah ke sini</span>
                </div>
              {/if}
            </div>

            <!-- Bottom "+ Add Task" button (Exact match to Image 1) -->
            <button
              type="button"
              class="column-bottom-add-btn"
              onclick={() => openCreateModal(col.id)}
            >
              <span class="plus-circle">+</span>
              <span>Add Task</span>
            </button>
          </section>
        {/if}
      {/each}
    </div>
  </main>
</div>

<!-- Task Card Snippet (Exact Replica of Clean Design in Image 1) -->
{#snippet taskCard(task, colId)}
  {@const pMeta = getPriorityMeta(task.priority)}
  {@const dateBadge = getDueDateBadge(task.due_date)}

  <article
    class="clean-task-card"
    class:is-card-dragging={draggedTaskId === task.id}
    class:is-just-dropped={recentlyMovedTaskId === task.id}
    class:is-completed={colId === 'completed'}
    draggable="true"
    ondragstart={(e) => handleDragStart(e, task)}
    ondragend={handleDragEnd}
    ontouchstart={(e) => handleTouchStart(e, task)}
  >
    <!-- Top Row: Priority Badge (with square bullet) & Actions Menu -->
    <div class="card-header-row">
      <span class="priority-tag-pill" style="color: {pMeta.color}; background-color: {pMeta.bg};">
        <span class="bullet-square" style="background-color: {pMeta.dotColor};"></span>
        <span class="priority-name">{pMeta.label}</span>
      </span>

      <div class="card-top-right">
        <button
          type="button"
          class="card-action-dot"
          draggable="false"
          onmousedown={(e) => e.stopPropagation()}
          ontouchstart={(e) => e.stopPropagation()}
          onclick={(e) => {
            e.stopPropagation();
            openEditModal(task);
          }}
          title="Edit tugas"
          aria-label="Edit tugas"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button
          type="button"
          class="card-action-dot delete"
          draggable="false"
          onmousedown={(e) => e.stopPropagation()}
          ontouchstart={(e) => e.stopPropagation()}
          onclick={(e) => {
            e.stopPropagation();
            confirmDeleteTask(task.id, task.title);
          }}
          title="Hapus tugas"
          aria-label="Hapus tugas"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Title & Description -->
    <h3 class="task-title-text" class:strike-title={colId === 'completed'}>
      {task.title}
    </h3>

    {#if task.description}
      <p class="task-desc-text">
        {task.description}
      </p>
    {/if}

    <!-- Card Bottom Footer (Date & Meta) -->
    {#if dateBadge}
      <div class="card-footer-row">
        <span
          class="meta-badge-item"
          class:is-urgent={dateBadge.isOverdue || dateBadge.isToday}
          title="Deadline: {task.due_date}"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>{dateBadge.text}</span>
        </span>
      </div>
    {/if}

    <!-- Quick Move Row (1-Tap navigation) -->
    <div class="quick-status-mover" role="group" aria-label="Aksi status tugas" ontouchstart={(e) => e.stopPropagation()}>
      {#if colId === 'todo'}
        <button
          type="button"
          class="step-move-btn"
          onclick={() => updateTaskStatus(task.id, 'in_progress')}
        >
          <span>Kerjakan</span> &rarr;
        </button>
      {:else if colId === 'in_progress'}
        <button
          type="button"
          class="step-move-btn back"
          onclick={() => updateTaskStatus(task.id, 'todo')}
        >
          &larr;
        </button>
        <button
          type="button"
          class="step-move-btn next"
          onclick={() => updateTaskStatus(task.id, 'pending')}
        >
          <span>Pending</span> &rarr;
        </button>
      {:else if colId === 'pending'}
        <button
          type="button"
          class="step-move-btn back"
          onclick={() => updateTaskStatus(task.id, 'in_progress')}
        >
          &larr;
        </button>
        <button
          type="button"
          class="step-move-btn done"
          onclick={() => updateTaskStatus(task.id, 'completed')}
        >
          <span>Selesai</span> &check;
        </button>
      {:else if colId === 'completed'}
        <button
          type="button"
          class="step-move-btn back"
          onclick={() => updateTaskStatus(task.id, 'pending')}
        >
          &larr; Pending
        </button>
      {/if}
    </div>
  </article>
{/snippet}

<!-- Create & Edit Modal -->
{#if isAddModalOpen}
  <div
    class="clean-modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) isAddModalOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') isAddModalOpen = false; }}
  >
    <div class="clean-modal-card">
      <div class="modal-card-head">
        <h3 class="modal-card-title">{isEditing ? 'Edit Task' : 'Add New Task'}</h3>
        <button
          type="button"
          class="modal-close-icon"
          onclick={() => isAddModalOpen = false}
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>

      <form class="modal-task-form" onsubmit={(e) => { e.preventDefault(); handleSaveTask(); }}>
        <!-- Title Input -->
        <div class="modal-field">
          <label for="clean-task-title">Task Title <span class="star">*</span></label>
          <input
            id="clean-task-title"
            type="text"
            placeholder="e.g. Tugas Presentasi"
            bind:value={formTitle}
            required
            maxlength="120"
            autocomplete="off"
          />
        </div>

        <!-- Description Input -->
        <div class="modal-field">
          <label for="clean-task-desc">Description / Notes</label>
          <textarea
            id="clean-task-desc"
            rows="3"
            placeholder="Buat rincian tugas, materi kuliah, referensi..."
            bind:value={formDesc}
          ></textarea>
        </div>

        <!-- Due Date with Auto Priority -->
        <div class="modal-field">
          <label for="clean-task-date">
            Due Date
            <span class="hint-blue">(Auto-sets priority)</span>
          </label>
          <input
            id="clean-task-date"
            type="date"
            value={formDueDate}
            onchange={handleDateChange}
          />
        </div>

        <!-- Priority Selector -->
        <div class="modal-field">
          <span class="field-label-text">
            Priority
            {#if !manualPrioritySet && formDueDate}
              <span class="auto-badge">Auto from Deadline</span>
            {/if}
          </span>
          <div class="priority-choice-row">
            {#each PRIORITIES as p}
              <button
                type="button"
                class="priority-chip"
                class:is-active-priority={formPriority === p.id}
                style="--chip-clr: {p.color}; --chip-bg: {p.bg};"
                onclick={() => setPriorityManual(p.id)}
              >
                <span class="chip-dot" style="background-color: {p.dotColor};"></span>
                <span>{p.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Column Placement Selector -->
        <div class="modal-field">
          <span class="field-label-text">Column</span>
          <div class="column-choice-row">
            {#each COLUMNS as col}
              <button
                type="button"
                class="col-chip"
                class:is-chosen-col={formStatus === col.id}
                style="--col-btn-accent: {col.accentColor};"
                onclick={() => formStatus = col.id}
              >
                <span>{col.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Modal Submit Actions -->
        <div class="modal-btn-row">
          {#if isEditing}
            <button
              type="button"
              class="btn-delete-modal"
              onclick={() => confirmDeleteTask(editingId, formTitle)}
              title="Hapus tugas ini"
            >
              Hapus
            </button>
          {/if}
          <button
            type="button"
            class="btn-dismiss"
            onclick={() => isAddModalOpen = false}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-save"
            disabled={isSaving || !formTitle.trim()}
          >
            {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Task')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Custom Delete Confirmation Modal -->
{#if isDeleteModalOpen}
  <div
    class="clean-modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) isDeleteModalOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') isDeleteModalOpen = false; }}
  >
    <div class="clean-delete-modal-card">
      <div class="delete-icon-orb">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C45959" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>

      <h3 class="delete-modal-title">Hapus Tugas?</h3>
      <p class="delete-modal-desc">
        Apakah kamu yakin ingin menghapus <strong>"{deleteConfirmTitle}"</strong>?
      </p>

      <div class="delete-modal-actions">
        <button
          type="button"
          class="btn-dismiss"
          onclick={() => isDeleteModalOpen = false}
        >
          Batal
        </button>
        <button
          type="button"
          class="btn-confirm-delete"
          onclick={executeDelete}
        >
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Mobile Floating Drag Preview Card (Subtle & Clean) -->
{#if isTouchDragging && touchDraggedTask}
  {@const pMeta = getPriorityMeta(touchDraggedTask.priority)}
  <div
    class="mobile-drag-floating-card"
    style="left: {touchX}px; top: {touchY}px; width: {touchCardWidth}px;"
  >
    <div class="card-header-row">
      <span class="priority-tag-pill" style="color: {pMeta.color}; background-color: {pMeta.bg};">
        <span class="bullet-square" style="background-color: {pMeta.dotColor};"></span>
        <span class="priority-name">{pMeta.label}</span>
      </span>
      <span class="drag-pill-indicator">Memindahkan</span>
    </div>
    <h3 class="task-title-text">{touchDraggedTask.title}</h3>
  </div>
{/if}

<style>
  /* ── Canvas Root Clean Plain White ── */
  .clean-kanban-root {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 100dvh;
    padding: max(var(--sp-3), var(--sat)) var(--sp-2) max(var(--sp-6), var(--sab));
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: #FFFFFF;
    background-image: none;
    overflow-x: hidden;
    font-family: var(--font-sans);
  }

  /* ── Top Nav Bar ── */
  .clean-top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    margin-bottom: var(--sp-2);
  }

  .nav-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #FFFFFF;
    border: 1px solid #E4E4E7;
    color: #27272A;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    min-height: 32px;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.15s;
  }

  .nav-pill-btn:hover {
    background: #F4F4F5;
  }

  .nav-pill-btn:active {
    transform: scale(0.96);
  }

  .layout-toggle-group {
    display: flex;
    align-items: center;
    background: #FFFFFF;
    border: 1px solid #E4E4E7;
    border-radius: 999px;
    padding: 2px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    flex-shrink: 0;
  }

  .layout-pill {
    padding: 4px 8px;
    border-radius: 999px;
    border: none;
    background: transparent;
    font-size: 0.68rem;
    font-weight: 700;
    color: #71717A;
    cursor: pointer;
    min-height: 26px;
    transition: all 0.15s ease;
  }

  .layout-pill.is-active {
    background: #18181B;
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .primary-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 5px 12px;
    border-radius: 999px;
    background: #6D9C3F; /* Soft aesthetic blue */
    color: #FFFFFF;
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    box-shadow: 0 3px 10px rgba(109, 156, 63, 0.28);
    min-height: 32px;
    flex-shrink: 0;
    cursor: pointer;
    transition: transform 0.15s, background 0.15s;
  }

  .primary-add-btn:active {
    transform: scale(0.95);
  }

  .plus-sign {
    font-size: 1rem;
    line-height: 1;
  }

  /* ── Header Branding Banner (from Image 2) ── */
  .board-branding-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: var(--sp-2);
  }

  .main-board-sub {
    font-size: 0.68rem;
    font-weight: 800;
    color: #6D9C3F;
    letter-spacing: 0.04em;
    margin: 0;
  }

  /* ── Celebration Toast ── */
  .celebration-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #6D9C3F;
    color: #FFFFFF;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(109, 156, 63, 0.35);
    z-index: 9999;
    animation: toastIn 0.25s ease-out;
  }

  @keyframes toastIn {
    from { transform: translate(-50%, -15px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }

  /* ── Mobile Filter Pills ── */
  .mobile-filter-pills {
    display: flex;
    gap: 6px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    margin-bottom: var(--sp-2);
    padding: 2px 2px 6px;
    box-sizing: border-box;
  }

  .mobile-filter-pills::-webkit-scrollbar {
    display: none;
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #E4E4E7;
    background: #FFFFFF;
    color: #52525B;
    font-size: 0.68rem;
    font-weight: 700;
    white-space: nowrap;
    min-height: 26px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .filter-pill.is-active {
    background: #18181B;
    color: #FFFFFF;
    border-color: #18181B;
  }

  .col-pill-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  /* ── Canvas Container ── */
  .kanban-canvas-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  /* ── Layout Modes: Grid 2x2 (Image 2) vs 4 Columns (Image 1) ── */
  .kanban-layout-wrapper.mode-grid-2x2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .kanban-layout-wrapper.mode-columns {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 12px;
    scrollbar-width: thin;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .kanban-layout-wrapper.mode-columns .clean-column-box {
    min-width: 230px;
    max-width: 280px;
    flex: 1;
  }

  /* ── Column Box (Matches Clean SaaS style in Image 1 & 2) ── */
  .clean-column-box {
    background: #F4F4F5;
    border: 1px solid #E4E4E7;
    border-radius: 14px;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    box-sizing: border-box;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.02);
  }

  .clean-column-box.is-drag-target {
    background: #F4F8FC;
    border: 1.5px dashed var(--col-accent, #4E82B4);
    box-shadow: inset 0 0 0 1px rgba(78, 130, 180, 0.12), 0 4px 14px rgba(78, 130, 180, 0.08);
    transform: translateY(-2px);
  }

  /* ── Column Top Header (Image 1 style) ── */
  .column-top-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
    gap: 2px;
    min-width: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  .vertical-color-bar {
    width: 3px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .col-header-label {
    font-size: 0.68rem;
    font-weight: 800;
    color: #27272A;
    letter-spacing: 0;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-counter-chip {
    font-size: 0.58rem;
    font-weight: 800;
    color: #71717A;
    background: #E4E4E7;
    padding: 1px 5px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
  }

  .col-icon-btn {
    width: 18px;
    height: 18px;
    min-width: 18px;
    min-height: 18px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #71717A;
    font-size: 0.75rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .col-icon-btn:hover {
    background: #E4E4E7;
    color: #18181B;
  }

  /* ── Column Tasks Stack ── */
  .column-tasks-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 60px;
    min-width: 0;
  }

  .empty-column-state {
    padding: 16px 4px;
    text-align: center;
  }

  .empty-text {
    font-size: 0.68rem;
    color: #A1A1AA;
    font-weight: 600;
  }

  /* ── Column Bottom "+ Add Task" button (Matches Image 1) ── */
  .column-bottom-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 6px;
    border-radius: 10px;
    border: 1px dashed #D4D4D8;
    background: #FFFFFF;
    color: #71717A;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    min-height: 30px;
    width: 100%;
    box-sizing: border-box;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .column-bottom-add-btn:hover {
    background: #F8FAFC;
    border-color: #4E82B4;
    color: #4E82B4;
  }

  .plus-circle {
    font-size: 0.85rem;
    line-height: 1;
  }

  /* ── Clean Task Card (Exact Replica of Image 1) ── */
  .clean-task-card {
    background: #FFFFFF;
    border: 1px solid #E4E4E7;
    border-radius: 10px;
    padding: 7px 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    box-sizing: border-box;
    cursor: grab;
    cursor: -webkit-grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: pan-y;
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease, border-color 0.18s ease, opacity 0.15s ease;
  }

  .clean-task-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    border-color: #D4D4D8;
  }

  .clean-task-card:active {
    cursor: grabbing;
    cursor: -webkit-grabbing;
  }

  .clean-task-card.is-card-dragging {
    opacity: 0.3;
    transform: scale(0.97);
    border: 1.5px dashed #4E82B4;
    background: #F8FAFC;
    box-shadow: none;
  }

  /* Drop Landing Settle Animation - Subtle & Non-intrusive */
  @keyframes cardLandSettle {
    0% {
      transform: scale(0.96);
      box-shadow: 0 0 0 2px var(--col-accent, #4E82B4);
    }
    50% {
      transform: scale(1.015);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }
  }

  .clean-task-card.is-just-dropped {
    animation: cardLandSettle 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Mobile Floating Drag Card */
  .mobile-drag-floating-card {
    position: fixed;
    pointer-events: none;
    z-index: 99999;
    background: #FFFFFF;
    border: 1.5px solid #4E82B4;
    border-radius: 12px;
    padding: 8px 10px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
    transform: translate(-50%, -50%) rotate(1.5deg) scale(1.02);
    opacity: 0.98;
    box-sizing: border-box;
    will-change: left, top;
  }

  .drag-pill-indicator {
    font-size: 0.58rem;
    font-weight: 700;
    color: #4E82B4;
    background: #F0F5FA;
    padding: 1px 6px;
    border-radius: 999px;
  }

  /* Drop Zone Indicator inside Column */
  .drop-zone-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 6px;
    border-radius: 8px;
    border: 1.5px dashed var(--col-accent, #4E82B4);
    background: rgba(78, 130, 180, 0.05);
    color: var(--col-accent, #4E82B4);
    font-size: 0.65rem;
    font-weight: 700;
    animation: dropHintPulse 1.2s ease-in-out infinite;
    box-sizing: border-box;
  }

  .drop-zone-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--col-accent, #4E82B4);
  }

  @keyframes dropHintPulse {
    0%, 100% { opacity: 0.75; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.01); }
  }

  .clean-task-card.is-completed {
    background: #FAFAFA;
    opacity: 0.9;
  }

  /* Card Header: Priority Pill & Menu */
  .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .priority-tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 800;
  }

  .bullet-square {
    width: 6px;
    height: 6px;
    border-radius: 1.5px;
  }

  .card-top-right {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .card-action-dot {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    border-radius: 6px;
    background: transparent;
    border: none;
    font-size: 0.7rem;
    color: #A1A1AA;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .card-action-dot:hover {
    background: #F4F4F5;
    color: #18181B;
  }

  .card-action-dot:active {
    transform: scale(0.92);
  }

  .card-action-dot.delete:hover {
    background: #FAF0F0;
    color: #C45959;
  }

  /* Card Content */
  .task-title-text {
    font-size: 0.82rem;
    font-weight: 800;
    color: #18181B;
    line-height: 1.35;
    margin: 0;
  }

  .strike-title {
    text-decoration: line-through;
    color: #A1A1AA;
  }

  .task-desc-text {
    font-size: 0.7rem;
    color: #71717A;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Card Footer (Deadline Badge) */
  .card-footer-row {
    display: flex;
    align-items: center;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid #F4F4F5;
  }

  .meta-badge-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #71717A;
  }

  .meta-badge-item.is-urgent {
    color: #C45959;
    font-weight: 800;
  }

  /* 1-Tap Quick Mover at Bottom of Card */
  .quick-status-mover {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }

  .step-move-btn {
    padding: 3px 8px;
    border-radius: 6px;
    border: none;
    font-size: 0.65rem;
    font-weight: 800;
    cursor: pointer;
    min-height: 24px;
    background: #F4F4F5;
    color: #3F3F46;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    transition: background 0.12s;
  }

  .step-move-btn:hover {
    background: #E4E4E7;
  }

  .step-move-btn.next {
    background: #F0F5FA;
    color: #2C5882;
    margin-left: auto;
  }

  .step-move-btn.done {
    background: #F2F7ED;
    color: #446823;
    margin-left: auto;
  }

  /* ── Modal Design ── */
  .clean-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    z-index: 10000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: max(0px, var(--sab));
  }

  .clean-modal-card {
    background: #FFFFFF;
    width: 100%;
    max-width: 440px;
    border-radius: 20px 20px 0 0;
    padding: 18px 20px 24px;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15);
    max-height: 90dvh;
    overflow-y: auto;
    animation: modalSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalSlide {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .modal-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .modal-card-title {
    font-size: 1rem;
    font-weight: 800;
    color: #18181B;
    margin: 0;
  }

  .modal-close-icon {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 50%;
    background: #F4F4F5;
    color: #71717A;
    font-size: 0.85rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .modal-task-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .modal-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .modal-field label,
  .field-label-text {
    font-size: 0.74rem;
    font-weight: 800;
    color: #27272A;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .star {
    color: #C45959;
  }

  .hint-blue {
    color: #4E82B4;
    font-weight: 600;
    font-size: 0.68rem;
  }

  .auto-badge {
    background: #F0F5FA;
    color: #2C5882;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .modal-field input[type="text"],
  .modal-field input[type="date"],
  .modal-field textarea {
    width: 100%;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid #D4D4D8;
    font-size: 0.82rem;
    background: #FAFAFA;
    color: #18181B;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, background 0.15s;
  }

  .modal-field input:focus,
  .modal-field textarea:focus {
    border-color: #4E82B4;
    background: #FFFFFF;
  }

  .priority-choice-row,
  .column-choice-row {
    display: flex;
    gap: 6px;
  }

  .priority-chip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 7px 4px;
    border-radius: 8px;
    border: 1px solid #E4E4E7;
    background: #FFFFFF;
    color: #3F3F46;
    font-size: 0.72rem;
    font-weight: 700;
    min-height: 32px;
    cursor: pointer;
  }

  .priority-chip.is-active-priority {
    border-color: var(--chip-clr);
    background: var(--chip-bg);
    color: var(--chip-clr);
    font-weight: 800;
  }

  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 2px;
  }

  .col-chip {
    flex: 1;
    padding: 6px 2px;
    border-radius: 8px;
    border: 1px solid #E4E4E7;
    background: #FFFFFF;
    color: #52525B;
    font-size: 0.68rem;
    font-weight: 700;
    min-height: 32px;
    cursor: pointer;
    white-space: nowrap;
  }

  .col-chip.is-chosen-col {
    border-color: var(--col-btn-accent);
    background: var(--col-btn-accent);
    color: #FFFFFF;
    font-weight: 800;
  }

  .modal-btn-row {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .btn-dismiss {
    flex: 1;
    background: #F4F4F5;
    color: #52525B;
    font-weight: 800;
    font-size: 0.82rem;
    border-radius: 10px;
    min-height: 40px;
  }

  .btn-save {
    flex: 2;
    background: #4E82B4;
    color: #FFFFFF;
    font-weight: 800;
    font-size: 0.82rem;
    border-radius: 10px;
    min-height: 40px;
    box-shadow: 0 3px 10px rgba(78, 130, 180, 0.28);
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Delete Confirmation Modal Styles ── */
  .clean-delete-modal-card {
    background: #FFFFFF;
    width: 90%;
    max-width: 360px;
    border-radius: 20px;
    padding: 24px 20px 20px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
    margin: auto;
  }

  @keyframes popIn {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .delete-icon-orb {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #FAF0F0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .delete-modal-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #18181B;
    margin: 0 0 6px;
  }

  .delete-modal-desc {
    font-size: 0.78rem;
    color: #71717A;
    line-height: 1.45;
    margin: 0 0 20px;
  }

  .delete-modal-desc strong {
    color: #18181B;
  }

  .delete-modal-actions {
    display: flex;
    width: 100%;
    gap: 8px;
  }

  .btn-confirm-delete {
    flex: 1;
    background: #C45959;
    color: #FFFFFF;
    font-weight: 800;
    font-size: 0.82rem;
    border-radius: 10px;
    border: none;
    min-height: 40px;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(196, 89, 89, 0.3);
    transition: background 0.15s, transform 0.1s;
  }

  .btn-confirm-delete:hover {
    background: #B34848;
  }

  .btn-confirm-delete:active {
    transform: scale(0.98);
  }

  .btn-delete-modal {
    background: #FAF0F0;
    color: #C45959;
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 10px;
    border: 1px solid rgba(196, 89, 89, 0.25);
    padding: 0 14px;
    min-height: 40px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-delete-modal:hover {
    background: #F8E2E2;
  }
</style>
