<script>
  import { onMount } from 'svelte';
  import { couple, galleryVideo } from '$lib/data/content.js';
  import { togglePlayPause, subscribeAudio } from '$lib/audioManager.js';
  import {
    fetchGalleryVideoFromSupabase,
    saveGalleryVideoToSupabase,
    subscribeGalleryVideo,
    fetchPhotosFromSupabase,
    savePhotoToSupabase,
    togglePhotoFavoriteInSupabase,
    deletePhotoFromSupabase,
    subscribeGalleryPhotos,
    GALLERY_FULL_SQL,
    GALLERY_SETTINGS_SQL
  } from '$lib/gallerySync.js';

  let { onBack } = $props();

  // Audio state
  let isPlaying = $state(false);
  let currentTitle = $state('');
  let hasTrack = $state(false);

  $effect(() => {
    return subscribeAudio(state => {
      isPlaying = state.isPlaying;
      currentTitle = state.currentTitle || '';
      hasTrack = !!state.currentMoodId;
    });
  });

  // YouTube Video Configuration
  // Default video ID or stored custom ID
  const DEFAULT_YT_ID = 'jfKfPfyJRdk';
  let youtubeVideoId = $state(DEFAULT_YT_ID);
  let isVideoModalOpen = $state(false);
  let inputVideoUrl = $state('');
  let videoTitle = $state('A Special Video for Winda ✨');

  // Supabase Database Sync State
  let isSavingToSupabase = $state(false);
  let supabaseStatusMessage = $state('');
  let supabaseStatusType = $state(''); // 'success' | 'error' | 'info'
  let showSqlCode = $state(false);
  let sqlCopyToast = $state(false);

  // Camouflage Secret Click Triggers (Only Maggie knows!)
  let secretClickCount = $state(0);
  let secretClickTimer = null;

  function handleSecretBadgeClick() {
    secretClickCount++;
    if (secretClickTimer) clearTimeout(secretClickTimer);
    secretClickTimer = setTimeout(() => {
      secretClickCount = 0;
    }, 1500);

    // Tap 3x quickly on the badge to reveal secret settings
    if (secretClickCount >= 3) {
      secretClickCount = 0;
      inputVideoUrl = `https://youtu.be/${youtubeVideoId}`;
      isVideoModalOpen = true;
    }
  }

  function handleSecretDotClick() {
    // Tap the subtle typographical dot • in the footer
    inputVideoUrl = `https://youtu.be/${youtubeVideoId}`;
    isVideoModalOpen = true;
  }

  // Memories & Photos
  let activeTab = $state('all'); // 'all' | 'fav' | 'funny' | 'special'
  let selectedPhoto = $state(null);
  let isAddMemoryOpen = $state(false);

  // New Memory Form State
  let newMemoryTitle = $state('');
  let newMemoryCaption = $state('');
  let newMemoryDate = $state(new Date().toISOString().split('T')[0]);
  let newMemoryCategory = $state('special');
  let newMemoryImageUrl = $state('');

  let memories = $state([]);

  onMount(() => {
    // 1. Silent fetch from Supabase database table (Highest Priority: shared across all devices)
    fetchGalleryVideoFromSupabase().then(remoteVideo => {
      if (remoteVideo && remoteVideo.youtubeId) {
        youtubeVideoId = remoteVideo.youtubeId;
        if (remoteVideo.title) {
          videoTitle = remoteVideo.title;
        }
        try {
          localStorage.setItem('winda_gallery_youtube_id_v2', remoteVideo.youtubeId);
          if (remoteVideo.title) {
            localStorage.setItem('winda_gallery_youtube_title_v2', remoteVideo.title);
          }
        } catch (e) {}
      }
    });

    // 2. Silent fetch photos & captions from Supabase table gallery_photos
    fetchPhotosFromSupabase().then(remotePhotos => {
      if (remotePhotos && remotePhotos.length > 0) {
        memories = remotePhotos;
        try {
          localStorage.setItem('winda_gallery_memories_v2', JSON.stringify(remotePhotos));
        } catch (e) {}
      }
    });

    // 3. Realtime listeners: video and photos update in real-time across devices!
    const unsubRealtime = subscribeGalleryVideo(updated => {
      if (updated && updated.youtubeId) {
        youtubeVideoId = updated.youtubeId;
        if (updated.title) {
          videoTitle = updated.title;
        }
      }
    });

    const unsubPhotos = subscribeGalleryPhotos(() => {
      fetchPhotosFromSupabase().then(remotePhotos => {
        if (remotePhotos && remotePhotos.length > 0) {
          memories = remotePhotos;
        }
      });
    });

    // 4. Check if URL has ?v=... parameter (Maggie can share a direct link to Winda)
    try {
      const fullHash = window.location.hash || '';
      const searchStr = window.location.search || '';
      const queryPart = searchStr || (fullHash.includes('?') ? fullHash.split('?')[1] : '');
      const params = new URLSearchParams(queryPart);
      
      const paramV = params.get('v');
      if (paramV) {
        const extracted = extractYouTubeId(paramV);
        if (extracted) {
          youtubeVideoId = extracted;
          try {
            localStorage.setItem('winda_gallery_youtube_id_v2', extracted);
          } catch (e) {}
        }
      }

      if (params.get('admin') === 'true' || params.get('edit') === 'true' || fullHash.includes('edit=true')) {
        isVideoModalOpen = true;
      }
    } catch (e) {}

    // 5. Initial fallback to localStorage or content.js
    try {
      const savedYtId = localStorage.getItem('winda_gallery_youtube_id_v2');
      if (savedYtId) {
        youtubeVideoId = savedYtId;
      } else if (galleryVideo?.youtubeIdOrUrl) {
        const idFromContent = extractYouTubeId(galleryVideo.youtubeIdOrUrl);
        if (idFromContent) {
          youtubeVideoId = idFromContent;
        }
      }

      const savedTitle = localStorage.getItem('winda_gallery_youtube_title_v2');
      if (savedTitle) {
        videoTitle = savedTitle;
      } else if (galleryVideo?.title) {
        videoTitle = galleryVideo.title;
      }
    } catch (e) {}

    // 6. Fallback memories from localStorage (excluding any old dummy sample photos)
    try {
      const savedMem = localStorage.getItem('winda_gallery_memories_v2');
      if (savedMem) {
        const parsed = JSON.parse(savedMem);
        if (Array.isArray(parsed)) {
          const cleanList = parsed.filter(m => !['mem-1', 'mem-2', 'mem-3'].includes(m.id));
          if (cleanList.length > 0) {
            memories = cleanList;
          } else {
            memories = [];
            localStorage.removeItem('winda_gallery_memories_v2');
          }
        }
      }
    } catch (e) {}

    return () => {
      if (unsubRealtime) unsubRealtime();
      if (unsubPhotos) unsubPhotos();
    };
  });

  function extractYouTubeId(url) {
    if (!url) return null;
    const clean = url.trim();
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    if (clean.length === 11 && !clean.includes('/') && !clean.includes(' ')) {
      return clean;
    }
    return null;
  }

  async function handleSaveVideo() {
    const id = extractYouTubeId(inputVideoUrl);
    if (!id) {
      alert('Link YouTube tidak valid. Pastikan format link seperti: https://youtu.be/ID atau https://youtube.com/watch?v=ID');
      return;
    }

    youtubeVideoId = id;
    try {
      localStorage.setItem('winda_gallery_youtube_id_v2', id);
      localStorage.setItem('winda_gallery_youtube_title_v2', videoTitle);
    } catch (e) {}

    // Save to Supabase Table so Winda's phone automatically gets it!
    isSavingToSupabase = true;
    supabaseStatusType = 'info';
    supabaseStatusMessage = 'Menyimpan ke database Supabase...';

    const res = await saveGalleryVideoToSupabase({
      youtubeId: id,
      title: videoTitle
    });

    isSavingToSupabase = false;

    if (res.success) {
      supabaseStatusType = 'success';
      supabaseStatusMessage = '✅ Berhasil disimpan ke tabel Supabase! Semua HP (termasuk Winda) otomatis memutar video ini.';
      setTimeout(() => {
        isVideoModalOpen = false;
        supabaseStatusMessage = '';
        inputVideoUrl = '';
      }, 1500);
    } else {
      supabaseStatusType = 'error';
      supabaseStatusMessage = '⚠️ Belum ada tabel "gallery_settings" di Supabase. Silakan copy SQL di bawah dan jalankan di Supabase SQL Editor.';
      showSqlCode = true;
    }
  }

  function handleResetVideo() {
    const fallbackId = (galleryVideo?.youtubeIdOrUrl && extractYouTubeId(galleryVideo.youtubeIdOrUrl)) || DEFAULT_YT_ID;
    youtubeVideoId = fallbackId;
    videoTitle = galleryVideo?.title || 'A Special Video for Winda ✨';
    try {
      localStorage.removeItem('winda_gallery_youtube_id_v2');
      localStorage.removeItem('winda_gallery_youtube_title_v2');
    } catch (e) {}
    isVideoModalOpen = false;
  }

  function handleCopySql() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(GALLERY_FULL_SQL);
      sqlCopyToast = true;
      setTimeout(() => { sqlCopyToast = false; }, 2500);
    }
  }

  async function handleAddMemory() {
    if (!newMemoryImageUrl) {
      alert('Harap pilih foto terlebih dahulu dari galeri.');
      return;
    }

    if (!newMemoryTitle.trim()) {
      alert('Harap isi judul momen.');
      return;
    }

    const newMem = {
      id: 'mem-' + Date.now(),
      title: newMemoryTitle.trim(),
      caption: newMemoryCaption.trim(),
      imageUrl: newMemoryImageUrl,
      category: newMemoryCategory,
      date: newMemoryDate,
      isFavorite: false
    };

    // Optimistic local update
    memories = [newMem, ...memories];
    try {
      localStorage.setItem('winda_gallery_memories_v2', JSON.stringify(memories));
    } catch (e) {}

    // Save to Supabase table gallery_photos!
    savePhotoToSupabase(newMem).then(res => {
      if (!res.success) {
        console.warn('Notice saving photo to Supabase:', res.error);
      }
    });

    // Reset Form
    newMemoryTitle = '';
    newMemoryCaption = '';
    newMemoryImageUrl = '';
    isAddMemoryOpen = false;
  }

  function handleToggleFavorite(id, e) {
    e.stopPropagation();
    let newFavState = false;
    memories = memories.map(m => {
      if (m.id === id) {
        newFavState = !m.isFavorite;
        return { ...m, isFavorite: newFavState };
      }
      return m;
    });
    try {
      localStorage.setItem('winda_gallery_memories_v2', JSON.stringify(memories));
    } catch (e) {}

    // Sync favorite to Supabase
    togglePhotoFavoriteInSupabase(id, newFavState);
  }

  function handleDeleteMemory(id, e) {
    e.stopPropagation();
    if (confirm('Hapus kenangan ini dari gallery?')) {
      memories = memories.filter(m => m.id !== id);
      try {
        localStorage.setItem('winda_gallery_memories_v2', JSON.stringify(memories));
      } catch (e) {}

      // Delete from Supabase
      deletePhotoFromSupabase(id);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Optimal resize (max 1280px) for crisp quality & fast Supabase sync
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        newMemoryImageUrl = canvas.toDataURL('image/jpeg', 0.85);
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  let filteredMemories = $derived.by(() => {
    if (activeTab === 'fav') {
      return memories.filter(m => m.isFavorite);
    }
    if (activeTab === 'funny') {
      return memories.filter(m => m.category === 'funny');
    }
    if (activeTab === 'special') {
      return memories.filter(m => m.category === 'special');
    }
    return memories;
  });

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#/';
    }
  }
</script>

<div class="gallery-page">
  <!-- Top Header Navigation -->
  <header class="gallery-header">
    <div class="header-left">
      <button
        type="button"
        class="icon-btn back-btn"
        onclick={handleBack}
        aria-label="Kembali ke Beranda"
        title="Kembali ke Beranda"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <div class="header-title-box">
        <div class="badge-pill">GALLERY & MEMORIES</div>
        <h1 class="header-title">{couple.her}'s Sweet Moments 🌸</h1>
      </div>
    </div>

    <div class="header-right">
      {#if hasTrack}
        <button
          type="button"
          class="music-btn"
          onclick={togglePlayPause}
          aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
          title={isPlaying ? `Memutar: ${currentTitle}` : 'Musik dijeda'}
        >
          <span class="disc-vinyl" class:spinning={isPlaying}>💿</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- Main Scrollable Content -->
  <main class="gallery-content">

    <!-- ── 1. Featured Video Showcase (YouTube Unlisted Embed) ── -->
    <section class="video-showcase-card">
      <div class="video-card-header">
        <div class="video-meta">
          <!-- Camouflage 1: Klik 3x cepat di badge ini untuk buka pengaturan rahasia -->
          <button
            type="button"
            class="video-tag secret-badge-btn"
            onclick={handleSecretBadgeClick}
            aria-label="Video tag"
            title="Featured Video"
          >
            FEATURED VIDEO 🎬
          </button>
          <h2 class="video-title">{videoTitle}</h2>
        </div>
      </div>

      <!-- Responsive 16:9 Video Container -->
      <div class="video-player-wrapper">
        <iframe
          class="youtube-iframe"
          src="https://www.youtube.com/embed/{youtubeVideoId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1"
          title="Special Video for Winda"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>

      <div class="video-card-footer">
        <div class="yt-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span>YouTube Unlisted Embed</span>
          <!-- Camouflage 2: Klik titik pemisah ini untuk buka pengaturan rahasia -->
          <button
            type="button"
            class="secret-dot-btn"
            onclick={handleSecretDotClick}
            aria-label="Separator"
            title="•"
          >
            •
          </button>
          <!-- <span>Full HD & Hemat Kuota</span> -->
        </div>
      </div>
    </section>

    <!-- ── 2. Photo Gallery & Memories ── -->
    <section class="memories-section">
      <div class="memories-section-header">
        <div>
          <h2 class="section-title">Photo Album & Catatan 📸</h2>
          <p class="section-subtitle">Koleksi foto dan kenangan bersama</p>
        </div>

        <button
          type="button"
          class="add-memory-btn"
          onclick={() => isAddMemoryOpen = true}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Tambah</span>
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="gallery-tabs">
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === 'all'}
          onclick={() => activeTab = 'all'}
        >
          Semua ({memories.length})
        </button>
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === 'fav'}
          onclick={() => activeTab = 'fav'}
        >
          Favorit ❤️
        </button>
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === 'funny'}
          onclick={() => activeTab = 'funny'}
        >
          Lucu 🐸
        </button>
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === 'special'}
          onclick={() => activeTab = 'special'}
        >
          Spesial ✨
        </button>
      </div>

      <!-- Memories Grid -->
      {#if filteredMemories.length === 0}
        <div class="empty-state">
          <span class="empty-icon">📷</span>
          <p class="empty-text">Belum ada kenangan di kategori ini.</p>
          <button
            type="button"
            class="empty-add-btn"
            onclick={() => isAddMemoryOpen = true}
          >
            + Tambah Foto Kenangan
          </button>
        </div>
      {:else}
        <div class="memories-grid">
          {#each filteredMemories as mem (mem.id)}
            <div
              class="memory-card"
              role="button"
              tabindex="0"
              onclick={() => selectedPhoto = mem}
              onkeydown={(e) => { if (e.key === 'Enter') selectedPhoto = mem; }}
            >
              <div class="image-wrapper">
                <img src={mem.imageUrl} alt={mem.title} loading="lazy" />
                <button
                  type="button"
                  class="fav-badge-btn"
                  class:is-fav={mem.isFavorite}
                  onclick={(e) => handleToggleFavorite(mem.id, e)}
                  title={mem.isFavorite ? 'Hapus dari favorit' : 'Jadikan favorit'}
                  aria-label="Toggle favorit"
                >
                  {mem.isFavorite ? '❤️' : '🤍'}
                </button>
              </div>

              <div class="memory-info">
                <div class="memory-meta-top">
                  <span class="memory-date">{mem.date || 'Kenangan'}</span>
                  <button
                    type="button"
                    class="delete-mini-btn"
                    onclick={(e) => handleDeleteMemory(mem.id, e)}
                    title="Hapus foto"
                    aria-label="Hapus foto"
                  >
                    ×
                  </button>
                </div>
                <h3 class="memory-card-title">{mem.title}</h3>
                {#if mem.caption}
                  <p class="memory-card-caption">{mem.caption}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <!-- ── 3. Lightbox Modal (Zoom Photo) ── -->
  {#if selectedPhoto}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      onclick={() => selectedPhoto = null}
      onkeydown={(e) => { if (e.key === 'Escape') selectedPhoto = null; }}
    >
      <div
        class="lightbox-card"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => { if (e.key === 'Escape') selectedPhoto = null; }}
      >
        <button
          type="button"
          class="lightbox-close-btn"
          onclick={() => selectedPhoto = null}
          aria-label="Tutup"
        >
          ✕
        </button>

        <div class="lightbox-img-wrap">
          <img src={selectedPhoto.imageUrl} alt={selectedPhoto.title} />
        </div>

        <div class="lightbox-details">
          <div class="lightbox-meta">
            <span class="lightbox-tag">#{selectedPhoto.category}</span>
            <span class="lightbox-date">{selectedPhoto.date}</span>
          </div>
          <h3 class="lightbox-title">{selectedPhoto.title}</h3>
          {#if selectedPhoto.caption}
            <p class="lightbox-caption">{selectedPhoto.caption}</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- ── 4. YouTube Video Config Modal ── -->
  {#if isVideoModalOpen}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      onclick={() => isVideoModalOpen = false}
      onkeydown={(e) => { if (e.key === 'Escape') isVideoModalOpen = false; }}
    >
      <div
        class="config-modal-card"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => { if (e.key === 'Escape') isVideoModalOpen = false; }}
      >
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Atur Link Video YouTube 🎬</h3>
            <p class="modal-desc">Sematkan video unlisted dari YouTube untuk Winda</p>
          </div>
          <button
            type="button"
            class="modal-close-icon"
            onclick={() => isVideoModalOpen = false}
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <div class="info-box">
            <span class="info-icon">💡</span>
            <p class="info-text">
              Video ukuran besar (seperti 150MB) paling bagus di-upload ke YouTube dengan status <strong>"Tidak Publik / Unlisted"</strong>. Hanya orang yang punya link yang bisa tonton, dan otomatis bebas buffering!
            </p>
          </div>

          <div class="form-group">
            <label for="yt-title-input">Judul Video</label>
            <input
              id="yt-title-input"
              type="text"
              bind:value={videoTitle}
              placeholder="Contoh: Our Special Graduation / Birthday Video"
            />
          </div>

          <div class="form-group">
            <label for="yt-url-input">Link / URL YouTube</label>
            <input
              id="yt-url-input"
              type="text"
              bind:value={inputVideoUrl}
              placeholder="https://youtu.be/... atau https://youtube.com/watch?v=..."
            />
          </div>

          {#if supabaseStatusMessage}
            <div class="db-status-banner" class:success={supabaseStatusType === 'success'} class:error={supabaseStatusType === 'error'} class:info={supabaseStatusType === 'info'}>
              <span>{supabaseStatusMessage}</span>
            </div>
          {/if}

          {#if showSqlCode}
            <div class="sql-guide-card">
              <div class="sql-guide-header">
                <span class="sql-guide-title">⚡ Setup Tabel Supabase (Cukup 1x Saja):</span>
                <button type="button" class="copy-sql-btn" onclick={handleCopySql}>
                  {sqlCopyToast ? 'Tersalin! ✅' : 'Salin SQL 📋'}
                </button>
              </div>
              <p class="sql-guide-desc">Buka <strong>Supabase Dashboard → SQL Editor → New query</strong>, paste SQL ini lalu klik <strong>RUN</strong>:</p>
              <pre class="sql-code-block"><code>{GALLERY_FULL_SQL}</code></pre>
            </div>
          {/if}

          {#if youtubeVideoId}
            <div class="share-helper-box">
              <span class="share-helper-title">🔗 Link Instan untuk Winda:</span>
              <p class="share-helper-desc">Bisa kirimkan link ini ke Winda agar video langsung aktif di HP Winda tanpa dia harus setting apapun:</p>
              <div class="share-code-line">
                <code>#/gallery?v={youtubeVideoId}</code>
              </div>
            </div>
          {/if}

          <div class="code-tip-box">
            <span class="tip-icon">✨</span>
            <p class="tip-desc">
              <strong>Tips Alternatif:</strong> Kamu juga bisa ganti langsung di <code>src/lib/data/content.js</code> pada <code>galleryVideo.youtubeIdOrUrl</code> agar otomatis tersimpan tanpa database.
            </p>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            onclick={handleResetVideo}
            disabled={isSavingToSupabase}
          >
            Reset Default
          </button>
          <button
            type="button"
            class="btn-primary"
            onclick={handleSaveVideo}
            disabled={isSavingToSupabase}
          >
            {isSavingToSupabase ? 'Menyimpan...' : 'Simpan ke Database Supabase 🚀'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── 5. Add Memory Modal ── -->
  {#if isAddMemoryOpen}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      onclick={() => isAddMemoryOpen = false}
      onkeydown={(e) => { if (e.key === 'Escape') isAddMemoryOpen = false; }}
    >
      <div
        class="config-modal-card"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => { if (e.key === 'Escape') isAddMemoryOpen = false; }}
      >
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Tambah Kenangan Baru 📷</h3>
            <p class="modal-desc">Simpan momen berharga ke dalam gallery</p>
          </div>
          <button
            type="button"
            class="modal-close-icon"
            onclick={() => isAddMemoryOpen = false}
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="mem-title">Judul Momen</label>
            <input
              id="mem-title"
              type="text"
              bind:value={newMemoryTitle}
              placeholder="Contoh: Jalan-jalan sore di taman"
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="mem-date">Tanggal</label>
              <input
                id="mem-date"
                type="date"
                bind:value={newMemoryDate}
              />
            </div>
            <div class="form-group flex-1">
              <label for="mem-cat">Kategori</label>
              <select id="mem-cat" bind:value={newMemoryCategory}>
                <option value="special">Spesial ✨</option>
                <option value="funny">Lucu 🐸</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="mem-file-picker">Pilih Foto</label>
            {#if !newMemoryImageUrl}
              <label for="mem-file-picker" class="upload-dropzone">
                <span class="upload-dropzone-icon">📸</span>
                <span class="upload-dropzone-title">Pilih Foto dari Galeri HP / Laptop</span>
                <span class="upload-dropzone-sub">Klik di sini untuk memilih foto</span>
                <input
                  id="mem-file-picker"
                  type="file"
                  accept="image/*"
                  class="file-hidden-input"
                  onchange={handleFileUpload}
                />
              </label>
            {:else}
              <div class="preview-box">
                <div class="preview-header">
                  <span class="preview-label">Foto Terpilih:</span>
                  <label for="mem-file-picker" class="change-photo-btn">
                    Ganti Foto 🔄
                    <input
                      id="mem-file-picker"
                      type="file"
                      accept="image/*"
                      class="file-hidden-input"
                      onchange={handleFileUpload}
                    />
                  </label>
                </div>
                <img src={newMemoryImageUrl} alt="Preview" class="upload-preview-img" />
              </div>
            {/if}
          </div>

          <div class="form-group">
            <label for="mem-caption">Catatan / Pesan Singkat</label>
            <textarea
              id="mem-caption"
              rows="3"
              bind:value={newMemoryCaption}
              placeholder="Tuliskan cerita manis atau alasan kenapa momen ini berharga..."
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            onclick={() => isAddMemoryOpen = false}
          >
            Batal
          </button>
          <button
            type="button"
            class="btn-primary"
            onclick={handleAddMemory}
          >
            Simpan Momen
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .gallery-page {
    width: 100%;
    min-height: 100dvh;
    background: #FAF8F5;
    color: #1E293B;
    display: flex;
    flex-direction: column;
    font-family: var(--font-sans, 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif);
    padding-bottom: 60px;
  }

  /* ── Header ── */
  .gallery-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(250, 248, 245, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: max(14px, var(--sat, 14px)) 16px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-btn.back-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #1E293B;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
    transition: transform 0.15s ease, background-color 0.15s ease;
  }

  .icon-btn.back-btn:active {
    transform: scale(0.92);
  }

  .badge-pill {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #4F46E5;
    background: #EEF2FF;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 2px;
  }

  .header-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    line-height: 1.2;
  }

  .music-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
  }

  .disc-vinyl.spinning {
    display: inline-block;
    animation: spinVinyl 3.5s linear infinite;
  }

  @keyframes spinVinyl {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Content ── */
  .gallery-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* ── Featured Video Card ── */
  .video-showcase-card {
    background: #FFFFFF;
    border-radius: 20px;
    border: 1px solid #E2E8F0;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .video-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .video-tag {
    font-size: 0.68rem;
    font-weight: 800;
    color: #BE123C;
    background: #FFF1F2;
    padding: 2px 7px;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 4px;
  }

  .video-title {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .secret-badge-btn {
    all: unset;
    font-size: 0.68rem;
    font-weight: 800;
    color: #BE123C;
    background: #FFF1F2;
    padding: 2px 7px;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 4px;
    cursor: default;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .secret-dot-btn {
    all: unset;
    min-width: 0 !important;
    min-height: 0 !important;
    cursor: default;
    color: #94A3B8;
    font-size: 0.9rem;
    padding: 0 4px;
    user-select: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s ease;
  }

  .video-player-wrapper {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
    background: #0F172A;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    touch-action: auto;
    -webkit-overflow-scrolling: touch;
  }

  .youtube-iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0;
    pointer-events: auto;
    touch-action: auto;
  }

  .video-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .yt-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748B;
  }

  /* ── Photo Album Section ── */
  .memories-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .memories-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .section-subtitle {
    font-size: 0.78rem;
    color: #64748B;
    margin: 2px 0 0;
  }

  .add-memory-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #4F46E5;
    color: #FFFFFF;
    font-size: 0.78rem;
    font-weight: 700;
    box-shadow: 0 3px 8px rgba(79, 70, 229, 0.25);
    transition: transform 0.15s ease, background-color 0.15s ease;
  }

  .add-memory-btn:active {
    transform: scale(0.95);
  }

  .gallery-tabs {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .gallery-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    padding: 6px 14px;
    border-radius: 999px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #64748B;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .tab-btn.active {
    background: #1E293B;
    color: #FFFFFF;
    border-color: #1E293B;
  }

  /* ── Memories Grid ── */
  .memories-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .memory-card {
    background: #FFFFFF;
    border-radius: 16px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    flex-direction: column;
  }

  .memory-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  }

  .image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #F8FAFC;
    overflow: hidden;
  }

  .image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .memory-card:hover .image-wrapper img {
    transform: scale(1.05);
  }

  .fav-badge-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .fav-badge-btn.is-fav {
    background: #FFFFFF;
  }

  .memory-info {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .memory-meta-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .memory-date {
    font-size: 0.65rem;
    font-weight: 700;
    color: #94A3B8;
  }

  .delete-mini-btn {
    font-size: 1.1rem;
    line-height: 1;
    color: #CBD5E1;
    padding: 0 2px;
    transition: color 0.15s ease;
  }

  .delete-mini-btn:hover {
    color: #EF4444;
  }

  .memory-card-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .memory-card-caption {
    font-size: 0.72rem;
    color: #64748B;
    margin: 0;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .empty-state {
    background: #FFFFFF;
    border: 1.5px dashed #CBD5E1;
    border-radius: 18px;
    padding: 32px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .empty-icon {
    font-size: 2rem;
  }

  .empty-text {
    font-size: 0.82rem;
    color: #64748B;
  }

  .empty-add-btn {
    margin-top: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    background: #EEF2FF;
    color: #4F46E5;
    font-size: 0.75rem;
    font-weight: 700;
  }

  /* ── Lightbox & Modals ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .lightbox-card {
    background: #FFFFFF;
    border-radius: 20px;
    max-width: 390px;
    width: 100%;
    overflow: hidden;
    position: relative;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lightbox-close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.5);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    z-index: 10;
  }

  .lightbox-img-wrap {
    width: 100%;
    max-height: 320px;
    background: #F8FAFC;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox-img-wrap img {
    max-width: 100%;
    max-height: 320px;
    object-fit: contain;
  }

  .lightbox-details {
    padding: 16px 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lightbox-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    color: #64748B;
  }

  .lightbox-tag {
    font-weight: 700;
    color: #4F46E5;
    background: #EEF2FF;
    padding: 2px 7px;
    border-radius: 6px;
  }

  .lightbox-title {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .lightbox-caption {
    font-size: 0.82rem;
    color: #475569;
    line-height: 1.45;
    margin: 0;
  }

  /* Config / Form Modals */
  .config-modal-card {
    background: #FFFFFF;
    border-radius: 22px;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalPop {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .modal-desc {
    font-size: 0.75rem;
    color: #64748B;
    margin: 2px 0 0;
  }

  .modal-close-icon {
    font-size: 1.1rem;
    color: #94A3B8;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-box {
    display: flex;
    gap: 8px;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 12px;
    padding: 10px 12px;
  }

  .info-icon {
    font-size: 1rem;
  }

  .info-text {
    font-size: 0.72rem;
    color: #166534;
    line-height: 1.4;
    margin: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #334155;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 9px 12px;
    border-radius: 10px;
    border: 1.5px solid #CBD5E1;
    font-family: inherit;
    font-size: 0.82rem;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: #4F46E5;
  }

  .form-row {
    display: flex;
    gap: 10px;
  }

  .flex-1 {
    flex: 1;
  }

  .upload-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 18px 14px;
    background: #F8FAFC;
    border: 1.5px dashed #CBD5E1;
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .upload-dropzone:hover {
    background: #EEF2FF;
    border-color: #818CF8;
  }

  .upload-dropzone-icon {
    font-size: 1.8rem;
    line-height: 1;
    margin-bottom: 2px;
  }

  .upload-dropzone-title {
    font-size: 0.8rem;
    font-weight: 800;
    color: #334155;
  }

  .upload-dropzone-sub {
    font-size: 0.7rem;
    color: #64748B;
  }

  .file-hidden-input {
    display: none;
  }

  .preview-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .change-photo-btn {
    cursor: pointer;
    font-size: 0.72rem;
    font-weight: 700;
    color: #4F46E5;
    background: #EEF2FF;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid #C7D2FE;
    transition: background-color 0.15s ease;
  }

  .change-photo-btn:hover {
    background: #E0E7FF;
  }

  .preview-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: #475569;
  }

  .upload-preview-img {
    max-height: 180px;
    width: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .btn-secondary {
    padding: 8px 16px;
    border-radius: 10px;
    background: #F1F5F9;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .btn-primary {
    padding: 8px 18px;
    border-radius: 10px;
    background: #4F46E5;
    color: #FFFFFF;
    font-size: 0.78rem;
    font-weight: 700;
    box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
  }

  .share-helper-box {
    background: #EEF2FF;
    border: 1px solid #C7D2FE;
    border-radius: 12px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .share-helper-title {
    font-size: 0.75rem;
    font-weight: 800;
    color: #3730A3;
  }

  .share-helper-desc {
    font-size: 0.7rem;
    color: #4F46E5;
    line-height: 1.35;
    margin: 0;
  }

  .share-code-line {
    margin-top: 4px;
    background: #FFFFFF;
    border: 1px solid #C7D2FE;
    border-radius: 6px;
    padding: 6px 10px;
  }

  .share-code-line code {
    font-family: monospace;
    font-size: 0.75rem;
    color: #4338CA;
    word-break: break-all;
  }

  .code-tip-box {
    display: flex;
    gap: 6px;
    background: #FEF3C7;
    border: 1px solid #FDE68A;
    border-radius: 12px;
    padding: 10px 12px;
    align-items: flex-start;
  }

  .tip-icon {
    font-size: 0.9rem;
  }

  .tip-desc {
    font-size: 0.72rem;
    color: #92400E;
    line-height: 1.4;
    margin: 0;
  }

  .code-tip-box code {
    background: rgba(255, 255, 255, 0.6);
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-family: monospace;
  }

  .db-status-banner {
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.4;
  }

  .db-status-banner.info {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  }

  .db-status-banner.success {
    background: #F0FDF4;
    color: #15803D;
    border: 1px solid #BBF7D0;
  }

  .db-status-banner.error {
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  }

  .sql-guide-card {
    background: #0F172A;
    color: #F8FAFC;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sql-guide-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .sql-guide-title {
    font-size: 0.72rem;
    font-weight: 800;
    color: #38BDF8;
  }

  .copy-sql-btn {
    all: unset;
    cursor: pointer;
    background: #0284C7;
    color: #FFFFFF;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    transition: background 0.15s ease;
  }

  .copy-sql-btn:hover {
    background: #0369A1;
  }

  .sql-guide-desc {
    font-size: 0.68rem;
    color: #94A3B8;
    margin: 0;
  }

  .sql-code-block {
    background: #020617;
    border: 1px solid #1E293B;
    border-radius: 8px;
    padding: 8px;
    max-height: 120px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.65rem;
    color: #A5F3FC;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
