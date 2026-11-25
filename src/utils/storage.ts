import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QuerySnapshot,
  type Timestamp,
} from 'firebase/firestore';
import {
  ANSWER_SECONDS,
  TOTAL_QUESTIONS,
  type Language,
  type LeaderboardRecord,
} from '../data/questions';
import { db, handleFirestoreError, OperationType } from '../firebase';

const MY_RECORD_KEY = 'xmas_memory_my_record_v2';
const LANG_KEY = 'xmas_memory_lang_v1';
const LEADERBOARD_COLLECTION = 'leaderboard';

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

function getLeaderboardQuery() {
  return query(
    collection(db, LEADERBOARD_COLLECTION),
    where('score', '>=', 0),
    where('score', '<=', TOTAL_QUESTIONS),
    orderBy('score', 'desc'),
    limit(200)
  );
}

function mapSnapshotToRecords(snapshot: QuerySnapshot): LeaderboardRecord[] {
  const records: LeaderboardRecord[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as {
      name?: unknown;
      score?: unknown;
      totalQuestions?: unknown;
      totalTime?: unknown;
      createdAt?: Timestamp | number | null;
    };
    if (
      typeof data.name === 'string' &&
      typeof data.score === 'number' &&
      data.totalQuestions === TOTAL_QUESTIONS &&
      typeof data.totalTime === 'number'
    ) {
      const createdAtMs =
        data.createdAt &&
        typeof data.createdAt === 'object' &&
        typeof data.createdAt.toMillis === 'function'
          ? data.createdAt.toMillis()
          : typeof data.createdAt === 'number'
            ? data.createdAt
            : Date.now();
      records.push({
        id: docSnap.id,
        name: data.name,
        score: data.score,
        totalQuestions: data.totalQuestions,
        totalTime: data.totalTime,
        createdAt: createdAtMs,
      });
    }
  });
  return sortLeaderboard(records);
}

export function subscribeCloudLeaderboard(
  onUpdate: (records: LeaderboardRecord[]) => void
): () => void {
  return onSnapshot(
    getLeaderboardQuery(),
    (snapshot) => {
      onUpdate(mapSnapshotToRecords(snapshot));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, LEADERBOARD_COLLECTION);
    }
  );
}

export async function fetchCloudLeaderboard(): Promise<LeaderboardRecord[]> {
  try {
    const snapshot = await getDocs(getLeaderboardQuery());
    return mapSnapshotToRecords(snapshot);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, LEADERBOARD_COLLECTION);
  }
}

export async function addCloudLeaderboardRecord(record: LeaderboardRecord): Promise<void> {
  const sanitizedName = record.name.trim().slice(0, 20) || 'Player';
  const clampedScore = Math.max(0, Math.min(TOTAL_QUESTIONS, Math.round(record.score)));
  const maxTotalTime = TOTAL_QUESTIONS * ANSWER_SECONDS;
  const clampedTotalTime = Number(
    Math.max(0, Math.min(maxTotalTime, Number(record.totalTime || 0))).toFixed(2)
  );
  const safeId = /^[a-zA-Z0-9_-]{1,128}$/.test(record.id)
    ? record.id
    : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const path = `${LEADERBOARD_COLLECTION}/${safeId}`;
  try {
    await setDoc(doc(db, LEADERBOARD_COLLECTION, safeId), {
      name: sanitizedName,
      score: clampedScore,
      totalQuestions: TOTAL_QUESTIONS,
      totalTime: clampedTotalTime,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function sortLeaderboard(records: LeaderboardRecord[]): LeaderboardRecord[] {
  return [...records].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return a.createdAt - b.createdAt;
  });
}
