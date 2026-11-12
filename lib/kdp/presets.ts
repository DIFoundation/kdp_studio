import type { BookCategory } from "@/lib/types";

/** Recommended wizard presets per category — sensible defaults the user can override. */
export interface CategoryPreset {
  category: BookCategory;
  label: string;
  description: string;
  defaults: {
    formats: string[];
    trimSize: string;
    needsIllustrations: boolean;
    needsCover: boolean;
    wordCountTarget?: number;
    pageCountTarget?: number;
    chapterCount?: number;
    ageRange?: string;
    tone?: string;
  };
  subcategories: string[];
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    category: "fiction",
    label: "Fiction & Literature",
    description: "Novels, novellas, short stories, poetry",
    defaults: {
      formats: ["paperback", "kindle"],
      trimSize: "5.5x8.5",
      needsIllustrations: false,
      needsCover: true,
      wordCountTarget: 60000,
      chapterCount: 20,
      tone: "engaging, polished",
    },
    subcategories: [
      "Romance", "Mystery & Detective", "Thriller & Suspense", "Fantasy",
      "Science Fiction", "Horror", "Adventure", "Historical Fiction",
      "Contemporary Fiction", "Drama", "Short Stories", "Novella",
      "Poetry & Anthologies", "Inspirational Fiction",
    ],
  },
  {
    category: "childrens",
    label: "Children's Books",
    description: "Picture books, early readers, bedtime stories",
    defaults: {
      formats: ["paperback", "kindle"],
      trimSize: "8.5x11",
      needsIllustrations: true,
      needsCover: true,
      wordCountTarget: 800,
      pageCountTarget: 32,
      ageRange: "4-6",
      tone: "warm, playful, gentle",
    },
    subcategories: [
      "Bedtime Stories", "Fairy Tales", "Moral Stories", "Animal Adventures",
      "Educational Stories", "Alphabet Books", "Number Books", "Picture Books",
      "Early Readers", "Adventure Stories", "Children's Poetry",
    ],
  },
  {
    category: "colouring",
    label: "Colouring Books",
    description: "Line-art colouring and activity pages",
    defaults: {
      formats: ["paperback"],
      trimSize: "8.5x11",
      needsIllustrations: true,
      needsCover: true,
      pageCountTarget: 50,
      tone: "clean line art",
    },
    subcategories: [
      "Animals", "Dinosaurs", "Flowers & Gardens", "Princesses & Fantasy",
      "Vehicles", "Space & Planets", "Alphabet", "Numbers & Shapes",
      "Mandalas", "Geometric Patterns", "Nature", "Christmas & Seasonal",
      "Adult Relaxation", "Mindfulness",
    ],
  },
  {
    category: "educational",
    label: "Educational & Activity Books",
    description: "Workbooks, exercises, learning activities",
    defaults: {
      formats: ["paperback"],
      trimSize: "8.5x11",
      needsIllustrations: true,
      needsCover: true,
      pageCountTarget: 60,
      ageRange: "6-9",
      tone: "clear, encouraging",
    },
    subcategories: [
      "Handwriting Practice", "Alphabet Tracing", "Math Workbooks",
      "Word Searches", "Mazes", "Puzzles", "Reading Comprehension",
      "Vocabulary", "Science Workbooks", "Geography", "Logic Games",
      "Learning Activities", "Teacher Resources",
    ],
  },
  {
    category: "nonfiction",
    label: "Nonfiction",
    description: "Self-help, business, education, biography",
    defaults: {
      formats: ["paperback", "kindle", "hardcover"],
      trimSize: "6x9",
      needsIllustrations: false,
      needsCover: true,
      wordCountTarget: 50000,
      chapterCount: 12,
      tone: "authoritative, practical",
    },
    subcategories: [
      "Personal Development", "Self-Help", "Productivity", "Business",
      "Entrepreneurship", "Financial Literacy", "Leadership",
      "Psychology", "Health Education", "Lifestyle", "History",
      "Biography", "Technology", "Career Development", "Educational Guides",
    ],
  },
  {
    category: "journal",
    label: "Journals, Planners & Low-Content",
    description: "Journals, trackers, planners, notebooks",
    defaults: {
      formats: ["paperback", "kindle"],
      trimSize: "6x9",
      needsIllustrations: false,
      needsCover: true,
      pageCountTarget: 120,
      tone: "clean, minimal",
    },
    subcategories: [
      "Daily Journals", "Gratitude Journals", "Prayer Journals",
      "Fitness Trackers", "Budget Planners", "Goal Setting",
      "Travel Journals", "Reading Logs", "Meal Planners",
      "Notebooks", "Habit Trackers", "Business Planners",
    ],
  },
];

export function getPreset(category: BookCategory): CategoryPreset | undefined {
  return CATEGORY_PRESETS.find((p) => p.category === category);
}
