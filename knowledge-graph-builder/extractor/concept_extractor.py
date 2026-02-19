"""Extract concepts and relationships from repo analysis using an LLM."""

from __future__ import annotations

import logging
from typing import Optional

from extractor.graph import KnowledgeGraph
from extractor.llm_client import get_client, chat_completion, parse_json_response
from extractor.models import (
    ConceptNode, ConceptType, ConceptLevel, Edge, RelationshipType,
)
from analyzer.models import UniversalRepoAnalysis, RepoType

logger = logging.getLogger(__name__)

# Character budget per section in the user prompt.
# Each of the 4 sections (components, structure, commits, docs) gets this many chars.
_SECTION_BUDGET = 3_000

# Repository types that warrant ML-specific prompt hints.
_ML_REPO_TYPES = frozenset({RepoType.HUGGINGFACE.value, RepoType.PYTORCH.value})

EXTRACTION_SYSTEM_PROMPT = """\
You are an expert in software architecture{domain_context}. Given analysis data \
from a code repository, extract a knowledge graph of concepts and their relationships.

For each concept, provide:
- id: snake_case identifier
- name: human-readable name
- type: one of {types}
- level: one of {levels}
- description: 1-2 sentence description
- key_ideas: list of 2-4 key ideas
- code_refs: list of relevant file:class references from the repo
- paper_ref: the seminal paper (REQUIRED for every concept; use "" only if truly no \
paper exists), e.g. "Vaswani et al., 2017 — Attention Is All You Need"

For each relationship (edge), provide:
- source: concept id
- target: concept id
- relationship: one of {relationships}
- description: brief description of the relationship

Edge direction rules (IMPORTANT — get the direction right):
- component_of: child → parent  (e.g. attention_mechanism → transformer_architecture)
- optimizes: technique → target  (e.g. flash_attention → attention_mechanism)
- builds_on / evolves_to: derived → base  (e.g. gpt → transformer_architecture)
- variant_of: variant → original  (e.g. bert → transformer_architecture)
- requires: dependent → dependency  (e.g. fine_tuning → pre_trained_model)

Focus on:
1. Core architectural concepts (key abstractions, patterns, data flows)
2. Main components and their roles
3. Key techniques and algorithms implemented{technique_hint}
4. Training / optimization innovations
5. Prerequisite chains (what must you understand before what)

Return ONLY valid JSON with keys "nodes" and "edges". No other text.\
"""

EXTRACTION_USER_PROMPT = """\
Here is the analysis of the repository:

## Repository type: {repo_type}
## Repository path: {repo_path}

## Key components ({num_components} total, showing first {shown_components}):
{components_text}

## Class hierarchy / structure:
{structure_text}

## Dependencies:
{dependencies_text}

## Key commits ({num_commits} total, showing first {shown_commits}):
{commits_text}

## Documentation ({num_docs} total, showing first {shown_docs}):
{docs_text}

Extract a comprehensive knowledge graph of concepts and their relationships. \
Include both foundational abstractions AND concrete named techniques{technique_hint} \
that are present or referenced in the repo. \
Ensure proper prerequisite chains. Every node MUST have a paper_ref where one exists.

Return ONLY valid JSON with keys "nodes" and "edges".\
"""


class ConceptExtractor:
    """Uses an LLM to extract concepts from repo analysis data."""

    def __init__(self, base_url: Optional[str] = None, model: str = "google/gemma-3-27b-it"):
        self.client = get_client(base_url)
        self.model = model

    def extract(self, analysis: UniversalRepoAnalysis) -> KnowledgeGraph:
        """Extract a knowledge graph from repo analysis."""
        logger.info("Extracting concepts via LLM (model=%s)", self.model)

        domain_context, technique_hint = self._domain_hints(analysis.repo_type)
        system_prompt = EXTRACTION_SYSTEM_PROMPT.format(
            types=", ".join(t.value for t in ConceptType),
            levels=", ".join(l.value for l in ConceptLevel),
            relationships=", ".join(r.value for r in RelationshipType),
            domain_context=domain_context,
            technique_hint=technique_hint,
        )

        user_prompt = self._build_user_prompt(analysis, technique_hint)

        response_text, finish_reason = chat_completion(
            self.client, self.model, system_prompt, user_prompt,
            max_tokens=8192, temperature=0.3,
        )

        graph_data = parse_json_response(response_text)
        node_count = len(graph_data.get("nodes", []))

        if not node_count:
            # Nothing parsed at all — retry with a simpler, shorter prompt.
            logger.warning("No nodes in response, retrying with simpler prompt...")
            graph_data = self._retry_extraction(system_prompt, analysis)
        elif finish_reason == "length" or node_count < 20:
            # Output was cut off or suspiciously sparse — run a second pass.
            if finish_reason == "length":
                logger.warning(
                    "Pass 1 truncated (finish_reason=length, %d nodes). Running Pass 2.",
                    node_count,
                )
            else:
                logger.warning(
                    "Pass 1 returned only %d nodes. Running Pass 2.", node_count
                )
            extra_data = self._extract_pass2(system_prompt, analysis, graph_data)
            graph_data = self._merge_graph_data(graph_data, extra_data)

        return self._build_graph(graph_data)

    def _retry_extraction(self, system_prompt: str, analysis: UniversalRepoAnalysis) -> dict:
        """Retry with a shorter prompt if the first attempt fails."""
        top_components = ", ".join(c.name for c in analysis.components[:30])
        short_prompt = (
            f"Extract 30-40 key concepts from the {analysis.repo_type.value} repository. "
            f"Key components include: {top_components}. "
            "Return ONLY valid JSON with keys 'nodes' and 'edges'."
        )
        text, finish_reason = chat_completion(
            self.client, self.model, system_prompt, short_prompt,
            max_tokens=16384, temperature=0.3,
        )
        if finish_reason == "length":
            logger.warning("Retry also truncated. Graph may be incomplete.")
        return parse_json_response(text)

    def _extract_pass2(
        self,
        system_prompt: str,
        analysis: UniversalRepoAnalysis,
        existing_data: dict,
    ) -> dict:
        """Run a second extraction pass to supplement a truncated or sparse Pass 1.

        Tells the LLM which concepts were already extracted so it focuses on gaps.
        """
        existing_ids = [n["id"] for n in existing_data.get("nodes", [])]
        ids_str = ", ".join(existing_ids[:50])
        _, technique_hint = self._domain_hints(analysis.repo_type)
        continuation_prompt = (
            f"The following concepts were already extracted from the "
            f"{analysis.repo_type.value} repository: {ids_str}.\n"
            "Extract any ADDITIONAL concepts not yet in that list. Focus on:\n"
            f"1. Concrete named components and techniques not yet covered{technique_hint}\n"
            "2. Components and techniques not covered above\n"
            "IMPORTANT: Every node MUST include paper_ref "
            "(use \"\" only if truly no paper exists).\n"
            "Return ONLY valid JSON with keys 'nodes' and 'edges'."
        )
        text, finish_reason = chat_completion(
            self.client, self.model, system_prompt, continuation_prompt,
            max_tokens=8192, temperature=0.3,
        )
        if finish_reason == "length":
            logger.warning("Pass 2 also truncated.")
        return parse_json_response(text)

    def _merge_graph_data(self, base: dict, extra: dict) -> dict:
        """Merge two {nodes, edges} dicts. Deduplicates nodes by id."""
        seen_ids = {n["id"] for n in base.get("nodes", [])}
        merged_nodes = list(base.get("nodes", []))
        for node in extra.get("nodes", []):
            if node.get("id") not in seen_ids:
                merged_nodes.append(node)
                seen_ids.add(node["id"])
        # Edges: deduplicate by (source, target, relationship) to prevent Pass 2 duplicates.
        seen_edges = {
            (e["source"], e["target"], e.get("relationship", ""))
            for e in base.get("edges", [])
        }
        merged_edges = list(base.get("edges", []))
        for edge in extra.get("edges", []):
            key = (edge["source"], edge["target"], edge.get("relationship", ""))
            if key not in seen_edges:
                merged_edges.append(edge)
                seen_edges.add(key)
        logger.info(
            "Merged graphs: %d nodes total (%d new from Pass 2)",
            len(merged_nodes),
            len(merged_nodes) - len(base.get("nodes", [])),
        )
        return {"nodes": merged_nodes, "edges": merged_edges}

    # ------------------------------------------------------------------
    # Prompt construction helpers
    # ------------------------------------------------------------------

    def _domain_hints(self, repo_type: RepoType) -> tuple[str, str]:
        """Return (domain_context, technique_hint) strings for the given repo type.

        ML repos (HuggingFace, PyTorch) get ML-specific phrasing with concrete model
        examples; all other repo types get neutral, domain-agnostic phrasing.
        """
        if repo_type.value in _ML_REPO_TYPES:
            return (
                " and machine learning",
                " — include concrete model instances (e.g. BERT, GPT, T5, LoRA)"
                " as well as foundational abstractions",
            )
        return (
            "",
            " — include concrete named components and design patterns"
            " present in this codebase",
        )

    def _get_important_suffixes(self, repo_type: RepoType) -> tuple[str, ...]:
        """Return class name suffixes used to prioritize 'important' components.

        HF/ML repos use model-class suffixes (ForCausalLM, etc.);
        other repos use generic design-pattern suffixes (Manager, Service, etc.).
        """
        if repo_type.value in _ML_REPO_TYPES:
            return (
                "Model", "ForSequenceClassification", "ForCausalLM",
                "ForMaskedLM", "ForTokenClassification", "Config",
                "Tokenizer", "ForQuestionAnswering", "PreTrainedModel",
            )
        return (
            "Manager", "Handler", "Service", "Controller",
            "Factory", "Builder", "Processor", "Parser",
            "Middleware", "Router", "Registry",
        )

    def _select_components(self, analysis: UniversalRepoAnalysis) -> tuple[str, int, int]:
        """Return components text, balancing base classes and concrete important instances.

        Sorting priority:
          0 — important classes (has inheritance AND name matches repo-type suffixes)
          1 — other classes with inheritance (base classes)
          2 — leaf classes without inheritance
        """
        important_suffixes = self._get_important_suffixes(analysis.repo_type)

        def _sort_key(c):
            has_bases = bool(c.metadata.get("bases"))
            is_model = any(c.name.endswith(sfx) or c.name.startswith(sfx)
                           for sfx in important_suffixes)
            if has_bases and is_model:
                return (0, c.name)
            if has_bases:
                return (1, c.name)
            return (2, c.name)

        items = sorted(analysis.components, key=_sort_key)
        lines: list[str] = []
        budget = _SECTION_BUDGET
        for c in items:
            bases = c.metadata.get("bases", [])
            bases_str = f" (extends: {', '.join(bases[:3])})" if bases else ""
            line = f"- **{c.name}** [{c.type}] @ {c.path}{bases_str}\n"
            if len(line) > budget:
                break
            lines.append(line)
            budget -= len(line)
        return "".join(lines), len(items), len(lines)

    def _select_structure(self, analysis: UniversalRepoAnalysis) -> tuple[str, int, int]:
        """Return class hierarchy text up to the character budget."""
        items = list(analysis.structure.items())
        lines: list[str] = []
        budget = _SECTION_BUDGET
        for cls_name, info in items:
            inherits = info.get("inherits", [])
            file_path = info.get("file", "")
            inherits_str = f" extends {', '.join(inherits)}" if inherits else ""
            line = f"- {cls_name}{inherits_str} @ {file_path}\n"
            if len(line) > budget:
                break
            lines.append(line)
            budget -= len(line)
        return "".join(lines), len(items), len(lines)

    def _select_commits(self, analysis: UniversalRepoAnalysis) -> tuple[str, int, int]:
        """Return commits text, sorted by tag richness (most tags first)."""
        items = sorted(analysis.commits, key=lambda c: -len(c.tags))
        lines: list[str] = []
        budget = _SECTION_BUDGET
        for c in items:
            tags_str = f" (tags: {', '.join(c.tags)})" if c.tags else ""
            line = f"- [{c.date}] {c.message}{tags_str}\n"
            if len(line) > budget:
                break
            lines.append(line)
            budget -= len(line)
        return "".join(lines), len(items), len(lines)

    def _select_docs(self, analysis: UniversalRepoAnalysis) -> tuple[str, int, int]:
        """Return documentation text up to the character budget."""
        items = analysis.documentation
        lines: list[str] = []
        budget = _SECTION_BUDGET
        for d in items:
            summary = d.summary[:200] if d.summary else ""
            line = f"- **{d.title}** ({d.category}): {summary}\n"
            if len(line) > budget:
                break
            lines.append(line)
            budget -= len(line)
        return "".join(lines), len(items), len(lines)

    def _build_user_prompt(self, analysis: UniversalRepoAnalysis, technique_hint: str = "") -> str:
        components_text, num_components, shown_components = self._select_components(analysis)
        structure_text, _, _ = self._select_structure(analysis)
        commits_text, num_commits, shown_commits = self._select_commits(analysis)
        docs_text, num_docs, shown_docs = self._select_docs(analysis)

        # Dependencies (small, include fully)
        deps = analysis.dependencies
        frameworks = ", ".join(deps.get("frameworks", []))
        domain_libs = ", ".join(deps.get("domain_libs", []))
        data_libs = ", ".join(deps.get("data", []))
        dependencies_text = ""
        if frameworks:
            dependencies_text += f"- Frameworks: {frameworks}\n"
        if domain_libs:
            dependencies_text += f"- Domain libs: {domain_libs}\n"
        if data_libs:
            dependencies_text += f"- Data libs: {data_libs}\n"

        return EXTRACTION_USER_PROMPT.format(
            repo_type=analysis.repo_type.value,
            repo_path=analysis.repo_path,
            num_components=num_components,
            shown_components=shown_components,
            components_text=components_text or "(none found)",
            structure_text=structure_text or "(none found)",
            dependencies_text=dependencies_text or "(none found)",
            num_commits=num_commits,
            shown_commits=shown_commits,
            commits_text=commits_text or "(none found)",
            num_docs=num_docs,
            shown_docs=shown_docs,
            docs_text=docs_text or "(none found)",
            technique_hint=technique_hint,
        )

    def _build_graph(self, data: dict) -> KnowledgeGraph:
        """Build a KnowledgeGraph from parsed extraction data."""
        kg = KnowledgeGraph()

        for node_data in data.get("nodes", []):
            try:
                node = ConceptNode(
                    id=node_data["id"],
                    name=node_data["name"],
                    type=ConceptType(node_data.get("type", "theory")),
                    level=ConceptLevel(node_data.get("level", "intermediate")),
                    description=node_data.get("description", ""),
                    key_ideas=node_data.get("key_ideas", []),
                    code_refs=node_data.get("code_refs", []),
                    paper_ref=node_data.get("paper_ref", ""),
                    first_appeared=node_data.get("first_appeared"),
                    confidence=node_data.get("confidence", 1.0),
                )
                kg.add_concept(node)
            except (KeyError, ValueError) as e:
                logger.warning("Skipping invalid node %s: %s", node_data.get("id", "?"), e)

        valid_ids = {n.id for n in kg.get_all_concepts()}
        for edge_data in data.get("edges", []):
            try:
                source = edge_data["source"]
                target = edge_data["target"]
                if source not in valid_ids or target not in valid_ids:
                    logger.debug("Skipping edge %s->%s: missing node", source, target)
                    continue
                edge = Edge(
                    source=source,
                    target=target,
                    relationship=RelationshipType(edge_data.get("relationship", "builds_on")),
                    description=edge_data.get("description", ""),
                )
                kg.add_edge(edge)
            except (KeyError, ValueError) as e:
                logger.warning("Skipping invalid edge: %s", e)

        logger.info(
            "Built knowledge graph: %d concepts, %d edges",
            len(kg.get_all_concepts()),
            len(kg.get_all_edges()),
        )
        return kg
