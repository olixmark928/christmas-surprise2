import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReviewModal } from './components/ReviewModal';
import {
  ANSWER_SECONDS,
  MEMORIZE_SECONDS,
  pickRandomQuestions,
  QUESTION_POOL,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  TOTAL_QUESTIONS,
  type Language,
  type LeaderboardRecord,
  type PlayerQuestionResult,
  type QuestionItem,
} from './data/questions';
import { getUiText } from './i18n';
import { sfx } from './utils/sound';
import {
  addLeaderboardRecord,
  getLeaderboard,
  getMySavedRecord,
  getSavedLanguage,
  saveLanguage,
  saveMyRecord,
} from './utils/storage';

type GameScreen = 'WELCOME' | 'MEMORIZE' | 'ANSWER' | 'RESULT';

interface AnswerFeedbackState {
  type: 'correct' | 'wrong' | 'timeout';
  timeTaken?: number;
  question: QuestionItem;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => getSavedLanguage());
  const [screen, setScreen] = useState<GameScreen>('WELCOME');
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [nameError, setNameError] = useState(false);

  const [savedRecord, setSavedRecord] = useState<LeaderboardRecord | null>(() =>
    getMySavedRecord()
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>(() =>
    getLeaderboard()
  );

  const [selectedQuestions, setSelectedQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [playerResults, setPlayerResults] = useState<PlayerQuestionResult[]>([]);

  // Timer states
  const [memoSecondsLeft, setMemoSecondsLeft] = useState(MEMORIZE_SECONDS);
  const [memoProgress, setMemoProgress] = useState(1);

  const [ansSecondsLeft, setAnsSecondsLeft] = useState(ANSWER_SECONDS);
  const [ansProgress, setAnsProgress] = useState(1);

  // Answer feedback states
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedbackState | null>(null);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<LeaderboardRecord | null>(null);

  // Refs for accurate intervals & cleanup
  const timerIntervalRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const answerStartTimeRef = useRef<number>(0);
  const answerLockedRef = useRef<boolean>(false);
  const gameFinishedRef = useRef<boolean>(false);
  const isPracticeRef = useRef<boolean>(false);
  const resultsRef = useRef<PlayerQuestionResult[]>([]);

  const t = getUiText(lang);

  useEffect(() => {
    document.title = t.pageTitle;
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'zh-Hant';
  }, [lang, t.pageTitle]);

  const handleLanguageChange = (nextLang: Language) => {
    setLang(nextLang);
    saveLanguage(nextLang);
  };

  const clearTimers = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    for (const q of QUESTION_POOL) {
      if (q.imageUrl) {
        const img = new Image();
        img.src = q.imageUrl;
      }
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const finishGame = useCallback(
    (finalResults: PlayerQuestionResult[], playerName: string) => {
      if (gameFinishedRef.current) return;
      gameFinishedRef.current = true;
      clearTimers();
      sfx.finish();

      const validResults = finalResults.slice(0, TOTAL_QUESTIONS);
      const score = validResults.filter((r) => r.isCorrect).length;
      const totalTime = Number(
        validResults.reduce((acc, r) => acc + Number(r.timeTaken || 0), 0).toFixed(2)
      );

      const newRecord: LeaderboardRecord = {
        id: `rec_${Date.now()}`,
        name: playerName,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        totalTime,
        createdAt: Date.now(),
      };

      const existingRecord = getMySavedRecord();
      if (isPracticeRef.current || existingRecord) {
        setActiveRecord(newRecord);
        setLeaderboard(getLeaderboard());
        setScreen('RESULT');
        return;
      }

      saveMyRecord(newRecord);
      const updatedBoard = addLeaderboardRecord(newRecord);

      setSavedRecord(newRecord);
      setActiveRecord(newRecord);
      setLeaderboard(updatedBoard);
      setScreen('RESULT');
    },
    [clearTimers]
  );

  const advanceToNextQuestion = useCallback(
    (
      nextResults: PlayerQuestionResult[],
      questionsList: QuestionItem[],
      idx: number,
      playerName: string
    ) => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = window.setTimeout(() => {
        const nextIdx = idx + 1;
        if (nextIdx < TOTAL_QUESTIONS && nextIdx < questionsList.length) {
          setCurrentIndex(nextIdx);
          setScreen('MEMORIZE');
        } else {
          finishGame(nextResults, playerName);
        }
      }, 1350);
    },
    [finishGame]
  );

  // Run Memorize countdown when screen === 'MEMORIZE'
  useEffect(() => {
    if (screen !== 'MEMORIZE') return;
    clearTimers();
    answerStartTimeRef.current = 0;

    const totalMs = MEMORIZE_SECONDS * 1000;
    const startAt = performance.now();
    let lastShownSec = MEMORIZE_SECONDS;

    setMemoSecondsLeft(MEMORIZE_SECONDS);
    setMemoProgress(1);

    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startAt;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const ratio = remainingMs / totalMs;
      const sec = Math.ceil(remainingMs / 1000);

      setMemoProgress(ratio);

      if (sec !== lastShownSec && sec > 0) {
        lastShownSec = sec;
        setMemoSecondsLeft(sec);
        if (sec <= 2) {
          sfx.urgentTick();
        } else {
          sfx.tick();
        }
      }

      if (remainingMs <= 0) {
        clearTimers();
        sfx.phaseChange();
        answerStartTimeRef.current = performance.now();
        answerLockedRef.current = false;
        setSelectedOptionIndex(null);
        setAnswerLocked(false);
        setAnswerFeedback(null);
        setScreen('ANSWER');
      }
    }, 50);

    return () => clearTimers();
  }, [screen, currentIndex, clearTimers]);

  // Run Answer countdown when screen === 'ANSWER'
  useEffect(() => {
    if (screen !== 'ANSWER') return;
    clearTimers();

    const currentQuestion = selectedQuestions[currentIndex];
    if (!currentQuestion) return;

    const totalMs = ANSWER_SECONDS * 1000;
    const startAt = performance.now();
    answerStartTimeRef.current = startAt;
    answerLockedRef.current = false;
    let lastShownSec = ANSWER_SECONDS;

    setAnsSecondsLeft(ANSWER_SECONDS);
    setAnsProgress(1);

    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startAt;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const ratio = remainingMs / totalMs;
      const sec = Math.ceil(remainingMs / 1000);

      setAnsProgress(ratio);

      if (sec !== lastShownSec && sec > 0) {
        lastShownSec = sec;
        setAnsSecondsLeft(sec);
        if (sec <= 3) {
          sfx.urgentTick();
        } else {
          sfx.tick();
        }
      }

      if (remainingMs <= 0) {
        if (answerLockedRef.current || resultsRef.current.length > currentIndex) return;
        answerLockedRef.current = true;
        clearTimers();
        setAnswerLocked(true);
        sfx.wrong();

        setAnswerFeedback({
          type: 'timeout',
          timeTaken: ANSWER_SECONDS,
          question: currentQuestion,
        });

        const updatedResults: PlayerQuestionResult[] = [
          ...resultsRef.current,
          {
            question: currentQuestion,
            selectedIndex: null,
            isCorrect: false,
            timeTaken: ANSWER_SECONDS,
          },
        ];
        resultsRef.current = updatedResults;
        setPlayerResults(updatedResults);

        advanceToNextQuestion(
          updatedResults,
          selectedQuestions,
          currentIndex,
          currentPlayerName
        );
      }
    }, 50);

    return () => clearTimers();
  }, [
    screen,
    currentIndex,
    selectedQuestions,
    currentPlayerName,
    clearTimers,
    advanceToNextQuestion,
  ]);

  const handleStartGame = () => {
    sfx.unlock();
    const existing = getMySavedRecord();
    if (existing) {
      setSavedRecord(existing);
      return;
    }

    const trimmed = playerNameInput.trim();
    if (!trimmed) {
      setNameError(true);
      sfx.wrong();
      return;
    }

    clearTimers();
    setNameError(false);
    isPracticeRef.current = false;
    const picked = pickRandomQuestions(TOTAL_QUESTIONS);
    resultsRef.current = [];
    answerLockedRef.current = false;
    gameFinishedRef.current = false;
    answerStartTimeRef.current = 0;
    setSelectedQuestions(picked);
    setPlayerResults([]);
    setCurrentPlayerName(trimmed);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setAnswerLocked(false);
    setAnswerFeedback(null);
    setScreen('MEMORIZE');
  };

  const handleOptionSelect = (optionIdx: number) => {
    if (
      answerLockedRef.current ||
      answerLocked ||
      screen !== 'ANSWER' ||
      resultsRef.current.length > currentIndex
    ) {
      return;
    }
    const currentQuestion = selectedQuestions[currentIndex];
    if (!currentQuestion) return;

    answerLockedRef.current = true;
    clearTimers();
    setAnswerLocked(true);
    setSelectedOptionIndex(optionIdx);

    const rawSeconds =
      answerStartTimeRef.current > 0
        ? Math.max(0, (performance.now() - answerStartTimeRef.current) / 1000)
        : 0;
    const timeTaken = Number(Math.min(ANSWER_SECONDS, rawSeconds).toFixed(2));
    const isCorrect = optionIdx === currentQuestion.correctIndex;

    if (isCorrect) {
      sfx.correct();
      setAnswerFeedback({
        type: 'correct',
        timeTaken,
        question: currentQuestion,
      });
    } else {
      sfx.wrong();
      setAnswerFeedback({
        type: 'wrong',
        timeTaken,
        question: currentQuestion,
      });
    }

    const updatedResults: PlayerQuestionResult[] = [
      ...resultsRef.current,
      {
        question: currentQuestion,
        selectedIndex: optionIdx,
        isCorrect,
        timeTaken,
      },
    ];
    resultsRef.current = updatedResults;
    setPlayerResults(updatedResults);

    advanceToNextQuestion(
      updatedResults,
      selectedQuestions,
      currentIndex,
      currentPlayerName
    );
  };

  const handleToggleSound = () => {
    const muted = sfx.toggleMute();
    setIsMuted(muted);
  };

  const handleReplayUnscored = () => {
    if (!savedRecord) return;
    sfx.unlock();
    clearTimers();
    isPracticeRef.current = true;
    const picked = pickRandomQuestions(TOTAL_QUESTIONS);
    resultsRef.current = [];
    answerLockedRef.current = false;
    gameFinishedRef.current = false;
    answerStartTimeRef.current = 0;
    setSelectedQuestions(picked);
    setPlayerResults([]);
    setCurrentPlayerName(savedRecord.name);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setAnswerLocked(false);
    setAnswerFeedback(null);
    setScreen('MEMORIZE');
  };

  const handleOpenLeaderboard = (record: LeaderboardRecord | null) => {
    setLeaderboard(getLeaderboard());
    setActiveRecord(record);
    setScreen('RESULT');
  };

  const currentQuestion = selectedQuestions[currentIndex];
  const currentQuestionLocale = currentQuestion?.[lang];

  const feedbackMessage = answerFeedback
    ? answerFeedback.type === 'correct'
      ? t.feedbackCorrect((answerFeedback.timeTaken ?? 0).toFixed(2))
      : answerFeedback.type === 'wrong'
        ? t.feedbackWrong(
            answerFeedback.question[lang].options[answerFeedback.question.correctIndex],
            (answerFeedback.timeTaken ?? 0).toFixed(2)
          )
        : t.feedbackTimeout(
            answerFeedback.question[lang].options[answerFeedback.question.correctIndex],
            (answerFeedback.timeTaken ?? ANSWER_SECONDS).toFixed(2)
          )
    : '';

  return (
    <div className="min-h-[100dvh] text-slate-900 flex flex-col items-center relative">
      {/* 9:16 手機直式外框容器 */}
      <div className="relative z-10 w-full max-w-[450px] min-h-[100dvh] sm:min-h-0 sm:my-4 flex flex-col sm:rounded-[32px] sm:overflow-hidden sm:shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:border-4 sm:border-amber-300/35 bg-[#0b261e]">
        {/* 頂部手機導覽列（安全間距 + 超大語言切換） */}
        <header className="w-full border-b border-amber-300/30 bg-gradient-to-r from-[#5a0f18] via-[#3a161a] to-[#0d3326] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 min-h-[76px] flex items-center justify-between gap-2.5 shrink-0">
          {/* 超大高對比雙語切換器：中文 / Tiếng Việt */}
          <div
            role="group"
            aria-label="語言切換 / Chọn ngôn ngữ"
            className="flex-1 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/35 p-1.5 border-2 border-amber-300/60 shadow-inner"
          >
            <button
              id="lang-zh-btn"
              type="button"
              onClick={() => handleLanguageChange('zh')}
              className={`py-2.5 px-4 rounded-xl text-lg sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap text-center ${
                lang === 'zh'
                  ? 'bg-amber-400 text-red-950 shadow-md'
                  : 'text-amber-50 hover:bg-white/10'
              }`}
            >
              中文
            </button>
            <button
              id="lang-vi-btn"
              type="button"
              onClick={() => handleLanguageChange('vi')}
              className={`py-2.5 px-4 rounded-xl text-lg sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap text-center ${
                lang === 'vi'
                  ? 'bg-amber-400 text-red-950 shadow-md'
                  : 'text-amber-50 hover:bg-white/10'
              }`}
            >
              Tiếng Việt
            </button>
          </div>

          <button
            id="sound-toggle-btn"
            type="button"
            onClick={handleToggleSound}
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-amber-50 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer shrink-0"
            aria-label={isMuted ? t.soundOffLabel : t.soundOnLabel}
            title={isMuted ? t.soundOffLabel : t.soundOnLabel}
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-red-300" />
            ) : (
              <Volume2 className="w-6 h-6 text-emerald-300" />
            )}
          </button>
        </header>

        {/* 9:16 直式遊戲主舞台 */}
        <main className="flex-1 flex flex-col justify-center p-1.5 sm:p-2 sm:min-h-[730px]">
          {/* 1. 歡迎與登入畫面 */}
          {screen === 'WELCOME' && (
            <section
              id="screen-welcome"
              className="bg-[#fffcf7] rounded-3xl shadow-xl border-2 border-amber-300/80 overflow-hidden animate-pop-in flex flex-col"
            >
              {/* 聖誕節頂部緞帶條 */}
              <div className="bg-gradient-to-r from-[#991b1b] via-[#b91c1c] to-[#14532d] px-4 py-3.5 text-white flex items-center justify-between gap-2 border-b border-amber-300/40">
                <span className="inline-flex items-center gap-1.5 text-base font-bold text-amber-200 tracking-wide whitespace-nowrap">
                  <span className="text-3xl leading-none" aria-hidden="true">🎅</span>
                  <span>{t.ribbonLeft}</span>
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-100 font-mono-num whitespace-nowrap">
                  {t.ribbonCount(TOTAL_QUESTIONS)}
                </span>
              </div>

              <div className="p-5 flex flex-col gap-5">
                <div className="border-b-2 border-amber-300/80 pb-5 text-center">
                  <h1
                    className={`font-display font-black text-slate-900 tracking-tight leading-tight ${
                      lang === 'vi' ? 'text-[27px] sm:text-[31px]' : 'text-[33px] sm:text-4xl'
                    }`}
                  >
                    {t.mainTitle}
                  </h1>
                  <p className="mt-3 text-slate-700 text-[15px] sm:text-base leading-relaxed">
                    {t.introLine1Prefix}{' '}
                    <strong className="text-emerald-800">
                      {t.secondsUnit(MEMORIZE_SECONDS)}
                    </strong>
                    {t.introLine1Suffix}
                    <br />
                    {t.introLine2Prefix}{' '}
                    <strong className="text-red-700">
                      {t.secondsUnit(ANSWER_SECONDS)}
                    </strong>{' '}
                    {t.introLine2Suffix}
                    <br />
                    {t.introLine3Prefix}{' '}
                    <strong className="text-slate-900">
                      {t.questionsUnit(TOTAL_QUESTIONS)}
                    </strong>{' '}
                    {t.introLine3Suffix}
                  </p>
                </div>

                {/* 3 欄直式緊湊資訊卡 */}
                <div className="grid grid-cols-3 gap-2 text-center bg-gradient-to-br from-red-100/95 via-amber-100/90 to-emerald-100/95 border-2 border-amber-400/90 rounded-2xl py-4 px-2 shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{t.infoCountLabel}</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono-num mt-1 whitespace-nowrap">
                      {t.questionsUnit(TOTAL_QUESTIONS)}
                    </div>
                  </div>
                  <div className="border-x-2 border-amber-400/70 px-1">
                    <div className="text-sm font-bold text-slate-800">{t.infoObserveLabel}</div>
                    <div
                      className={`font-black text-emerald-800 font-mono-num mt-1.5 whitespace-nowrap ${
                        lang === 'vi' ? 'text-[15px] sm:text-lg' : 'text-xl'
                      }`}
                    >
                      {t.perQuestionUnit(MEMORIZE_SECONDS)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{t.infoAnswerLabel}</div>
                    <div
                      className={`font-black text-red-700 font-mono-num mt-1.5 whitespace-nowrap ${
                        lang === 'vi' ? 'text-[15px] sm:text-lg' : 'text-xl'
                      }`}
                    >
                      {t.perQuestionUnit(ANSWER_SECONDS)}
                    </div>
                  </div>
                </div>

                {!savedRecord ? (
                  <div id="welcome-form-area" className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="player-name-input"
                        className="block text-base font-bold text-slate-800 mb-1.5"
                      >
                        {t.playerNameLabel}
                      </label>
                      <input
                        id="player-name-input"
                        type="text"
                        maxLength={20}
                        value={playerNameInput}
                        onChange={(e) => {
                          setPlayerNameInput(e.target.value);
                          if (nameError && e.target.value.trim()) {
                            setNameError(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleStartGame();
                        }}
                        placeholder={t.playerNamePlaceholder}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-amber-400/80 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 text-base"
                      />
                      {nameError && (
                        <p
                          id="welcome-error-msg"
                          className="mt-1.5 text-sm font-semibold text-red-600"
                        >
                          {t.playerNameError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1">
                      <button
                        id="start-game-btn"
                        type="button"
                        onClick={handleStartGame}
                        className="w-full min-h-[64px] py-4 px-6 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-black text-2xl shadow-md transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2.5"
                      >
                        <span className="text-3xl leading-none" aria-hidden="true">🎄</span>
                        <span>{t.startButton}</span>
                      </button>
                      <button
                        id="view-board-from-welcome-btn"
                        type="button"
                        onClick={() => handleOpenLeaderboard(null)}
                        className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-emerald-900/10 hover:bg-emerald-900/15 border-2 border-emerald-800/30 text-emerald-950 font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t.viewBoardButton}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div id="welcome-locked-area" className="space-y-4">
                    <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4">
                      <div className="text-sm font-bold text-emerald-900 mb-3">
                        {t.lockedBanner}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center items-end">
                        <div className="flex flex-col justify-between min-w-0">
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {t.colPlayer}
                          </div>
                          <div
                            id="locked-player-name"
                            className="font-bold text-slate-900 text-sm mt-0.5 truncate"
                          >
                            {savedRecord.name}
                          </div>
                        </div>
                        <div className="border-x border-emerald-200 px-1 flex flex-col justify-between min-w-0">
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {t.colScore}
                          </div>
                          <div
                            id="locked-player-score"
                            className="font-black text-emerald-700 font-mono-num text-base mt-0.5 whitespace-nowrap"
                          >
                            {savedRecord.score} / {savedRecord.totalQuestions || TOTAL_QUESTIONS}
                          </div>
                        </div>
                        <div className="flex flex-col justify-between min-w-0">
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {t.colTime}
                          </div>
                          <div
                            id="locked-player-time"
                            className="font-black text-red-700 font-mono-num text-base mt-0.5 whitespace-nowrap"
                          >
                            {Number(savedRecord.totalTime).toFixed(2)}s
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <button
                        id="go-result-btn"
                        type="button"
                        onClick={() => handleOpenLeaderboard(savedRecord)}
                        className="w-full min-h-[52px] py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t.goResultButton}
                      </button>
                      <button
                        type="button"
                        onClick={handleReplayUnscored}
                        className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] py-2.5 px-6 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{t.resetLockButton}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 2. 遊戲進行畫面（9:16 直式單手操作佈局） */}
          {(screen === 'MEMORIZE' || screen === 'ANSWER') && currentQuestion && currentQuestionLocale && (
            <section
              id="screen-game"
              className="bg-[#fffcf7] rounded-3xl shadow-xl border-2 border-amber-300/80 overflow-hidden animate-pop-in flex flex-col"
            >
              {/* 頂部進度 HUD */}
              <div className="bg-gradient-to-r from-[#8b151e] via-[#a31924] to-[#14532d] text-white px-4 py-3.5 flex items-center justify-between gap-2 border-b border-amber-300/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    id="question-badge"
                    className="text-base font-black text-amber-300 font-mono-num whitespace-nowrap"
                  >
                    {t.questionBadge(currentIndex + 1, TOTAL_QUESTIONS)}
                  </span>
                  <span className="text-amber-200/40" aria-hidden="true">
                    |
                  </span>
                  <span
                    id="phase-hint"
                    className="text-xs font-semibold text-amber-50 truncate"
                  >
                    {screen === 'MEMORIZE' ? t.phaseObserveHint : t.phaseAnswerHint}
                  </span>
                </div>

                <div id="progress-dots" className="flex items-center gap-1.5 shrink-0">
                  {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < currentIndex
                          ? 'w-2.5 h-2.5 rounded-full bg-emerald-300'
                          : i === currentIndex
                            ? 'w-3.5 h-3.5 rounded-full bg-amber-300 ring-2 ring-amber-100'
                            : 'w-2.5 h-2.5 rounded-full bg-white/30'
                      }
                    />
                  ))}
                </div>
              </div>

              {/* 階段 A：記憶觀察（極大化滿版貼圖顯示） */}
              {screen === 'MEMORIZE' && (
                <div id="phase-memorize" className="px-1.5 py-3 flex flex-col gap-2.5">
                  <div className="px-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 leading-snug">
                        <Eye className="w-6 h-6 text-emerald-700 shrink-0" />
                        <span>{t.memorizeTitle}</span>
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">{t.memorizeSub}</p>
                    </div>

                    <div
                      id="memo-timer-box"
                      className="relative w-20 h-20 shrink-0 flex items-center justify-center"
                    >
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="#dcfce7"
                          strokeWidth="9"
                        />
                        <circle
                          id="memo-timer-ring"
                          cx="50"
                          cy="50"
                          r={RING_RADIUS}
                          fill="none"
                          stroke={memoSecondsLeft <= 2 ? '#d97706' : '#15803d'}
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={RING_CIRCUMFERENCE * (1 - memoProgress)}
                          style={{ transition: 'stroke-dashoffset 0.08s linear, stroke 0.2s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          id="memo-timer-text"
                          className="text-2xl font-black text-emerald-900 font-mono-num leading-none"
                        >
                          {memoSecondsLeft}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {t.ringUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 再放大的滿版貼圖展示框 */}
                  <div className="w-full bg-gradient-to-b from-amber-100/80 to-emerald-100/70 rounded-2xl border-2 border-amber-400/80 p-0.5">
                    {currentQuestion.imageUrl ? (
                      <div
                        id="svg-scene-container"
                        className="w-full aspect-[4/3] rounded-[14px] overflow-hidden bg-[#fffcf7] shadow-md flex items-center justify-center"
                      >
                        <img
                          src={currentQuestion.imageUrl}
                          alt={currentQuestionLocale.shortTitle}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        id="svg-scene-container"
                        className="w-full aspect-[4/3] rounded-[14px] overflow-hidden bg-white shadow-md"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.svg ?? '' }}
                      />
                    )}
                  </div>

                  <p className="text-center text-base sm:text-lg font-bold text-slate-700 py-1">
                    {t.memorizeTip}
                  </p>
                </div>
              )}

              {/* 階段 B：限時作答（9:16 單欄拇指好按選單） */}
              {screen === 'ANSWER' && (
                <div id="phase-answer" className="p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-red-700 mb-1">
                        {t.answerEyebrow} · {t.questionBadge(currentIndex + 1, TOTAL_QUESTIONS)}
                      </p>
                      <h2
                        id="question-text"
                        className="text-xl font-black text-slate-900 leading-snug"
                      >
                        {currentQuestionLocale.question}
                      </h2>
                    </div>

                    <div
                      id="ans-timer-box"
                      className="relative w-20 h-20 shrink-0 flex items-center justify-center"
                    >
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="#fee2e2"
                          strokeWidth="9"
                        />
                        <circle
                          id="ans-timer-ring"
                          cx="50"
                          cy="50"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={RING_CIRCUMFERENCE * (1 - ansProgress)}
                          style={{ transition: 'stroke-dashoffset 0.08s linear' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          id="ans-timer-text"
                          className="text-2xl font-black text-red-600 font-mono-num leading-none"
                        >
                          {ansSecondsLeft}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {t.ringUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 單欄直式大按鈕選項 */}
                  <div id="options-grid" className="flex flex-col gap-2.5">
                    {currentQuestionLocale.options.map((opt, idx) => {
                      const isCorrectOpt = idx === currentQuestion.correctIndex;
                      const isSelectedOpt = idx === selectedOptionIndex;

                      let btnStyle =
                        'border-amber-300 bg-white hover:border-red-600 hover:bg-red-50/50 text-slate-900 cursor-pointer shadow-sm';
                      if (answerLocked) {
                        if (isCorrectOpt) {
                          btnStyle =
                            'border-emerald-600 bg-emerald-50 text-emerald-950 cursor-default shadow-sm';
                        } else if (isSelectedOpt && !isCorrectOpt) {
                          btnStyle = 'border-red-600 bg-red-50 text-red-950 cursor-default';
                        } else {
                          btnStyle =
                            'border-slate-200 bg-white text-slate-400 opacity-55 cursor-default';
                        }
                      }

                      return (
                        <button
                          key={`${currentQuestion.id}-${idx}`}
                          type="button"
                          disabled={answerLocked}
                          onClick={() => handleOptionSelect(idx)}
                          className={`w-full min-h-[58px] px-4 py-3 rounded-2xl border-2 text-left font-bold text-lg transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-amber-100 text-red-900 font-mono-num text-sm font-black flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </span>

                          {answerLocked && isCorrectOpt && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {answerLocked && isSelectedOpt && !isCorrectOpt && (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {answerFeedback && (
                    <div
                      id="answer-status-bar"
                      className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 border ${
                        answerFeedback.type === 'correct'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : answerFeedback.type === 'wrong'
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      {answerFeedback.type === 'correct' && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                      {answerFeedback.type === 'wrong' && (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                      {answerFeedback.type === 'timeout' && (
                        <Clock className="w-4 h-4 shrink-0" />
                      )}
                      <span>{feedbackMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 3. 結算與排行榜畫面（全員共用同一份排行榜） */}
          {screen === 'RESULT' && (
            <section
              id="screen-result"
              className="bg-[#fffcf7] rounded-3xl shadow-xl border-2 border-amber-300/80 overflow-hidden animate-pop-in flex flex-col"
            >
              <div className="bg-gradient-to-r from-[#991b1b] via-[#b91c1c] to-[#14532d] px-4 py-4 text-white flex items-center justify-between gap-2 border-b border-amber-300/30">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-200">
                    {activeRecord ? t.resultEndedTag : t.resultPublicTag}
                  </p>
                  <h2 className="font-display text-[26px] sm:text-3xl font-black text-white mt-0.5 leading-tight">
                    {activeRecord ? t.resultTitle : t.publicBoardTitle}
                  </h2>
                </div>
                <button
                  id="back-to-welcome-btn"
                  type="button"
                  onClick={() => setScreen('WELCOME')}
                  className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t.backToHome}
                </button>
              </div>

              <div className="p-4 sm:p-5 flex flex-col gap-5">
                {activeRecord && (
                  <div className="rounded-2xl bg-gradient-to-br from-red-100/80 via-amber-100/80 to-emerald-100/80 border-2 border-amber-400/80 p-4">
                    <div className="grid grid-cols-3 gap-2 text-center items-end">
                      <div className="flex flex-col justify-between min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">
                          {t.colPlayer}
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-1 truncate">
                          {activeRecord.name}
                        </div>
                      </div>
                      <div className="border-x border-amber-400/60 px-1 flex flex-col justify-between min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">
                          {t.colScore}
                        </div>
                        <div className="text-2xl font-black text-emerald-800 font-mono-num mt-0.5 whitespace-nowrap">
                          {activeRecord.score}/{activeRecord.totalQuestions || TOTAL_QUESTIONS}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">
                          {t.colTime}
                        </div>
                        <div className="text-2xl font-black text-red-700 font-mono-num mt-0.5 whitespace-nowrap">
                          {Number(activeRecord.totalTime).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-sm font-semibold text-slate-700 mt-3 pt-2.5 border-t border-amber-300/80 flex items-center justify-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        {activeRecord.score === (activeRecord.totalQuestions || TOTAL_QUESTIONS)
                          ? t.evalPerfect
                          : activeRecord.score >=
                              Math.ceil((activeRecord.totalQuestions || TOTAL_QUESTIONS) * 0.6)
                            ? t.evalGreat
                            : t.evalKeepGoing}
                      </span>
                    </p>
                  </div>
                )}

                {playerResults.length > 0 && (
                  <button
                    id="open-review-btn"
                    type="button"
                    onClick={() => setIsReviewOpen(true)}
                    className="w-full min-h-[54px] px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black text-lg sm:text-xl transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    {t.reviewButton(playerResults.length)}
                  </button>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                      <span>{t.leaderboardTitle}</span>
                    </h3>
                    <span className="text-xs text-slate-500 text-right whitespace-nowrap">
                      {t.leaderboardRule}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-white">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead>
                        <tr className="bg-amber-100/70 border-b border-amber-300/70 text-sm sm:text-base font-bold text-slate-700">
                          <th className="py-3 px-3 w-16 whitespace-nowrap">{t.thRank}</th>
                          <th className="py-3 px-2 whitespace-nowrap">{t.thPlayer}</th>
                          <th className="py-3 px-2 text-right w-16 whitespace-nowrap">{t.thCorrect}</th>
                          <th className="py-3 px-3 text-right w-28 whitespace-nowrap">{t.thTime}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 text-sm sm:text-base">
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 px-4 text-center text-slate-400">
                              {t.boardEmpty}
                            </td>
                          </tr>
                        ) : (
                          leaderboard.map((item, idx) => {
                            const isCurrent = activeRecord?.id === item.id;
                            const rankDisplay =
                              idx === 0
                                ? '🥇 1'
                                : idx === 1
                                  ? '🥈 2'
                                  : idx === 2
                                    ? '🥉 3'
                                    : String(idx + 1);
                            return (
                              <tr
                                key={item.id}
                                className={
                                  isCurrent ? 'bg-amber-50 font-semibold' : 'hover:bg-amber-50/40'
                                }
                              >
                                <td className="py-3 px-3 font-mono-num text-slate-700 whitespace-nowrap">
                                  {rankDisplay}
                                </td>
                                <td className="py-3 px-2 text-slate-900 truncate">
                                  {item.name}
                                  {isCurrent && (
                                    <span className="ml-1 text-xs font-bold text-red-700">
                                      {t.currentTag}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-right font-mono-num font-bold text-emerald-700 whitespace-nowrap">
                                  {item.score}/{item.totalQuestions || TOTAL_QUESTIONS}
                                </td>
                                <td className="py-3 px-3 text-right font-mono-num text-slate-700 whitespace-nowrap">
                                  {Number(item.totalTime).toFixed(2)}s
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <ReviewModal
        isOpen={isReviewOpen}
        lang={lang}
        totalQuestions={TOTAL_QUESTIONS}
        results={playerResults}
        onClose={() => setIsReviewOpen(false)}
      />
    </div>
  );
}
