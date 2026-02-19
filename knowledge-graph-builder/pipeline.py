#!/usr/bin/env python3
"""End-to-end pipeline for running all 5 phases.

This script runs the complete knowledge graph extraction pipeline:
Phase 1: Repository Analysis
Phase 2: Concept Extraction
Phase 3: Graph Expansion
Phase 4: Course Building
Phase 5: Scaffolding

Automatically clones and cleans up temporary repositories.
"""

import argparse
import logging
import shutil
import sys
import tempfile
from pathlib import Path

from git import Repo as GitRepo

from analyzer import RepoAnalyzer
from extractor import ConceptExtractor
from expander import GraphExpander
from courseBuilder import CourseBuilder
from scaffolder import Scaffolder

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


def run_phase_1_analyze(repo_path: Path, config: dict):
    """Phase 1: Repository Analysis."""
    logger.info("=" * 70)
    logger.info("Phase 1: Repository Analysis")
    logger.info("=" * 70)

    analyzer = RepoAnalyzer(repo_path, config=config)
    analysis = analyzer.analyze()

    logger.info(f"✅ Detected type: {analysis.repo_type.value}")
    logger.info(f"   Components: {len(analysis.components)}")
    logger.info(f"   Commits: {len(analysis.commits)}")
    logger.info(f"   Documentation: {len(analysis.documentation)}")

    return analysis


def run_phase_2_extract(analysis, model: str):
    """Phase 2: Concept Extraction."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Phase 2: Concept Extraction")
    logger.info("=" * 70)

    extractor = ConceptExtractor(model=model)
    kg = extractor.extract(analysis)

    logger.info(f"✅ Extracted {len(kg.get_all_concepts())} concepts")

    return kg


def run_phase_3_expand(kg, model: str, rounds: int):
    """Phase 3: Graph Expansion."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Phase 3: Graph Expansion")
    logger.info("=" * 70)

    expander = GraphExpander(model=model)
    kg = expander.expand(kg, rounds=rounds)

    logger.info(f"✅ Graph now has {len(kg.get_all_concepts())} concepts after {rounds} rounds")

    return kg


def run_phase_4_build(kg, model: str, skip_lessons: bool):
    """Phase 4: Course Building."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Phase 4: Course Building")
    logger.info("=" * 70)

    builder = CourseBuilder(model=model)
    courses = builder.build_courses(kg, generate_lessons=not skip_lessons)

    logger.info(f"✅ Built {len(courses)} courses")

    return courses


def run_phase_5_scaffold(kg, courses, output_dir: Path, repo_path: Path, enable_blockchain: bool):
    """Phase 5: Scaffolding Course Repository."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Phase 5: Scaffolding Course Repository")
    logger.info("=" * 70)

    scaffolder = Scaffolder(kg, courses, enable_blockchain=enable_blockchain)
    course_repo = scaffolder.scaffold(output_dir, repo_path=repo_path)

    # Initialize git repo if needed
    if not (output_dir / ".git").exists():
        logger.info("Initializing git repository...")
        GitRepo.init(str(output_dir))

    logger.info(f"✅ Course repo scaffolded at {course_repo}")

    return course_repo


def verify_pipeline_output(course_repo: Path, enable_blockchain: bool) -> None:
    """Verify the generated course repo structure."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Verification")
    logger.info("=" * 70)

    required_files = [
        course_repo / "CLAUDE.md",
        course_repo / "README.md",
        course_repo / ".gitignore",
        course_repo / "knowledge" / "graph.json",
        course_repo / "knowledge" / "courses.json",
        course_repo / ".learner" / "profile.json",
    ]

    if not enable_blockchain:
        required_files.append(course_repo / ".learner" / "progress.json")

    missing = []
    for file in required_files:
        if not file.exists():
            logger.warning(f"⚠️  Missing: {file}")
            missing.append(file)
        else:
            logger.info(f"✅ Found: {file.relative_to(course_repo)}")

    if missing:
        logger.warning(f"\n⚠️  Warning: {len(missing)} required files are missing")
    else:
        logger.info(f"\n✅ All required files present")


def print_pipeline_summary(analysis, kg, courses, course_repo: Path) -> None:
    """Print a summary of the pipeline results."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("Pipeline Summary")
    logger.info("=" * 70)
    logger.info(f"Repository Type: {analysis.repo_type.value}")
    logger.info(f"Components Analyzed: {len(analysis.components)}")
    logger.info(f"Commits Scanned: {len(analysis.commits)}")
    logger.info(f"Concepts Extracted: {len(kg.get_all_concepts())}")
    logger.info(f"Courses Built: {len(courses)}")
    logger.info(f"Course Repository: {course_repo}")
    logger.info("=" * 70)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Evaluate the full knowledge graph extraction pipeline (all 5 phases)"
    )
    parser.add_argument(
        "repo",
        help="Path or URL to the git repository to analyze"
    )
    parser.add_argument(
        "--output",
        "-o",
        required=True,
        help="Output directory for the generated course repository"
    )
    parser.add_argument(
        "--clone-dir",
        default=None,
        help="Directory to clone repository to (if URL). If not specified, uses temporary directory."
    )
    parser.add_argument(
        "--keep-clone",
        action="store_true",
        help="Keep the cloned repository after pipeline completion (default: auto-delete temporary clones)"
    )
    parser.add_argument(
        "--model",
        default="/data/models/gemma-3-27b-it",
        help="LLM model name on vLLM server (default: gemma-3-27b-it)"
    )
    parser.add_argument(
        "--max-commits",
        type=int,
        default=2000,
        help="Maximum number of commits to scan (default: 2000)"
    )
    parser.add_argument(
        "--fast-mode",
        action="store_true",
        help="Enable fast mode (limited commit scan)"
    )
    parser.add_argument(
        "--expansion-rounds",
        type=int,
        default=2,
        help="Number of graph expansion rounds (default: 2)"
    )
    parser.add_argument(
        "--skip-expansion",
        action="store_true",
        help="Skip Phase 3 (graph expansion)"
    )
    parser.add_argument(
        "--skip-lessons",
        action="store_true",
        help="Skip lesson generation in Phase 4 (faster)"
    )
    parser.add_argument(
        "--enable-blockchain",
        action="store_true",
        help="Generate blockchain/ directory with AIN helper"
    )

    args = parser.parse_args()

    # Track clone management
    is_temp_clone = False
    clone_dir = None
    repo_path = args.repo

    try:
        logger.info("=" * 70)
        logger.info("Full Pipeline Evaluation")
        logger.info("=" * 70)

        # Handle URL cloning
        if repo_path.startswith("http://") or repo_path.startswith("https://"):
            # Determine clone directory
            if args.clone_dir:
                clone_dir = Path(args.clone_dir)
            else:
                # Create temporary directory
                repo_name = repo_path.rstrip("/").split("/")[-1].replace(".git", "")
                clone_dir = Path(tempfile.mkdtemp(prefix=f"pipeline_{repo_name}_"))
                is_temp_clone = True

            logger.info(f"Repository URL: {repo_path}")
            logger.info(f"Clone directory: {clone_dir}")

            # Check if already cloned
            if (clone_dir / ".git").exists():
                logger.info("♻️  Using existing clone")
            else:
                # Clone repository
                logger.info("Cloning repository (depth=1)...")
                clone_dir.mkdir(parents=True, exist_ok=True)
                GitRepo.clone_from(repo_path, str(clone_dir), depth=1)
                logger.info("✅ Clone completed")

                # Deepen for commit history
                logger.info(f"Fetching commit history (last {args.max_commits} commits)...")
                try:
                    git_repo = GitRepo(clone_dir)
                    git_repo.git.fetch("--deepen", str(args.max_commits))
                    logger.info("✅ Commit history fetched")
                except Exception as e:
                    logger.warning(f"Could not deepen clone: {e}")

            repo_path = str(clone_dir)
        else:
            logger.info(f"Local repository: {repo_path}")

        # Prepare analyzer config
        config = {}
        if args.fast_mode:
            config["use_fast_mode"] = True
        if args.max_commits:
            config["max_commit_scan"] = args.max_commits

        # Create output directory
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Run all 5 phases
        analysis = run_phase_1_analyze(Path(repo_path), config)
        kg = run_phase_2_extract(analysis, args.model)

        if not args.skip_expansion:
            kg = run_phase_3_expand(kg, args.model, args.expansion_rounds)
        else:
            logger.info("\n" + "=" * 70)
            logger.info("Phase 3: Skipping graph expansion")
            logger.info("=" * 70)

        courses = run_phase_4_build(kg, args.model, args.skip_lessons)
        course_repo = run_phase_5_scaffold(
            kg, courses, output_dir, Path(repo_path), args.enable_blockchain
        )

        # Verification
        verify_pipeline_output(course_repo, args.enable_blockchain)

        # Summary
        print_pipeline_summary(analysis, kg, courses, course_repo)

        logger.info("")
        logger.info("✅ Pipeline evaluation completed successfully!")
        logger.info(f"To start learning: cd {course_repo} && claude")

    except Exception as e:
        logger.error(f"❌ Pipeline evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        # Cleanup temporary clone
        if is_temp_clone and not args.keep_clone:
            if clone_dir and clone_dir.exists():
                logger.info("")
                logger.info("🗑️  Cleaning up temporary clone...")
                shutil.rmtree(clone_dir)
                logger.info("✅ Cleanup completed")


if __name__ == "__main__":
    main()
