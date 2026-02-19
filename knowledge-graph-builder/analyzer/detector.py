"""Repository type detector."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Type

logger = logging.getLogger(__name__)


class RepoTypeDetector:
    """Detects repository type based on heuristics."""

    @staticmethod
    def detect(
        repo_path: Path, analyzers: list[Type["BaseRepoAnalyzer"]]
    ) -> tuple[Type["BaseRepoAnalyzer"], float]:
        """
        Detect the best analyzer for a repository.

        Calls can_handle() on all analyzers and selects the one with
        the highest confidence score.

        Args:
            repo_path: Path to the repository
            analyzers: List of available analyzer classes

        Returns:
            Tuple of (AnalyzerClass, confidence_score)
        """
        candidates = []

        for analyzer_class in analyzers:
            try:
                can_handle, confidence = analyzer_class.can_handle(repo_path)
                if can_handle:
                    candidates.append((analyzer_class, confidence))
                    logger.debug(
                        f"{analyzer_class.__name__} can handle {repo_path} "
                        f"(confidence: {confidence:.2f})"
                    )
            except Exception as e:
                logger.warning(
                    f"Error checking {analyzer_class.__name__}: {e}"
                )

        if not candidates:
            # Return GenericAnalyzer as fallback
            # Import here to avoid circular dependency
            from analyzer.analyzers.generic import (
                GenericAnalyzer,
            )

            logger.info(f"No specific analyzer found for {repo_path}, using GenericAnalyzer")
            return GenericAnalyzer, 0.1

        # Sort by confidence and return the best match
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_analyzer, best_confidence = candidates[0]

        logger.info(
            f"Detected repository type: {best_analyzer.get_repo_type().value} "
            f"(confidence: {best_confidence:.2f})"
        )

        return best_analyzer, best_confidence

    @staticmethod
    def detect_features(repo_path: Path) -> dict[str, bool]:
        """
        Detect various repository features for heuristic matching.

        This method checks for common indicators across different repository types.

        Args:
            repo_path: Path to the repository

        Returns:
            Dict of boolean features
        """
        features = {}

        # Python indicators
        features["has_setup_py"] = (repo_path / "setup.py").exists()
        features["has_pyproject_toml"] = (repo_path / "pyproject.toml").exists()
        features["has_requirements_txt"] = (repo_path / "requirements.txt").exists()
        features["has_python_src"] = any(repo_path.rglob("*.py"))

        # JavaScript/TypeScript indicators
        features["has_package_json"] = (repo_path / "package.json").exists()
        features["has_node_modules"] = (repo_path / "node_modules").exists()
        features["has_js_src"] = any(repo_path.rglob("*.js")) or any(repo_path.rglob("*.ts"))

        # Framework-specific
        features["has_transformers"] = (repo_path / "src" / "transformers").exists()
        features["has_torch_dir"] = (repo_path / "torch").exists()
        features["has_django_manage"] = (repo_path / "manage.py").exists()

        # Try to detect Flask (check common entry point files)
        flask_indicators = ["app.py", "application.py", "main.py"]
        features["has_flask_app"] = False
        for filename in flask_indicators:
            filepath = repo_path / filename
            if filepath.exists():
                try:
                    content = filepath.read_text(errors="ignore")
                    if "Flask" in content:
                        features["has_flask_app"] = True
                        break
                except Exception:
                    pass

        # Documentation
        features["has_docs"] = (
            (repo_path / "docs").exists() or (repo_path / "documentation").exists()
        )
        features["has_readme"] = any(
            (repo_path / name).exists()
            for name in ["README.md", "README.rst", "README.txt", "README"]
        )

        return features
