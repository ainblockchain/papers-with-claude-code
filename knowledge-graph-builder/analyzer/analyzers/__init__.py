"""Repository-specific analyzers."""

# Import all analyzers to auto-register them
from analyzer.analyzers import (
    generic,
    huggingface,
)

__all__ = [
    "generic",
    "huggingface",
]
