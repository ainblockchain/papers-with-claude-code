/**
 * Generate static stage JSON files for a course from its courses.json.
 *
 * Usage:
 *   npx tsx scripts/generate-course-stages.ts <paperSlug> <courseSlug>
 *
 * Reads: ../knowledge-graph-builder/courseGenerator/awesome-papers-with-claude-code/{paperSlug}/{courseSlug}/knowledge/courses.json
 * Writes: public/courses/{paperSlug}--{courseSlug}/stages/{n}.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { generateStageData } from '../src/lib/server/map-generator';

async function main() {
  const [paperSlug, courseSlug] = process.argv.slice(2);
  if (!paperSlug || !courseSlug) {
    console.error('Usage: npx tsx scripts/generate-course-stages.ts <paperSlug> <courseSlug>');
    process.exit(1);
  }

  const coursesJsonPath = path.join(
    __dirname,
    '..',
    '..',
    'knowledge-graph-builder',
    'courseGenerator',
    'awesome-papers-with-claude-code',
    paperSlug,
    courseSlug,
    'knowledge',
    'courses.json',
  );

  const raw = await fs.readFile(coursesJsonPath, 'utf-8');
  const courses = JSON.parse(raw);

  const courseId = `${paperSlug}--${courseSlug}`;
  const outDir = path.join(__dirname, '..', 'public', 'courses', courseId, 'stages');
  await fs.mkdir(outDir, { recursive: true });

  for (let i = 0; i < courses.length; i++) {
    const stageData = generateStageData(i + 1, courses[i], courses.length);
    const outPath = path.join(outDir, `${i + 1}.json`);
    await fs.writeFile(outPath, JSON.stringify(stageData, null, 2));
    console.log(`✅ Stage ${i + 1}: ${courses[i].title} (${courses[i].lessons.length} concepts)`);
  }

  console.log(`\n📁 Output: public/courses/${courseId}/stages/`);
  console.log(`🎯 Total: ${courses.length} stages generated`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
