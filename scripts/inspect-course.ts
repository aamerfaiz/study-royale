import { parseCourse } from './parse-course.ts';

const course = parseCourse('docs/courses/001-course-ai-fullstack-engineer.md');

let nodes = 0;
let withContent = 0;
let questions = 0;

console.log(`${course.title}\n${course.subject} — ${course.sections.length} sections\n`);
for (const s of course.sections) {
  nodes += s.nodes.length;
  withContent += s.nodes.filter((n) => n.content).length;
  questions += s.quiz?.questions.length ?? 0;
  const missing = s.nodes.filter((n) => !n.content && n.requirement_type !== 'quiz');
  console.log(
    `  ${s.order}. ${s.title.padEnd(40)} ${String(s.nodes.length).padStart(2)} nodes` +
      `  quiz:${s.quiz ? String(s.quiz.questions.length).padStart(2) + 'q' : '  —'}` +
      (missing.length ? `   ${missing.length} without lesson` : ''),
  );
}
console.log(
  `\nTotal: ${nodes} nodes, ${withContent} with lesson content, ${questions} quiz questions`,
);
