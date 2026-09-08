import { mkdirSync, writeFileSync } from 'node:fs';
import { parseCourse } from './parse-course.ts';

/**
 * Writes the merged course (roadmap + quizzes + lesson bodies) as one JSON file
 * in the shape seed_course_section() consumes. Committed so the seed input is
 * reviewable on its own, rather than only existing inside a markdown doc.
 */
const course = parseCourse('docs/courses/001-course-ai-fullstack-engineer.md');

mkdirSync('supabase/seed', { recursive: true });
writeFileSync(
  'supabase/seed/course-001-ai-fullstack-engineer.json',
  JSON.stringify(
    {
      roadmap: {
        title: course.title,
        subject: course.subject,
        description: course.description,
        slug: 'ai-fullstack-engineer',
      },
      sections: course.sections,
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `Wrote supabase/seed/course-001-ai-fullstack-engineer.json — ` +
    `${course.sections.length} sections, ` +
    `${course.sections.reduce((n, s) => n + s.nodes.length, 0)} nodes, ` +
    `${course.sections.reduce((n, s) => n + (s.quiz?.questions.length ?? 0), 0)} questions`,
);
