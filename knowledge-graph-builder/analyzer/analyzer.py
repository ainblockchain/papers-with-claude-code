"""Universal repository analyzer with auto-detection."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from analyzer.base import BaseRepoAnalyzer
from analyzer.models import UniversalRepoAnalysis
from analyzer.registry import AnalyzerRegistry

# Auto-import all analyzers to register them
from analyzer.analyzers import generic, huggingface


class RepoAnalyzer:
    """
    Universal repository analyzer with auto-detection.

    This is the main entry point for repository analysis. It automatically
    detects the repository type and uses the appropriate analyzer.

    Example usage:
        # Auto-detection (recommended)
        analyzer = RepoAnalyzer("/path/to/any/repo")
        analysis = analyzer.analyze()

        # Explicit type
        analyzer = RepoAnalyzer(
            repo_path="/path/to/transformers",
            repo_type="huggingface",
            config={"max_commit_scan": 10000}
        )
        analysis = analyzer.analyze()
    """

    def __init__(
        self,
        repo_path: str | Path,
        repo_type: Optional[str] = None,
        config: Optional[dict] = None,
    ):
        """
        Initialize analyzer.

        Args:
            repo_path: Path to the repository
            repo_type: Optional explicit repository type. If None, auto-detect.
            config: Optional configuration dict for the analyzer

        Raises:
            ValueError: If repo_type is provided but not found in registry
        """
        self.repo_path = Path(repo_path)

        if repo_type:
            analyzer_class = AnalyzerRegistry.get(repo_type)
            if not analyzer_class:
                available_types = ", ".join([a.get_repo_type().value for a in AnalyzerRegistry.get_all()])
                raise ValueError(
                    f"Unknown repository type: {repo_type}. "
                    f"Available types: {available_types}"
                )
        else:
            analyzer_class = AnalyzerRegistry.auto_detect(self.repo_path)

        self.analyzer: BaseRepoAnalyzer = analyzer_class(self.repo_path, config=config)

    def analyze(self) -> UniversalRepoAnalysis:
        """
        Run analysis and return UniversalRepoAnalysis.

        For backward compatibility, the returned object has properties
        that map to the old RepoAnalysis fields (models, key_commits, etc.)

        Returns:
            UniversalRepoAnalysis object with all analysis results
        """
        return self.analyzer.analyze()

    @property
    def repo_type(self) -> str:
        """
        Get detected repository type.

        Returns:
            Repository type as string (e.g., "huggingface", "python_lib", "generic")
        """
        return self.analyzer.get_repo_type().value
