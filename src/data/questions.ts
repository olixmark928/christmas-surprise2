export const TOTAL_QUESTIONS = 6;
export const MEMORIZE_SECONDS = 8;
export const ANSWER_SECONDS = 8;
export const RING_RADIUS = 42;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // 263.89

export type Language = 'zh' | 'vi';

export interface QuestionLocaleContent {
  shortTitle: string;
  question: string;
  options: string[];
}

export interface QuestionItem {
  id: string;
  zh: QuestionLocaleContent;
  vi: QuestionLocaleContent;
  correctIndex: number;
  imageUrl?: string;
  svg?: string;
}

export interface PlayerQuestionResult {
  question: QuestionItem;
  selectedIndex: number | null; // null means timed out
  isCorrect: boolean;
  timeTaken: number;
}

export interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
  totalQuestions: number;
  totalTime: number;
  createdAt: number;
  results?: {
    questionId: string;
    selectedIndex: number | null;
    isCorrect: boolean;
    timeTaken: number;
  }[];
}

export const QUESTION_POOL: QuestionItem[] = [
  {
    id: 'fireplace-roast',
    zh: {
      shortTitle: '壁爐烤食物',
      question: '剛剛壁爐內正在烤什麼？',
      options: ['烤肉', '烤鴨', '烤雞', '烤小鳥'],
    },
    vi: {
      shortTitle: 'Món nướng trong lò sưởi',
      question: 'Vừa rồi trong lò sưởi đang nướng món gì?',
      options: ['Thịt nướng', 'Vịt quay', 'Gà quay', 'Chim nướng'],
    },
    correctIndex: 2,
    imageUrl: './assets/aistudio/_4_0fa42984.png',
  },
  {
    id: 'gift-boxes-count',
    zh: {
      shortTitle: '禮物盒數量',
      question: '剛剛地上總共擺了幾個禮物盒？',
      options: ['2 個', '3 個', '4 個', '5 個'],
    },
    vi: {
      shortTitle: 'Số lượng hộp quà',
      question: 'Vừa rồi trên sàn có tổng cộng bao nhiêu hộp quà?',
      options: ['2 hộp', '3 hộp', '4 hộp', '5 hộp'],
    },
    correctIndex: 2,
    imageUrl: './assets/aistudio/_5_b0f8edb7.png',
  },
  {
    id: 'tree-star-color',
    zh: {
      shortTitle: '聖誕樹頂星星',
      question: '剛剛聖誕樹最頂端的星星是什麼顏色？',
      options: ['黃色', '紅色', '藍色', '紫色'],
    },
    vi: {
      shortTitle: 'Ngôi sao đỉnh cây thông',
      question: 'Vừa rồi ngôi sao trên đỉnh cây thông Noel có màu gì?',
      options: ['Màu vàng', 'Màu đỏ', 'Màu xanh dương', 'Màu tím'],
    },
    correctIndex: 0,
    imageUrl: './assets/aistudio/Gemini_Generated_Image_hvl9nxhvl9nxhvl9_5a43d937.jfif',
  },
  {
    id: 'gingerbread-candy-canes',
    zh: {
      shortTitle: '薑餅人枴杖糖',
      question: '剛剛圖中總共有幾根枴杖糖？',
      options: ['5 根', '6 根', '7 根', '8 根'],
    },
    vi: {
      shortTitle: 'Số kẹo gậy',
      question: 'Vừa rồi trong hình có tổng cộng bao nhiêu chiếc kẹo gậy?',
      options: ['5 chiếc', '6 chiếc', '7 chiếc', '8 chiếc'],
    },
    correctIndex: 3,
    imageUrl: './assets/aistudio/_2_ce3ddc9f.png',
  },
  {
    id: 'reindeer-scarf',
    zh: {
      shortTitle: '馴鹿圍巾顏色',
      question: '剛剛馴鹿戴著什麼顏色的圍巾？',
      options: ['黃色圍巾', '紫色圍巾', '粉紅色圍巾', '紅色圍巾'],
    },
    vi: {
      shortTitle: 'Màu khăn tuần lộc',
      question: 'Vừa rồi tuần lộc quàng chiếc khăn màu gì?',
      options: ['Khăn vàng', 'Khăn tím', 'Khăn hồng', 'Khăn đỏ'],
    },
    correctIndex: 3,
    imageUrl: './assets/aistudio/_3_456e7e2f.png',
  },
  {
    id: 'christmas-candles',
    zh: {
      shortTitle: '最長的聖誕蠟燭',
      question: '剛剛圖中最長的蠟燭是什麼顏色？',
      options: ['藍色', '紅色', '綠色', '紫色'],
    },
    vi: {
      shortTitle: 'Cây nến dài nhất',
      question: 'Vừa rồi cây nến dài nhất trong hình có màu gì?',
      options: ['Màu xanh dương', 'Màu đỏ', 'Màu xanh lá', 'Màu tím'],
    },
    correctIndex: 2,
    imageUrl: './assets/aistudio/_1_caefe496.png',
  },
];

export function pickRandomQuestions(count: number): QuestionItem[] {
  const copy = [...QUESTION_POOL];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
