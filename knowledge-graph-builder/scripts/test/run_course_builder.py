#!/usr/bin/env python3
"""Test script for Phase 4: Course Builder (courseBuilder package).

Loads an expanded graph.json (Phase 3 output) and runs CourseBuilder to
build structured courses.

Usage (run from knowledge-graph-builder/):

  # Auto-select the most recently modified expanded graph
  python scripts/test/run_course_builder.py

  # Specify a graph file explicitly
  python scripts/test/run_course_builder.py \\
      --graph scripts/test/results/expander/expanded_<stem>_<ts>.json

  # Skip lesson generation (faster structural test)
  python scripts/test/run_course_builder.py --skip-lessons

  # Custom model
  python scripts/test/run_course_builder.py --model google/gemma-3-27b-it
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Ensure project root (knowledge-graph-builder/) is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from courseBuilder.course_builder import CourseBuilder
from extractor.graph import KnowledgeGraph
from extractor.models import Course

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

INPUT_DIR = Path("scripts/test/results/expander")
OUTPUT_DIR = Path("scripts/test/results/courseBuilder")


def find_latest_graph(results_dir: Path) -> Path:
    """Return the most recently modified *.json in results_dir."""
    jsons = sorted(results_dir.glob("*.json"), key=lambda p: p.stat().st_mtime)
    if not jsons:
        raise FileNotFoundError(f"No graph JSON found in {results_dir}")
    return jsons[-1]


def run(args: argparse.Namespace) -> None:
    # ── Resolve input graph ───────────────────────────────────────────────────
    if args.graph:
        graph_path = Path(args.graph)
        if not graph_path.exists():
            logger.error("Graph file not found: %s", graph_path)
            sys.exit(1)
    else:
        graph_path = find_latest_graph(INPUT_DIR)
        logger.info("Auto-selected graph: %s", graph_path.name)

    output_dir = Path(args.output_dir)

    # ── Load graph ────────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("Phase 4: Course Building")
    logger.info("=" * 60)
    logger.info("Input:         %s", graph_path)
    logger.info("Model:         %s", args.model)
    logger.info("Skip lessons:  %s", args.skip_lessons)

    kg = KnowledgeGraph.load(graph_path)
    logger.info(
        "Loaded graph: %d concepts, %d edges",
        len(kg.get_all_concepts()),
        len(kg.get_all_edges()),
    )

    # ── Run Phase 4 ───────────────────────────────────────────────────────────
    builder = CourseBuilder(model=args.model)
    courses = builder.build_courses(kg, generate_lessons=not args.skip_lessons)

    logger.info("Built %d courses:", len(courses))
    for course in courses:
        logger.info(
            "  %-40s  %d concepts, %d lessons",
            course.title,
            len(course.concepts),
            len(course.lessons),
        )

    # ── Serialization round-trip check ────────────────────────────────────────
    courses_dicts = [c.to_dict() for c in courses]
    restored = [Course.from_dict(d) for d in courses_dicts]
    assert len(restored) == len(courses), "Serialization round-trip failed: course count mismatch"
    logger.info("✅ Serialization round-trip OK")

    # ── Save result ───────────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = graph_path.stem  # e.g. "expanded_transformers_20260218_021245_..."
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"courses_{stem}_{timestamp}.json"
    output_file.write_text(json.dumps(courses_dicts, indent=2, ensure_ascii=False))
    logger.info("")
    logger.info("Courses saved → %s", output_file)

    # ── Summary ───────────────────────────────────────────────────────────────
    total_lessons = sum(len(c.lessons) for c in courses)
    total_concepts = sum(len(c.concepts) for c in courses)
    logger.info(
        "Total: %d concepts across %d courses, %d lessons generated",
        total_concepts, len(courses), total_lessons,
    )
    logger.info("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Phase 4: build courses from an expanded knowledge graph",
    )
    parser.add_argument(
        "--graph",
        default=None,
        help=(
            "Path to input graph.json (Phase 3 output). "
            "Omit to auto-select the most recent file in "
            f"{INPUT_DIR}/."
        ),
    )
    parser.add_argument(
        "--model",
        default="google/gemma-3-27b-it",
        help="LLM model name (default: google/gemma-3-27b-it)",
    )
    parser.add_argument(
        "--skip-lessons",
        action="store_true",
        help="Skip lesson generation (faster structural test)",
    )
    parser.add_argument(
        "--output-dir",
        default=str(OUTPUT_DIR),
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error("❌ Failed: %s", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)
