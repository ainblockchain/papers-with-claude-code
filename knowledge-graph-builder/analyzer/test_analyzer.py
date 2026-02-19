#!/usr/bin/env python3
"""Test script for the new Universal Repository Analyzer."""

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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


def main():
    """Test the analyzer on a repository (local path or URL)."""
    parser = argparse.ArgumentParser(
        description="Test the Universal Repository Analyzer module"
    )
    parser.add_argument(
        "repo",
        nargs="?",
        default="/Users/comcom/Desktop/papers-with-claudecode",
        help="Path or URL to the git repository (default: current project)"
    )
    parser.add_argument(
        "--detail-mode",
        action="store_true",
        help="Enable detail mode (fetch full commit history)"
    )
    parser.add_argument(
        "--keep-clone",
        action="store_true",
        help="Keep cloned repository after test (default: auto-delete)"
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        default="analyzer/results",
        help="Output directory for results (default: analyzer/results)"
    )

    args = parser.parse_args()

    # Track clone management
    is_temp_clone = False
    clone_dir = None
    repo_path = args.repo

    try:
        logger.info("Testing Universal Repository Analyzer")
        logger.info("=" * 60)

        # Handle URL cloning
        if repo_path.startswith("http://") or repo_path.startswith("https://"):
            repo_name = repo_path.rstrip("/").split("/")[-1].replace(".git", "")
            clone_dir = Path(tempfile.mkdtemp(prefix=f"test_analyzer_{repo_name}_"))
            is_temp_clone = True

            logger.info(f"Repository URL: {repo_path}")
            logger.info(f"Clone directory: {clone_dir}")
            logger.info("Cloning repository (depth=1)...")

            GitRepo.clone_from(repo_path, str(clone_dir), depth=1)
            logger.info("✅ Clone completed")

            # Fetch commit history based on mode
            git_repo = GitRepo(clone_dir)
            if args.detail_mode:
                logger.info("Detail mode: Fetching full commit history...")
                try:
                    git_repo.git.fetch("--unshallow")
                    logger.info("✅ Full commit history fetched")
                except Exception as e:
                    logger.warning(f"Could not unshallow clone: {e}")
            else:
                # Default: fetch same number of commits as Phase1 (MAX_COMMIT_SCAN = 5000)
                max_commits = 5000
                logger.info(f"Fetching commit history (last {max_commits} commits)...")
                try:
                    git_repo.git.fetch("--deepen", str(max_commits))
                    logger.info("✅ Commit history fetched")
                except Exception as e:
                    logger.warning(f"Could not deepen clone: {e}")

            repo_path = str(clone_dir)
        else:
            logger.info(f"Local repository: {repo_path}")

        # Test 1: Auto-detection
        logger.info("\nTest 1: Auto-detection")
        analyzer = RepoAnalyzer(repo_path)
        logger.info(f"Detected type: {analyzer.repo_type}")

        # Run analysis
        analysis = analyzer.analyze()

        # Print results
        logger.info(f"\nAnalysis Results:")
        logger.info(f"  Repository type: {analysis.repo_type.value}")
        logger.info(f"  Components: {len(analysis.components)}")
        logger.info(f"  Commits: {len(analysis.commits)}")
        logger.info(f"  Documentation: {len(analysis.documentation)}")
        logger.info(f"  Structure keys: {list(analysis.structure.keys())}")
        logger.info(f"  Dependencies keys: {list(analysis.dependencies.keys())}")
        logger.info(f"  Extensions keys: {list(analysis.extensions.keys())}")

        # Show some components
        if analysis.components:
            logger.info(f"\nFirst 5 components:")
            for comp in analysis.components[:5]:
                logger.info(f"  - {comp.name} ({comp.type}) in {comp.path}")

        # Show some commits
        if analysis.commits:
            logger.info(f"\nFirst 5 commits:")
            for commit in analysis.commits[:5]:
                logger.info(f"  - [{commit.date}] {commit.message[:50]}... (tags: {commit.tags})")

        # Test serialization
        logger.info("\nTest 2: Serialization")
        data_dict = analysis.to_dict()
        logger.info(f"Serialized to dict: {len(json.dumps(data_dict))} bytes")

        # Test deserialization
        analysis_from_dict = type(analysis).from_dict(data_dict)
        logger.info(
            f"Deserialized successfully: {len(analysis_from_dict.components)} components"
        )

        # Test backward compatibility
        logger.info("\nTest 3: Backward compatibility")
        logger.info(f"  analysis.models: {type(analysis.models)} (length: {len(analysis.models)})")
        logger.info(
            f"  analysis.key_commits: {type(analysis.key_commits)} (length: {len(analysis.key_commits)})"
        )
        logger.info(
            f"  analysis.doc_summaries: {type(analysis.doc_summaries)} (length: {len(analysis.doc_summaries)})"
        )

        logger.info("\n" + "=" * 60)
        logger.info("All tests completed successfully!")

        # Save results to file
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate output filename
        if args.repo.startswith("http://") or args.repo.startswith("https://"):
            repo_name = args.repo.rstrip("/").split("/")[-1].replace(".git", "")
        else:
            repo_name = Path(args.repo).name

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"{repo_name}_{timestamp}.json"

        # Save (with run metadata attached)
        logger.info("")
        logger.info("=" * 60)
        logger.info(f"Saving results to: {output_file}")
        result = analysis.to_dict()
        result["metadata"]["generated_by"] = "analyzer/test_analyzer.py"
        result["metadata"]["source_repo"] = args.repo
        result["metadata"]["detail_mode"] = args.detail_mode
        result["metadata"]["timestamp"] = timestamp
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        logger.info("✅ Results saved")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
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
