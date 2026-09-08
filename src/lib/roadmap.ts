import { createClient } from '@/lib/supabase/server';
import type { NodeStatus, RequirementType } from '@/lib/types';

export type RoadmapNodeView = {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  resource_url: string | null;
  content: string | null;
  is_optional: boolean;
  requirement_type: RequirementType;
  requirement_value: number | null;
  /** The viewer's own status. */
  status: NodeStatus;
  /** Minutes the viewer has logged against this node. */
  minutesLogged: number;
  /** Every member's status, for the "waiting on Sam" moment. */
  memberStatus: { user_id: string; status: NodeStatus }[];
};

export type QuizView = {
  id: string;
  title: string;
  passing_score_pct: number;
  questionCount: number;
  /** The viewer's best attempt, if any. */
  bestScore: number | null;
  passed: boolean;
  /** Which members have passed. */
  passedBy: Set<string>;
};

export type SectionView = {
  id: string;
  order_index: number;
  title: string;
  nodes: RoadmapNodeView[];
  quiz: QuizView | null;
  /** Unlocked for the group: at or before the group's current phase. */
  unlocked: boolean;
  isCurrent: boolean;
  /** The viewer has finished every required node and passed the quiz. */
  clearedByMe: boolean;
  /** Members who have cleared this section. */
  clearedBy: Set<string>;
};

export type RoadmapView = {
  groupRoadmapId: string;
  roadmapId: string;
  title: string;
  description: string | null;
  currentSectionIndex: number;
  sections: SectionView[];
};

/**
 * A member clears a section when every required node is done for them and, if
 * the section has a quiz, they have passed it. Optional nodes never block
 * (docs/05); sections without a quiz skip that half of the check (docs/10).
 */
function clearedBy(
  userId: string,
  nodes: RoadmapNodeView[],
  quiz: QuizView | null,
): boolean {
  const requiredDone = nodes
    .filter((n) => !n.is_optional && n.requirement_type !== 'quiz')
    .every((n) => n.memberStatus.find((m) => m.user_id === userId)?.status === 'done');

  if (!requiredDone) return false;
  return quiz ? quiz.passedBy.has(userId) : true;
}

export async function loadRoadmap(
  groupId: string,
  userId: string,
): Promise<RoadmapView | null> {
  const supabase = await createClient();

  const { data: groupRoadmap } = await supabase
    .from('group_roadmaps')
    .select('id, roadmap_id, current_section_index, roadmaps(title, description)')
    .eq('group_id', groupId)
    .maybeSingle();

  if (!groupRoadmap) return null;

  const roadmapMeta = Array.isArray(groupRoadmap.roadmaps)
    ? groupRoadmap.roadmaps[0]
    : groupRoadmap.roadmaps;

  const [{ data: sections }, { data: progress }, { data: attempts }, { data: sessions }] =
    await Promise.all([
      supabase
        .from('roadmap_sections')
        .select(
          'id, order_index, title, roadmap_nodes(id, order_index, title, description, resource_url, content, is_optional, requirement_type, requirement_value), section_quizzes(id, title, passing_score_pct, quiz_questions(id))',
        )
        .eq('roadmap_id', groupRoadmap.roadmap_id)
        .order('order_index', { ascending: true }),
      supabase
        .from('member_node_progress')
        .select('roadmap_node_id, user_id, status')
        .eq('group_roadmap_id', groupRoadmap.id),
      supabase
        .from('quiz_attempts')
        .select('quiz_id, user_id, score_pct, passed')
        .eq('group_roadmap_id', groupRoadmap.id),
      supabase
        .from('study_sessions')
        .select('roadmap_node_id, duration_minutes')
        .eq('user_id', userId)
        .not('roadmap_node_id', 'is', null),
    ]);

  const statusByNode = new Map<string, { user_id: string; status: NodeStatus }[]>();
  for (const row of progress ?? []) {
    const list = statusByNode.get(row.roadmap_node_id) ?? [];
    list.push({ user_id: row.user_id, status: row.status as NodeStatus });
    statusByNode.set(row.roadmap_node_id, list);
  }

  const minutesByNode = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (!s.roadmap_node_id) continue;
    minutesByNode.set(
      s.roadmap_node_id,
      (minutesByNode.get(s.roadmap_node_id) ?? 0) + s.duration_minutes,
    );
  }

  const built: SectionView[] = (sections ?? []).map((section) => {
    const nodes: RoadmapNodeView[] = (section.roadmap_nodes ?? [])
      .map((n) => {
        const memberStatus = statusByNode.get(n.id) ?? [];
        return {
          id: n.id,
          order_index: n.order_index,
          title: n.title,
          description: n.description,
          resource_url: n.resource_url,
          content: n.content,
          is_optional: n.is_optional,
          requirement_type: n.requirement_type as RequirementType,
          requirement_value: n.requirement_value,
          status:
            (memberStatus.find((m) => m.user_id === userId)?.status as NodeStatus) ??
            'not_started',
          minutesLogged: minutesByNode.get(n.id) ?? 0,
          memberStatus,
        };
      })
      .sort((a, b) => a.order_index - b.order_index);

    const rawQuiz = Array.isArray(section.section_quizzes)
      ? section.section_quizzes[0]
      : section.section_quizzes;

    let quiz: QuizView | null = null;
    if (rawQuiz) {
      const mine = (attempts ?? []).filter(
        (a) => a.quiz_id === rawQuiz.id && a.user_id === userId,
      );
      quiz = {
        id: rawQuiz.id,
        title: rawQuiz.title,
        passing_score_pct: rawQuiz.passing_score_pct,
        questionCount: rawQuiz.quiz_questions?.length ?? 0,
        bestScore: mine.length ? Math.max(...mine.map((a) => a.score_pct)) : null,
        passed: mine.some((a) => a.passed),
        passedBy: new Set(
          (attempts ?? []).filter((a) => a.quiz_id === rawQuiz.id && a.passed).map((a) => a.user_id),
        ),
      };
    }

    return {
      id: section.id,
      order_index: section.order_index,
      title: section.title,
      nodes,
      quiz,
      unlocked: section.order_index <= groupRoadmap.current_section_index,
      isCurrent: section.order_index === groupRoadmap.current_section_index,
      clearedByMe: clearedBy(userId, nodes, quiz),
      clearedBy: new Set<string>(),
    };
  });

  // Which members have cleared each section — drives the "waiting on" copy.
  const memberIds = new Set<string>();
  for (const row of progress ?? []) memberIds.add(row.user_id);
  memberIds.add(userId);

  for (const section of built) {
    for (const id of memberIds) {
      if (clearedBy(id, section.nodes, section.quiz)) section.clearedBy.add(id);
    }
  }

  return {
    groupRoadmapId: groupRoadmap.id,
    roadmapId: groupRoadmap.roadmap_id,
    title: roadmapMeta?.title ?? 'Course',
    description: roadmapMeta?.description ?? null,
    currentSectionIndex: groupRoadmap.current_section_index,
    sections: built,
  };
}
