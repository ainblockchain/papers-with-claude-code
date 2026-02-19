"""Build structured courses from the knowledge graph."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from extractor.graph import KnowledgeGraph
from extractor.llm_client import get_client, chat_completion, parse_json_response
from extractor.models import (
    ConceptLevel, ConceptNode, Course, Lesson, RelationshipType,
)

from courseBuilder.prompts import (
    COURSE_STRUCTURE_PROMPT,
    COURSE_STRUCTURE_USER_PROMPT,
    LESSON_GENERATION_PROMPT,
)

logger = logging.getLogger(__name__)

# Maximum characters for the concepts listing in the course structure prompt.
_CLUSTER_CONCEPT_BUDGET = 6_000


class CourseBuilder:
    """Phase 4: Builds structured courses from the knowledge graph."""

    def __init__(self, base_url: Optional[str] = None, model: str = "google/gemma-3-27b-it"):
        self.client = get_client(base_url)
        self.model = model

    def build_courses(self, kg: KnowledgeGraph, generate_lessons: bool = True) -> list[Course]:
        """Build courses from the knowledge graph."""
        sorted_concepts = kg.topological_sort()
        clusters = self._generate_course_clusters(kg)
        courses = self._cluster_concepts(kg, sorted_concepts, clusters)

        if generate_lessons:
            for course in courses:
                logger.info("Generating lessons for course: %s", course.title)
                course.lessons = self._generate_lessons(kg, course.concepts)

        courses = [c for c in courses if c.concepts]

        logger.info("Built %d courses with %d total concepts",
                     len(courses),
                     sum(len(c.concepts) for c in courses))
        return courses

    def _generate_course_clusters(self, kg: KnowledgeGraph) -> list[dict]:
        """Ask the LLM to generate domain-specific course clusters from the knowledge graph."""
        all_nodes = kg.get_all_concepts()

        # Build a compact concept listing within budget
        lines = []
        budget = _CLUSTER_CONCEPT_BUDGET
        for node in all_nodes:
            line = f"- {node.id} ({node.type.value}, {node.level.value}): {node.name}"
            if len(line) > budget:
                break
            lines.append(line)
            budget -= len(line)

        concepts_text = "\n".join(lines)
        user_prompt = COURSE_STRUCTURE_USER_PROMPT.format(
            num_concepts=len(all_nodes),
            concepts_text=concepts_text,
        )

        try:
            text, _ = chat_completion(
                self.client, self.model,
                COURSE_STRUCTURE_PROMPT, user_prompt,
                max_tokens=2048, temperature=0.3,
            )
            data = parse_json_response(text)
            clusters = data.get("courses", [])
            if clusters:
                logger.info("LLM generated %d course clusters", len(clusters))
                return clusters
        except Exception as e:
            logger.warning("Failed to generate course clusters via LLM: %s", e)

        # Fallback: single bucket per level
        logger.warning("Falling back to level-based course structure")
        return [
            {"id": "foundational", "title": "Foundational Concepts", "description": "Core fundamentals", "levels": ["foundational"]},
            {"id": "intermediate", "title": "Intermediate Concepts", "description": "Building on the fundamentals", "levels": ["intermediate"]},
            {"id": "advanced", "title": "Advanced Concepts", "description": "Advanced techniques and patterns", "levels": ["advanced"]},
            {"id": "frontier", "title": "Frontier & Emerging", "description": "Cutting-edge developments", "levels": ["frontier"]},
        ]

    def _cluster_concepts(self, kg: KnowledgeGraph, sorted_ids: list[str], clusters: list[dict]) -> list[Course]:
        assigned = set()
        courses = []

        for cluster in clusters:
            course = Course(
                id=cluster["id"],
                title=cluster["title"],
                description=cluster.get("description", ""),
            )

            for concept_id in sorted_ids:
                if concept_id in assigned:
                    continue
                node = kg.get_concept(concept_id)
                if not node:
                    continue

                if self._concept_matches_cluster(node, cluster):
                    course.concepts.append(concept_id)
                    assigned.add(concept_id)

            courses.append(course)

        # Assign unmatched concepts using level-based fallback
        for concept_id in sorted_ids:
            if concept_id not in assigned:
                node = kg.get_concept(concept_id)
                if node:
                    best_course = self._find_best_course(node, courses)
                    best_course.concepts.append(concept_id)

        return courses

    def _concept_matches_cluster(self, node: ConceptNode, cluster: dict) -> bool:
        # Level filter
        levels = cluster.get("levels", [])
        level_values = [lv.value if hasattr(lv, "value") else lv for lv in levels]
        if level_values and node.level.value not in level_values:
            return False

        # Keyword match against concept id, name, description
        keywords = cluster.get("keywords", [])
        if keywords:
            node_text = f"{node.id} {node.name} {node.description}".lower()
            return any(kw.lower() in node_text for kw in keywords)

        # If only levels are specified (no keywords), accept any concept at that level
        return bool(level_values)

    def _find_best_course(self, node: ConceptNode, courses: list[Course]) -> Course:
        """Fallback: assign concept to the course whose level range best matches."""
        level_order = [
            ConceptLevel.FOUNDATIONAL,
            ConceptLevel.INTERMEDIATE,
            ConceptLevel.ADVANCED,
            ConceptLevel.FRONTIER,
        ]
        node_rank = level_order.index(node.level) if node.level in level_order else len(level_order) - 1

        # Find the course whose declared levels are closest to the node's level
        best: Course = courses[-1]
        best_dist = float("inf")
        for course in courses:
            raw_levels = course.description  # levels not stored on Course; use position heuristic
            # Use course position as a proxy for level (early = foundational, late = frontier)
            idx = courses.index(course)
            rank = int(idx / max(len(courses) - 1, 1) * (len(level_order) - 1))
            dist = abs(rank - node_rank)
            if dist < best_dist:
                best_dist = dist
                best = course
        return best

    def _generate_lessons(self, kg: KnowledgeGraph, concept_ids: list[str]) -> list[Lesson]:
        # 전처리: 순서 보존을 위해 (index, node, prereq_names) 수집
        tasks: list[tuple[int, ConceptNode, list[str]]] = []
        for concept_id in concept_ids:
            node = kg.get_concept(concept_id)
            if not node:
                continue
            prereqs = kg.get_prerequisites(concept_id)
            prereq_names = [
                pnode.name
                for pid in prereqs
                if (pnode := kg.get_concept(pid))
            ]
            tasks.append((len(tasks), node, prereq_names))

        lessons: list[Lesson | None] = [None] * len(tasks)
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(self._generate_one_lesson, node, prereq_names): idx
                for idx, node, prereq_names in tasks
            }
            for future in as_completed(futures):
                lessons[futures[future]] = future.result()

        return [lesson for lesson in lessons if lesson is not None]

    def _generate_one_lesson(self, node: ConceptNode, prerequisite_names: list[str]) -> Lesson:
        fallback_exercise = (
            f"True or false: {node.name} was introduced to solve a problem with "
            "earlier approaches. Explain your answer in one sentence."
        )

        prompt = LESSON_GENERATION_PROMPT.format(
            concept_name=node.name,
            paper_ref=node.paper_ref or "unknown",
            concept_description=node.description,
            key_ideas=", ".join(node.key_ideas) if node.key_ideas else "N/A",
            code_refs=", ".join(node.code_refs) if node.code_refs else "N/A",
            prerequisites=", ".join(prerequisite_names) if prerequisite_names else "None",
        )

        try:
            text, finish_reason = chat_completion(
                self.client, self.model, "", prompt,
                max_tokens=6144, temperature=0.3,
            )
            if finish_reason == "length":
                logger.warning("LLM response truncated for lesson: %s", node.id)
            data = parse_json_response(text)

            return Lesson(
                concept_id=node.id,
                title=node.name,
                prerequisites=prerequisite_names,
                key_ideas=node.key_ideas,
                code_ref=node.code_refs[0] if node.code_refs else "",
                paper_ref=node.paper_ref,
                exercise=data.get("exercise", fallback_exercise),
                explanation=data.get("explanation", node.description),
            )
        except Exception as e:
            logger.exception("Failed to generate lesson for %s: %s", node.id, e)
            return Lesson(
                concept_id=node.id,
                title=node.name,
                prerequisites=prerequisite_names,
                key_ideas=node.key_ideas,
                code_ref=node.code_refs[0] if node.code_refs else "",
                paper_ref=node.paper_ref,
                exercise=fallback_exercise,
                explanation=node.description,
            )
