import { supabase } from '$lib/supabaseClient.js';

export const GALLERY_FULL_SQL = `-- ============================================================
-- SQL SETUP UNTUK GALLERY (VIDEO & FOTO/CAPTIONS) DI SUPABASE
-- Buka Supabase -> SQL Editor -> New Query -> Paste & Run
-- ============================================================

-- 1. Tabel Konfigurasi Video YouTube
CREATE TABLE IF NOT EXISTS public.gallery_settings (
  id INT PRIMARY KEY DEFAULT 1,
  youtube_id TEXT NOT NULL,
  title TEXT DEFAULT 'A Special Video for Winda ✨',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gallery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read gallery_settings" ON public.gallery_settings;
CREATE POLICY "Allow public read gallery_settings"
  ON public.gallery_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public all gallery_settings" ON public.gallery_settings;
CREATE POLICY "Allow public all gallery_settings"
  ON public.gallery_settings FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.gallery_settings (id, youtube_id, title)
VALUES (1, 'jfKfPfyJRdk', 'A Special Video for Winda ✨')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabel Koleksi Foto & Captions Bersama
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  caption TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'special',
  date TEXT DEFAULT '',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read gallery_photos" ON public.gallery_photos;
CREATE POLICY "Allow public read gallery_photos"
  ON public.gallery_photos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public all gallery_photos" ON public.gallery_photos;
CREATE POLICY "Allow public all gallery_photos"
  ON public.gallery_photos FOR ALL
  USING (true)
  WITH CHECK (true);`;

export const GALLERY_SETTINGS_SQL = GALLERY_FULL_SQL;

// ── 1. Video YouTube Operations ────────────────────────────────────────

/**
 * Fetch latest YouTube video from Supabase database table.
 * @returns {Promise<{youtubeId: string, title?: string, updatedAt?: string}|null>}
 */
export async function fetchGalleryVideoFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('gallery_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data && data.youtube_id) {
      return {
        youtubeId: data.youtube_id,
        title: data.title,
        updatedAt: data.updated_at
      };
    }

    if (error) {
      console.log('Notice fetching gallery_settings from Supabase:', error.message);
    }
    return null;
  } catch (err) {
    console.warn('Error fetching gallery video from Supabase:', err);
    return null;
  }
}

/**
 * Save / update YouTube video to Supabase database table.
 * All devices (including Winda's phone) will automatically load this.
 * @param {{youtubeId: string, title: string}} videoData
 */
export async function saveGalleryVideoToSupabase(videoData) {
  if (!videoData?.youtubeId) return { success: false, error: 'No video ID' };

  try {
    const payload = {
      id: 1,
      youtube_id: videoData.youtubeId,
      title: videoData.title || 'A Special Video for Winda ✨',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('gallery_settings')
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      return { success: true };
    }

    return { success: false, error: error.message };
  } catch (err) {
    console.error('Error saving gallery video to Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Realtime subscription to gallery video updates.
 */
export function subscribeGalleryVideo(callback) {
  try {
    const channel = supabase
      .channel('public:gallery_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_settings' }, payload => {
        if (payload.new && payload.new.youtube_id) {
          callback({
            youtubeId: payload.new.youtube_id,
            title: payload.new.title
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error for gallery video:', err);
    return () => {};
  }
}

// ── 2. Photo & Captions Operations (gallery_photos) ────────────────────

/**
 * Fetch all photos & captions from Supabase database table.
 * @returns {Promise<Array<{id: string, title: string, caption: string, imageUrl: string, category: string, date: string, isFavorite: boolean}>|null>}
 */
export async function fetchPhotosFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map(item => ({
        id: item.id,
        title: item.title,
        caption: item.caption || '',
        imageUrl: item.image_url,
        category: item.category || 'special',
        date: item.date || '',
        isFavorite: !!item.is_favorite
      }));
    }

    if (error) {
      console.log('Notice fetching gallery_photos from Supabase:', error.message);
    }
    return null;
  } catch (err) {
    console.warn('Error fetching photos from Supabase:', err);
    return null;
  }
}

/**
 * Save / Insert / Update a photo memory to Supabase.
 * @param {{id: string, title: string, caption: string, imageUrl: string, category: string, date: string, isFavorite: boolean}} photo
 */
export async function savePhotoToSupabase(photo) {
  if (!photo?.id || !photo?.imageUrl) return { success: false, error: 'Incomplete photo data' };

  try {
    const payload = {
      id: photo.id,
      title: photo.title || 'Kenangan Indah',
      caption: photo.caption || '',
      image_url: photo.imageUrl,
      category: photo.category || 'special',
      date: photo.date || new Date().toISOString().split('T')[0],
      is_favorite: !!photo.isFavorite
    };

    const { error } = await supabase
      .from('gallery_photos')
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      return { success: true };
    }

    return { success: false, error: error.message };
  } catch (err) {
    console.error('Error saving photo to Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle favorite status of a photo in Supabase.
 * @param {string} id
 * @param {boolean} isFavorite
 */
export async function togglePhotoFavoriteInSupabase(id, isFavorite) {
  try {
    const { error } = await supabase
      .from('gallery_photos')
      .update({ is_favorite: isFavorite })
      .eq('id', id);

    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a photo memory from Supabase.
 * @param {string} id
 */
export async function deletePhotoFromSupabase(id) {
  try {
    const { error } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', id);

    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Realtime subscription to photo updates.
 * When Maggie adds or modifies photos, Winda's gallery updates automatically!
 */
export function subscribeGalleryPhotos(callback) {
  try {
    const channel = supabase
      .channel('public:gallery_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos' }, payload => {
        callback(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error for gallery photos:', err);
    return () => {};
  }
}
