-- AI KDP Publishing Studio — initial schema
-- Run with: supabase db push  (or paste into SQL editor)

create extension if not exists "pgcrypto";

-- ── Profiles ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  pen_name text,
  avatar_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Projects (one per book) ──────────────────────────────
create type project_status as enum (
  'draft','concept','blueprint','writing','editing','illustrating',
  'cover','exporting','review','completed','archived'
);

create type book_category as enum (
  'fiction','childrens','colouring','educational','nonfiction','journal'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  working_title text,
  category book_category not null,
  subcategory text,
  target_audience text,
  age_range text,
  topic text,
  tone text,
  language text not null default 'en',
  word_count_target integer,
  page_count_target integer,
  chapter_count integer,
  formats text[] not null default '{paperback}',
  trim_size text,
  orientation text not null default 'portrait',
  needs_illustrations boolean not null default false,
  needs_cover boolean not null default true,
  author_name text,
  status project_status not null default 'draft',
  wizard_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_idx on public.projects(user_id, updated_at desc);

-- ── Book bible (1:1 with project) ────────────────────────
create table public.book_bibles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  premise text,
  themes jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  world_building jsonb not null default '{}'::jsonb,
  style_guide jsonb not null default '{}'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  continuity_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Sections (chapters / exercises / pages) ──────────────
create type section_type as enum (
  'front_matter','chapter','scene','exercise','coloring_page',
  'back_matter','worksheet'
);
create type section_status as enum ('draft','in_review','approved','rejected');

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.sections(id) on delete cascade,
  order_index integer not null default 0,
  title text not null,
  type section_type not null default 'chapter',
  status section_status not null default 'draft',
  word_count_target integer,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sections_project_idx on public.sections(project_id, order_index);

-- ── Section versions (immutable snapshots) ───────────────
create table public.section_versions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  version integer not null,
  content text not null default '',
  source text not null default 'ai',        -- 'ai' | 'human'
  model text,
  approved boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(section_id, version)
);
create index section_versions_section_idx on public.section_versions(section_id, version desc);

-- ── Illustrations ────────────────────────────────────────
create type illustration_status as enum ('pending','generated','approved','rejected');

create table public.illustrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  kind text not null default 'scene',       -- scene|character_sheet|coloring_page|diagram|cover_element
  prompt text not null,
  negative_prompt text,
  style text,
  provider text,
  model text,
  storage_path text,
  status illustration_status not null default 'pending',
  page_mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index illustrations_project_idx on public.illustrations(project_id);

create table public.illustration_versions (
  id uuid primary key default gen_random_uuid(),
  illustration_id uuid not null references public.illustrations(id) on delete cascade,
  version integer not null,
  storage_path text not null,
  prompt text not null,
  created_at timestamptz not null default now(),
  unique(illustration_id, version)
);

-- ── Covers ───────────────────────────────────────────────
create type cover_type as enum ('kindle','paperback','hardcover');

create table public.covers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type cover_type not null,
  title text not null,
  subtitle text,
  author_name text,
  theme text,
  width_px integer,
  height_px integer,
  spine_width_px integer,
  concepts jsonb not null default '[]'::jsonb,  -- array of {prompt, storage_path, status}
  approved_concept integer,
  status illustration_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Exports ──────────────────────────────────────────────
create type export_format as enum ('docx','pdf','epub','print_pdf','cover_png','cover_jpg');

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  format export_format not null,
  storage_path text,
  file_size_bytes bigint,
  validation_report jsonb not null default '{}'::jsonb,
  status text not null default 'pending',  -- pending|processing|ready|failed
  created_at timestamptz not null default now()
);
create index exports_project_idx on public.exports(project_id);

-- ── Listings (KDP SEO) ───────────────────────────────────
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  title text,
  subtitle text,
  description text,
  keywords text[] not null default '{}',
  categories text[] not null default '{}',
  target_audience text,
  author_bio text,
  series_name text,
  series_description text,
  research_notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── QA reports ───────────────────────────────────────────
create type qa_severity as enum ('info','warning','error');

create table public.qa_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  check_type text not null,
  severity qa_severity not null default 'info',
  message text not null,
  section_id uuid references public.sections(id) on delete cascade,
  status text not null default 'open',   -- open|resolved|ignored
  created_at timestamptz not null default now()
);
create index qa_reports_project_idx on public.qa_reports(project_id, status);

-- ── Usage & cost tracking ────────────────────────────────
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  kind text not null,                 -- text|image
  provider text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  image_count integer,
  estimated_cost_usd numeric(10,6),
  mode text not null default 'standard',  -- economy|standard|premium
  created_at timestamptz not null default now()
);
create index usage_events_user_idx on public.usage_events(user_id, created_at desc);
create index usage_events_project_idx on public.usage_events(project_id);

-- ── AI disclosure records (KDP compliance) ───────────────
create table public.ai_disclosures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_type text not null,   -- text|illustration|translation|cover
  ai_generated boolean not null default true,
  ai_assisted boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.book_bibles enable row level security;
alter table public.sections enable row level security;
alter table public.section_versions enable row level security;
alter table public.illustrations enable row level security;
alter table public.illustration_versions enable row level security;
alter table public.covers enable row level security;
alter table public.exports enable row level security;
alter table public.listings enable row level security;
alter table public.qa_reports enable row level security;
alter table public.usage_events enable row level security;
alter table public.ai_disclosures enable row level security;

-- Helper: is project owned by caller?
create or replace function public.owns_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and user_id = auth.uid()
  );
$$;

-- Profiles: own row only
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Projects: full CRUD own
create policy "projects_all_own" on public.projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables: access via project ownership
create policy "bibles_all_owner" on public.book_bibles for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "sections_all_owner" on public.sections for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "section_versions_all_owner" on public.section_versions for all
  using (exists (select 1 from public.sections s where s.id = section_id and public.owns_project(s.project_id)))
  with check (exists (select 1 from public.sections s where s.id = section_id and public.owns_project(s.project_id)));
create policy "illustrations_all_owner" on public.illustrations for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "illustration_versions_all_owner" on public.illustration_versions for all
  using (exists (select 1 from public.illustrations i where i.id = illustration_id and public.owns_project(i.project_id)))
  with check (exists (select 1 from public.illustrations i where i.id = illustration_id and public.owns_project(i.project_id)));
create policy "covers_all_owner" on public.covers for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "exports_all_owner" on public.exports for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "listings_all_owner" on public.listings for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "qa_all_owner" on public.qa_reports for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "usage_all_own" on public.usage_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "disclosures_all_owner" on public.ai_disclosures for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create trigger touch_bibles before update on public.book_bibles for each row execute function public.touch_updated_at();
create trigger touch_sections before update on public.sections for each row execute function public.touch_updated_at();
create trigger touch_illustrations before update on public.illustrations for each row execute function public.touch_updated_at();
create trigger touch_covers before update on public.covers for each row execute function public.touch_updated_at();
