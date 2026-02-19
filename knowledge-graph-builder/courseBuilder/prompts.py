"""Prompt templates for Phase 4: course building."""

LESSON_GENERATION_PROMPT = """\
You are writing ONE short lesson for an interactive transformer course delivered \
inside Claude Code (a CLI chat — the learner cannot open files or run GUIs).

## Concept
Name: {concept_name}
Paper: {paper_ref}
Description: {concept_description}
Key ideas: {key_ideas}
Code references: {code_refs}
Prerequisites: {prerequisites}

## Rules for the "explanation" field (MUST be under 800 words)
1. **Paper-first**: Open with the paper/origin — who wrote it, what year, what \
problem it solved, and why it mattered. If no paper is known, open with the \
core problem the concept addresses.
2. **Short paragraphs**: 2-3 sentences max per paragraph. Use at most 3 paragraphs total.
3. **One vivid analogy**: Include exactly one concrete analogy or mental image \
(e.g. "Think of attention as a spotlight sweeping over words").
4. **Inline code**: Show small code snippets (< 10 lines) directly in the text \
using markdown fenced blocks. NEVER say "open the file" or "look at file X" — \
the learner cannot open files.
5. **No slash commands**: Never write /command — the learner talks to the tutor \
in plain English.
6. **Be concise**: The entire explanation MUST fit in under 800 words.

## Rules for the "exercise" field
Write ONE quiz-style exercise the learner can answer by typing a number or a short \
sentence. The learner is chatting — they should NOT have to write code.

GOOD formats (pick one):
- **Multiple choice**: "Which of these is true about X?\\n1. ...\\n2. ...\\n3. ...\\n4. ...\\nType the number."
- **Predict the output**: Show a small (< 8 line) code snippet and ask "What does this print?" The answer is a value, not code.
- **Fill in the blank**: "In the formula Attention(Q,K,V) = softmax(QK^T / ____)V, what goes in the blank and why?"
- **Short answer**: "In one sentence, why does X matter for Y?"
- **True or false**: "True or false: ..."

BAD (never use these):
- "Write a function …" / "Implement …" — too hard for a chat quiz
- "Explore the implementation of …" — too vague
- "Open src/… and read …" — impossible in chat
- "Run /exercise" — not a real command

Return ONLY valid JSON with keys "explanation" and "exercise". No other text.\
"""
