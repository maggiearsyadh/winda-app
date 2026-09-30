// ============================================================
//  CONTENT.JS  –  Konfigurasi Data Aplikasi
// ============================================================

export const couple = {
  her: "Winda",                 // Nama pasangan
  me: "Maggie",              // Nama kamu
  startDate: "2024-02-14",   // Tanggal jadian (YYYY-MM-DD)
};

// Mood Section – "HOW’S YOUR FEELING" (4 Moods Kodok SVG + Musik)
export const moodSection = {
  badge: "Mood Tracker",
  title: "HOW’S YOUR FEELING?",
  subtitle: "Pilih perasaan yang paling menggambarkan dirimu saat ini:",
  moods: [
    {
      id: "anger",
      title: "Anger",
      songTitle: "Anger Playlist",
      artist: "Calming Sounds",
      cover: "/audio/covers/anger.jpg",
      src: "/moods/anger.svg",
      audioSrc: "/audio/anger.mp3",
      bgColor: "#BA4965", // Warna mood Anger
      tag: "Feel angry today??? why an 😤",
      activeColor: "#BA4965",
      message: "Tell me what made you mad. I always ready to hear you, and i always on your side",
    },
    {
      id: "happy",
      title: "Happy",
      songTitle: 'Happy - From Purwokerto',
      artist: "Pharrell Williams",
      cover: "/audio/covers/happy.png",
      src: "/moods/happy.svg",
      audioSrc: "/audio/happy.mp3",
      bgColor: "#DC9917", // Warna mood Happy
      tag: "HAHAHAH U HAPPY AS ALWAYS AN",
      activeColor: "#DC9917",
      message: "Keep cheerful and get excited !",
    },
    {
      id: "fear",
      title: "Fear",
      songTitle: "Best Part - Clark Maggie",
      artist: "Clark Maggie",
      cover: "/audio/covers/fear.jpg",
      src: "/moods/fear.svg",
      audioSrc: "/audio/fear.mp3",
      bgColor: "#678347", // Warna mood Fear
      tag: "Fear of something? 🥺",
      activeColor: "#678347",
      message: "Take a deep breath. It's okay not to be okay, tell me what are you afraid of, tugas lagi banyak ya?",
    },
    {
      id: "sad",
      title: "Sad",
      songTitle: "Location - Abdul Khoir",
      artist: "Abdul Khoir",
      cover: "/audio/covers/sad.jpg",
      src: "/moods/sad.svg",
      audioSrc: "/audio/sad.mp3",
      bgColor: "#3D64A1", // Warna mood Sad
      tag: "harusnya Putri kodok ga akan pernah sedih",
      activeColor: "#3D64A1",
      message: "Winda pernah bilang klo lagi sedih, harus di bawa tidur atau beli makanan enak.",
    },
  ],
};
