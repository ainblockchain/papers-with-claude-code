"""Generic fallback analyzer for unknown repository types."""

from __future__ import annotations

import logging
import re
from pathlib import Path

from analyzer.base import BaseRepoAnalyzer
from analyzer.models import (
    CommitInfo,
    ComponentInfo,
    DocumentationInfo,
    RepoType,
    UniversalRepoAnalysis,
)
from analyzer.registry import register_analyzer

logger = logging.getLogger(__name__)


@register_analyzer
class GenericAnalyzer(BaseRepoAnalyzer):
    """Fallback analyzer for unknown repository types."""

    @classmethod
    def get_repo_type(cls) -> RepoType:
        return RepoType.GENERIC

    @classmethod
    def can_handle(cls, repo_path: Path) -> tuple[bool, float]:
        """Always returns True with low confidence (fallback)."""
        return (True, 0.1)

    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "max_commit_scan": None,  # None = unlimited (use --fast-mode for limited scan)
            "fast_mode_commits": 1000,  # Used when --fast-mode is enabled
        }

    def analyze(self) -> UniversalRepoAnalysis:
        """Run generic analysis - basic commit and structure info."""
        logger.info("Starting generic analysis of %s", self.repo_path)

        components = self.scan_components()
        logger.info("Found %d components", len(components))

        commits = self.scan_commits()
        logger.info("Found %d commits", len(commits))

        documentation = self.scan_documentation()
        logger.info("Found %d documentation files", len(documentation))

        structure = self.scan_structure()
        logger.info("Analyzed repository structure")

        dependencies = self.scan_dependencies()

        return UniversalRepoAnalysis(
            repo_type=self.get_repo_type(),
            repo_path=str(self.repo_path),
            components=components,
            commits=commits,
            documentation=documentation,
            structure=structure,
            dependencies=dependencies,
            extensions={},
            metadata={},
        )

    def scan_commits(self) -> list[CommitInfo]:
        """Scan commits with generic keywords."""
        commits = []

        # Generic keywords that work for most repositories
        keywords = [
            "release",
            "version",
            "feature",
            "fix",
            "breaking",
            "deprecate",
            "add",
            "feat",
            "refactor",
            "optimize",
            "performance",
            "security",
        ]

        try:
            max_scan = self.config.get("max_commit_scan")  # None = unlimited
            # If max_scan is None, don't pass max_count (scan all commits)
            iter_args = {"max_count": max_scan} if max_scan else {}
            for commit in self.repo.iter_commits(**iter_args):
                msg = commit.message.strip()
                msg_lower = msg.lower()

                matched_tags = [kw for kw in keywords if kw in msg_lower]

                # Also match version-like commit messages (v1.0.0, Release 2.0, etc.)
                if matched_tags or commit.summary.startswith(("v", "V", "Release")):
                    commits.append(
                        CommitInfo(
                            sha=commit.hexsha[:8],
                            date=commit.committed_datetime.strftime("%Y-%m-%d"),
                            message=msg.split("\n")[0][:200],
                            author=str(commit.author),
                            tags=matched_tags,
                            metadata={},
                        )
                    )
        except Exception as e:
            logger.warning(f"Error scanning commits: {e}")

        return commits

    def scan_structure(self) -> dict:
        """
        Extract class hierarchy from Python source files.

        Returns a dict mapping each class name to its inherited bases and file path.
        This reveals how components are composed and connected, which directly
        maps to prerequisite concept chains in the learning path.
        """
        hierarchy: dict = {}

        try:
            python_files = [
                f for f in self.repo_path.rglob("*.py")
                if not any(part.startswith(".") for part in f.parts)
                and not any(
                    part in {"__pycache__", "venv", "env", "node_modules", "build", "dist"}
                    for part in f.parts
                )
            ]

            # Limit to avoid scanning too many files in large repos
            max_files = 50
            if len(python_files) > max_files:
                logger.info("Found %d Python files, limiting structure scan to %d", len(python_files), max_files)
                python_files = sorted(python_files)[:max_files]

            for py_file in python_files:
                try:
                    content = py_file.read_text(errors="replace")
                    relative_path = str(py_file.relative_to(self.repo_path))

                    for match in re.finditer(
                        r"^class\s+(\w+)\s*\(([^)]+)\)\s*:", content, re.MULTILINE
                    ):
                        class_name = match.group(1)
                        bases = [
                            b.strip() for b in match.group(2).split(",")
                            if b.strip() and b.strip() not in {"object", "ABC", "Enum"}
                        ]
                        hierarchy[class_name] = {
                            "inherits": bases,
                            "file": relative_path,
                        }
                except Exception as e:
                    logger.debug("Could not parse %s: %s", py_file, e)

        except Exception as e:
            logger.warning("Error scanning structure: %s", e)

        return hierarchy

    def scan_components(self) -> list[ComponentInfo]:
        """
        Scan repository for code components (classes and functions).

        Focuses on Python files but can be extended for other languages.
        """
        components = []

        try:
            # Scan Python files for classes and functions
            python_files = list(self.repo_path.rglob("*.py"))

            # Limit to avoid scanning too many files
            max_files = 100
            if len(python_files) > max_files:
                logger.info(f"Found {len(python_files)} Python files, limiting to {max_files}")
                python_files = python_files[:max_files]

            for py_file in python_files:
                # Skip hidden directories and common ignore patterns
                if any(part.startswith(".") for part in py_file.parts):
                    continue
                if any(part in ["__pycache__", "venv", "env", "node_modules"] for part in py_file.parts):
                    continue

                relative_path = str(py_file.relative_to(self.repo_path))

                # Extract classes
                classes = self._extract_class_names(py_file)
                for class_name in classes:
                    components.append(
                        ComponentInfo(
                            name=class_name,
                            path=relative_path,
                            type="class",
                            metadata={},
                        )
                    )

                # Extract top-level functions
                functions = self._extract_function_names(py_file)
                for func_name in functions:
                    components.append(
                        ComponentInfo(
                            name=func_name,
                            path=relative_path,
                            type="function",
                            metadata={},
                        )
                    )

        except Exception as e:
            logger.warning(f"Error scanning components: {e}")

        return components

    def scan_documentation(self) -> list[DocumentationInfo]:
        """
        Scan repository for documentation files.

        Looks for README files and docs directory.
        """
        documentation = []

        try:
            # 1. Look for README files in root
            readme_patterns = ["README.md", "README.rst", "README.txt", "README"]
            for pattern in readme_patterns:
                readme_path = self.repo_path / pattern
                if readme_path.exists():
                    try:
                        content = readme_path.read_text(errors="replace")
                        summary = self._extract_doc_summary(content)
                        documentation.append(
                            DocumentationInfo(
                                path=pattern,
                                title="README",
                                summary=summary,
                                category="guide",
                                metadata={"length": len(content)},
                            )
                        )
                        break  # Only add one README
                    except Exception as e:
                        logger.debug(f"Could not read {readme_path}: {e}")

            # 2. Look for docs directory
            docs_dirs = ["docs", "documentation", "doc"]
            for docs_dir_name in docs_dirs:
                docs_dir = self.repo_path / docs_dir_name
                if docs_dir.exists() and docs_dir.is_dir():
                    # Scan markdown files in docs
                    md_files = list(docs_dir.rglob("*.md"))

                    # Limit to avoid too many files
                    max_docs = 20
                    if len(md_files) > max_docs:
                        logger.info(f"Found {len(md_files)} doc files, limiting to {max_docs}")
                        md_files = sorted(md_files)[:max_docs]

                    for doc_file in md_files:
                        try:
                            content = doc_file.read_text(errors="replace")
                            summary = self._extract_doc_summary(content)
                            relative_path = str(doc_file.relative_to(self.repo_path))

                            # Determine category from path
                            category = "guide"
                            if "api" in relative_path.lower():
                                category = "api"
                            elif "tutorial" in relative_path.lower():
                                category = "tutorial"

                            documentation.append(
                                DocumentationInfo(
                                    path=relative_path,
                                    title=doc_file.stem,
                                    summary=summary,
                                    category=category,
                                    metadata={"length": len(content)},
                                )
                            )
                        except Exception as e:
                            logger.debug(f"Could not read doc {doc_file}: {e}")

                    break  # Only scan first matching docs directory

        except Exception as e:
            logger.warning(f"Error scanning documentation: {e}")

        return documentation

    # Helper methods

    def _extract_class_names(self, filepath: Path) -> list[str]:
        """Extract class names from a Python file."""
        classes = []
        try:
            content = filepath.read_text(errors="replace")
            for match in re.finditer(r"^class\s+(\w+)\s*[\(:]", content, re.MULTILINE):
                classes.append(match.group(1))
        except Exception as e:
            logger.debug(f"Could not read {filepath}: {e}")
        return classes

    def _extract_function_names(self, filepath: Path) -> list[str]:
        """Extract top-level function names from a Python file."""
        functions = []
        try:
            content = filepath.read_text(errors="replace")
            # Match top-level functions (no indentation before 'def')
            for match in re.finditer(r"^def\s+(\w+)\s*\(", content, re.MULTILINE):
                func_name = match.group(1)
                # Skip private functions (starting with _)
                if not func_name.startswith("_"):
                    functions.append(func_name)
        except Exception as e:
            logger.debug(f"Could not read {filepath}: {e}")
        return functions

    def _extract_doc_summary(self, content: str) -> str:
        """
        Extract the first meaningful paragraph from a markdown doc.

        Skips headers, frontmatter, and extracts the first substantial paragraph.
        """
        lines = content.split("\n")
        in_content = False
        summary_lines = []

        for line in lines:
            stripped = line.strip()

            # Skip frontmatter, comments, and code blocks
            if stripped.startswith("<!--") or stripped.startswith("---") or stripped.startswith("```"):
                continue

            # Skip headers but mark that we're in content
            if stripped.startswith("#"):
                if in_content and summary_lines:
                    break  # Hit next section after getting content
                in_content = True
                continue

            # Collect content
            if in_content and stripped:
                summary_lines.append(stripped)
                if len(" ".join(summary_lines)) > 500:
                    break
            elif in_content and not stripped and summary_lines:
                break  # End of first paragraph

        return " ".join(summary_lines)[:500]
