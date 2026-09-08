/**
 * Seeds the official course into Supabase.
 *
 *   npm run seed:course              # writes to the database (needs a service key)
 *   npm run seed:course -- --sql-out ./out   # emits one .sql file per section
 *
 * Course content is read-only to clients by design, so this writes with the
 * service role key past RLS. The --sql-out mode exists for environments where
 * the key isn't available: the statements can be run from the Supabase SQL
 * editor instead.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCourse } from './parse-course.ts';

const COURSE_PATH = 'docs/courses/001-course-ai-fullstack-engineer.md';
const SLUG = 'ai-fullstack-engineer';

function sqlLiteral(value: string): string {
  // Dollar-quoting keeps markdown lesson bodies (quotes, backslashes, newlines)
  // intact without escaping every character.
  let tag = 'seed';
  while (value.includes(`$${tag}$`)) tag += 'x';
  return `$${tag}$${value}$${tag}$`;
}

async function main() {
  const args = process.argv.slice(2);
  const sqlOutIndex = args.indexOf('--sql-out');
  const sqlOut = sqlOutIndex >= 0 ? args[sqlOutIndex + 1] : null;

  const course = parseCourse(COURSE_PATH);
  const roadmap = {
    title: course.title,
    subject: course.subject,
    description: course.description,
    slug: SLUG,
  };

  const nodeCount = course.sections.reduce((n, s) => n + s.nodes.length, 0);
  const questionCount = course.sections.reduce(
    (n, s) => n + (s.quiz?.questions.length ?? 0),
    0,
  );
  console.log(
    `${course.title}: ${course.sections.length} sections, ${nodeCount} nodes, ${questionCount} quiz questions`,
  );

  if (sqlOut) {
    mkdirSync(sqlOut, { recursive: true });
    for (const section of course.sections) {
      const statement =
        `select public.seed_course_section(\n  ${sqlLiteral(JSON.stringify(roadmap))}::jsonb,\n  ${sqlLiteral(JSON.stringify(section))}::jsonb\n);\n`;
      const file = join(sqlOut, `section-${String(section.order).padStart(2, '0')}.sql`);
      writeFileSync(file, statement);
      console.log(`  wrote ${file} (${section.nodes.length} nodes)`);
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --sql-out <dir>.',
    );
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const section of course.sections) {
    const { error } = await supabase.rpc('seed_course_section', {
      p_roadmap: roadmap,
      p_section: section,
    });
    if (error) throw new Error(`Section ${section.order} failed: ${error.message}`);
    console.log(`  seeded ${section.order}. ${section.title} (${section.nodes.length} nodes)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
