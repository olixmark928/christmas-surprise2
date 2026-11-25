import { CheckCircle2, X, XCircle } from 'lucide-react';
import type { Language, PlayerQuestionResult } from '../data/questions';
import { getUiText } from '../i18n';

interface ReviewModalProps {
  isOpen: boolean;
  lang: Language;
  totalQuestions: number;
  results: PlayerQuestionResult[];
  onClose: () => void;
}

export function ReviewModal({
  isOpen,
  lang,
  totalQuestions,
  results,
  onClose,
}: ReviewModalProps) {
  if (!isOpen) return null;

  const t = getUiText(lang);

  return (
    <div
      id="review-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-[#fffcf7] rounded-2xl shadow-2xl max-w-[430px] w-full max-h-[88dvh] flex flex-col overflow-hidden animate-pop-in border border-amber-300/60">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h3 id="review-modal-title" className="text-xl font-bold text-slate-900">
            {t.reviewModalTitle(results.length || totalQuestions)}
          </h3>
          <button
            id="close-review-btn"
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label={t.closeReviewAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id="review-items-container" className="p-6 overflow-y-auto space-y-6">
          {results.map((res, idx) => {
            const qLocale = res.question[lang];
            const userAnsText =
              res.selectedIndex === null
                ? t.timeoutAnswerText
                : qLocale.options[res.selectedIndex];
            const correctAnsText = qLocale.options[res.question.correctIndex];

            return (
              <div
                key={res.question.id}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-900">
                    {t.reviewItemPrefix(idx + 1, qLocale.shortTitle)}
                  </span>
                  {res.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      {t.reviewCorrectTag(res.timeTaken.toFixed(2))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 shrink-0">
                      <XCircle className="w-4 h-4" />
                      {res.selectedIndex === null
                        ? t.reviewTimeoutTag(res.timeTaken.toFixed(2))
                        : t.reviewWrongTag(res.timeTaken.toFixed(2))}
                    </span>
                  )}
                </div>

                {res.question.imageUrl ? (
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-[#fffcf7] flex items-center justify-center">
                    <img
                      src={res.question.imageUrl}
                      alt={qLocale.shortTitle}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-white"
                    dangerouslySetInnerHTML={{ __html: res.question.svg ?? '' }}
                  />
                )}

                <p className="text-sm font-bold text-slate-900">{qLocale.question}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500">{t.yourAnswerLabel}</span>
                    <span
                      className={`font-bold ${res.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}
                    >
                      {userAnsText}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700">{t.correctAnswerLabel}</span>
                    <span className="font-bold text-emerald-900">{correctAnsText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            id="close-review-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {t.closeReviewButton}
          </button>
        </div>
      </div>
    </div>
  );
}
