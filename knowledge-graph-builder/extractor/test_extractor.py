#!/usr/bin/env python3
"""Test script for Phase 2: Concept Extractor.

Two usage modes:

  1. Pass a Phase 1 JSON file (from analyzer/results/):
       python extractor/test_extractor.py --analysis analyzer/results/transformers_20260218_020450.json

  2. Pass a repo path/URL and run Phase 1 → Phase 2 in sequence:
       python extractor/test_extractor.py /path/to/repo
       python extractor/test_extractor.py https://github.com/org/repo
"""

import argparse
import json
import logging
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

from git import Repo as GitRepo

from analyzer import RepoAnalyzer
from analyzer.models import UniversalRepoAnalysis
from extractor import ConceptExtractor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


def load_analysis(path: str | Path) -> UniversalRepoAnalysis:
    """Load a Phase 1 analysis from a JSON file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Analysis file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return UniversalRepoAnalysis.from_dict(data)


def run_phase1(repo_path: str) -> tuple[UniversalRepoAnalysis, bool, Path | None]:
    """Run Phase 1 analysis, cloning if a URL is given.

    Returns:
        (analysis, is_temp_clone, clone_dir)
    """
    is_temp_clone = False
    clone_dir = None

    if repo_path.startswith("http://") or repo_path.startswith("https://"):
        repo_name = repo_path.rstrip("/").split("/")[-1].replace(".git", "")
        clone_dir = Path(tempfile.mkdtemp(prefix=f"test_extractor_{repo_name}_"))
        is_temp_clone = True

        logger.info("Cloning %s → %s ...", repo_path, clone_dir)
        GitRepo.clone_from(repo_path, str(clone_dir), depth=1)
        logger.info("✅ Clone completed")

        git_repo = GitRepo(clone_dir)
        try:
            git_repo.git.fetch("--deepen", "2000")
            logger.info("✅ Commit history fetched (2000 commits)")
        except Exception as e:
            logger.warning("Could not deepen clone: %s", e)

        repo_path = str(clone_dir)
    else:
        logger.info("Local repository: %s", repo_path)

    analyzer = RepoAnalyzer(repo_path)
    logger.info("Detected type: %s", analyzer.repo_type)
    analysis = analyzer.analyze()
    return analysis, is_temp_clone, clone_dir


def main():
    parser = argparse.ArgumentParser(
        description="Test Phase 2: Concept Extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  # From a saved Phase 1 JSON:
  python extractor/test_extractor.py --analysis analyzer/results/transformers_20260218_020450.json

  # From a local repo (runs Phase 1 then Phase 2):
  python extractor/test_extractor.py /path/to/repo

  # From a GitHub URL:
  python extractor/test_extractor.py https://github.com/org/repo
""",
    )
    parser.add_argument(
        "repo",
        nargs="?",
        default=None,
        help="Path or URL to a git repository (runs Phase 1 first)",
    )
    parser.add_argument(
        "--analysis", "-a",
        default=None,
        metavar="PATH",
        help="Phase 1 JSON file to use directly (skips Phase 1)",
    )
    parser.add_argument(
        "--output-dir", "-o",
        default="extractor/results",
        help="Output directory for graph JSON (default: extractor/results)",
    )
    parser.add_argument(
        "--model",
        default="google/gemma-3-27b-it",
        help="LLM model name (default: google/gemma-3-27b-it)",
    )
    parser.add_argument(
        "--keep-clone",
        action="store_true",
        help="Keep cloned repository after test",
    )

    args = parser.parse_args()

    if not args.analysis and not args.repo:
        parser.error("Provide either a repo path/URL or --analysis PATH")

    is_temp_clone = False
    clone_dir = None

    try:
        # ── Phase 1 ──────────────────────────────────────────────────────
        if args.analysis:
            logger.info("Loading Phase 1 analysis from: %s", args.analysis)
            analysis = load_analysis(args.analysis)
            repo_label = Path(args.analysis).stem
        else:
            logger.info("=" * 60)
            logger.info("Phase 1: Repository Analysis")
            logger.info("=" * 60)
            analysis, is_temp_clone, clone_dir = run_phase1(args.repo)
            repo_label = args.repo.rstrip("/").split("/")[-1].replace(".git", "")

        logger.info(
            "Analysis: type=%s, components=%d, commits=%d, docs=%d",
            analysis.repo_type.value,
            len(analysis.components),
            len(analysis.commits),
            len(analysis.documentation),
        )

        # ── Phase 2 ──────────────────────────────────────────────────────
        logger.info("")
        logger.info("=" * 60)
        logger.info("Phase 2: Concept Extraction")
        logger.info("=" * 60)

        extractor = ConceptExtractor(model=args.model)
        kg = extractor.extract(analysis)

        logger.info("✅ Extracted %d concepts, %d edges",
                    len(kg.get_all_concepts()), len(kg.get_all_edges()))

        # ── Serialization check ───────────────────────────────────────────
        logger.info("")
        logger.info("Serialization check")
        graph_dict = kg.to_dict()
        from_dict_kg = type(kg).from_dict(graph_dict)
        assert len(from_dict_kg.get_all_concepts()) == len(kg.get_all_concepts()), \
            "Concept count mismatch after round-trip"
        logger.info("✅ Serialization OK")

        # ── Save ─────────────────────────────────────────────────────────
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"{repo_label}_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(graph_dict, f, indent=2, ensure_ascii=False)

        logger.info("Graph saved → %s", output_file)
        logger.info("=" * 60)

        # ── Summary ──────────────────────────────────────────────────────
        concepts = kg.get_all_concepts()
        by_level: dict[str, int] = {}
        for c in concepts:
            by_level[c.level.value] = by_level.get(c.level.value, 0) + 1

        logger.info("Concept levels: %s", by_level)
        if concepts:
            logger.info("Sample concepts: %s",
                        ", ".join(c.name for c in concepts[:5]))

    except Exception as e:
        logger.error("❌ Test failed: %s", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        if is_temp_clone and not args.keep_clone and clone_dir and clone_dir.exists():
            logger.info("Cleaning up temporary clone...")
            shutil.rmtree(clone_dir)
            logger.info("✅ Cleanup done")


if __name__ == "__main__":
    main()
