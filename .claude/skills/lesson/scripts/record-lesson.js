#!/usr/bin/env node
/**
 * Record a lesson_learned to AIN blockchain.
 * Called by the /lesson Claude Code skill.
 *
 * Usage:
 *   node record-lesson.js --title "..." --content "..." --summary "..." --topic "lessons/..." --tags "tag1,tag2"
 *
 * Or pipe JSON via stdin:
 *   echo '{"title":"...","content":"..."}' | node record-lesson.js
 *
 * Falls back to POST http://localhost:3402/lesson if ain-js is not available.
 */

const args = process.argv.slice(2);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      const key = argv[i].slice(2);
      result[key] = argv[++i];
    }
  }
  return result;
}

async function recordViaApi(lesson) {
  const url = process.env.COGITO_URL || 'http://localhost:3402';
  const res = await fetch(`${url}/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lesson),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function recordViaAinJs(lesson) {
  // Try to use ain-js directly if available
  try {
    const AinModule = await import('@ainblockchain/ain-js');
    const Ain = AinModule.default || AinModule;

    const providerUrl = process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
    const privateKey = process.env.AIN_PRIVATE_KEY;

    if (!privateKey) throw new Error('AIN_PRIVATE_KEY not set');

    const ain = new Ain(providerUrl);
    ain.wallet.addAndSetDefaultAccount(privateKey);

    const topicPath = lesson.topicPath || 'lessons';
    const tags = Array.isArray(lesson.tags) ? lesson.tags : (lesson.tags || '').split(',').filter(Boolean);

    // Ensure topic exists
    try {
      const parts = topicPath.split('/');
      const title = parts[parts.length - 1].replace(/-/g, ' ');
      await ain.knowledge.registerTopic(topicPath, {
        title,
        description: `Lessons related to ${topicPath}`,
      });
    } catch {}

    const result = await ain.knowledge.explore({
      topicPath,
      title: lesson.title,
      content: lesson.content,
      summary: lesson.summary || lesson.content.slice(0, 200),
      depth: 2,
      tags: ['lesson_learned', ...tags].join(','),
    });

    return { success: true, entryId: result.entryId, method: 'ain-js' };
  } catch (err) {
    // ain-js not available or failed, will fall back to API
    throw err;
  }
}

async function main() {
  let lesson;

  if (args.length > 0) {
    const parsed = parseArgs(args);
    lesson = {
      title: parsed.title || 'Untitled Lesson',
      content: parsed.content || '',
      summary: parsed.summary || '',
      topicPath: parsed.topic || 'lessons',
      tags: parsed.tags ? parsed.tags.split(',') : [],
    };
  } else {
    // Read from stdin
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    lesson = JSON.parse(input);
  }

  if (!lesson.title || !lesson.content) {
    console.error('Error: --title and --content are required');
    process.exit(1);
  }

  console.log(`Recording lesson: "${lesson.title}"`);
  console.log(`Topic: ${lesson.topicPath || 'lessons'}`);

  // Try ain-js first, fall back to API
  let result;
  try {
    result = await recordViaAinJs(lesson);
  } catch {
    try {
      result = await recordViaApi(lesson);
      result.method = 'api';
    } catch (apiErr) {
      console.error(`Failed to record lesson: ${apiErr.message}`);
      console.error('Make sure either AIN_PRIVATE_KEY is set or the Cogito container is running on port 3402');
      process.exit(1);
    }
  }

  console.log(`Lesson recorded successfully!`);
  console.log(`  Entry ID: ${result.entryId}`);
  console.log(`  Method: ${result.method}`);
  console.log(`  The Cogito container will enrich this with related papers + official code.`);
}

main();
