"""Registry for repository analyzers."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional, Type

logger = logging.getLogger(__name__)


class AnalyzerRegistry:
    """Registry for all available repository analyzers."""

    _analyzers: Dict[str, Type["BaseRepoAnalyzer"]] = {}

    @classmethod
    def register(cls, analyzer_class: Type["BaseRepoAnalyzer"]) -> Type["BaseRepoAnalyzer"]:
        """
        Register an analyzer.

        Args:
            analyzer_class: The analyzer class to register

        Returns:
            The analyzer class (for use as a decorator)
        """
        from analyzer.base import BaseRepoAnalyzer

        if not issubclass(analyzer_class, BaseRepoAnalyzer):
            raise TypeError(f"{analyzer_class} must be a subclass of BaseRepoAnalyzer")

        repo_type = analyzer_class.get_repo_type().value
        cls._analyzers[repo_type] = analyzer_class
        logger.debug(f"Registered analyzer: {repo_type} -> {analyzer_class.__name__}")
        return analyzer_class

    @classmethod
    def get(cls, repo_type: str) -> Optional[Type["BaseRepoAnalyzer"]]:
        """
        Get analyzer by type name.

        Args:
            repo_type: Repository type name (e.g., "huggingface", "python_lib")

        Returns:
            Analyzer class or None if not found
        """
        return cls._analyzers.get(repo_type)

    @classmethod
    def get_all(cls) -> list[Type["BaseRepoAnalyzer"]]:
        """
        Get all registered analyzers.

        Returns:
            List of analyzer classes
        """
        return list(cls._analyzers.values())

    @classmethod
    def auto_detect(cls, repo_path: str | Path) -> Type["BaseRepoAnalyzer"]:
        """
        Auto-detect the best analyzer for a repository.

        Uses the detector to find the analyzer with the highest confidence score.

        Args:
            repo_path: Path to the repository

        Returns:
            The best matching analyzer class
        """
        from analyzer.detector import RepoTypeDetector

        repo_path = Path(repo_path)
        analyzer_class, confidence = RepoTypeDetector.detect(repo_path, cls.get_all())

        logger.info(
            f"Auto-detected analyzer: {analyzer_class.__name__} "
            f"(confidence: {confidence:.2f})"
        )

        return analyzer_class

    @classmethod
    def clear(cls) -> None:
        """
        Clear all registered analyzers.

        This is mainly useful for testing.
        """
        cls._analyzers.clear()


def register_analyzer(cls: Type["BaseRepoAnalyzer"]) -> Type["BaseRepoAnalyzer"]:
    """
    Decorator to register an analyzer.

    Usage:
        @register_analyzer
        class MyAnalyzer(BaseRepoAnalyzer):
            ...

    Args:
        cls: The analyzer class to register

    Returns:
        The analyzer class
    """
    return AnalyzerRegistry.register(cls)
