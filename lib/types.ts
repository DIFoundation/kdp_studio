/** Shared domain types mirroring the database schema. */

export type BookCategory =
  | "fiction"
  | "childrens"
  | "colouring"
  | "educational"
  | "nonfiction"
  | "journal";

export type ProjectStatus =
  | "draft"
  | "concept"
  | "blueprint"
  | "writing"
  | "editing"
  | "illustrating"
  | "cover"
  | "exporting"
  | "review"
  | "completed"
  | "archived";

export type SectionType =
  | "front_matter"
  | "chapter"
  | "scene"
  | "exercise"
  | "coloring_page"
  | "back_matter"
  | "worksheet";

export type SectionStatus = "draft" | "in_review" | "approved" | "rejected";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  working_title: string | null;
  category: BookCategory;
  subcategory: string | null;
  target_audience: string | null;
  age_range: string | null;
  topic: string | null;
  tone: string | null;
  language: string;
  word_count_target: number | null;
  page_count_target: number | null;
  chapter_count: number | null;
  formats: string[];
  trim_size: string | null;
  orientation: string;
  needs_illustrations: boolean;
  needs_cover: boolean;
  author_name: string | null;
  status: ProjectStatus;
  wizard_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  parent_id: string | null;
  order_index: number;
  title: string;
  type: SectionType;
  status: SectionStatus;
  word_count_target: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookBible {
  id: string;
  project_id: string;
  premise: string | null;
  themes: unknown[];
  characters: unknown[];
  world_building: Record<string, unknown>;
  style_guide: Record<string, unknown>;
  timeline: unknown[];
  continuity_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionVersion {
  id: string;
  section_id: string;
  version: number;
  content: string;
  source: "ai" | "human";
  model: string | null;
  approved: boolean;
  created_by: string | null;
  created_at: string;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  concept: "Concept",
  blueprint: "Blueprint",
  writing: "Writing",
  editing: "Editing",
  illustrating: "Illustrating",
  cover: "Cover Design",
  exporting: "Exporting",
  review: "In Review",
  completed: "Completed",
  archived: "Archived",
};

export const CATEGORY_LABELS: Record<BookCategory, string> = {
  fiction: "Fiction & Literature",
  childrens: "Children's Books",
  colouring: "Colouring Books",
  educational: "Educational",
  nonfiction: "Nonfiction",
  journal: "Journals & Planners",
};
