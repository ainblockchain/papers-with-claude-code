"""Universal data models for repository analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class RepoType(str, Enum):
    """Supported repository types."""

    HUGGINGFACE = "huggingface"
    PYTORCH = "pytorch"
    PYTHON_LIB = "python_lib"
    WEB_FRAMEWORK = "web_framework"
    JAVASCRIPT = "javascript"
    GENERIC = "generic"


@dataclass
class ComponentInfo:
    """Universal component representation (class, function, module, etc.)."""

    name: str  # Component name (e.g., "BertModel", "PreTrainedModel")
    path: str  # File path relative to repo root
    type: str  # "class", "function", "module", "package"
    metadata: dict = field(default_factory=dict)  # Extended info (lineno, methods, bases, etc.)

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "name": self.name,
            "path": self.path,
            "type": self.type,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> ComponentInfo:
        """Deserialize from dict."""
        return cls(
            name=d["name"],
            path=d["path"],
            type=d["type"],
            metadata=d.get("metadata", {}),
        )


@dataclass
class CommitInfo:
    """Universal commit representation."""

    sha: str  # Commit SHA (first 8 chars)
    date: str  # Commit date (YYYY-MM-DD)
    message: str  # Commit message (max 200 chars)
    author: str  # Commit author
    tags: list[str] = field(default_factory=list)  # Matched keywords (e.g., ["architecture", "optimization"])
    metadata: dict = field(default_factory=dict)  # Additional info

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "sha": self.sha,
            "date": self.date,
            "message": self.message,
            "author": self.author,
            "tags": self.tags,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CommitInfo:
        """Deserialize from dict."""
        return cls(
            sha=d["sha"],
            date=d["date"],
            message=d["message"],
            author=d["author"],
            tags=d.get("tags", []),
            metadata=d.get("metadata", {}),
        )


@dataclass
class DocumentationInfo:
    """Universal documentation representation."""

    path: str  # Documentation file path
    title: str  # Document title
    summary: str  # Summary (max 500 chars)
    category: str  # "api", "tutorial", "guide", "model"
    metadata: dict = field(default_factory=dict)  # Additional info (length, sections, etc.)

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "path": self.path,
            "title": self.title,
            "summary": self.summary,
            "category": self.category,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> DocumentationInfo:
        """Deserialize from dict."""
        return cls(
            path=d["path"],
            title=d["title"],
            summary=d["summary"],
            category=d["category"],
            metadata=d.get("metadata", {}),
        )


@dataclass
class UniversalRepoAnalysis:
    """
    Universal analysis result with extensible metadata.

    This data model supports all repository types with a common interface
    while allowing type-specific extensions.
    """

    # Metadata
    repo_type: RepoType  # Detected repository type
    repo_path: str  # Analyzed repository path

    # Core fields (present in all repo types)
    components: list[ComponentInfo] = field(default_factory=list)
    commits: list[CommitInfo] = field(default_factory=list)
    documentation: list[DocumentationInfo] = field(default_factory=list)

    # Structural info
    structure: dict = field(default_factory=dict)  # Directory tree, package info
    dependencies: dict = field(default_factory=dict)  # Requirements, package.json

    # Type-specific extensions
    extensions: dict[str, Any] = field(default_factory=dict)

    # Metadata
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "repo_type": self.repo_type.value if isinstance(self.repo_type, RepoType) else self.repo_type,
            "repo_path": self.repo_path,
            "components": [c.to_dict() for c in self.components],
            "commits": [c.to_dict() for c in self.commits],
            "documentation": [d.to_dict() for d in self.documentation],
            "structure": self.structure,
            "dependencies": self.dependencies,
            "extensions": self.extensions,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> UniversalRepoAnalysis:
        """Deserialize from dict."""
        return cls(
            repo_type=RepoType(d["repo_type"]),
            repo_path=d["repo_path"],
            components=[ComponentInfo.from_dict(c) for c in d.get("components", [])],
            commits=[CommitInfo.from_dict(c) for c in d.get("commits", [])],
            documentation=[DocumentationInfo.from_dict(doc) for doc in d.get("documentation", [])],
            structure=d.get("structure", {}),
            dependencies=d.get("dependencies", {}),
            extensions=d.get("extensions", {}),
            metadata=d.get("metadata", {}),
        )

    # Backward compatibility properties for HuggingFace-specific interface

    @property
    def models(self) -> list[dict]:
        """
        Extract HF models from extensions for backward compatibility.

        This property maintains compatibility with the old RepoAnalysis.models field.
        """
        if self.repo_type == RepoType.HUGGINGFACE:
            return self.extensions.get("models", [])
        return []

    @property
    def key_commits(self) -> list[dict]:
        """
        Alias for commits (backward compatibility).

        This property maintains compatibility with the old RepoAnalysis.key_commits field.
        """
        return [c.to_dict() for c in self.commits]

    @property
    def doc_summaries(self) -> list[dict]:
        """
        Alias for documentation (backward compatibility).

        This property maintains compatibility with the old RepoAnalysis.doc_summaries field.
        """
        return [d.to_dict() for d in self.documentation]
