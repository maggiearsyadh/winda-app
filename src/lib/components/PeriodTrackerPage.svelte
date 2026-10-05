<script>
 import { onMount } from 'svelte';
 import { couple } from '$lib/data/content.js';
 import { togglePlayPause, subscribeAudio } from '$lib/audioManager.js';
 import { todayISO, toISO, parseISO, addDays, diffDays, formatDateIndo } from '$lib/period/dateUtils.js';
 import { computeStats, predictCycle, getDayStatus } from '$lib/period/cycleEngine.js';
 import { loadPeriodStore, savePeriodStore, startCycle, endCycle, sanitizeCycles } from '$lib/period/periodStore.js';
	import { fetchPeriodDataFromSupabase, syncAllCyclesToSupabase, deleteCycleFromSupabase, syncDailyLogToSupabase, syncSettingsToSupabase } from '$lib/period/periodSync.js';

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

 // Period Core Store state (v2 with local dates & cycle history)
 let cycles = $state([]);
 let logs = $state({});
 let settings = $state({ cycleLength: 28, periodDuration: 5 });

 // Selected date on the stepper strip (local YYYY-MM-DD)
 let selectedDateStr = $state(todayISO());

 // Modal Date Picker & History State
 let isDatePickerOpen = $state(false);
 let isHistoryModalOpen = $state(false);
 let modalStartDate = $state('');

 // Daily log state for active selected date
 let selectedFlow = $state('medium'); // 'light' | 'medium' | 'heavy' | null
 let selectedSymptoms = $state(['cramps']); // list of IDs: 'fine' | 'cramps' | 'acne' | 'headache' | 'nausea' | 'backache'
 let selectedMood = $state('calm'); // 'calm' | 'happy' | 'sad' | 'energetic' | 'frisky'
 let loggedWeight = $state(48.5); // kg
 let loggedSleep = $state('7h 45m');
 let saveToast = $state('');
 let partnerAlertToast = $state('');

 // Hydration Tracker & Self-Care Modal (Recommendation 3)
 let isWaterModalOpen = $state(false);
 let loggedWaterCups = $state(4); // default 4 glasses (1000ml)

 // Daily Health Journal Modal (Recommendation 2 ala Clue & Apple Health)
 let isJournalModalOpen = $state(false);
  let isLoggingPeriod = $state(false);
 let loggedNote = $state('');
 let loggedTags = $state([]);
 let loggedTemp = $state(36.6);

	// Boyfriend Care Box (Generate on-demand mechanism)
	let isBfCareBoxVisible = $state(false);
	let isGeneratingBf = $state(false);

	function handleGenerateBfBox() {
		isGeneratingBf = true;
		setTimeout(() => {
			isGeneratingBf = false;
			isBfCareBoxVisible = true;
			showToast("Catatan perhatian untuk Arsyad siap dilihat!");
		}, 300);
	}

	// Daily Summary & Solution Box (Generate on-demand mechanism)
	let isSummaryBoxVisible = $state(false);
	let isGeneratingSummary = $state(false);

	function handleGenerateSummary() {
		isGeneratingSummary = true;
		setTimeout(() => {
			isGeneratingSummary = false;
			isSummaryBoxVisible = true;
			showToast("Rangkuman & solusi tubuh berhasil dibuat!");
		}, 300);
	}

 // Symptoms list matching the reference image squircle layout
	const SYMPTOMS = [
		{ id: 'fine', label: "I'm fine", type: 'thumbs', color: '#10B981' },
		{ id: 'cramps', label: 'Cramps', type: 'cramps', color: '#EF4444' },
		{ id: 'acne', label: 'Acne', type: 'acne', color: '#6366F1' },
		{ id: 'headache', label: 'Headache', type: 'headache', color: '#0EA5E9' },
		{ id: 'nausea', label: 'Diarrhea', type: 'stomach', color: '#F59E0B' },
		{ id: 'backache', label: 'Backache', type: 'backache', color: '#EC4899' }
	];

 // Moods list matching the reference image squircle layout
 const MOODS = [
 { id: 'calm', label: 'Calm', type: 'lotus', color: '#F59E0B' },
 { id: 'happy', label: 'Happy', type: 'smile', color: '#10B981' },
 { id: 'sad', label: 'Sad', type: 'frown', color: '#3B82F6' },
 { id: 'energetic', label: 'Energetic', type: 'energetic', color: '#F97316' },
 { id: 'frisky', label: 'Frisky', type: 'frisky', color: '#8B5CF6' }
 ];

 // Menstrual Flow options matching reference
 const FLOW_LEVELS = [
 { id: 'light', label: 'Light', desc: 'Ringan', type: 'tissue' },
 { id: 'medium', label: 'Medium', desc: 'Sedang', type: 'medium' },
 { id: 'heavy', label: 'Heavy', desc: 'Deras', type: 'heavy' }
 ];

 // 4 Cycle Phases
 const PHASES_INFO = [
 {
 id: 'menstruation',
 name: 'Fase Menstruasi',
 days: 'Hari 1 - 5',
 icon: '',
 badgeColor: '#FFE4E6',
 textColor: '#BE123C',
 description: 'Hormon estrogen & progesteron rendah. Dinding rahim meluruh.',
 tips: 'Istirahat cukup, minum air hangat, gunakan kompres hangat jika kram.',
 food: 'Sup hangat, sayuran hijau, kurma, dan dark chocolate.'
 },
 {
 id: 'follicular',
 name: 'Fase Folikuler',
 days: 'Hari 6 - 13',
 icon: '',
 badgeColor: '#DCFCE7',
 textColor: '#15803D',
 description: 'Estrogen mulai meningkat. Tubuh mempersiapkan sel telur matang.',
 tips: 'Energi dan fokus sedang tinggi! Waktu terbaik untuk belajar dan produktif.',
 food: 'Alpukat, sayuran hijau, kacang-kacangan, dan protein tinggi.'
 },
 {
 id: 'ovulation',
 name: 'Fase Ovulasi',
 days: 'Hari 14 - 16',
 icon: '',
 badgeColor: '#FEF3C7',
 textColor: '#B45309',
 description: 'Sel telur dilepaskan ke rahim. Masa paling subur dalam satu siklus.',
 tips: 'Mood dan rasa percaya diri sedang di puncak! Suhu basal tubuh sedikit naik.',
 food: 'Buah beri, salmon, sayuran segar, dan banyak minum air putih.'
 },
 {
 id: 'luteal',
 name: 'Fase Luteal (PMS)',
 days: 'Hari 17 - 28',
 icon: '',
 badgeColor: '#F3E8FF',
 textColor: '#7E22CE',
 description: 'Hormon progesteron dominan. Jika tidak dibuahi, korpus luteum menyusut, kadar hormon turun, dan tubuh kembali masuk ke fase menstruasi.',
 tips: 'Fase rawan mood swing, kembung, dan ngidam makanan manis. Luangkan waktu santai.',
 food: 'Camilan manis secukupnya, teh chamomile, dan pisang.'
 }
 ];

 // Header date text (e.g. "19 Oktober 2026")
 let headerDateText = $derived.by(() => {
 return formatDateIndo(selectedDateStr, 'medium');
 });

 // Cycle statistics and predictions based on recorded cycles
 let stats = $derived.by(() => computeStats(cycles, settings));
 let prediction = $derived.by(() => predictCycle(cycles, stats, todayISO()));
 let currentDayStatus = $derived.by(() => getDayStatus(selectedDateStr, cycles, stats, todayISO()));

 // Latest cycle reference
 let latestCycle = $derived.by(() => {
 if (!cycles || cycles.length === 0) return null;
 const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
 return sorted[sorted.length - 1];
 });

	// Cycle History Formatter & Card List (Exact Replica of Reference Design)
	function formatCycleDate(iso) {
		if (!iso) return "Jan 23";
		const d = parseISO(iso);
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return `${months[d.getMonth()]} ${d.getDate()}`;
	}

	let displayCycleHistory = $derived.by(() => {
		const list = [];
		const sortedCycles = [...cycles].sort((a, b) => b.start.localeCompare(a.start));

		sortedCycles.forEach((c, idx) => {
			const isCurrent = idx === 0;
			let cDay = 13;
			if (isCurrent) {
				cDay = Math.max(1, diffDays(c.start, todayISO()) + 1);
			} else {
				cDay = c.end ? Math.max(1, diffDays(c.start, c.end) + 1) : settings.cycleLength;
			}

			const phaseName = isCurrent
				? (currentDayStatus.phaseEnglish || "Ovulation Phase")
				: "Ovulation Phase";

			list.push({
				id: c.id,
				isCurrent,
				dayNum: cDay,
				phaseName,
				dateFormatted: formatCycleDate(c.start),
				nextPeriodDays: prediction.daysUntilNext || 0
			});
		});

		return list.slice(0, 3);
	});

 // Period Status proxy for template compatibility with dial & cards
 let periodStatus = $derived.by(() => {
 const daySt = currentDayStatus;
 const rad = (daySt.knobAngle * Math.PI) / 180;
 const knobX = Math.round((55 + 43 * Math.cos(rad)) * 10) / 10;
 const knobY = Math.round((55 + 43 * Math.sin(rad)) * 10) / 10;

 return {
 label: daySt.label,
 dayText: daySt.dayText,
 cDay: daySt.cDay,
 knobX,
 knobY,
 knobFill: daySt.knobFill,
 knobStroke: daySt.knobStroke,
 phaseEnglish: daySt.phaseEnglish,
 charBody: daySt.charBody,
 charContour: daySt.charContour,
 charHighlight: daySt.charHighlight,
 isPeriod: daySt.isPeriod,
 isPredictedPeriod: daySt.isPredictedPeriod,
 isFertile: daySt.isFertile,
 isOvulation: daySt.isOvulation,
 lateDays: daySt.lateDays,
 phase: daySt.phase,
		phaseName: daySt.phaseName
		};
	});

	// Current Phase Index for Stepper (0: Menstruasi, 1: Folikuler, 2: Ovulasi, 3: Luteal/PMS)
	let currentPhaseIndex = $derived.by(() => {
		if (periodStatus.isPeriod) return 0;
		const p = periodStatus.phase;
		if (p === 'menstruation') return 0;
		if (p === 'follicular') return 1;
		if (p === 'ovulation' || periodStatus.isOvulation) return 2;
		if (p === 'luteal' || p === 'pms' || p === 'late') return 3;
		return 0;
	});

 // 7-Day Stepper Strip (Centered on selectedDateStr, with local dates, real history & prediction indicators)
	let weekStrip = $derived.by(() => {
		const rawList = [];
		const base = selectedDateStr;
		const today = todayISO();

		for (let i = -3; i <= 3; i++) {
			const iso = addDays(base, i);
			const daySt = getDayStatus(iso, cycles, stats, today);
			const isToday = iso === today;
			const isSelected = iso === selectedDateStr;
			const hasLog = !!logs[iso] && (logs[iso].flow || logs[iso].mood || (logs[iso].symptoms && logs[iso].symptoms.length > 0));

			const d = parseISO(iso);
			const dayIndex = d.getDay(); // 0 = Sunday
			const letter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIndex];
			const dayNum = d.getDate();
			const dayNumFormatted = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;

			rawList.push({
				iso,
				dayNum,
				dayNumFormatted,
				topLabel: isToday ? 'Today' : letter,
				isToday,
				isSelected,
				isPeriodDay: daySt.isPeriod || daySt.isPredictedPeriod,
				isPredicted: daySt.isPredictedPeriod,
				isFertile: daySt.isFertile,
				isOvulation: daySt.isOvulation,
				hasLog,
				phase: daySt.phase
			});
		}

		return rawList;
	});
 // Dynamic analysis derived from Flow, Mood, and Symptoms
 let dailyAnalysisResult = $derived.by(() => {
 // 1. Flow analysis
 let flowTitle = 'Aliran Normal';
 let flowTip = 'Ganti pembalut teratur setiap 3-4 jam untuk menjaga higienitas.';
 if (selectedFlow === 'light') {
 flowTitle = 'Darah Ringan (Light)';
 flowTip = 'Darah masih sedikit atau mendekati tuntas. Gunakan pantyliner atau pembalut tipis.';
 } else if (selectedFlow === 'medium') {
 flowTitle = 'Darah Sedang (Medium)';
 flowTip = 'Aliran rata-rata haid normal. Cukupi minum air putih hangat(hehe) dan hindari dehidrasi.';
 } else if (selectedFlow === 'heavy') {
 flowTitle = 'Darah Deras (Heavy)';
 flowTip = 'Aliran sedang deras! Gunakan pembalut panjang/sayap dan hindari aktivitas fisik terlalu berat.';
 }

 // 2. Mood analysis
 let moodTitle = 'Tenang & Santai';
 let moodAdvice = 'Pikiran sedang rileks. Waktu yang baik untuk istirahat atau me-time.';
 let bfMoodNote = 'Mood Winda lagi tenang dan rileks. Temani dia ngobrol santai tanpa bikin stres ya';
 if (selectedMood === 'calm') {
 moodTitle = 'Hati Tenang (Calm)';
 moodAdvice = 'Pikiran sedang damai. Nikmati waktu santai dan rileks.';
 bfMoodNote = 'Mood Winda lagi santai dan tenang. Temani dia dengan suasana santai ya';
 } else if (selectedMood === 'happy') {
 moodTitle = 'Ceria & Happy';
 moodAdvice = 'Energi positif sedang tinggi! Manfaatkan untuk hal-hal yang menyenangkan.';
 bfMoodNote = 'Winda lagi senang dan bahagia hari ini! Apresiasi senyumannya dan dukung kegiatannya.';
 } else if (selectedMood === 'sad') {
 moodTitle = 'Lagi Melow & Sensitif (Sad)';
 moodAdvice = 'Hormon sedang fluktuatif. Sangat wajar merasa emosional atau baper. Luangkan waktu santai.';
 bfMoodNote = 'Winda lagi melow & sensitif. Jangan didebat, dengarkan ceritanya dan kasih semangat.';
 } else if (selectedMood === 'energetic') {
 moodTitle = 'Penuh Energi (Energetic)';
 moodAdvice = 'Tubuh terasa fit! Waktu terbaik untuk produktif dan beraktivitas.';
 bfMoodNote = 'Winda lagi berenergi hari ini! Siap diajak produktif ';
 } else if (selectedMood === 'frisky') {
 moodTitle = 'Lagi Manja (Frisky)';
 moodAdvice = 'Lagi butuh perhatian dan kasih sayang lebih.';
 bfMoodNote = 'Winda lagi pengen banget dimanja sama kamu, Kasih perhatian ekstra dan kata-kata manis ya';
 }

 // 3. Symptoms analysis
 const syms = selectedSymptoms;
 let symptomTips = [];
 let bfSymptomAlert = [];

 if (syms.includes('fine')) {
 symptomTips.push('Tubuh terasa nyaman tanpa keluhan mengganggu. Tetap jaga stamina!');
 bfSymptomAlert.push('Badan Winda terasa nyaman hari ini tanpa keluhan kram.');
 }
 if (syms.includes('cramps')) {
 symptomTips.push('Kompres perut bagian bawah dengan air hangat, minum teh hangat, dan rebahan dengan posisi miring.');
 bfSymptomAlert.push('Perut Winda lagi kram (nyeri haid). Siapkan kompres hangat atau ingatkan dia jangan kecapean');
 }
 if (syms.includes('acne')) {
 symptomTips.push('Hormon progesteron memicu sebum di kulit. Hindari sering menyentuh wajah dan perbanyak minum air putih.');
 bfSymptomAlert.push('Winda lagi merasa kurang pede dengan kulitnya. Berikan pujian tulus bahwa dia tetap cantik!');
 }
 if (syms.includes('headache')) {
 symptomTips.push('Kurangi paparan layar ponsel sejenak, pijat pelipis perlahan, dan minum air hangat untuk meredakan sakit kepala.');
 bfSymptomAlert.push('Kepala Winda lagi pusing/migrain. Redupkan cahaya dan jangan ajak ngobrol terlalu bising.');
 }
 if (syms.includes('nausea')) {
 symptomTips.push('Konsumsi sup hangat porsi kecil, hindari makanan pedas, santan kental, atau berlemak yang memicu mual/begah.');
 bfSymptomAlert.push('Perut Winda lagi mual/kembung. Belikan camilan sehat atau sup hangat ya.');
 }
 if (syms.includes('backache')) {
 symptomTips.push('Berbaring dengan bantal kecil di bawah lutut untuk meredakan ketegangan otot pinggang.');
 bfSymptomAlert.push('Pinggang Winda lagi pegal-pegal. Bantu pijat punggung perlahan kalau dia mau.');
 }

 return {
 flowTitle,
 flowTip,
 moodTitle,
 moodAdvice,
 bfMoodNote,
 symptomTips,
 bfSymptomAlert: bfSymptomAlert.join(' ')
 };
 });

 onMount(() => {
		const store = loadPeriodStore();
		cycles = sanitizeCycles(store.cycles);
		logs = store.logs;
		settings = store.settings;
		loadLogForDate(selectedDateStr);

		// Silent background sync with Supabase
		syncWithSupabase();
	});

	async function syncWithSupabase() {
		try {
			const remote = await fetchPeriodDataFromSupabase();
			if (!remote) return;

			let needsSave = false;

			if (Array.isArray(remote.cycles)) {
				const validCycles = remote.cycles.filter(c => c.id !== 'cycle_init_1');
				cycles = sanitizeCycles(validCycles);
				needsSave = true;
			} else if (cycles.length > 0) {
				// If Supabase table is fresh/empty, sync initial local cycles up
				syncAllCyclesToSupabase(cycles);
			}

			if (remote.logs && Object.keys(remote.logs).length > 0) {
				logs = { ...logs, ...remote.logs };
				loadLogForDate(selectedDateStr);
				needsSave = true;
			}

			if (remote.settings && remote.settings.cycleLength) {
				settings = remote.settings;
				needsSave = true;
			}

			if (needsSave) {
				savePeriodStore({ version: 2, settings, cycles, logs });
			}
		} catch (err) {
			console.warn('Background Supabase sync notice:', err);
		}
	}

 function loadLogForDate(iso) {
 const entry = logs[iso];
 if (entry) {
 selectedFlow = entry.flow || 'medium';
 selectedMood = entry.mood || 'calm';
 selectedSymptoms = entry.symptoms || ['fine'];
 if (entry.weight !== undefined) loggedWeight = entry.weight;
 if (entry.sleep) loggedSleep = entry.sleep;
 loggedWaterCups = entry.water !== undefined ? entry.water : 4;
 loggedNote = entry.note || '';
 loggedTags = entry.tags || [];
 loggedTemp = entry.temp !== undefined ? entry.temp : 36.6;
 } else {
 const daySt = getDayStatus(iso, cycles, stats, todayISO());
 selectedFlow = daySt.isPeriod ? 'medium' : null;
 selectedMood = 'calm';
 selectedSymptoms = daySt.isPeriod ? ['cramps'] : ['fine'];
 loggedWaterCups = 4;
 loggedNote = '';
 loggedTags = [];
 loggedTemp = 36.6;
 }
 }

 function saveTrackerData(silent = false) {
		const updatedEntry = {
			flow: selectedFlow,
			mood: selectedMood,
			symptoms: selectedSymptoms,
			weight: loggedWeight,
			sleep: loggedSleep,
			water: loggedWaterCups,
			note: loggedNote,
			tags: loggedTags,
			temp: loggedTemp,
			updatedAt: new Date().toISOString()
		};

		logs = {
			...logs,
			[selectedDateStr]: updatedEntry
		};
		savePeriodStore({ version: 2, settings, cycles, logs });

		// Silent background sync to Supabase
		syncDailyLogToSupabase(selectedDateStr, updatedEntry);

		if (!silent) {
			showToast("Data tersimpan rapi!");
		}
	}


 function addWaterCup(amount = 1) {
 loggedWaterCups = Math.min(12, Math.max(0, loggedWaterCups + amount));
 saveTrackerData(true);
 }

 function setWaterCups(cups) {
 loggedWaterCups = Math.min(12, Math.max(0, cups));
 saveTrackerData(true);
 }

 function openDatePicker() {
  modalStartDate = latestCycle ? latestCycle.start : todayISO();
  isDatePickerOpen = true;
 }

 function startPeriodToday() {
		cycles = startCycle(cycles, todayISO());
		selectedDateStr = todayISO();
		loadLogForDate(todayISO());
		savePeriodStore({ version: 2, settings, cycles, logs });
		syncAllCyclesToSupabase(cycles);
		showToast("Haid baru dimulai hari ini (Day 1)!");
	}


 function handleSaveDatePicker() {
		if (modalStartDate) {
			cycles = startCycle(cycles, modalStartDate);
			selectedDateStr = modalStartDate;
			loadLogForDate(modalStartDate);
			syncAllCyclesToSupabase(cycles);
		}
		isDatePickerOpen = false;
		savePeriodStore({ version: 2, settings, cycles, logs });
		showToast("Tanggal mulai haid berhasil dicatat!");
	}

 function selectDate(iso) {
 selectedDateStr = iso;
 loadLogForDate(iso);
 }

 function toggleSymptom(id) {
 if (id === 'fine') {
 selectedSymptoms = ['fine'];
 saveTrackerData(true);
 return;
 }
 let list = selectedSymptoms.filter(s => s !== 'fine');
 if (list.includes(id)) {
 list = list.filter(s => s !== id);
 } else {
 list = [...list, id];
 }
 selectedSymptoms = list.length > 0 ? list : ['fine'];
 saveTrackerData(true);
 }

 function selectFlowLevel(flowId) {
 selectedFlow = flowId;
 saveTrackerData(true);
 }

 function selectMoodLevel(moodId) {
 selectedMood = moodId;
 saveTrackerData(true);
 }

 function deleteCycleEntry(cycleId) {
		cycles = cycles.filter(c => c.id !== cycleId);
		savePeriodStore({ version: 2, settings, cycles, logs });
		deleteCycleFromSupabase(cycleId);
		showToast("Siklus berhasil dihapus");
	}

 function sendPartnerTreat(type) {
 partnerAlertToast = `Notifikasi "${type}" telah dicatat untuk Maggie`;
 setTimeout(() => {
 partnerAlertToast = '';
 }, 3200);
 }

 function showToast(msg) {
 saveToast = msg;
 setTimeout(() => {
 saveToast = '';
 }, 2800);
 }

 function handleBack() {
 if (onBack) {
 onBack();
 } else {
 window.location.hash = '#/';
 }
 }
</script>

<div class="period-app-viewport">
 <!-- ── 1. PINK HERO CANVAS (EXACT REPLICA OF REFERENCE IMAGE) ── -->
 <header class="pink-hero-canvas">
 <!-- Top Nav Row: Superman Mascot, Date Center, Calendar Picker Button -->
 <div class="hero-top-nav-row">
				<!-- Left: User Profile (Sama persis dengan Header Utama) -->
				<div class="user-profile">
					<div class="avatar-circle">
						<svg viewBox="0 0 40 40" width="40" height="40" class="avatar-svg">
							<circle cx="20" cy="20" r="19" fill="#FEA0A0" />
							<path d="M12 38 C12 30, 28 30, 28 38" fill="#FFFFFF" stroke="#111" stroke-width="1.2" />
							<path d="M17 30 L20 34 L23 30" fill="none" stroke="#111" stroke-width="1.2" />
							<path d="M11 18 C10 28, 9 34, 13 36 C14 30, 14 26, 14 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
							<path d="M29 18 C30 28, 31 34, 27 36 C26 30, 26 26, 26 24" fill="#5A2E17" stroke="#111" stroke-width="1" />
							<ellipse cx="20" cy="20" rx="6.5" ry="7.5" fill="#FFE5D1" stroke="#111" stroke-width="1.2" />
							<path d="M13 18 C14 13, 26 13, 27 18 C25 15, 23 16, 20 16 C17 16, 15 15, 13 18 Z" fill="#5A2E17" stroke="#111" stroke-width="1.2" />
							<circle cx="17.8" cy="19.5" r="0.9" fill="#111" />
							<circle cx="22.2" cy="19.5" r="0.9" fill="#111" />
							<path d="M18.8 23 C19.5 24, 20.5 24, 21.2 23" fill="none" stroke="#111" stroke-width="1" stroke-linecap="round" />
						</svg>
					</div>
					<span class="greeting-text">Hiiii, {couple.her || 'Winda'}</span>
				</div>

				<!-- Center: Formatted Date (5 Oktober 2026) -->

				<h2 class="hero-center-date">{headerDateText}</h2>

				<!-- Right: Header Right Actions (Mini Music Disc & Tombol Back) -->
				<div class="hero-right-tools">
					{#if hasTrack}
						<button
							type="button"
							class="hero-round-btn"
							onclick={togglePlayPause}
							aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
							title={isPlaying ? `Memutar lagu ${currentTitle}` : 'Musik dijeda'}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
						</button>
					{/if}

					<!-- Tombol Back -->
					<button
						type="button"
						class="hero-round-btn back-btn"
						onclick={handleBack}
						title="Kembali ke Beranda"
						aria-label="Kembali ke Beranda"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
							<line x1="19" y1="12" x2="5" y2="12"></line>
							<polyline points="12 19 5 12 12 5"></polyline>
						</svg>
					</button>
				</div>
			</div>

		<!-- ── 2. STEP TANGGAL HORIZONTAL (STEPPER STRIP MATCHING REFERENCE) ── -->
		<div class="date-stepper-strip" role="group" aria-label="Step tanggal mingguan">
			{#each weekStrip as day}
				<button
					type="button"
					class="stepper-col-btn"
					class:is-active-step={day.isSelected}
					class:is-today-step={day.isToday}
					class:is-period-step={day.isPeriodDay}
					onclick={() => selectDate(day.iso)}
				>
					{#if day.isToday}
						<span class="today-accent-dot"></span>
					{/if}
					<!-- Top Label (S, M, T, W, T, F, S / Today) -->
					<span class="step-day-label" class:is-today-lbl={day.isToday}>
						{day.topLabel}
					</span>

					<!-- Bottom Day Number 2 digits (06, 07, 08, 09, 10) -->
					<span class="step-day-number" class:is-today-num={day.isToday}>
						{day.dayNumFormatted}
					</span>
				</button>
			{/each}
		</div>

 <!-- ── 3. HERO PERIOD STATUS & "EDIT PERIOD DATES" BUTTON ── -->
 <div class="hero-period-display">
 <span class="period-sub-label">{periodStatus.label}</span>
 <h1 class="period-big-day">{periodStatus.dayText}</h1>

 <!-- Edit Period Dates Button -->
 <div class="hero-actions-pill-row">
 <button type="button" class="btn-edit-period-dates" onclick={openDatePicker}>
 <span>Edit Date</span>
 </button>
 </div>
 </div>

 <!-- Soft Organic Wave Curves in Background -->
 <div class="hero-soft-wave"></div>
 </header>

 <!-- ── 4. WHITE CARD BOTTOM SECTION ── -->
 <main class="insights-sheet-container">
 <!-- Greeting & Action Cards (Matches Right Screen in Reference) -->
 <div class="greeting-banner-card">
 <div class="greet-titles">
 <span class="greet-sub">Hey Winda, How's your feeling today? </span>
 <!-- <h3 class="greet-main">How are you feeling today?</h3> -->
 </div>
 <div class="greet-square-grid">
 <!-- Box Square Kiri: Hydration Tracker (Water & Self-Care Counter, 1 layer) -->
 <button
 type="button"
 class="simple-feature-box box-water"
 onclick={() => isWaterModalOpen = true}
 title="Klik untuk lihat detail hidrasi harian"
 >
 <div class="water-dial-wrap">
 <svg class="water-dial-svg" viewBox="0 0 110 110" width="124" height="124">
 <!-- Background Ring -->
 <circle
 cx="55"
 cy="55"
 r="43"
 fill="none"
 stroke="#E0F2FE"
 stroke-width="5.5"
 />
 <!-- Dynamic Water Progress Arc (Cyan / Sky Blue) -->
 <circle
 cx="55"
 cy="55"
 r="43"
 fill="none"
 stroke="#38BDF8"
 stroke-width="5.5"
 stroke-linecap="round"
 stroke-dasharray="270"
 stroke-dashoffset={270 - (270 * Math.min(loggedWaterCups / 8, 1))}
 transform="rotate(-90 55 55)"
 class="water-progress-ring"
 />
 <!-- Water Droplet Minimal SVG Icon in Center -->
 <path
 d="M 55 24 C 55 24 43 40 43 49 C 43 56 48.4 61 55 61 C 61.6 61 67 56 67 49 C 67 40 55 24 55 24 Z"
 fill="#0284C7"
 opacity="0.9"
 />
 <!-- Inner Water Wave / Drop Highlight -->
 <circle cx="58" cy="46" r="2.5" fill="#BAE6FD" />

 <!-- Counter Display Under Droplet -->
 <text x="55" y="76" text-anchor="middle" class="water-card-count">
 {loggedWaterCups}/8 Gelas
 </text>
 <text x="55" y="87" text-anchor="middle" class="water-card-pct">
 {Math.round((loggedWaterCups / 8) * 100)}%
 </text>
 </svg>
 </div>
 <span class="simple-box-label">Hydration Tracker</span>
 </button>

 <!-- Box Square Kanan: Tracker Hari Siklus / Daily Health Journal -->
 <button
 type="button"
 class="simple-feature-box box-tracker"
 onclick={() => { isJournalModalOpen = true; isLoggingPeriod = false; }}
 title="Klik untuk buka catatan kesehatan pribadi"
 >
 <div class="cycle-dial-wrap">
 <svg class="cycle-dial-svg" viewBox="0 0 110 110" width="124" height="124">
 <defs>
 <!-- Clip path ensuring the mascot stays 100% inside the circle without sharp corners -->
 <clipPath id="dial-mascot-clip">
 <circle cx="55" cy="55" r="40.5" />
 </clipPath>
 <!-- Pastel Sun Gradient matching reference -->
 <linearGradient id="mascot-sun-grad" x1="0%" y1="0%" x2="0%" y2="100%">
 <stop offset="0%" stop-color="#FEF08A" />
 <stop offset="100%" stop-color="#FACC15" />
 </linearGradient>
 <!-- Shadow filter for the pointer knob -->
 <filter id="knob-shadow" x="-50%" y="-50%" width="200%" height="200%">
 <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.25" />
 </filter>
 </defs>

 <!-- 4-Segment Colored Cycle Wheel (Smoothly curved, rich vibrant pastel) -->
 <!-- 1. Menstruation Arc (Top-Left: Pink) -->
 <path
 d="M 17.8 33.5 A 43 43 0 0 1 55 12"
 fill="none"
 stroke="#FDA4AF"
 stroke-width="5"
 stroke-linecap="round"
 />
 <!-- 2. Follicular / Ovulation Arc (Top-Right: Soft Pastel Butter) -->
 <path
 d="M 61 12.4 A 43 43 0 0 1 95.4 69.7"
 fill="none"
 stroke="#FDE68A"
 stroke-width="5"
 stroke-linecap="round"
 />
 <!-- 3. Luteal Arc (Bottom-Right: Soft Pastel Baby Blue) -->
 <path
 d="M 93 75.2 A 43 43 0 0 1 33.5 92.2"
 fill="none"
 stroke="#BAE6FD"
 stroke-width="5"
 stroke-linecap="round"
 />
 <!-- 4. Pre-Menstrual Arc (Bottom-Left: Soft Pastel Mint) -->
 <path
 d="M 28.5 88.9 A 43 43 0 0 1 15.1 38.9"
 fill="none"
 stroke="#BBF7D0"
 stroke-width="5"
 stroke-linecap="round"
 />

 <!-- Mascot in Center-Bottom: Simple cute face matching reference (2 dots + 1 smile, dynamic phase colors) -->
 <g clip-path="url(#dial-mascot-clip)">
 <!-- Mascot Round Dome Body (Dynamic phase color: pink, yellow, blue, or mint green) -->
 <circle cx="55" cy="77" r="37" fill={periodStatus.charBody || '#FFDE59'} class="transition-colors duration-500" />
 <!-- Subtle warm/phase contour layer for depth -->
 <ellipse cx="63" cy="73" rx="31" ry="29" fill={periodStatus.charContour || '#F59E0B'} opacity="0.45" class="transition-colors duration-500" />
 <circle cx="53" cy="78" r="35" fill={periodStatus.charHighlight || '#FFE86B'} class="transition-colors duration-500" />

 <!-- 2 Eyes: Clean solid black dots (Enlarged to match crop) -->
 <circle cx="41" cy="60" r="3.4" fill="#1E293B" />
 <circle cx="69" cy="64" r="3.4" fill="#1E293B" />

 <!-- 1 Mouth: Clean friendly curved smile (Enlarged and bold) -->
 <path
 d="M 46 72 Q 55 80 64 72"
 stroke="#1E293B"
 stroke-width="3.5"
 stroke-linecap="round"
 fill="none"
 />
 </g>

 <!-- Day & Phase Texts in Upper Center -->
 <text x="55" y="33" text-anchor="middle" class="dial-day-text">
 {periodStatus.dayText}
 </text>
 <text x="55" y="43" text-anchor="middle" class="dial-phase-text">
 {periodStatus.phaseEnglish}
 </text>

 <!-- Active Day Indicator Knob on the Wheel -->
 <circle
 cx={periodStatus.knobX || 80}
 cy={periodStatus.knobY || 20}
 r="6.5"
 fill={periodStatus.knobFill || '#FEF08A'}
 stroke={periodStatus.knobStroke || '#F59E0B'}
 stroke-width="2.8"
 filter="url(#knob-shadow)"
 />
 </svg>
 </div>
 <span class="simple-box-label">Cycle Tracker</span>
 </button>
 </div>
 </div>

 <!-- ── A. MENSTRUAL FLOW (MATCHES REFERENCE SQUIRCLE ROW) ── -->
 <section class="log-feature-block">
 <div class="block-head-wrap">
 <h3 class="block-main-title">Menstrual Flow</h3>
 <p class="block-sub-title">Estimate your average daily flow</p>
 </div>

 <div class="squircle-grid-row flow-3col">
 {#each FLOW_LEVELS as flow}
 <div class="squircle-item-col">
 <button
 type="button"
 class="squircle-card-btn"
 class:is-active-flow={selectedFlow === flow.id}
 onclick={() => selectFlowLevel(flow.id)}
 aria-label={flow.label}
 >
 {#if flow.type === 'tissue'}
 <!-- Light Flow (Sanitary / Clean Pad SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <rect x="6" y="4" width="12" height="16" rx="3"></rect>
 <circle cx="12" cy="9" r="2"></circle>
 <line x1="6" y1="14" x2="18" y2="14"></line>
 </svg>
 {:else if flow.type === 'medium'}
 <!-- Medium Flow (Droplet SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M12 3c-4 5-6 8-6 11a6 6 0 0 0 12 0c0-3-2-6-6-11z"></path>
 <circle cx="12" cy="14" r="2"></circle>
 </svg>
 {:else}
 <!-- Heavy Flow (Full Flow Cup SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M5 8h14v5a7 7 0 0 1-14 0V8z"></path>
 <path d="M9 4l1.5 3M15 4l-1.5 3M12 3v4"></path>
 </svg>
 {/if}
 </button>
 <span class="squircle-label">{flow.label}</span>
					</div>
				{/each}
			</div>
		</section>

 <!-- ── B. MINI HEALTH WIDGETS (CHART & SLEEP - MATCHES REFERENCE) ── -->
 

 <!-- ── C. MOOD SECTION (MATCHES REFERENCE SQUIRCLE ROW) ── -->
 <section class="log-feature-block">
 <div class="block-head-wrap">
 <h3 class="block-main-title">Mood</h3>
 </div>

 <div class="squircle-scroll-row">
 {#each MOODS as m}
 <div class="squircle-item-col">
 <button
 type="button"
 class="squircle-card-btn"
 class:is-active-mood={selectedMood === m.id}
 style="--active-theme-color: {m.color}"
 onclick={() => selectMoodLevel(m.id)}
 aria-label={m.label}
 >
 {#if m.type === 'lotus'}
 <!-- Calm (Lotus flower SVG - gold in reference) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M12 4c-1.5 3-3 6.5-3 9.5a3 3 0 0 0 6 0c0-3-1.5-6.5-3-9.5z"></path>
 <path d="M12 13.5c-2.5-2-5.5-3-8.5-2 1.5 4 4.5 6 8.5 6"></path>
 <path d="M12 13.5c2.5-2 5.5-3 8.5-2-1.5 4-4.5 6-8.5 6"></path>
 <path d="M7 19.5c2-1 3.5-1 5-1s3 0 5 1"></path>
 </svg>
 {:else if m.type === 'smile'}
 <!-- Happy (Smile Face SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="12" r="9"></circle>
 <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
 <line x1="9" y1="9" x2="9.01" y2="9" stroke-width="2.5"></line>
 <line x1="15" y1="9" x2="15.01" y2="9" stroke-width="2.5"></line>
 </svg>
 {:else if m.type === 'frown'}
 <!-- Sad (Frown Face SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="12" r="9"></circle>
 <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
 <line x1="9" y1="10" x2="9.01" y2="10" stroke-width="2.5"></line>
 <line x1="15" y1="10" x2="15.01" y2="10" stroke-width="2.5"></line>
 </svg>
 {:else if m.type === 'energetic'}
 <!-- Energetic (Joyful Grin Face SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="12" r="9"></circle>
 <path d="M7 9.5l3-1-3-1"></path>
 <path d="M17 9.5l-3-1 3-1"></path>
 <path d="M8 14.5c1 1.5 2.5 2 4 2s3-.5 4-2"></path>
 </svg>
 {:else}
 <!-- Frisky (Winking Blush Love SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="12" r="9"></circle>
 <path d="M14 9l2 1-2 1"></path>
 <line x1="9" y1="10" x2="9.01" y2="10" stroke-width="2.5"></line>
 <path d="M8 15c1 1 2.5 1.5 4 1.5s3-.5 4-1.5"></path>
 <circle cx="7" cy="13" r="1.3" fill="currentColor"></circle>
 <circle cx="17" cy="13" r="1.3" fill="currentColor"></circle>
 </svg>
 {/if}
 </button>
 <span class="squircle-label">{m.label}</span>
 </div>
 {/each}
 </div>
 </section>

 <!-- ── D. SYMPTOMS SECTION (MATCHES REFERENCE SQUIRCLE ROW) ── -->
 <section class="log-feature-block">
 <div class="block-head-wrap">
 <h3 class="block-main-title">Symptoms</h3>
 </div>

 <div class="squircle-scroll-row">
 {#each SYMPTOMS as sym}
 <div class="squircle-item-col">
 <button
 type="button"
 class="squircle-card-btn"
 class:is-active-sym={selectedSymptoms.includes(sym.id)}
 style="--active-theme-color: {sym.color}"
 onclick={() => toggleSymptom(sym.id)}
 aria-label={sym.label}
 >
 {#if sym.type === 'thumbs'}
 <!-- I'm fine (Thumbs up SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M7 10v12"></path>
 <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3"></path>
 </svg>
 {:else if sym.type === 'cramps'}
 <!-- Cramps (Pain / Wince Face SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="12" r="9"></circle>
 <path d="M8 9l2 1-2 1"></path>
 <path d="M16 9l-2 1 2 1"></path>
 <path d="M9 16c1-1 2-1 3-1s2 0 3 1"></path>
 </svg>
 {:else if sym.type === 'acne'}
 <!-- Acne (Skin spots & sparkles SVG - Purple in reference) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <rect x="4" y="6" width="16" height="12" rx="4"></rect>
 <circle cx="8" cy="10" r="1.3" fill="currentColor"></circle>
 <circle cx="15" cy="14" r="1.5" fill="currentColor"></circle>
 <circle cx="16" cy="9" r="1.1" fill="currentColor"></circle>
 <path d="M12 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"></path>
 </svg>
 {:else if sym.type === 'headache'}
 <!-- Headache (Brain / Waves SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M9.5 4a3.5 3.5 0 0 0-3.5 3.5v.5a3.5 3.5 0 0 0-1 6.8V17a3 3 0 0 0 3 3h4"></path>
 <path d="M14.5 4a3.5 3.5 0 0 1 3.5 3.5v.5a3.5 3.5 0 0 1 1 6.8V17a3 3 0 0 1-3 3h-4"></path>
 <line x1="12" y1="4" x2="12" y2="20"></line>
 </svg>
 {:else if sym.type === 'stomach'}
 <!-- Diarrhea / Stomach SVG -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <path d="M12 4c-3 0-5 2-5 5v3c0 4 2 8 5 8s5-4 5-8V9c0-3-2-5-5-5z"></path>
 <path d="M9 11c1.5 1 4.5 1 6 0"></path>
 </svg>
 {:else}
 <!-- Backache (Spine SVG) -->
 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="12" cy="5" r="1.5"></circle>
 <circle cx="12" cy="9.5" r="1.5"></circle>
 <circle cx="12" cy="14" r="1.5"></circle>
 <circle cx="12" cy="18.5" r="1.5"></circle>
 <path d="M7 9.5h10M6 14h12"></path>
 </svg>
 {/if}
 </button>
 <span class="squircle-label">{sym.label}</span>
 </div>
 {/each}
 </div>
 </section>

				<!-- ── E. HASIL ANALISIS DARI FLOW, MOOD & GEJALA (GENERATE ON-DEMAND) ── -->
				{#if !isSummaryBoxVisible}
					<div class="drs-generate-card">
						<div class="drs-generate-left">
							<h4 class="drs-generate-title">Rangkuman & Solusi Tubuh Winda</h4>
							<p class="drs-generate-desc">Saya akan analisis kondisi tubuhmu sesuai dari pilihan Flow, Mood, dan Symptoms di atas. Saran medis dari MaggieGPT, dan tips perawatan hari ini.</p>
						</div>
						<button
							type="button"
							class="btn-generate-drs"
							onclick={handleGenerateSummary}
							disabled={isGeneratingSummary}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
							</svg>
							<span>{isGeneratingSummary ? "Loading..." : "Generate"}</span>
						</button>
					</div>
				{:else}
					<section class="daily-result-summary-card animated-slide-down">
						<div class="drs-head">
							<div class="drs-title-wrap">
								<h3 class="drs-title">Rangkuman & Solusi Tubuh Winda</h3>
							</div>
							<button type="button" class="btn-close-drs-box" onclick={() => isSummaryBoxVisible = false} title="Sembunyikan">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>

						<!-- Tag Pilihan yang Aktif -->
						<div class="drs-chips-row">
							<span class="drs-chip flow-chip">{dailyAnalysisResult.flowTitle}</span>
							<span class="drs-chip mood-chip">{dailyAnalysisResult.moodTitle}</span>
							{#each selectedSymptoms as symId}
								{@const sItem = SYMPTOMS.find(s => s.id === symId)}
								{#if sItem}
									<span class="drs-chip sym-chip" style="--chip-color: {sItem.color}">
										{sItem.label}
									</span>
								{/if}
							{/each}
						</div>

						<!-- Solusi Medis & Tips Nyata -->
						<div class="drs-advice-box">
							<h4 class="drs-advice-head">Solusi & Saran Perawatan Tubuh:</h4>
							<ul class="drs-advice-list">
								<li><strong>Aliran Darah:</strong> {dailyAnalysisResult.flowTip}</li>
								<li><strong>Kondisi Mood:</strong> {dailyAnalysisResult.moodAdvice}</li>
								{#each dailyAnalysisResult.symptomTips as tip}
									<li><strong>Tips Gejala:</strong> {tip}</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}

				<!-- ── F. BOYFRIEND CARE BOX (GENERATE ON-DEMAND) ── -->
				<!-- {#if !isBfCareBoxVisible}
					<div class="bf-generate-card">
						<div class="bf-generate-left">
							
							<h4 class="bf-generate-title">Catatan perhatian untuk Winda</h4>
							<p class="bf-generate-desc">Generate ringkasan otomatis kondisi tubuh Winda hari ini dan kirim ke siapapun</p>
						</div>
						<button
							type="button"
							class="btn-generate-bf"
							onclick={handleGenerateBfBox}
							disabled={isGeneratingBf}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
							</svg>
							<span>{isGeneratingBf ? "Loading..." : "Generate"}</span>
						</button>
					</div>
				{:else}
					<section class="boyfriend-care-box animated-slide-down">
						<div class="bf-head">
							<span class="bf-tag">Catatan (DIPERBARUI DARI KONDISI WINDA)</span>
							<button type="button" class="btn-close-bf-box" onclick={() => isBfCareBoxVisible = false} title="Sembunyikan">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
						<h3 class="bf-care-title">
							{periodStatus.isPeriod ? "Sedang Haid" : "Kondisi Tubuh Winda Hari Ini"}
						</h3>
						<p class="bf-care-text">
							{dailyAnalysisResult.bfMoodNote} {dailyAnalysisResult.bfSymptomAlert}
						</p>

			
						
					</section>
				{/if} -->

 <!-- ── LATE PERIOD GENTLE ALERT (TAMPIL HANYA JIKA TELAT HAID) ── -->
 {#if periodStatus.phase === 'late'}
 <section class="late-period-alert-card">
 <div class="late-alert-header">
 <span class="late-alert-badge">STATUS SIKLUS</span>
 <h3 class="late-alert-title">Telat Haid {periodStatus.lateDays} Hari</h3>
 </div>
 <p class="late-alert-message">
 Jangan cemas ya Winda. Siklus alami tubuh wajar bergeser beberapa hari karena stres, kelelahan, fluktuasi hormon, atau perubahan pola tidur. Tetap jaga istirahat, penuhi cairan tubuh, dan pantau kondisi secara berkala.
 </p>
 <div class="late-alert-actions">
 <button type="button" class="btn-late-start-today" onclick={startPeriodToday}>
 <span>Haid Dimulai Hari Ini</span>
 </button>
 </div>
 </section>
 {/if}

		<!-- ── CYCLE HISTORY SECTION (EXACT REPLICA OF REFERENCE DESIGN) ── -->
		<section class="cycle-history-section">
			<div class="cycle-history-header">
				<div class="ch-header-left">
					<h3 class="ch-section-title">Cycle History</h3>
				</div>
				<div class="ch-header-right">
					<span class="ch-status-pill">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						<span>{stats.isIrregular ? "Bervariasi" : "Normal"}</span>
					</span>
					<button type="button" class="btn-ch-see-all" onclick={() => isHistoryModalOpen = true}>
						See All
					</button>
				</div>
			</div>

			<div class="cycle-history-list">
				{#if displayCycleHistory.length === 0}
					<div class="ch-empty-card">
						<p class="ch-empty-text">Belum ada riwayat siklus yang dicatat.<br/>Klik <strong>Edit Date</strong> untuk mulai mencatat siklus pertamamu.</p>
					</div>
				{:else}
					{#each displayCycleHistory as item}
					<button
						type="button"
						class="cycle-history-card"
						onclick={() => isHistoryModalOpen = true}
					>
						<!-- Left: Stylized Hot-Pink Uterus Icon & Info -->
						<div class="ch-card-left">
							<div class="ch-icon-bubble">
								<svg viewBox="0 0 32 32" width="24" height="24" fill="none" stroke="#F43F5E" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
									<path d="M16 26 C12.5 22.5 11 18 11 14.5 C11 11.5 13 9.5 16 9.5 C19 9.5 21 11.5 21 14.5 C21 18 19.5 22.5 16 26 Z" />
									<path d="M12 12.5 C9 12.5 6 10.5 6 7.5 C6 5.5 8 5.5 9.5 7 C10.5 8 11.5 10 12.5 11" />
									<path d="M20 12.5 C23 12.5 26 10.5 26 7.5 C26 5.5 24 5.5 22.5 7 C21.5 8 20.5 10 19.5 11" />
								</svg>
							</div>
							<div class="ch-info">
								<h4 class="ch-day-title">Day {item.dayNum}</h4>
								<span class="ch-phase-subtitle">{item.phaseName}</span>
								{#if item.isCurrent && item.nextPeriodDays > 0}
									<div class="ch-next-badge">
										<span class="ch-check-dot">
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										</span>
										<span>Next period in {item.nextPeriodDays}d</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Right: Date & Chevron -->
						<div class="ch-card-right">
							<span class="ch-date-text">{item.dateFormatted}</span>
							<svg class="ch-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="9 18 15 12 9 6"></polyline>
							</svg>
						</div>
					</button>
				{/each}
				{/if}
			</div>
		</section>

 <!-- ── F. DAILY INSIGHTS ANCHOR & 4 PHASES ── -->
 <div id="daily-insights-section"></div>
 <section class="phases-overview-section">
			<div class="phases-header-row">
				<h3 class="phases-main-title">4 Fase Siklus Tubuh</h3>
				<span class="phases-sub-badge">Tahapan Siklus</span>
			</div>

			<div class="phases-stepper-wrap">
				{#each PHASES_INFO as phase, idx}
					{@const isCompleted = idx < currentPhaseIndex}
					{@const isActive = idx === currentPhaseIndex}
					{@const isUpcoming = idx > currentPhaseIndex}
					{@const isLast = idx === PHASES_INFO.length - 1}

					<div
						class="phase-step-item"
						class:is-completed={isCompleted}
						class:is-active={isActive}
						class:is-upcoming={isUpcoming}
					>
						<!-- Left: Stepper Node (Circle & Vertical Connecting Line) -->
						<div class="step-node-col">
							<div
								class="step-node-circle"
								class:is-completed={isCompleted}
								class:is-active={isActive}
								class:is-upcoming={isUpcoming}
							>
								{#if isCompleted}
									<!-- Green Solid Circle with Crisp White Checkmark -->
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12"></polyline>
									</svg>
								{:else if isActive}
									<!-- Active Highlight with 4-square Grid Icon matching reference -->
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
										<rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
										<rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
										<rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
										<rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
									</svg>
								{:else}
									<!-- Upcoming Outline Circle with Step Number -->
									<span class="upcoming-step-num">{idx + 1}</span>
								{/if}
							</div>

							{#if !isLast}
								<!-- Vertical Connecting Line -->
								<div
									class="step-connector-line"
									class:is-completed={isCompleted}
									class:is-pending={!isCompleted}
								></div>
							{/if}
						</div>

						<!-- Right: Step Content (Labels, Title, Description, Tips) -->
						<div class="step-content-col">
							<div class="step-tag-row">
								<span class="step-num-tag">STEP {idx + 1} • {phase.days}</span>
								{#if isActive}
									<!-- <span class="step-active-pill">Sedang Berlangsung</span> -->
								{:else if isCompleted}
									<span class="step-done-pill">Selesai</span>
								{/if}
							</div>

							<h4 class="step-phase-title">{phase.name}</h4>
							<p class="step-phase-desc">{phase.description}</p>

							{#if isActive}
								<!-- Active Phase Highlight Box with Tips & Food -->
								<!-- <div class="step-active-tip-card">
									<div class="tip-card-row">
										<span class="tip-card-label">Saran Perawatan:</span>
										<p class="tip-card-text">{phase.tips}</p>
									</div>
									<div class="tip-card-row">
										<span class="tip-card-label">Nutrisi Dianjurkan:</span>
										<p class="tip-card-text">{phase.food}</p>
									</div>
								</div> -->
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

 </main>

 <!-- ── 5. DATE PICKER POP-UP MODAL (FITUR TAMBAH/EDIT DATA HAID) ── -->
 {#if isDatePickerOpen}
 <div
 class="picker-modal-backdrop"
 role="dialog"
 aria-modal="true"
 tabindex="-1"
 onclick={(e) => { if (e.target === e.currentTarget) isDatePickerOpen = false; }}
 onkeydown={(e) => { if (e.key === 'Escape') isDatePickerOpen = false; }}
 >
 <div class="picker-modal-card">
 <div class="picker-card-head">
 <div class="picker-head-left">
 <span class="picker-head-badge"> SET DATA HAID</span>
 <h3 class="picker-card-title">Atur Tanggal Menstruasi</h3>
 </div>
 <button
 type="button"
 class="picker-close-btn"
 onclick={() => isDatePickerOpen = false}
 aria-label="Tutup modal"
 >
 ✕
 </button>
 </div>

 <form class="picker-form" onsubmit={(e) => { e.preventDefault(); handleSaveDatePicker(); }}>
 <!-- Tanggal Mulai Haid Picker -->
 <div class="picker-field">
 <label for="picker-start-date" class="field-label">
 Hari Pertama Haid (Start Date) 
 </label>
 <input
 id="picker-start-date"
 type="date"
 class="date-input-box"
 bind:value={modalStartDate}
 required
 />
 <!-- Quick Date Shortcut Chips -->
 <div class="quick-date-chips">
 <button
 type="button"
 class="q-chip"
 onclick={() => modalStartDate = todayISO()}
 >
 Hari Ini
 </button>
 <button
 type="button"
 class="q-chip"
 onclick={() => modalStartDate = addDays(todayISO(), -1)}
 >
 Kemarin
 </button>
 <button
 type="button"
 class="q-chip"
 onclick={() => modalStartDate = addDays(todayISO(), -2)}
 >
 2 Hari Lalu
 </button>
 </div>
 </div>

 <!-- Submit Button -->
 <div class="picker-actions">
 <button
 type="button"
 class="btn-cancel-picker"
 onclick={() => isDatePickerOpen = false}
 >
 Batal
 </button>
 <button type="submit" class="btn-submit-picker">
 Simpan Tanggal 
 </button>
 </div>
 </form>
 </div>
 </div>
 {/if}

 <!-- ── WATER INTAKE & HYDRATION DETAIL MODAL ── -->
 {#if isWaterModalOpen}
 <div class="picker-modal-backdrop" onclick={() => isWaterModalOpen = false} role="presentation">
 <div
 class="modal-card water-modal-card"
 onclick={(e) => e.stopPropagation()}
 onkeydown={(e) => e.stopPropagation()}
 role="dialog"
 tabindex="-1"
 aria-modal="true"
 >
 <!-- Top Mascot with Superman Lottie animation (as specifically requested in detail!) -->
 <div class="water-modal-mascot-wrap">
 <div class="water-mascot-bubble">
 <iframe
 src="https://lottie.host/embed/998700b9-dfb1-4162-9ff6-6c15abd529f1/5v2R0Pwh8g.lottie"
 title="Superman Mascot"
 class="water-modal-lottie-frame"
 loading="lazy"
 ></iframe>
 </div>
 <button
 type="button"
 class="picker-close-btn"
 onclick={() => isWaterModalOpen = false}
 aria-label="Tutup Modal"
 >✕</button>
 </div>

 <div class="water-head-texts">
 <h2 class="water-modal-title">Daily Hydration Tracker</h2>
 <p class="water-modal-subtitle">
 Cukupi cairan tubuh setiap hari untuk memulihkan stamina coy
 </p>
 </div>

 <!-- Big Metric Banner -->
 <div class="water-stat-banner">
 <div class="water-stat-big">
 <span class="water-stat-num">{loggedWaterCups}</span>
 <span class="water-stat-denom">/ 8 Gelas</span>
 </div>
 <div class="water-stat-vol">
 <strong>{loggedWaterCups * 250} ml</strong> dari target 2.000 ml
 </div>
 <!-- Progress Bar -->
 <div class="water-prog-bar-track">
 <div
 class="water-prog-bar-fill"
 style="width: {Math.min(100, Math.round((loggedWaterCups / 8) * 100))}%"
 ></div>
 </div>
 </div>

 <!-- Interactive 8 Glasses Row -->
 <div class="water-glasses-row">
 {#each Array(8) as _, i}
 <button
 type="button"
 class="water-cup-btn"
 class:is-filled={i < loggedWaterCups}
 onclick={() => setWaterCups(i + 1)}
 title={`Gelas ke-${i + 1}`}
 >
 <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
 <path
 d="M5 4L7.5 20C7.7 20.6 8.3 21 9 21H15C15.7 21 16.3 20.6 16.5 20L19 4H5Z"
 fill={i < loggedWaterCups ? '#38BDF8' : '#F1F5F9'}
 stroke={i < loggedWaterCups ? '#0284C7' : '#CBD5E1'}
 stroke-width="1.8"
 stroke-linejoin="round"
 />
 {#if i < loggedWaterCups}
 <path d="M7 9C8 8.5 10 9.5 12 9C14 8.5 16 9.5 17 9" stroke="#E0F2FE" stroke-width="1.5" stroke-linecap="round" />
 {/if}
 </svg>
 <span class="cup-label">{i + 1}</span>
 </button>
 {/each}
 </div>

 <!-- Stepper Buttons (+1, -1) -->
 <div class="water-stepper-actions">
 <button
 type="button"
 class="btn-water-minus"
 onclick={() => addWaterCup(-1)}
 disabled={loggedWaterCups <= 0}
 >
 - 1 Gelas
 </button>
 <button
 type="button"
 class="btn-water-plus"
 onclick={() => addWaterCup(1)}
 >
 + 1 Gelas (250 ml)
 </button>
 </div>

 <!-- Health Note / Tip -->
 <!-- <div class="water-tip-box">
 <h4 class="water-tip-head">Tips Kesehatan & Siklus:</h4>
 <p class="water-tip-text">
 Minum air putih hangat membantu merelaksasi otot rahim yang tegang dan memperlancar aliran sirkulasi darah saat fase menstruasi.
 </p>
 </div> -->

 <!-- Close / Save Action -->
 <button
 type="button"
 class="btn-save-water"
 onclick={() => {
 saveTrackerData();
 isWaterModalOpen = false;
 }}
 >
 Simpan Catatan Hidrasi
 </button>
 </div>
 </div>
 {/if}

 <!-- ── DAILY HEALTH JOURNAL / CATATAN PRIBADI MODAL (RECOMMENDATION 2) ── -->
  {#if isJournalModalOpen}
    <div class="picker-modal-backdrop" onclick={() => isJournalModalOpen = false} role="presentation">
      <div
        class="modal-card journal-modal-card"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="-1"
        aria-modal="true"
      >
        <!-- Top Bar: Clean date indicator & close button -->
        <div class="journal-top-bar">
          <div class="journal-date-pill">
            <span class="journal-date-dot"></span>
            <span class="journal-date-text">{headerDateText}</span>
          </div>
          <button
            type="button"
            class="picker-close-btn"
            onclick={() => isJournalModalOpen = false}
            aria-label="Tutup"
          >✕</button>
        </div>

        <!-- Center: Large Donut Dial & Mascot (Pastel Tones Matching Reference Image) -->
        <div class="journal-big-donut-stage">
          <svg class="journal-big-donut-svg" viewBox="0 0 110 110" width="224" height="224">
            <defs>
              <clipPath id="big-modal-mascot-clip">
                <circle cx="55" cy="55" r="40.5" />
              </clipPath>
              <filter id="big-knob-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.18" />
              </filter>
            </defs>

            <!-- Background Track Circle -->
            <circle cx="55" cy="55" r="43" fill="none" stroke="#F1F5F9" stroke-width="5" />

            <!-- 4-Segment Colored Cycle Wheel (Soft Pastel Tones) -->
            <!-- 1. Menstruation Arc (Top-Left: Soft Pastel Pink) -->
            <path d="M 17.8 33.5 A 43 43 0 0 1 55 12" fill="none" stroke="#FDA4AF" stroke-width="5" stroke-linecap="round" />
            <!-- 2. Follicular / Ovulation Arc (Top-Right: Soft Pastel Butter) -->
            <path d="M 61 12.4 A 43 43 0 0 1 95.4 69.7" fill="none" stroke="#FDE68A" stroke-width="5" stroke-linecap="round" />
            <!-- 3. Luteal Arc (Bottom-Right: Soft Pastel Baby Blue) -->
            <path d="M 93 75.2 A 43 43 0 0 1 33.5 92.2" fill="none" stroke="#BAE6FD" stroke-width="5" stroke-linecap="round" />
            <!-- 4. Pre-Menstrual Arc (Bottom-Left: Soft Pastel Mint) -->
            <path d="M 28.5 88.9 A 43 43 0 0 1 15.1 38.9" fill="none" stroke="#BBF7D0" stroke-width="5" stroke-linecap="round" />

            <!-- Center Mascot: Cute dome body with 2 clean dot eyes and friendly smile (Soft Pastel) -->
            <g clip-path="url(#big-modal-mascot-clip)">
              <circle cx="55" cy="77" r="37" fill={periodStatus.charBody || '#BBF7D0'} />
              <ellipse cx="63" cy="73" rx="31" ry="29" fill={periodStatus.charContour || '#86EFAC'} opacity="0.4" />
              <circle cx="53" cy="78" r="35" fill={periodStatus.charHighlight || '#DCFCE7'} />

              <!-- 2 Eyes: Clean solid black dots -->
              <circle cx="41" cy="60" r="3.4" fill="#1E293B" />
              <circle cx="69" cy="64" r="3.4" fill="#1E293B" />

              <!-- 1 Mouth: Clean friendly curved smile -->
              <path d="M 46 72 Q 55 80 64 72" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round" fill="none" />
            </g>

            <!-- Day & Phase Texts in Upper Center (Large, Crisp, Bold) -->
            <text x="55" y="32" text-anchor="middle" class="big-dial-day-text">
              {periodStatus.dayText}
            </text>
            <text x="55" y="42" text-anchor="middle" class="big-dial-phase-text">
              {periodStatus.phaseEnglish}
            </text>

            <!-- Knob Indicator (Pastel & Subtle) -->
            <circle
              cx={periodStatus.knobX || 80}
              cy={periodStatus.knobY || 20}
              r="6"
              fill={periodStatus.knobFill || '#FEF08A'}
              stroke={periodStatus.knobStroke || '#FDE68A'}
              stroke-width="2.5"
              filter="url(#big-knob-shadow)"
            />
          </svg>
        </div>

        <!-- Legend (4 Phases: Period, Follicular, Ovulasi, PMS) -->
        <div class="journal-legend-row">
          <div class="legend-chip">
            <span class="legend-color-dot dot-period"></span>
            <span class="legend-chip-label">Period</span>
          </div>
          <div class="legend-chip">
            <span class="legend-color-dot dot-follicular"></span>
            <span class="legend-chip-label">Follicular</span>
          </div>
          <div class="legend-chip">
            <span class="legend-color-dot dot-ovulation"></span>
            <span class="legend-chip-label">Ovulasi</span>
          </div>
          <div class="legend-chip">
            <span class="legend-color-dot dot-pms"></span>
            <span class="legend-chip-label">PMS</span>
          </div>
        </div>

        <!-- Pill Button: Log Period + (Trigger pertama yang memunculkan input catatan) -->
        {#if !isLoggingPeriod}
          <div class="journal-log-btn-wrap">
            <button
              type="button"
              class="journal-log-pill-btn"
              onclick={() => isLoggingPeriod = true}
            >
              <span>{loggedNote && loggedNote.trim().length > 0 ? 'Edit Catatan Hari Ini' : 'Log Period'}</span>
              <span class="pill-plus-symbol">+</span>
            </button>
          </div>
        {/if}

        <!-- Status Cards: Catatan Hari Ini (Muncul saat Log Period diklik) & Next Period -->
        <div class="journal-status-cards-col">
          <!-- Card 1: Input Catatan Hari Ini (Muncul saat tombol Log Period ditekan) -->
          {#if isLoggingPeriod}
            <div class="journal-info-card note-card is-editing-note">
              <div class="info-card-header-row">
                <div class="info-card-left">
                  <div class="info-card-icon-bubble">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </div>
                  <span class="info-card-label">Catatan Hari Ini</span>
                </div>
                <button
                  type="button"
                  class="btn-close-note-edit"
                  onclick={() => isLoggingPeriod = false}
                  aria-label="Tutup input catatan"
                >✕</button>
              </div>

              <div class="info-note-input-wrap">
                <textarea
                  class="journal-inline-note-input"
                  rows="3"
                  placeholder="Tulis kondisi tubuh, mood, atau perasaan hari ini..."
                  bind:value={loggedNote}
                ></textarea>
              </div>

              <div class="note-action-row">
                <button
                  type="button"
                  class="btn-save-note"
                  onclick={() => {
                    saveTrackerData();
                    isLoggingPeriod = false;
                    showToast("Catatan hari ini berhasil disimpan!");
                  }}
                >
                  Save Catatan
                </button>
              </div>
            </div>
          {:else if loggedNote && loggedNote.trim().length > 0}
            <!-- Card 1 Preview: Jika sudah tersimpan, tampilkan cuplikan catatan -->
            <div class="journal-info-card note-card is-saved-preview">
              <div class="info-card-header-row">
                <div class="info-card-left">
                  <div class="info-card-icon-bubble">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </div>
                  <span class="info-card-label">Catatan Hari Ini</span>
                </div>
                <button
                  type="button"
                  class="btn-edit-note-link"
                  onclick={() => isLoggingPeriod = true}
                >
                  Edit
                </button>
              </div>
              <p class="saved-note-text">{loggedNote}</p>
            </div>
          {/if}

          <!-- Card 2: Next expected Period starts -->
          <div class="journal-info-card">
            <div class="info-card-left">
              <div class="info-card-icon-bubble">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <span class="info-card-label">Next expected Period starts</span>
            </div>
            <span class="info-card-val">
              {formatDateIndo(prediction.nextPeriodStart, 'short')}
            </span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── CYCLE HISTORY MODAL (RIWAYAT SIKLUS) ── -->
 {#if isHistoryModalOpen}
 <div class="picker-modal-backdrop" onclick={() => isHistoryModalOpen = false} role="presentation">
 <div class="history-modal-card" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-modal="true">
 <div class="history-modal-header">
 <div>

 <h3 class="picker-card-title">Riwayat Siklus Haid</h3>
 </div>
 <button type="button" class="picker-close-btn" onclick={() => isHistoryModalOpen = false} aria-label="Tutup modal">✕</button>
 </div>

 <div class="history-modal-body">
 <div class="history-stats-banner">
 <div>
 <span class="h-stat-lbl">Rata-rata Siklus</span>
 <strong class="h-stat-val">{stats.avgCycleLength} Hari</strong>
 </div>
 <div>
 <span class="h-stat-lbl">Lama Haid Rata-rata</span>
 <strong class="h-stat-val">{stats.avgPeriodDuration} Hari</strong>
 </div>
 <div>
 <span class="h-stat-lbl">Total Tercatat</span>
 <strong class="h-stat-val">{stats.cycleCount} Kali</strong>
 </div>
 </div>

					<div class="history-list-wrap">
						{#if cycles.length === 0}
							<p class="history-empty-text">Belum ada riwayat siklus yang tercatat.</p>
						{:else}
							{#each [...cycles].reverse() as c, idx}
								{@const isLatest = idx === 0}
								{@const dur = c.end ? diffDays(c.start, c.end) + 1 : "Sedang Berlangsung"}
								{@const cDay = isLatest ? Math.max(1, diffDays(c.start, todayISO()) + 1) : (c.end ? diffDays(c.start, c.end) + 1 : 28)}
								<div class="history-item-row-card">
									<div class="ch-card-left">
										<div class="ch-icon-bubble">
											<svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="#F43F5E" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
												<path d="M16 26 C12.5 22.5 11 18 11 14.5 C11 11.5 13 9.5 16 9.5 C19 9.5 21 11.5 21 14.5 C21 18 19.5 22.5 16 26 Z" />
												<path d="M12 12.5 C9 12.5 6 10.5 6 7.5 C6 5.5 8 5.5 9.5 7 C10.5 8 11.5 10 12.5 11" />
												<path d="M20 12.5 C23 12.5 26 10.5 26 7.5 C26 5.5 24 5.5 22.5 7 C21.5 8 20.5 10 19.5 11" />
											</svg>
										</div>
										<div class="ch-info">
											<div class="m-cycle-title-row">
												<h4 class="ch-day-title">Day {cDay}</h4>
												{#if !c.end}
													<span class="h-ongoing-pill">Aktif</span>
												{/if}
											</div>
											<span class="ch-phase-subtitle">{isLatest ? (currentDayStatus.phaseName || "Fase Ovulasi") : "Siklus Selesai"}</span>
											<span class="m-dates-sub">{formatDateIndo(c.start, "short")} - {c.end ? formatDateIndo(c.end, "short") : "Sekarang"}</span>
										</div>
									</div>
									<div class="m-actions-right">
										<span class="ch-date-text">{formatCycleDate(c.start)}</span>
										<button type="button" class="btn-delete-cycle" onclick={() => deleteCycleEntry(c.id)} title="Hapus catatan ini">✕</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
 <div class="history-modal-footer">
 <button type="button" class="btn-close-history-full" onclick={() => isHistoryModalOpen = false}>
 Tutup Riwayat
 </button>
 </div>
 </div>
 </div>
 {/if}

 <!-- Toast Notification Popups -->
 {#if saveToast}
 <div class="toast-bubble">
 <span>{saveToast}</span>
 </div>
 {/if}

 {#if partnerAlertToast}
 <div class="toast-bubble partner-bubble">
 <span>{partnerAlertToast}</span>
 </div>
 {/if}
</div>

<style>
 .period-app-viewport {
 width: 100%;
 max-width: 100%;
 min-height: 100dvh;
 display: flex;
 flex-direction: column;
 box-sizing: border-box;
 background-color: #FFFFFF;
 font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
 animation: fadeInView 0.22s ease-out;
 position: relative;
 overflow-x: hidden;
 }

 @keyframes fadeInView {
 from { opacity: 0; }
 to { opacity: 1; }
 }

 /* ── 1. PINK HERO CANVAS (EXACT GRADIENT & SHAPES MATCHING REFERENCE) ── */
 .pink-hero-canvas {
 width: 100%;
		background: linear-gradient(180deg, #fcd2d9 0%, #FCDAE0 55%, #fde2e7 100%);
 padding: max(var(--sp-4), var(--sat)) 18px 46px;
 box-sizing: border-box;
 position: relative;
 overflow: hidden;
 color: #111827;
 }

 .hero-soft-wave {
 position: absolute;
 bottom: -30px;
 left: -20px;
 right: -20px;
 height: 80px;
 border-radius: 50% 50% 0 0;
 background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
 pointer-events: none;
 }

 /* Top Nav Row */
 .hero-top-nav-row {
 display: flex;
 align-items: center;
 justify-content: space-between;
 margin-bottom: 22px;
 position: relative;
 z-index: 5;
 }

 .user-profile {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		justify-content: flex-start;
	}

	.hero-center-date {
		font-size: 1.05rem;
		font-weight: 800;
		color: #111827;
		margin: 0;
		letter-spacing: -0.01em;
		text-transform: capitalize;
		text-align: center;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.avatar-circle {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #FEA0A0;
		border: 2px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}

	.avatar-svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.greeting-text {
		font-size: 0.88rem;
		font-weight: 700;
		color: #111827;
	}

	.hero-right-tools {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		justify-content: flex-end;
	}

	@media (max-width: 410px) {
		.greeting-text {
			display: none;
		}
	}

	.hero-round-btn {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		border: 1.5px solid rgba(255, 255, 255, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease;
		flex-shrink: 0;
	}

	.hero-round-btn:hover {
		transform: scale(1.08);
		background: #FFFFFF;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
	}

	.hero-round-btn:active {
		transform: scale(0.95);
	}

	/* ── 2. STEP TANGGAL HORIZONTAL (STEPPER STRIP MATCHING REFERENCE) ── */
	.date-stepper-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 6px;
		margin-bottom: 26px;
		position: relative;
		z-index: 5;
		padding: 6px 0 10px;
		box-sizing: border-box;
	}

	.stepper-col-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		flex: 1;
		max-width: 48px;
		height: 64px;
		border-radius: 16px;
		background: transparent;
		border: 1.5px solid transparent;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		position: relative;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
		padding: 4px 2px;
		box-sizing: border-box;
	}

	.stepper-col-btn:hover {
		transform: translateY(-2px);
	}

	.stepper-col-btn:active {
		transform: translateY(1px);
	}

	.step-day-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: #64748B;
		letter-spacing: 0.02em;
		line-height: 1.2;
		transition: color 0.15s ease;
	}

	.step-day-number {
		font-size: 1.05rem;
		font-weight: 800;
		color: #0F172A;
		line-height: 1.1;
		letter-spacing: -0.01em;
		transition: color 0.15s ease;
	}

	/* Period Day: Rounded pill with soft dashed pink border */
	.stepper-col-btn.is-period-step {
		border: 1.5px dashed #F492A8;
		background: rgba(255, 255, 255, 0.22);
	}

	/* Today or Selected Day: Solid soft coral-pink pill with 3D bottom bevel */
	.stepper-col-btn.is-today-step,
	.stepper-col-btn.is-active-step {
		background: #FF859B;
		border: 1.5px solid transparent;
		box-shadow: 0 4px 0 #E0607A;
		transform: translateY(-2px);
	}

	.stepper-col-btn.is-today-step:active,
	.stepper-col-btn.is-active-step:active {
		transform: translateY(1px);
		box-shadow: 0 1px 0 #E0607A;
	}

	.stepper-col-btn.is-today-step .step-day-label,
	.stepper-col-btn.is-active-step .step-day-label {
		color: #1E293B;
		font-weight: 700;
		font-size: 0.70rem;
	}

	.stepper-col-btn.is-today-step .step-day-number,
	.stepper-col-btn.is-active-step .step-day-number {
		color: #0F172A;
		font-weight: 900;
		font-size: 1.1rem;
	}

	/* Cute Accent Dot on Top-Right of Today pill */
	.today-accent-dot {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #FF758F;
		border: 2px solid #FCDAE0;
		box-shadow: 0 1px 3px rgba(224, 96, 122, 0.4);
		pointer-events: none;
	}

 /* ── 3. HERO PERIOD DISPLAY ── */
 .hero-period-display {
 display: flex;
 flex-direction: column;
 align-items: center;
 text-align: center;
 position: relative;
 z-index: 5;
 padding-bottom: 8px;
 }

 .period-sub-label {
 font-size: 1.15rem;
 font-weight: 700;
 color: #1F2937;
 margin-bottom: 2px;
 }

 .period-big-day {
 font-size: 2.85rem;
 font-weight: 900;
 color: #111827;
 letter-spacing: -0.03em;
 margin: 0 0 16px;
 line-height: 1;
 }

 .hero-actions-pill-row {
 display: flex;
 align-items: center;
 gap: 8px;
 flex-wrap: wrap;
 justify-content: center;
 }

 .btn-edit-period-dates {
 background: #FFFFFF;
 color: #BE123C;
 border: none;
 border-radius: 999px;
 padding: 10px 20px;
 font-size: 0.84rem;
 font-weight: 800;
 cursor: pointer;
 box-shadow: 0 4px 16px rgba(136, 19, 55, 0.15);
 transition: transform 0.18s ease, box-shadow 0.18s ease;
 -webkit-tap-highlight-color: transparent;
 }

 .btn-edit-period-dates:hover {
 transform: translateY(-2px);
 box-shadow: 0 6px 20px rgba(136, 19, 55, 0.22);
 }

 .btn-edit-period-dates:active {
 transform: scale(0.96);
 }

 /* ── 4. WHITE CARD BOTTOM SHEET ── */
 .insights-sheet-container {
 background: #FFFFFF;
 border-radius: 32px 32px 0 0;
 margin-top: -24px;
 position: relative;
 z-index: 10;
 padding: 24px 18px 30px;
 box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.05);
 display: flex;
 flex-direction: column;
 gap: 22px;
 box-sizing: border-box;
 }

 /* Greeting Banner (Right Screen) */
 .greeting-banner-card {
 background: #F9FAFB;
 border: 1.5px solid #F3F4F6;
 border-radius: 24px;
 padding: 18px 16px;
 display: flex;
 flex-direction: column;
 gap: 14px;
 }

 .greet-titles {
 display: flex;
 flex-direction: column;
 gap: 2px;
 }

 .greet-sub {
 font-size: 0.8rem;
 font-weight: 800;
 color: #E11D48;
 }

 /* ── GREETING SQUARE GRID (KANAN KIRI) ── */
 .greet-square-grid {
 display: grid;
 grid-template-columns: repeat(2, 1fr);
 gap: 12px;
 width: 100%;
 box-sizing: border-box;
 }

 .simple-feature-box {
 background: #FFFFFF;
 border-radius: 24px;
 padding: 8px 6px 14px;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: space-between;
 min-height: 175px;
 text-align: center;
 cursor: pointer;
 box-sizing: border-box;
 transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
 -webkit-tap-highlight-color: transparent;
 position: relative;
 border: 1.5px solid #F3F4F6;
 }

 .simple-feature-box:hover {
 transform: translateY(-3px);
 }

 .simple-feature-box:active {
 transform: scale(0.97);
 }

 .simple-feature-box.box-tracker {
 background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF5 100%);
 box-shadow: 0 4px 14px rgba(245, 158, 11, 0.06);
 }

 .simple-feature-box.box-tracker:hover {
 border-color: #FDE047;
 box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
 }

 /* Cycle Dial Tracker (Matches Reference Image) */
 .cycle-dial-wrap {
 width: 100%;
 height: 122px;
 display: flex;
 align-items: center;
 justify-content: center;
 position: relative;
 }

 .cycle-dial-svg {
 display: block;
 overflow: visible;
 transition: transform 0.2s ease;
 }

 .simple-feature-box:hover .cycle-dial-svg {
 transform: scale(1.04);
 }

 .dial-day-text {
 font-size: 13.5px;
 font-weight: 900;
 fill: #0F172A;
 font-family: inherit;
 }

 .dial-phase-text {
 font-size: 7.2px;
 font-weight: 700;
 fill: #64748B;
 font-family: inherit;
 letter-spacing: -0.01em;
 }


 /* Single Simple Label Underneath */
 .simple-box-label {
 font-size: 0.94rem;
 font-weight: 800;
 color: #111827;
 line-height: 1.3;
 text-align: center;
 letter-spacing: -0.015em;
 margin: 0;
 }

 /* Log Feature Block */
 .log-feature-block {
 display: flex;
 flex-direction: column;
 gap: 12px;
 }

 .block-head-wrap {
 display: flex;
 flex-direction: column;
 gap: 2px;
 }

 .block-main-title {
 font-size: 1.05rem;
 font-weight: 800;
 color: #111827;
 margin: 0;
 }

 .block-sub-title {
 font-size: 0.76rem;
 color: #9CA3AF;
 margin: 0;
 }

 /* Squircle Grids & Rows (Matching reference image) */
 .squircle-grid-row {
 display: grid;
 gap: 12px;
 padding: 6px 4px 8px;
 }

 .flow-3col {
 grid-template-columns: repeat(3, 1fr);
 }

 .squircle-scroll-row {
 display: flex;
 gap: 12px;
 overflow-x: auto;
 padding: 8px 18px 12px;
 margin: 0 -18px;
 scrollbar-width: none;
 -webkit-overflow-scrolling: touch;
 }

 .squircle-scroll-row::-webkit-scrollbar {
 display: none;
 }

 .squircle-item-col {
 display: flex;
 flex-direction: column;
 align-items: center;
 gap: 6px;
 flex-shrink: 0;
 }

 .squircle-card-btn {
 width: 60px;
 height: 60px;
 border-radius: 18px;
 background: #FFFFFF;
 border: 1.5px solid #E5E7EB;
 color: #9CA3AF;
 display: flex;
 align-items: center;
 justify-content: center;
 cursor: pointer;
 box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
 transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
 -webkit-tap-highlight-color: transparent;
 flex-shrink: 0;
 }

 .squircle-card-btn:hover {
 transform: translateY(-2px);
 border-color: #D1D5DB;
 }

 /* Flow active state */
 .squircle-card-btn.is-active-flow {
 background: #E11D48;
 border-color: #E11D48;
 color: #FFFFFF;
 box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);
 transform: translateY(-2px) scale(1.04);
 }

 /* Mood active state */
 .squircle-card-btn.is-active-mood {
 background: var(--active-theme-color, #F59E0B);
 border-color: var(--active-theme-color, #F59E0B);
 color: #FFFFFF;
 box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
 transform: translateY(-2px) scale(1.04);
 }

 /* Symptoms active state */
 .squircle-card-btn.is-active-sym {
 background: var(--active-theme-color, #6366F1);
 border-color: var(--active-theme-color, #6366F1);
 color: #FFFFFF;
 box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
 transform: translateY(-2px) scale(1.04);
 }

 .squircle-label {
 font-size: 0.72rem;
 font-weight: 700;
 color: #4B5563;
 text-align: center;
 white-space: nowrap;
 }


 /* ── DAILY RESULT SUMMARY CARD (OUTPUT DARI FLOW, MOOD & GEJALA) ── */
	/* ── DAILY RESULT SUMMARY CARD (GENERATE ON-DEMAND) ── */
	.drs-generate-card {
		background: #FFF1F2;
		border: 1.5px dashed #FECDD3;
		border-radius: 24px;
		padding: 16px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		box-sizing: border-box;
		transition: all 0.2s ease;
	}

	@media (max-width: 480px) {
		.drs-generate-card {
			flex-direction: column;
			align-items: stretch;
		}
		.btn-generate-drs {
			justify-content: center;
			width: 100%;
		}
	}

	.drs-generate-left {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.drs-generate-title {
		font-size: 0.94rem;
		font-weight: 800;
		color: #9F1239;
		margin: 0;
	}

	.drs-generate-desc {
		font-size: 0.74rem;
		color: #881337;
		margin: 0;
		line-height: 1.4;
	}

	.btn-generate-drs {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: #E11D48;
		color: #FFFFFF;
		border: none;
		border-radius: 999px;
		padding: 10px 18px;
		font-size: 0.78rem;
		font-weight: 800;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 3px 10px rgba(225, 29, 72, 0.25);
		transition: transform 0.15s ease, background 0.15s ease;
		flex-shrink: 0;
	}

	.btn-generate-drs:hover:not(:disabled) {
		transform: translateY(-1px);
		background: #BE123C;
		box-shadow: 0 5px 14px rgba(225, 29, 72, 0.35);
	}

	.btn-generate-drs:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn-generate-drs:disabled {
		opacity: 0.75;
		cursor: wait;
	}

	.btn-close-drs-box {
		background: transparent;
		border: none;
		color: #9F1239;
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s ease;
	}

	.btn-close-drs-box:hover {
		background: #FFE4E6;
	}

 .daily-result-summary-card {
 background: #FFF1F2;
 border: 1.5px solid #FECDD3;
 border-radius: 24px;
 padding: 18px 16px;
 display: flex;
 flex-direction: column;
 gap: 12px;
 box-shadow: 0 4px 16px rgba(244, 63, 94, 0.08);
 }

 .drs-head {
 display: flex;
 align-items: center;
 justify-content: space-between;
 }

 .drs-title-wrap {
 display: flex;
 flex-direction: column;
 gap: 2px;
 }

 .drs-title {
 font-size: 0.98rem;
 font-weight: 800;
 color: #9F1239;
 margin: 0;
 }

 .drs-chips-row {
 display: flex;
 gap: 6px;
 flex-wrap: wrap;
 }

 .drs-chip {
 font-size: 0.72rem;
 font-weight: 700;
 padding: 4px 10px;
 border-radius: 999px;
 background: #FFFFFF;
 color: #881337;
 border: 1px solid #FECDD3;
 box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
 }

 .drs-chip.sym-chip {
 background: #FFFFFF;
 border-color: var(--chip-color, #EC4899);
 color: var(--chip-color, #9F1239);
 }

 .drs-advice-box {
 background: #FFFFFF;
 border-radius: 16px;
 padding: 14px;
 border: 1px solid #FFE4E6;
 }

 .drs-advice-head {
 font-size: 0.78rem;
 font-weight: 800;
 color: #881337;
 margin: 0 0 8px;
 }

 .drs-advice-list {
 margin: 0;
 padding-left: 18px;
 display: flex;
 flex-direction: column;
 gap: 6px;
 font-size: 0.74rem;
 color: #4B5563;
 line-height: 1.45;
 }

 .drs-advice-list strong {
 color: #1F2937;
 }

 /* ── 4 PHASES STEPPER COMPONENT (REFERENCE REPLICA) ── */
	.phases-overview-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 10px;
	}

	.phases-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2px;
	}

	.phases-main-title {
		font-size: 1.05rem;
		font-weight: 800;
		color: #111827;
		margin: 0;
	}

	.phases-sub-badge {
		font-size: 0.7rem;
		font-weight: 700;
		color: #BE123C;
		background: #FFF1F2;
		border: 1px solid #FFE4E6;
		padding: 3px 8px;
		border-radius: 999px;
	}

	.phases-stepper-wrap {
		background: #FFFFFF;
		border-radius: 20px;
		border: 1.5px solid #F1F5F9;
		padding: 22px 18px;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.03);
	}

	.phase-step-item {
		display: flex;
		gap: 16px;
	}

	/* Left Node Column */
	.step-node-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 38px;
		flex-shrink: 0;
	}

	.step-node-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 2;
		transition: all 0.2s ease;
	}

	/* 1. Completed State: Solid green circle */
	.step-node-circle.is-completed {
		background: #10B981;
		color: #FFFFFF;
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.28);
	}

	/* 2. Active State: Outer ring + filled center with icon */
	.step-node-circle.is-active {
		background: #E11D48;
		color: #FFFFFF;
		box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 5px #FDA4AF, 0 4px 14px rgba(225, 29, 72, 0.28);
	}

	/* 3. Upcoming State: Clean grey ring with step number */
	.step-node-circle.is-upcoming {
		background: #FAFAFA;
		border: 2px solid #D1D5DB;
		color: #94A3B8;
	}

	.upcoming-step-num {
		font-size: 0.78rem;
		font-weight: 800;
	}

	/* Connecting Line */
	.step-connector-line {
		width: 2.5px;
		flex: 1;
		min-height: 34px;
		margin: 4px 0;
		border-radius: 999px;
		transition: background-color 0.2s ease;
	}

	.step-connector-line.is-completed {
		background: #10B981;
	}

	.step-connector-line.is-pending {
		background: #E2E8F0;
	}

	/* Right Content Column */
	.step-content-col {
		flex: 1;
		padding-bottom: 22px;
	}

	.phase-step-item:last-child .step-content-col {
		padding-bottom: 4px;
	}

	.step-tag-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 3px;
	}

	.step-num-tag {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #64748B;
		text-transform: uppercase;
	}

	.step-done-pill {
		font-size: 0.62rem;
		font-weight: 800;
		color: #059669;
		background: #ECFDF5;
		padding: 2px 7px;
		border-radius: 999px;
	}

	.step-phase-title {
		font-size: 0.98rem;
		font-weight: 800;
		color: #0F172A;
		margin: 0 0 4px;
		line-height: 1.35;
	}

	.phase-step-item.is-upcoming .step-phase-title {
		color: #64748B;
	}

	.step-phase-desc {
		font-size: 0.77rem;
		color: #475569;
		line-height: 1.48;
		margin: 0;
	}

	.phase-step-item.is-upcoming .step-phase-desc {
		color: #94A3B8;
	}

	/* ── 5. DATE PICKER POP-UP MODAL ── */
	.picker-modal-backdrop {
 position: fixed;
 inset: 0;
 z-index: 99999;
 background: rgba(15, 23, 42, 0.65);
 backdrop-filter: blur(8px);
 -webkit-backdrop-filter: blur(8px);
 display: flex;
 align-items: center;
 justify-content: center;
 padding: 16px;
 box-sizing: border-box;
 animation: fadeIn 0.2s ease;
 }

 .picker-modal-card {
 background: #FFFFFF;
 width: 100%;
 max-width: 380px;
 border-radius: 26px;
 padding: 22px 20px 24px;
 box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
 animation: popModal 0.26s cubic-bezier(0.16, 1.2, 0.3, 1) both;
 box-sizing: border-box;
 }

 @keyframes popModal {
 from { transform: scale(0.92) translateY(12px); opacity: 0; }
 to { transform: scale(1) translateY(0); opacity: 1; }
 }

 .picker-card-head {
 display: flex;
 align-items: flex-start;
 justify-content: space-between;
 margin-bottom: 18px;
 }

 .picker-head-badge {
 font-size: 0.66rem;
 font-weight: 800;
 color: #E11D48;
 letter-spacing: 0.04em;
 display: block;
 margin-bottom: 2px;
 }

 .picker-card-title {
 font-size: 1.2rem;
 font-weight: 800;
 color: #111827;
 margin: 0;
 }

 .picker-close-btn {
 width: 30px;
 height: 30px;
 border-radius: 50%;
 background: #F3F4F6;
 border: none;
 color: #4B5563;
 font-size: 0.85rem;
 font-weight: 800;
 display: flex;
 align-items: center;
 justify-content: center;
 cursor: pointer;
 }

 .picker-form {
 display: flex;
 flex-direction: column;
 gap: 16px;
 }

 .picker-field {
 display: flex;
 flex-direction: column;
 gap: 6px;
 }

 .field-label {
 font-size: 0.8rem;
 font-weight: 800;
 color: #1F2937;
 }

 .date-input-box {
 background: #F9FAFB;
 border: 1.5px solid #E5E7EB;
 border-radius: 12px;
 padding: 10px 12px;
 font-size: 0.88rem;
 font-family: inherit;
 color: #111827;
 outline: none;
 width: 100%;
 box-sizing: border-box;
 }

 .date-input-box:focus {
 border-color: #E11D48;
 background: #FFFFFF;
 }

 .quick-date-chips {
 display: flex;
 gap: 6px;
 margin-top: 2px;
 }

 .q-chip {
 border: 1px solid #E5E7EB;
 background: #FFFFFF;
 color: #4B5563;
 font-size: 0.68rem;
 font-weight: 700;
 padding: 4px 8px;
 border-radius: 6px;
 cursor: pointer;
 transition: all 0.15s;
 }

 .q-chip:hover {
 background: #FFE4E6;
 border-color: #FECDD3;
 color: #BE123C;
 }

 .picker-actions {
 display: flex;
 gap: 8px;
 margin-top: 6px;
 }

 .btn-cancel-picker {
 flex: 1;
 background: #F3F4F6;
 border: none;
 border-radius: 12px;
 padding: 11px;
 font-size: 0.82rem;
 font-weight: 700;
 color: #4B5563;
 cursor: pointer;
 }

 .btn-submit-picker {
 flex: 2;
 background: #E11D48;
 border: none;
 border-radius: 12px;
 padding: 11px;
 font-size: 0.82rem;
 font-weight: 800;
 color: #FFFFFF;
 cursor: pointer;
 box-shadow: 0 4px 14px rgba(225, 29, 72, 0.25);
 }

 .btn-submit-picker:hover {
 background: #BE123C;
 }



 /* ── TOASTS ── */
 .toast-bubble {
 position: fixed;
 bottom: 24px;
 left: 50%;
 transform: translateX(-50%);
 background: #111827;
 color: #FFFFFF;
 font-size: 0.78rem;
 font-weight: 700;
 padding: 10px 18px;
 border-radius: 999px;
 box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
 z-index: 999999;
 animation: fadeInView 0.2s ease;
 }

 .toast-bubble.partner-bubble {
 background: #BE123C;
 box-shadow: 0 8px 24px rgba(190, 18, 60, 0.3);
 }

 /* ── Late Period Alert Card ── */
 .late-period-alert-card {
 background: #FFFBEB;
 border: 1.5px solid #FDE68A;
 border-radius: 20px;
 padding: 18px 20px;
 margin-bottom: 22px;
 box-shadow: 0 4px 14px rgba(245, 158, 11, 0.08);
 }
 .late-alert-header {
 display: flex;
 flex-direction: column;
 gap: 4px;
 margin-bottom: 8px;
 }
 .late-alert-badge {
 font-size: 0.68rem;
 font-weight: 800;
 letter-spacing: 0.08em;
 color: #B45309;
 text-transform: uppercase;
 }
 .late-alert-title {
 font-size: 1.15rem;
 font-weight: 800;
 color: #92400E;
 margin: 0;
 }
 .late-alert-message {
 font-size: 0.86rem;
 line-height: 1.55;
 color: #78350F;
 margin: 0 0 14px 0;
 }
 .late-alert-actions {
 display: flex;
 }
 .btn-late-start-today {
 background: #F59E0B;
 color: #FFFFFF;
 border: none;
 border-radius: 12px;
 padding: 9px 16px;
 font-size: 0.85rem;
 font-weight: 700;
 cursor: pointer;
 transition: transform 0.15s ease, background 0.15s ease;
 }
 .btn-late-start-today:hover {
 background: #D97706;
 transform: translateY(-1px);
 }

 /* ── Cycle Prediction Card ── */

 /* ── History Modal ── */
 .history-modal-card {
 max-width: 480px;
 width: 92%;
 max-height: 85vh;
 display: flex;
 flex-direction: column;
 padding: 24px;
 background: #FFFFFF;
 border-radius: 24px;
 box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
 }
 .history-modal-header {
 display: flex;
 justify-content: space-between;
 align-items: flex-start;
 margin-bottom: 16px;
 }
 .history-modal-body {
 overflow-y: auto;
 flex: 1;
 padding-right: 4px;
 }
 .history-stats-banner {
 display: grid;
 grid-template-columns: repeat(3, 1fr);
 gap: 8px;
 background: #FFF1F2;
 border-radius: 16px;
 padding: 12px;
 margin-bottom: 16px;
 text-align: center;
 }
 .h-stat-lbl {
 font-size: 0.65rem;
 font-weight: 700;
 color: #BE123C;
 display: block;
 margin-bottom: 2px;
 }
 .h-stat-val {
 font-size: 0.95rem;
 font-weight: 800;
 color: #881337;
 }
 .history-list-wrap {
 display: flex;
 flex-direction: column;
 gap: 10px;
 }
 .history-empty-text {
 text-align: center;
 color: #94A3B8;
 font-size: 0.88rem;
 padding: 24px 0;
 }
 .h-ongoing-pill {
 background: #10B981;
 color: #FFFFFF;
 font-size: 0.62rem;
 font-weight: 800;
 border-radius: 999px;
 padding: 2px 7px;
 text-transform: uppercase;
 }
 .btn-delete-cycle {
 background: transparent;
 border: 1px solid #FECDD3;
 color: #E11D48;
 font-size: 0.74rem;
 font-weight: 700;
 padding: 5px 10px;
 border-radius: 8px;
 cursor: pointer;
 transition: background 0.15s ease;
 }
 .btn-delete-cycle:hover {
 background: #FFF1F2;
 }
 .history-modal-footer {
 margin-top: 16px;
 display: flex;
 }
 .btn-close-history-full {
 width: 100%;
 background: #F1F5F9;
 color: #475569;
 border: none;
 border-radius: 14px;
 padding: 12px;
 font-size: 0.88rem;
 font-weight: 700;
 cursor: pointer;
 }
 .btn-close-history-full:hover {
 background: #E2E8F0;
 }

 /* ── Hydration Box & Water Dial ── */
 .simple-feature-box.box-water {
 background: linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%);
 box-shadow: 0 4px 14px rgba(14, 165, 233, 0.08);
 }
 .simple-feature-box.box-water:hover {
 border-color: #7DD3FC;
 box-shadow: 0 8px 24px rgba(14, 165, 233, 0.16);
 }
 .water-dial-wrap {
 width: 100%;
 height: 124px;
 display: flex;
 align-items: center;
 justify-content: center;
 position: relative;
 }
 .water-dial-svg {
 display: block;
 max-width: 124px;
 height: auto;
 }
 .water-progress-ring {
 transition: stroke-dashoffset 0.4s ease;
 }
 .water-card-count {
 font-size: 0.74rem;
 font-weight: 800;
 fill: #0369A1;
 font-family: inherit;
 }
 .water-card-pct {
 font-size: 0.65rem;
 font-weight: 700;
 fill: #0284C7;
 font-family: inherit;
 }

 /* ── Water Modal Card & Mascot ── */
 .water-modal-card {
 max-width: 440px;
 width: 92%;
 padding: 24px 20px;
 background: #FFFFFF;
 border-radius: 28px;
 box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
 display: flex;
 flex-direction: column;
 box-sizing: border-box;
 animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
 position: relative;
 max-height: 90vh;
 overflow-y: auto;
 }
 .water-modal-mascot-wrap {
 display: flex;
 justify-content: space-between;
 align-items: flex-start;
 margin-bottom: 8px;
 }
 .water-mascot-bubble {
 width: 84px;
 height: 84px;
 background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%);
 border-radius: 22px;
 display: flex;
 align-items: center;
 justify-content: center;
 overflow: hidden;
 box-shadow: 0 4px 16px rgba(14, 165, 233, 0.18);
 }
 .water-modal-lottie-frame {
 width: 110px;
 height: 110px;
 border: none;
 pointer-events: none;
 transform: scale(1.15);
 background: transparent;
 }
 .water-head-texts {
 display: flex;
 flex-direction: column;
 gap: 4px;
 margin-bottom: 16px;
 }
 .water-modal-title {
 font-size: 1.25rem;
 font-weight: 800;
 color: #0F172A;
 margin: 2px 0 0 0;
 }
 .water-modal-subtitle {
 font-size: 0.8rem;
 color: #64748B;
 line-height: 1.45;
 margin: 0;
 }
 .water-stat-banner {
 background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
 border: 1px solid #BAE6FD;
 border-radius: 20px;
 padding: 16px;
 margin-bottom: 16px;
 display: flex;
 flex-direction: column;
 align-items: center;
 text-align: center;
 gap: 6px;
 }
 .water-stat-big {
 display: flex;
 align-items: baseline;
 gap: 4px;
 }
 .water-stat-num {
 font-size: 2.2rem;
 font-weight: 800;
 color: #0284C7;
 line-height: 1;
 }
 .water-stat-denom {
 font-size: 1rem;
 font-weight: 700;
 color: #0369A1;
 }
 .water-stat-vol {
 font-size: 0.82rem;
 color: #0369A1;
 }
 .water-prog-bar-track {
 width: 100%;
 height: 8px;
 background: #BAE6FD;
 border-radius: 999px;
 overflow: hidden;
 margin-top: 4px;
 }
 .water-prog-bar-fill {
 height: 100%;
 background: #0284C7;
 border-radius: 999px;
 transition: width 0.3s ease;
 }
 .water-glasses-row {
 display: grid;
 grid-template-columns: repeat(4, 1fr);
 gap: 8px;
 margin-bottom: 16px;
 }
 .water-cup-btn {
 background: #F8FAFC;
 border: 1px solid #E2E8F0;
 border-radius: 14px;
 padding: 10px 4px;
 display: flex;
 flex-direction: column;
 align-items: center;
 gap: 4px;
 cursor: pointer;
 transition: all 0.15s ease;
 }
 .water-cup-btn.is-filled {
 background: #F0F9FF;
 border-color: #7DD3FC;
 transform: translateY(-2px);
 box-shadow: 0 4px 10px rgba(14, 165, 233, 0.15);
 }
 .water-cup-btn .cup-label {
 font-size: 0.72rem;
 font-weight: 800;
 color: #64748B;
 }
 .water-cup-btn.is-filled .cup-label {
 color: #0284C7;
 }
 .water-stepper-actions {
 display: flex;
 gap: 10px;
 margin-bottom: 14px;
 }
 .btn-water-minus {
 flex: 1;
 background: #F1F5F9;
 color: #475569;
 border: none;
 border-radius: 14px;
 padding: 11px;
 font-size: 0.84rem;
 font-weight: 700;
 cursor: pointer;
 transition: background 0.15s ease;
 }
 .btn-water-minus:disabled {
 opacity: 0.5;
 cursor: not-allowed;
 }
 .btn-water-plus {
 flex: 2;
 background: #0284C7;
 color: #FFFFFF;
 border: none;
 border-radius: 14px;
 padding: 11px;
 font-size: 0.84rem;
 font-weight: 800;
 cursor: pointer;
 box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
 transition: background 0.15s ease, transform 0.15s ease;
 }
 .btn-water-plus:hover {
 background: #0369A1;
 transform: translateY(-1px);
 }
 .btn-save-water {
 width: 100%;
 background: #0284C7;
 color: #FFFFFF;
 border: none;
 border-radius: 16px;
 padding: 12px;
 font-size: 0.88rem;
 font-weight: 800;
 cursor: pointer;
 box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
 transition: background 0.15s ease;
 }
 .btn-save-water:hover {
 background: #0369A1;
 }


 /* ── Daily Health Journal Modal (Clean Reference Replica - Pastel & Soft) ── */
  .journal-modal-card {
    max-width: 370px;
    width: 90%;
    padding: 20px 20px 24px;
    background: #FFFFFF;
    border-radius: 36px;
    box-shadow: 0 25px 65px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    max-height: 92vh;
    overflow-y: auto;
  }
  .journal-top-bar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .journal-date-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .journal-date-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FDA4AF;
  }
  .journal-date-text {
    font-size: 0.76rem;
    font-weight: 700;
    color: #475569;
  }
  .journal-big-donut-stage {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 8px 0 16px;
  }
  .journal-big-donut-svg {
    filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.04));
    transition: transform 0.3s ease;
  }
  .big-dial-day-text {
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 800;
    fill: #0F172A;
    letter-spacing: -0.02em;
  }
  .big-dial-phase-text {
    font-family: inherit;
    font-size: 5.6px;
    font-weight: 600;
    fill: #64748B;
    letter-spacing: 0.01em;
  }
  .journal-legend-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-bottom: 18px;
    padding: 0 4px;
  }
  .legend-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend-color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-color-dot.dot-period {
    background: #FDA4AF;
  }
  .legend-color-dot.dot-follicular {
    background: #FDE68A;
  }
  .legend-color-dot.dot-ovulation {
    background: #BAE6FD;
  }
  .legend-color-dot.dot-pms {
    background: #BBF7D0;
  }
  .legend-chip-label {
    font-size: 0.74rem;
    font-weight: 700;
    color: #64748B;
  }
  .journal-log-btn-wrap {
    margin-bottom: 16px;
  }
  .journal-log-pill-btn {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
    border-radius: 999px;
    padding: 10px 32px;
    font-size: 0.92rem;
    font-weight: 800;
    color: #1E293B;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .journal-log-pill-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(253, 164, 175, 0.25);
    border-color: #FDA4AF;
  }
  .journal-log-pill-btn:active {
    transform: translateY(0);
  }
  .pill-plus-symbol {
    color: #FDA4AF;
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1;
  }
  .journal-status-cards-col {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 6px;
  }
  .journal-info-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 20px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }
  .journal-info-card.note-card {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .info-card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .btn-close-note-edit {
    background: transparent;
    border: none;
    font-size: 0.82rem;
    color: #94A3B8;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 6px;
  }
  .btn-close-note-edit:hover {
    color: #0F172A;
    background: #E2E8F0;
  }
  .btn-edit-note-link {
    background: transparent;
    border: none;
    font-size: 0.76rem;
    font-weight: 700;
    color: #E11D48;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 8px;
  }
  .btn-edit-note-link:hover {
    background: #FFE4E6;
  }
  .saved-note-text {
    font-size: 0.8rem;
    color: #334155;
    line-height: 1.45;
    margin: 4px 0 0;
    background: #FFFFFF;
    border-radius: 12px;
    padding: 8px 12px;
    border: 1px solid #E2E8F0;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .note-action-row {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin-top: 2px;
  }
  .btn-save-note {
    background: #FDA4AF;
    color: #881337;
    border: none;
    border-radius: 999px;
    padding: 7px 18px;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(253, 164, 175, 0.35);
    transition: all 0.15s ease;
  }
  .btn-save-note:hover {
    background: #FB7185;
    color: #FFFFFF;
    transform: translateY(-1px);
  }
  .is-editing-note {
    animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .journal-info-card:hover {
    border-color: #CBD5E1;
  }
  .info-card-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .info-card-icon-bubble {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748B;
    flex-shrink: 0;
  }
  .info-card-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1E293B;
  }
  .info-card-val {
    font-size: 0.82rem;
    font-weight: 800;
    color: #0F172A;
  }
  .info-note-input-wrap {
    width: 100%;
    box-sizing: border-box;
  }
  .journal-inline-note-input {
    width: 100%;
    box-sizing: border-box;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    color: #1E293B;
    outline: none;
    resize: none;
    transition: all 0.15s ease;
  }
  .journal-inline-note-input:focus {
    border-color: #FDA4AF;
    box-shadow: 0 0 0 2.5px rgba(253, 164, 175, 0.2);
  }
	/* ── CYCLE HISTORY SECTION (MATCHING REFERENCE IMAGE) ── */
	.cycle-history-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 10px;
		margin-bottom: 22px;
		width: 100%;
		box-sizing: border-box;
	}

	.cycle-history-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4px;
		margin-bottom: 2px;
	}

	.ch-section-title {
		font-size: 1.18rem;
		font-weight: 800;
		color: #0F172A;
		margin: 0;
		letter-spacing: -0.015em;
	}

	.ch-header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ch-status-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #DCFCE7;
		color: #15803D;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
	}

	.btn-ch-see-all {
		background: transparent;
		border: none;
		color: #2563EB;
		font-size: 0.84rem;
		font-weight: 700;
		cursor: pointer;
		padding: 2px 4px;
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.btn-ch-see-all:hover {
		opacity: 0.8;
		transform: translateX(1px);
	}

	.ch-empty-card {
		background: #FFFFFF;
		border-radius: 18px;
		border: 1.5px dashed #E2E8F0;
		padding: 24px 18px;
		text-align: center;
	}

	.ch-empty-text {
		font-size: 0.82rem;
		color: #64748B;
		line-height: 1.5;
		margin: 0;
	}

	.ch-empty-text strong {
		color: #E11D48;
	}

	.cycle-history-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
	}

	.cycle-history-card {
		background: #FFFFFF;
		border-radius: 20px;
		padding: 16px 18px;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
		border: 1px solid #F1F5F9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		cursor: pointer;
		text-align: left;
		transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease, border-color 0.18s ease;
		box-sizing: border-box;
		-webkit-tap-highlight-color: transparent;
	}

	.cycle-history-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
		border-color: #E2E8F0;
	}

	.cycle-history-card:active {
		transform: translateY(0);
	}

	.ch-card-left {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.ch-icon-bubble {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: #FFF1F2;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ch-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ch-day-title {
		font-size: 1.05rem;
		font-weight: 800;
		color: #0F172A;
		margin: 0;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}

	.ch-phase-subtitle {
		font-size: 0.78rem;
		font-weight: 500;
		color: #64748B;
		line-height: 1.2;
	}

	.ch-next-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 5px;
		font-size: 0.74rem;
		font-weight: 700;
		color: #059669;
	}

	.ch-check-dot {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: #10B981;
		color: #FFFFFF;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ch-card-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.ch-date-text {
		font-size: 0.84rem;
		font-weight: 600;
		color: #64748B;
	}

	.ch-chevron {
		color: #94A3B8;
		transition: transform 0.15s ease;
	}

	.cycle-history-card:hover .ch-chevron {
		transform: translateX(2px);
		color: #64748B;
	}

	/* History Modal Items Styling */
	.history-item-row-card {
		background: #FFFFFF;
		border-radius: 18px;
		padding: 14px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
		border: 1px solid #F1F5F9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
	}

	.m-cycle-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.m-dates-sub {
		font-size: 0.72rem;
		color: #94A3B8;
	}

	.m-actions-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

</style>

