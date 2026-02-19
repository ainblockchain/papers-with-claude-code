#!/usr/bin/env python3
"""Test script for Phase 3: Graph Expander.

Loads an existing graph.json (Phase 2 output) and runs GraphExpander to
add frontier concepts via BFS rounds.

Usage (run from knowledge-graph-builder/):

  # Auto-select the most recently modified graph in scripts/test/results/expander/
  python expander/test_expander.py

  # Specify a graph file explicitly
  python expander/test_expander.py \\
      --graph scripts/test/results/transformers_20260218_021245_20260218_213505.json

  # Quick smoke test (1 round, 5 concepts)
  python expander/test_expander.py --rounds 1 --concepts-per-round 5

  # Compare new vs legacy expander output
  python scripts/compare_graphs.py \\
      scripts/test/results/expander/legacy_expanded_<stem>_<ts>.json \\
      scripts/test/results/expander/expanded_<stem>_<ts>.json \\
      --label-a "Legacy" --label-b "New" \\
      --save scripts/test/results/expander/comparison.png
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Ensure project root (knowledge-graph-builder/) is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from expander.graph_expander import GraphExpander
from extractor.graph import KnowledgeGraph

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("scripts/test/results/expander")


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
        graph_path = find_latest_graph(OUTPUT_DIR)
        logger.info("Auto-selected graph: %s", graph_path.name)

    output_dir = Path(args.output_dir)

    # ── Load graph ────────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("Phase 3: Graph Expansion")
    logger.info("=" * 60)
    logger.info("Input:  %s", graph_path)
    logger.info("Model:  %s", args.model)
    logger.info("Rounds: %d  |  Concepts/round: %d", args.rounds, args.concepts_per_round)

    kg = KnowledgeGraph.load(graph_path)
    before = kg.stats()
    logger.info("Before expansion: %s", before)

    # ── Run Phase 3 ───────────────────────────────────────────────────────────
    expander = GraphExpander(model=args.model)
    kg = expander.expand(
        kg,
        rounds=args.rounds,
        concepts_per_round=args.concepts_per_round,
    )

    after = kg.stats()
    logger.info("After  expansion: %s", after)
    logger.info(
        "Delta: +%d concepts, +%d edges",
        after["num_concepts"] - before["num_concepts"],
        after["num_edges"] - before["num_edges"],
    )

    # ── Serialization round-trip check ────────────────────────────────────────
    graph_dict = kg.to_dict()
    restored = KnowledgeGraph.from_dict(graph_dict)
    assert len(restored.get_all_concepts()) == len(kg.get_all_concepts()), \
        "Serialization round-trip failed: concept count mismatch"
    logger.info("✅ Serialization round-trip OK")

    # ── Save result ───────────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = graph_path.stem  # e.g. "graph_20260218_213224"
    output_file = output_dir / f"expanded_{stem}_{timestamp}.json"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(graph_dict, indent=2, ensure_ascii=False))
    logger.info("Saved  → %s", output_file)

    # ── Summary ───────────────────────────────────────────────────────────────
    by_level: dict[str, int] = {}
    for c in kg.get_all_concepts():
        by_level[c.level.value] = by_level.get(c.level.value, 0) + 1
    logger.info("Levels: %s", by_level)

    # Show up to 5 newly expanded concepts (confidence < 1.0 means LLM-generated)
    expanded = [c for c in kg.get_all_concepts() if c.confidence < 1.0]
    if expanded:
        logger.info(
            "Sample expanded concepts (%d total): %s",
            len(expanded),
            ", ".join(c.name for c in expanded[:5]),
        )

    logger.info("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Phase 3: expand a knowledge graph with frontier concepts",
    )
    parser.add_argument(
        "--graph",
        default=None,
        help=(
            "Path to input graph.json (Phase 2 output). "
            "Omit to auto-select the most recent file in scripts/test/results/."
        ),
    )
    parser.add_argument(
        "--model",
        default="google/gemma-3-27b-it",
        help="LLM model name (default: google/gemma-3-27b-it)",
    )
    parser.add_argument(
        "--rounds",
        type=int,
        default=2,
        help="Number of expansion rounds (default: 2)",
    )
    parser.add_argument(
        "--concepts-per-round",
        type=int,
        default=10,
        help="Target new concepts per round (default: 10)",
    )
    parser.add_argument(
        "--output-dir",
        default=str(OUTPUT_DIR),
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
