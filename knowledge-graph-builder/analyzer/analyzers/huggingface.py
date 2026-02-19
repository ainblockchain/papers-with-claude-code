"""Analyzer for HuggingFace Transformers repository."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

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

# Keywords indicating important architectural commits
EVOLUTION_KEYWORDS = [
    "add model",
    "new model",
    "flash attention",
    "quantization",
    "gradient checkpointing",
    "mixed precision",
    "kv cache",
    "rotary embedding",
    "rope",
    "grouped query attention",
    "gqa",
    "sliding window",
    "sparse attention",
    "lora",
    "peft",
    "token merging",
    "speculative decoding",
    "moe",
    "mixture of experts",
]


@register_analyzer
class HuggingFaceAnalyzer(BaseRepoAnalyzer):
    """Analyzer for HuggingFace Transformers repository."""

    @classmethod
    def get_repo_type(cls) -> RepoType:
        return RepoType.HUGGINGFACE

    @classmethod
    def can_handle(cls, repo_path: Path) -> tuple[bool, float]:
        """Detect HuggingFace repo with high confidence."""
        confidence = 0.0

        # Strong indicator: src/transformers directory exists
        if (repo_path / "src" / "transformers").exists():
            confidence += 0.6

        # Additional indicator: models directory exists
        if (repo_path / "src" / "transformers" / "models").exists():
            confidence += 0.3

        # Check for transformers-specific files
        if (repo_path / "src" / "transformers" / "modeling_utils.py").exists():
            confidence += 0.1

        return (confidence > 0.5, confidence)

    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "models_path": "src/transformers/models",
            "docs_path": "docs/source/en/model_doc",
            "modeling_utils_path": "src/transformers/modeling_utils.py",
            "max_commit_scan": None,  # None = unlimited (use --fast-mode for limited scan)
            "fast_mode_commits": 5000,  # Used when --fast-mode is enabled
            "evolution_keywords": EVOLUTION_KEYWORDS,
        }

    def analyze(self) -> UniversalRepoAnalysis:
        """Run HuggingFace-specific analysis."""
        logger.info("Starting HuggingFace analysis of %s", self.repo_path)

        # Scan HF-specific models
        models = self._scan_models()
        logger.info("Found %d models", len(models))

        # Scan components
        components = self.scan_components()
        logger.info("Found %d components", len(components))

        # Scan commits
        commits = self.scan_commits()
        logger.info("Found %d key commits", len(commits))

        # Scan documentation
        documentation = self.scan_documentation()
        logger.info("Found %d documentation files", len(documentation))

        # Scan model class hierarchy
        structure = self.scan_structure()
        logger.info("Found %d classes in structure", len(structure))

        # Scan dependencies
        dependencies = self.scan_dependencies()
        logger.info("Found %d packages in dependencies", len(dependencies.get("raw", [])))

        return UniversalRepoAnalysis(
            repo_type=self.get_repo_type(),
            repo_path=str(self.repo_path),
            components=components,
            commits=commits,
            documentation=documentation,
            structure=structure,
            dependencies=dependencies,
            extensions={
                "models": models,  # HF-specific extension
            },
            metadata={},
        )

    def _scan_models(self) -> list[dict]:
        """Scan src/transformers/models/*/ for model directories."""
        models_dir = self.repo_path / self.config["models_path"]
        if not models_dir.exists():
            logger.warning("Models directory not found: %s", models_dir)
            return []

        models = []
        for model_dir in sorted(models_dir.iterdir()):
            if not model_dir.is_dir() or model_dir.name.startswith("_"):
                continue

            model_info = {
                "name": model_dir.name,
                "path": str(model_dir.relative_to(self.repo_path)),
                "classes": [],
                "first_commit_date": None,
                "has_modeling": False,
                "has_config": False,
                "has_tokenizer": False,
            }

            # Check for key files
            for f in model_dir.iterdir():
                if f.name.startswith("modeling_"):
                    model_info["has_modeling"] = True
                    model_info["classes"].extend(self._extract_class_names(f))
                elif f.name.startswith("configuration_"):
                    model_info["has_config"] = True
                elif "tokeniz" in f.name:
                    model_info["has_tokenizer"] = True

            # Get first commit date for the model directory
            model_info["first_commit_date"] = self._get_first_commit_date(
                str(model_dir.relative_to(self.repo_path))
            )

            models.append(model_info)

        return models

    def scan_components(self) -> list[ComponentInfo]:
        """Scan shared components - adapted from original."""
        components = []

        # Scan modeling_utils.py for base classes
        modeling_utils = self.repo_path / self.config["modeling_utils_path"]
        if modeling_utils.exists():
            classes = self._extract_class_names(modeling_utils)
            for cls_name in classes:
                components.append(
                    ComponentInfo(
                        name=cls_name,
                        path=self.config["modeling_utils_path"],
                        type="class",
                        metadata={"category": "shared_base"},
                    )
                )

        # Scan for attention implementations
        attn_dir = self.repo_path / self.config["models_path"]
        if attn_dir.exists():
            attn_classes = set()
            for modeling_file in attn_dir.rglob("modeling_*.py"):
                try:
                    content = modeling_file.read_text(errors="replace")
                    for match in re.finditer(
                        r"^class\s+(\w*(?:Attention|SelfAttention|MultiHeadAttention)\w*)\s*[\(:]",
                        content,
                        re.MULTILINE,
                    ):
                        attn_classes.add(match.group(1))
                except Exception:
                    continue

            # Report a summary rather than every individual class
            if attn_classes:
                components.append(
                    ComponentInfo(
                        name="attention_implementations",
                        path=self.config["models_path"],
                        type="module",
                        metadata={
                            "category": "attention_variants",
                            "count": len(attn_classes),
                            "examples": sorted(attn_classes)[:10],
                        },
                    )
                )

        return components

    def scan_commits(self) -> list[CommitInfo]:
        """Scan evolution commits - adapted from original."""
        commits = []
        keywords = self.config["evolution_keywords"]
        max_scan = self.config.get("max_commit_scan")  # None = unlimited

        try:
            # If max_scan is None, don't pass max_count (scan all commits)
            iter_args = {"max_count": max_scan} if max_scan else {}
            for commit in self.repo.iter_commits(**iter_args):
                msg_lower = commit.message.lower()
                for keyword in keywords:
                    if keyword in msg_lower:
                        commits.append(
                            CommitInfo(
                                sha=commit.hexsha[:8],
                                date=commit.committed_datetime.strftime("%Y-%m-%d"),
                                message=commit.message.strip().split("\n")[0][:200],
                                author=str(commit.author),
                                tags=[keyword],
                                metadata={"keyword": keyword},
                            )
                        )
                        break  # one keyword match per commit is enough
        except Exception as e:
            logger.warning(f"Error scanning commits: {e}")

        return commits

    def scan_documentation(self) -> list[DocumentationInfo]:
        """Scan model documentation - adapted from original."""
        docs_dir = self.repo_path / self.config["docs_path"]
        if not docs_dir.exists():
            logger.warning("Docs directory not found: %s", docs_dir)
            return []

        documentation = []
        for doc_file in sorted(docs_dir.glob("*.md")):
            try:
                content = doc_file.read_text(errors="replace")
                summary = self._extract_doc_summary(content)
                documentation.append(
                    DocumentationInfo(
                        path=str(doc_file.relative_to(self.repo_path)),
                        title=doc_file.stem,
                        summary=summary,
                        category="model",
                        metadata={"length": len(content)},
                    )
                )
            except Exception as e:
                logger.debug(f"Could not read doc {doc_file}: {e}")

        return documentation

    def scan_structure(self) -> dict:
        """
        Extract model class hierarchy from key HuggingFace modeling files.

        Focuses on modeling_utils.py (base classes) and a sample of model files
        to show the PreTrainedModel → BertModel → BertForMaskedLM pattern.
        Avoids scanning all 500+ models to keep output manageable.
        """
        hierarchy: dict = {}

        # Always include the base classes file
        target_files = [self.config["modeling_utils_path"]]

        # Add one modeling file per model, limited to first 10 alphabetically
        models_dir = self.repo_path / self.config["models_path"]
        if models_dir.exists():
            sample_dirs = sorted(
                d for d in models_dir.iterdir()
                if d.is_dir() and not d.name.startswith("_")
            )[:10]
            for model_dir in sample_dirs:
                for f in sorted(model_dir.glob("modeling_*.py")):
                    target_files.append(str(f.relative_to(self.repo_path)))
                    break  # one file per model

        for relative_path in target_files:
            filepath = self.repo_path / relative_path
            if not filepath.exists():
                continue
            try:
                content = filepath.read_text(errors="replace")
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
                logger.debug("Could not parse %s: %s", filepath, e)

        return hierarchy

    # Helper methods (from original implementation)

    def _extract_class_names(self, filepath: Path) -> list[str]:
        """Extract class names from a Python file."""
        classes = []
        try:
            content = filepath.read_text(errors="replace")
            for match in re.finditer(r"^class\s+(\w+)\s*[\(:]", content, re.MULTILINE):
                classes.append(match.group(1))
        except Exception as e:
            logger.debug("Could not read %s: %s", filepath, e)
        return classes

    def _get_first_commit_date(self, path: str) -> Optional[str]:
        """Get the date of the first commit that touched a path."""
        try:
            commits = list(self.repo.iter_commits(paths=path, max_count=1, reverse=True))
            if commits:
                return commits[0].committed_datetime.strftime("%Y-%m-%d")
        except Exception as e:
            logger.debug("Could not get first commit for %s: %s", path, e)
        return None

    def _extract_doc_summary(self, content: str) -> str:
        """Extract the first meaningful paragraph from a markdown doc."""
        lines = content.split("\n")
        in_content = False
        summary_lines = []

        for line in lines:
            stripped = line.strip()
            # Skip frontmatter, comments, and headers
            if stripped.startswith("<!--") or stripped.startswith("---"):
                continue
            if stripped.startswith("#"):
                if in_content:
                    break  # hit next section
                in_content = True
                continue
            if in_content and stripped:
                summary_lines.append(stripped)
                if len(" ".join(summary_lines)) > 500:
                    break
            elif in_content and not stripped and summary_lines:
                break  # end of first paragraph

        return " ".join(summary_lines)[:500]
