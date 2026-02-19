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

from courseBuilder.prompts import LESSON_GENERATION_PROMPT

logger = logging.getLogger(__name__)

# Course cluster definitions
COURSE_CLUSTERS = [
    {
        "id": "foundations",
        "title": "Transformer Foundations",
        "description": "Core concepts every transformer practitioner must understand",
        "levels": [ConceptLevel.FOUNDATIONAL],
        "priority_types": ["theory", "component"],
    },
    {
        "id": "encoder_models",
        "title": "Encoder Models (BERT Family)",
        "description": "Understanding bidirectional transformers and their applications",
        "levels": [ConceptLevel.INTERMEDIATE],
        "keywords": ["bert", "roberta", "electra", "deberta", "albert", "distilbert", "encoder"],
    },
    {
        "id": "decoder_models",
        "title": "Decoder Models (GPT Family)",
        "description": "Autoregressive language models from GPT to modern LLMs",
        "levels": [ConceptLevel.INTERMEDIATE, ConceptLevel.ADVANCED],
        "keywords": ["gpt", "llama", "mistral", "falcon", "opt", "bloom", "decoder", "causal", "autoregressive"],
    },
    {
        "id": "seq2seq_models",
        "title": "Sequence-to-Sequence Models",
        "description": "Encoder-decoder architectures for translation and generation",
        "levels": [ConceptLevel.INTERMEDIATE],
        "keywords": ["t5", "bart", "marian", "pegasus", "seq2seq", "encoder_decoder"],
    },
    {
        "id": "efficiency",
        "title": "Efficiency & Optimization",
        "description": "Making transformers faster and smaller",
        "levels": [ConceptLevel.ADVANCED],
        "keywords": [
            "attention", "flash", "quantization", "pruning", "distillation",
            "efficient", "sparse", "linear", "cache", "optimization",
        ],
    },
    {
        "id": "frontier",
        "title": "Frontier Models & Techniques",
        "description": "Cutting-edge architectures and emerging paradigms",
        "levels": [ConceptLevel.FRONTIER],
    },
]


class CourseBuilder:
    """Phase 4: Builds structured courses from the knowledge graph."""

    def __init__(self, base_url: Optional[str] = None, model: str = "google/gemma-3-27b-it"):
        self.client = get_client(base_url)
        self.model = model

    def build_courses(self, kg: KnowledgeGraph, generate_lessons: bool = True) -> list[Course]:
        """Build courses from the knowledge graph."""
        sorted_concepts = kg.topological_sort()
        courses = self._cluster_concepts(kg, sorted_concepts)

        if generate_lessons:
            for course in courses:
                logger.info("Generating lessons for course: %s", course.title)
                course.lessons = self._generate_lessons(kg, course.concepts)

        courses = [c for c in courses if c.concepts]

        logger.info("Built %d courses with %d total concepts",
                     len(courses),
                     sum(len(c.concepts) for c in courses))
        return courses

    def _cluster_concepts(self, kg: KnowledgeGraph, sorted_ids: list[str]) -> list[Course]:
        assigned = set()
        courses = []

        for cluster in COURSE_CLUSTERS:
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

        for concept_id in sorted_ids:
            if concept_id not in assigned:
                node = kg.get_concept(concept_id)
                if node:
                    best_course = self._find_best_course(node, courses)
                    best_course.concepts.append(concept_id)

        return courses

    def _concept_matches_cluster(self, node: ConceptNode, cluster: dict) -> bool:
        levels = cluster.get("levels", [])
        if levels and node.level not in levels:
            return False

        keywords = cluster.get("keywords", [])
        if keywords:
            node_text = f"{node.id} {node.name} {node.description}".lower()
            return any(kw in node_text for kw in keywords)

        priority_types = cluster.get("priority_types", [])
        if priority_types:
            return node.type.value in priority_types

        return bool(levels)

    def _find_best_course(self, node: ConceptNode, courses: list[Course]) -> Course:
        level_to_course = {
            ConceptLevel.FOUNDATIONAL: "foundations",
            ConceptLevel.INTERMEDIATE: "encoder_models",
            ConceptLevel.ADVANCED: "efficiency",
            ConceptLevel.FRONTIER: "frontier",
        }
        target_id = level_to_course.get(node.level, "frontier")
        for course in courses:
            if course.id == target_id:
                return course
        return courses[-1]

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
                prerequisites=[],
                key_ideas=node.key_ideas,
                code_ref=node.code_refs[0] if node.code_refs else "",
                paper_ref=node.paper_ref,
                exercise=data.get("exercise", fallback_exercise),
                explanation=data.get("explanation", node.description),
            )
        except Exception as e:
            logger.warning("Failed to generate lesson for %s: %s", node.id, e)
            return Lesson(
                concept_id=node.id,
                title=node.name,
                prerequisites=[],
                key_ideas=node.key_ideas,
                code_ref=node.code_refs[0] if node.code_refs else "",
                paper_ref=node.paper_ref,
                exercise=fallback_exercise,
                explanation=node.description,
            )
