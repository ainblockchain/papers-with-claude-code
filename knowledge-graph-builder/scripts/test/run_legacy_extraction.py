#!/usr/bin/env python3
"""Run Phase 2 (Concept Extraction) using the legacy knowledge_graph_builder system.

Input:  knowledge_graph_builder/analysis.json/knowledge/repo_analysis.json
Output: scripts/test/results/graph_<timestamp>.json

Run from: knowledge-graph-builder/ (project root)
  python scripts/test/run_legacy_extraction.py
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from knowledge_graph_builder.concept_extractor import ConceptExtractor
from knowledge_graph_builder.models import RepoAnalysis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

ANALYSIS_FILE = Path(
    "knowledge_graph_builder/analysis.json/knowledge/repo_analysis.json"
)
OUTPUT_DIR = Path("scripts/test/results")


def main():
    # ── Load Phase 1 result ───────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("Legacy Phase 2: Concept Extraction")
    logger.info("=" * 60)
    logger.info("Loading Phase 1 analysis: %s", ANALYSIS_FILE)

    data = json.loads(ANALYSIS_FILE.read_text(encoding="utf-8"))
    analysis = RepoAnalysis.from_dict(data)

    logger.info(
        "Loaded: %d models, %d components, %d key_commits, %d doc_summaries",
        len(analysis.models),
        len(analysis.components),
        len(analysis.key_commits),
        len(analysis.doc_summaries),
    )

    # ── Run Phase 2 ───────────────────────────────────────────────────────
    logger.info("")
    logger.info("Running ConceptExtractor (legacy knowledge_graph_builder)...")
    extractor = ConceptExtractor(model="/data/models/gemma-3-27b-it")
    kg = extractor.extract(analysis)

    concepts = kg.get_all_concepts()
    edges = kg.get_all_edges()
    logger.info("✅ Extracted %d concepts, %d edges", len(concepts), len(edges))

    # Level breakdown
    by_level: dict[str, int] = {}
    for c in concepts:
        by_level[c.level.value] = by_level.get(c.level.value, 0) + 1
    logger.info("   Levels: %s", by_level)

    if concepts:
        logger.info("   Sample: %s", ", ".join(c.name for c in concepts[:5]))

    # ── Save ──────────────────────────────────────────────────────────────
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = OUTPUT_DIR / f"graph_{timestamp}.json"

    kg.save(output_file)
    logger.info("")
    logger.info("Graph saved → %s", output_file)
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error("❌ Failed: %s", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)
