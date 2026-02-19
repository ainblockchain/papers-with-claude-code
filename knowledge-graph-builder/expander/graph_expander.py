"""Expand the knowledge graph to include frontier concepts via BFS rounds."""

from __future__ import annotations

import logging
from typing import Optional

from extractor.graph import KnowledgeGraph
from extractor.llm_client import get_client, chat_completion, parse_json_response
from extractor.models import (
    ConceptNode, ConceptType, ConceptLevel, Edge, RelationshipType,
)
from expander.prompts import EXPANSION_SYSTEM_PROMPT, EXPANSION_USER_PROMPT

logger = logging.getLogger(__name__)

# Maximum characters for the existing-concepts listing in the user prompt.
_CONCEPT_BUDGET = 6_000


class GraphExpander:
    """Expands the knowledge graph to include frontier concepts via BFS rounds."""

    def __init__(self, base_url: Optional[str] = None, model: str = "google/gemma-3-27b-it"):
        self.client = get_client(base_url)
        self.model = model

    def expand(
        self,
        kg: KnowledgeGraph,
        rounds: int = 2,
        concepts_per_round: int = 10,
    ) -> KnowledgeGraph:
        """Expand the graph through multiple BFS rounds.

        Args:
            kg: The knowledge graph to expand (mutated in-place and returned).
            rounds: Maximum number of expansion rounds.
            concepts_per_round: Target number of new concepts per round.

        Returns:
            The expanded knowledge graph.
        """
        for round_num in range(1, rounds + 1):
            logger.info("Expansion round %d/%d", round_num, rounds)
            new_nodes, new_edges = self._expand_one_round(kg, concepts_per_round)

            if not new_nodes:
                logger.info("No new concepts found, stopping expansion early")
                break

            for node in new_nodes:
                kg.add_concept(node)
            for edge in new_edges:
                kg.add_edge(edge)

            logger.info(
                "Round %d: added %d concepts, %d edges",
                round_num, len(new_nodes), len(new_edges),
            )

        return kg

    def _expand_one_round(
        self, kg: KnowledgeGraph, num_new: int
    ) -> tuple[list[ConceptNode], list[Edge]]:
        """Run one round of expansion: build prompts → call LLM → parse → validate."""
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(kg, num_new)

        response_text, finish_reason = chat_completion(
            self.client, self.model, system_prompt, user_prompt,
            max_tokens=4096, temperature=0.3,
        )

        if finish_reason == "length":
            logger.warning("LLM response was truncated (finish_reason=length)")

        data = parse_json_response(response_text)
        existing_ids = {n.id for n in kg.get_all_concepts()}
        return self._build_nodes_and_edges(data, existing_ids)

    def _build_system_prompt(self) -> str:
        """Build the system prompt with Enum values injected dynamically."""
        return EXPANSION_SYSTEM_PROMPT.format(
            types=", ".join(t.value for t in ConceptType),
            levels=", ".join(l.value for l in ConceptLevel),
            relationships=", ".join(r.value for r in RelationshipType),
        )

    def _build_user_prompt(self, kg: KnowledgeGraph, num_new: int) -> str:
        """Build the user prompt with existing concepts, capped by _CONCEPT_BUDGET."""
        all_concepts = kg.get_all_concepts()
        budget = _CONCEPT_BUDGET
        lines: list[str] = []

        for i, n in enumerate(all_concepts):
            line = f"- {n.id}: {n.name} ({n.type.value}, {n.level.value}) — {n.description[:100]}"
            if budget - len(line) < 0:
                remaining = len(all_concepts) - i
                lines.append(f"... and {remaining} more concepts (omitted for brevity)")
                break
            lines.append(line)
            budget -= len(line)

        existing_concepts = "\n".join(lines)
        return EXPANSION_USER_PROMPT.format(
            num_existing=len(all_concepts),
            existing_concepts=existing_concepts,
            num_new=num_new,
        )

    def _build_nodes_and_edges(
        self, data: dict, existing_ids: set[str]
    ) -> tuple[list[ConceptNode], list[Edge]]:
        """Parse LLM JSON response into validated ConceptNode and Edge objects."""
        new_nodes: list[ConceptNode] = []
        for nd in data.get("new_nodes", []):
            if nd.get("id") in existing_ids:
                continue
            try:
                node = ConceptNode(
                    id=nd["id"],
                    name=nd["name"],
                    type=ConceptType(nd.get("type", "architecture")),
                    level=ConceptLevel(nd.get("level", "frontier")),
                    description=nd.get("description", ""),
                    key_ideas=nd.get("key_ideas", []),
                    code_refs=nd.get("code_refs", []),
                    paper_ref=nd.get("paper_ref", ""),
                    confidence=float(nd.get("confidence", 0.8)),
                )
                new_nodes.append(node)
            except (KeyError, ValueError) as e:
                logger.warning("Skipping invalid expansion node %r: %s", nd.get("id"), e)

        new_node_ids = {n.id for n in new_nodes}
        all_valid = existing_ids | new_node_ids

        new_edges: list[Edge] = []
        for ed in data.get("new_edges", []):
            try:
                source = ed["source"]
                target = ed["target"]
                if source not in all_valid or target not in all_valid:
                    continue
                edge = Edge(
                    source=source,
                    target=target,
                    relationship=RelationshipType(ed.get("relationship", "builds_on")),
                    description=ed.get("description", ""),
                )
                new_edges.append(edge)
            except (KeyError, ValueError) as e:
                logger.warning("Skipping invalid expansion edge %r→%r: %s",
                               ed.get("source"), ed.get("target"), e)

        return new_nodes, new_edges
