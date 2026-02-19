"""Base class for all repository analyzers."""

from __future__ import annotations

import json
import logging
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional

from git import InvalidGitRepositoryError, Repo

from analyzer.models import (
    CommitInfo,
    ComponentInfo,
    DocumentationInfo,
    RepoType,
    UniversalRepoAnalysis,
)

logger = logging.getLogger(__name__)

# Package categorization sets for scan_dependencies()
_ML_FRAMEWORKS = frozenset({
    "torch", "pytorch", "tensorflow", "jax", "flax",
    "paddle", "paddlepaddle", "mxnet",
})
_DOMAIN_LIBS = frozenset({
    "transformers", "diffusers", "peft", "timm", "flash-attn", "flash_attn",
    "einops", "bitsandbytes", "accelerate", "xformers", "trl", "deepspeed",
    "fairseq", "sentence-transformers", "tokenizers", "huggingface-hub",
    "torchvision", "torchaudio",
})
_DATA_LIBS = frozenset({
    "datasets", "numpy", "pandas", "scipy", "scikit-learn", "sklearn",
    "pillow", "opencv-python", "albumentations",
})


class BaseRepoAnalyzer(ABC):
    """Abstract base class for all repository analyzers."""

    def __init__(self, repo_path: str | Path, config: Optional[dict] = None):
        """
        Initialize the analyzer.

        Args:
            repo_path: Path to the repository
            config: Optional configuration dict
        """
        self.repo_path = Path(repo_path)

        # Start with default config
        self.config = self.get_default_config()

        # Apply user config
        if config:
            # Handle fast mode
            if config.get("use_fast_mode") and "fast_mode_commits" in self.config:
                self.config["max_commit_scan"] = self.config["fast_mode_commits"]

            # Merge user config (excluding use_fast_mode flag)
            for key, value in config.items():
                if key != "use_fast_mode":
                    self.config[key] = value

        # Validate git repository
        try:
            self.repo = Repo(self.repo_path)
        except InvalidGitRepositoryError:
            raise ValueError(f"{repo_path} is not a valid git repository")

    @classmethod
    @abstractmethod
    def get_repo_type(cls) -> RepoType:
        """
        Return the repository type this analyzer handles.

        Returns:
            RepoType enum value
        """
        pass

    @classmethod
    @abstractmethod
    def can_handle(cls, repo_path: Path) -> tuple[bool, float]:
        """
        Check if this analyzer can handle the given repo.

        This method uses heuristics to detect if the repository matches
        the type this analyzer is designed for.

        Args:
            repo_path: Path to the repository

        Returns:
            Tuple of (can_handle, confidence_score)
            - can_handle: Boolean indicating if this analyzer can handle the repo
            - confidence_score: Float between 0.0-1.0 indicating confidence level
        """
        pass

    @classmethod
    def get_default_config(cls) -> dict:
        """
        Return default configuration for this analyzer.

        Subclasses can override this to provide analyzer-specific defaults.

        Returns:
            Dict of configuration options
        """
        return {}

    @abstractmethod
    def analyze(self) -> UniversalRepoAnalysis:
        """
        Run full analysis pipeline.

        This is the main entry point for analysis. Subclasses must implement
        this method to perform their specific analysis logic.

        Returns:
            UniversalRepoAnalysis object containing all analysis results
        """
        pass

    # Optional hooks with default implementations

    def scan_components(self) -> list[ComponentInfo]:
        """
        Scan repository for components (classes, functions, modules).

        Subclasses can override this to implement component detection.

        Returns:
            List of ComponentInfo objects
        """
        return []

    def scan_commits(self) -> list[CommitInfo]:
        """
        Scan commit history for important changes.

        Subclasses can override this to implement commit analysis.

        Returns:
            List of CommitInfo objects
        """
        return []

    def scan_documentation(self) -> list[DocumentationInfo]:
        """
        Scan documentation files.

        Subclasses can override this to implement documentation extraction.

        Returns:
            List of DocumentationInfo objects
        """
        return []

    def scan_structure(self) -> dict:
        """
        Analyze repository structure.

        Subclasses can override this to implement structure analysis.

        Returns:
            Dict containing structure information
        """
        return {}

    def scan_dependencies(self) -> dict:
        """
        Extract and categorize dependencies from common dependency files.

        Parses requirements.txt, pyproject.toml, setup.py, package.json.
        Categorizes packages into ML frameworks, domain libs, data libs, other.

        Returns:
            Dict with keys: frameworks, domain_libs, data, other, raw, source_files
        """
        raw_packages: list[str] = []
        source_files: list[str] = []

        candidates = [
            ("requirements.txt", self._parse_requirements_file),
            ("requirements-dev.txt", self._parse_requirements_file),
            ("pyproject.toml", self._parse_pyproject_toml),
            ("setup.py", self._parse_setup_py),
            ("package.json", self._parse_package_json),
        ]

        for filename, parser in candidates:
            path = self.repo_path / filename
            if path.exists():
                try:
                    packages = parser(path)
                    if packages:
                        raw_packages.extend(packages)
                        source_files.append(filename)
                except Exception as e:
                    logger.debug("Could not parse %s: %s", filename, e)

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for pkg in raw_packages:
            key = re.split(r"[>=<!~\s]", pkg)[0].strip().lower()
            if key and key not in seen:
                seen.add(key)
                unique.append(pkg)

        # Categorize
        frameworks, domain_libs, data_libs, other = [], [], [], []
        for pkg in unique:
            key = re.split(r"[>=<!~\s]", pkg)[0].strip().lower().replace("-", "_")
            key_h = key.replace("_", "-")
            if key in _ML_FRAMEWORKS or key_h in _ML_FRAMEWORKS:
                frameworks.append(pkg)
            elif key in _DOMAIN_LIBS or key_h in _DOMAIN_LIBS:
                domain_libs.append(pkg)
            elif key in _DATA_LIBS or key_h in _DATA_LIBS:
                data_libs.append(pkg)
            else:
                other.append(pkg)

        return {
            "frameworks": frameworks,
            "domain_libs": domain_libs,
            "data": data_libs,
            "other": other,
            "raw": unique,
            "source_files": source_files,
        }

    def _parse_requirements_file(self, path: Path) -> list[str]:
        """Parse requirements.txt-style file."""
        packages = []
        for line in path.read_text(errors="replace").splitlines():
            line = line.split("#")[0].strip()
            if line and not line.startswith("-"):
                packages.append(line)
        return packages

    def _parse_pyproject_toml(self, path: Path) -> list[str]:
        """Extract dependencies from pyproject.toml via regex (no toml lib needed)."""
        packages = []
        content = path.read_text(errors="replace")
        # Match lines inside [project] dependencies = [...] or [tool.poetry.dependencies]
        in_deps = False
        for line in content.splitlines():
            stripped = line.strip()
            if re.match(r"^\[(?:project|tool\.poetry)\b", stripped):
                in_deps = False
            if re.match(r"^dependencies\s*=\s*\[", stripped):
                in_deps = True
            if in_deps:
                for m in re.finditer(r'"([A-Za-z][A-Za-z0-9._-]*[^"]*)"', line):
                    pkg = m.group(1)
                    if not pkg.startswith("python"):
                        packages.append(pkg)
                if stripped == "]":
                    in_deps = False
        return packages

    def _parse_setup_py(self, path: Path) -> list[str]:
        """Extract install_requires list from setup.py via regex."""
        packages = []
        content = path.read_text(errors="replace")
        m = re.search(r"install_requires\s*=\s*\[(.*?)\]", content, re.DOTALL)
        if m:
            for pkg_m in re.finditer(r"""["']([A-Za-z][^"']+)["']""", m.group(1)):
                packages.append(pkg_m.group(1))
        return packages

    def _parse_package_json(self, path: Path) -> list[str]:
        """Extract dependency names from package.json."""
        try:
            data = json.loads(path.read_text(errors="replace"))
            packages = []
            for section in ("dependencies", "devDependencies", "peerDependencies"):
                packages.extend(data.get(section, {}).keys())
            return packages
        except Exception as e:
            logger.debug("Could not parse package.json: %s", e)
            return []

    def get_extensions(self) -> dict[str, Any]:
        """
        Return type-specific extension data.

        Subclasses can override this to provide analyzer-specific data
        that doesn't fit in the common fields.

        Returns:
            Dict of extension data
        """
        return {}
