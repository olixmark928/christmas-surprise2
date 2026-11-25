import { TOTAL_QUESTIONS, type Language, type LeaderboardRecord } from '../data/questions';

const MY_RECORD_KEY = 'xmas_memory_my_record_v2';
const BOARD_KEY = 'xmas_memory_leaderboard_v1';
const LANG_KEY = 'xmas_memory_lang_v1';

export function getSavedLanguage(): Language {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === 'vi' ? 'vi' : 'zh';
  } catch {
    return 'zh';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore storage quota errors
  }
}

export function getMySavedRecord(): LeaderboardRecord | null {
  try {
    const raw = localStorage.getItem(MY_RECORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaderboardRecord;
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      typeof parsed.score === 'number' &&
      parsed.totalQuestions === TOTAL_QUESTIONS
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveMyRecord(record: LeaderboardRecord): void {
  try {
    localStorage.setItem(MY_RECORD_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearMyRecord(): void {
  try {
    localStorage.removeItem(MY_RECORD_KEY);
  } catch {
    // Ignore
  }
}

export function getLeaderboard(): LeaderboardRecord[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LeaderboardRecord[];
    if (!Array.isArray(list)) return [];
    return sortLeaderboard(
      list.filter((item) => item && item.totalQuestions === TOTAL_QUESTIONS)
    );
  } catch {
    return [];
  }
}

export function addLeaderboardRecord(record: LeaderboardRecord): LeaderboardRecord[] {
  const existing = getLeaderboard();
  const updated = sortLeaderboard([...existing, record]);
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(BOARD_KEY);
    localStorage.removeItem(MY_RECORD_KEY);
  } catch {
    // Ignore
  }
}

export function sortLeaderboard(records: LeaderboardRecord[]): LeaderboardRecord[] {
  return [...records].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return a.createdAt - b.createdAt;
  });
}
