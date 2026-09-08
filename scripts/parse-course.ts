import { readFileSync } from 'node:fs';

/**
 * The course ships as one markdown file with three fenced JSON blocks: the
 * roadmap, the section quizzes, and the lesson bodies. They are keyed to each
 * other by (section_order, node_title) rather than by id, so this merges them
 * into the shape the tables expect (docs/11-node-content-model.md).
 */

export type CourseNode = {
  title: string;
  description: string | null;
  resource_url: string | null;
  is_optional: boolean;
  requirement_type: 'time' | 'checkoff' | 'quiz';
  requirement_value: number | null;
  content: string | null;
};

export type CourseQuiz = {
  title: string;
  passing_score_pct: number;
  questions: {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string | null;
  }[];
};

export type CourseSection = {
  title: string;
  order: number;
  nodes: CourseNode[];
  quiz: CourseQuiz | null;
};

export type Course = {
  title: string;
  subject: string;
  description: string;
  sections: CourseSection[];
};

function jsonBlocks(markdown: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const fence = /```json\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(markdown)) !== null) {
    blocks.push(JSON.parse(match[1]) as Record<string, unknown>);
  }
  return blocks;
}

export function parseCourse(path: string): Course {
  const blocks = jsonBlocks(readFileSync(path, 'utf8'));

  const roadmap = blocks.find((b) => 'sections' in b);
  const quizzes = blocks.find((b) => 'quizzes' in b);
  const lessons = blocks.find((b) => 'lessons' in b);

  if (!roadmap) throw new Error('No roadmap block (expected a "sections" key)');
  if (!quizzes) throw new Error('No quiz block (expected a "quizzes" key)');
  if (!lessons) throw new Error('No lesson block (expected a "lessons" key)');

  // Lesson bodies are keyed by (section_order, node_title), not by id.
  const lessonByKey = new Map<string, string>();
  for (const l of lessons.lessons as {
    section_order: number;
    node_title: string;
    content: string;
  }[]) {
    lessonByKey.set(`${l.section_order}::${l.node_title}`, l.content);
  }

  const quizBySection = new Map<number, CourseQuiz>();
  for (const q of quizzes.quizzes as {
    section_order: number;
    title: string;
    passing_score_pct?: number;
    questions: {
      question_text: string;
      options: string[];
      correct_option_index: number;
      explanation?: string;
    }[];
  }[]) {
    quizBySection.set(q.section_order, {
      title: q.title,
      passing_score_pct: q.passing_score_pct ?? 70,
      questions: q.questions.map((question) => ({
        question_text: question.question_text,
        options: question.options,
        correct_option_index: question.correct_option_index,
        explanation: question.explanation ?? null,
      })),
    });
  }

  const usedLessons = new Set<string>();

  const sections: CourseSection[] = (
    roadmap.sections as {
      title: string;
      order: number;
      nodes: {
        title: string;
        description?: string;
        resource_url?: string;
        is_optional?: boolean;
        requirement_type: CourseNode['requirement_type'];
        requirement_value?: number;
      }[];
    }[]
  ).map((section) => ({
    title: section.title,
    order: section.order,
    quiz: quizBySection.get(section.order) ?? null,
    nodes: section.nodes.map((node) => {
      const key = `${section.order}::${node.title}`;
      const content = lessonByKey.get(key) ?? null;
      if (content !== null) usedLessons.add(key);
      return {
        title: node.title,
        description: node.description ?? null,
        resource_url: node.resource_url ?? null,
        is_optional: Boolean(node.is_optional),
        requirement_type: node.requirement_type,
        requirement_value: node.requirement_value ?? null,
        content,
      };
    }),
  }));

  // A lesson matching no node means the blocks have drifted apart, which would
  // silently ship a node with no lesson. Fail loudly instead.
  const orphans = [...lessonByKey.keys()].filter((k) => !usedLessons.has(k));
  if (orphans.length > 0) {
    throw new Error(
      `${orphans.length} lesson(s) matched no node: ${orphans.slice(0, 5).join(', ')}`,
    );
  }

  // Quizzes referencing a section that doesn't exist would silently vanish.
  const sectionOrders = new Set(sections.map((s) => s.order));
  for (const order of quizBySection.keys()) {
    if (!sectionOrders.has(order)) {
      throw new Error(`Quiz references section_order ${order}, which has no section`);
    }
  }

  return {
    title: roadmap.title as string,
    subject: roadmap.subject as string,
    description: roadmap.description as string,
    sections,
  };
}
