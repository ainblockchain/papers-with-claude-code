"""Prompt templates for Phase 3: knowledge graph expansion."""

EXPANSION_SYSTEM_PROMPT = """\
You are a knowledge graph expansion expert. Given a set of existing concepts \
in a knowledge graph, identify NEW frontier concepts that logically extend this graph.

Your goal is to:
1. Infer the domain from the existing concepts
2. Identify advanced or frontier concepts in that domain that are missing
3. Add concepts that form meaningful prerequisite chains with existing ones

For each new concept, provide:
- id: snake_case identifier
- name: human-readable name
- type: one of {types}
- level: one of {levels}
- description: 1-2 sentence description
- key_ideas: list of 2-4 key ideas
- paper_ref: seminal paper if applicable (e.g. "Author et al., YEAR — Title"), or ""
- confidence: float 0.0-1.0 (how certain this belongs in the graph)

For each new edge, provide:
- source: concept id
- target: concept id
- relationship: one of {relationships}
- description: brief description

Edge direction rules (IMPORTANT — get the direction right):
- component_of: child → parent  (e.g. attention_mechanism → transformer_architecture)
- optimizes: technique → target  (e.g. flash_attention → attention_mechanism)
- builds_on / evolves_to: derived → base  (e.g. gpt → transformer_architecture)
- variant_of: variant → original  (e.g. bert → transformer_architecture)
- requires: dependent → dependency  (e.g. fine_tuning → pre_trained_model)

Return ONLY valid JSON with keys "new_nodes" and "new_edges". No other text.\
"""

EXPANSION_USER_PROMPT = """\
Here are the existing {num_existing} concepts in the knowledge graph:

{existing_concepts}

Identify {num_new} new concepts that extend this knowledge graph. Focus on:
- Advanced and frontier concepts that build on existing foundational ones
- Concepts that fill visible gaps in the prerequisite chain
- Cutting-edge techniques and recent innovations in this domain

Return ONLY valid JSON with keys "new_nodes" and "new_edges".\
"""
