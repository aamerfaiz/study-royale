// Domain types for the Study Royale schema.
// Regenerate the exhaustive Supabase types with `npm run db:types` when the
// schema changes; this file is the hand-curated subset the app actually reads.

export type GroupType = 'solo' | 'duo' | 'trio' | 'squad';
export type MemberRole = 'owner' | 'member';
export type RequirementType = 'time' | 'checkoff' | 'quiz';
export type NodeStatus = 'not_started' | 'in_progress' | 'done';
export type XpReason = 'session' | 'daily_bonus' | 'quiz_pass' | 'achievement';

export type AppUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  streak_freezes_remaining: number;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  max_members: number;
  daily_goal_minutes: number;
  timezone: string;
  created_by: string;
  invite_code: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  joined_at: string;
  role: MemberRole;
};

export type Roadmap = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  source_type: 'official' | 'user_created' | 'ai_generated' | 'imported';
  visibility: 'private' | 'public';
  slug: string | null;
};

export type RoadmapSection = {
  id: string;
  roadmap_id: string;
  order_index: number;
  title: string;
};

export type RoadmapNode = {
  id: string;
  section_id: string;
  order_index: number;
  title: string;
  description: string | null;
  resource_url: string | null;
  /** Markdown lesson body — the primary study material (docs/11). */
  content: string | null;
  is_optional: boolean;
  requirement_type: RequirementType;
  requirement_value: number | null;
};

export type GroupRoadmap = {
  id: string;
  group_id: string;
  roadmap_id: string;
  current_section_index: number;
  started_at: string;
};

export type MemberNodeProgress = {
  id: string;
  group_roadmap_id: string;
  roadmap_node_id: string;
  user_id: string;
  status: NodeStatus;
  completed_at: string | null;
};

export type StudySession = {
  id: string;
  user_id: string;
  group_id: string | null;
  roadmap_node_id: string | null;
  started_at: string;
  duration_minutes: number;
  subject: string | null;
  completed_at: string | null;
};

export type SectionQuiz = {
  id: string;
  section_id: string;
  title: string;
  passing_score_pct: number;
};

/** A quiz question as the client sees it — no answer key (docs/10). */
export type QuizQuestionForClient = {
  id: string;
  order_index: number;
  question_text: string;
  options: string[];
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  group_roadmap_id: string;
  user_id: string;
  attempt_number: number;
  score_pct: number;
  passed: boolean;
  completed_at: string | null;
};

export type LogSessionResult = {
  session_id: string;
  xp_awarded: number;
  daily_bonus: number;
  new_total_xp: number;
  new_level: number;
};

export type QuizGradedQuestion = {
  question_id: string;
  order_index: number;
  selected_option_index: number | null;
  correct_option_index: number;
  correct: boolean;
  explanation: string | null;
};

export type SubmitQuizResult = {
  attempt_id: string;
  score_pct: number;
  passed: boolean;
  first_pass: boolean;
  xp_awarded: number;
  results: QuizGradedQuestion[];
};
