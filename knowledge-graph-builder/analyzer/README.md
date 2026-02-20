# Universal Repository Analyzer

A universal Git repository analyzer. Analyzes all types of repositories to extract code structure, commit history, documentation, and more.

## Features

- **Automatic Type Detection**: Automatically recognizes HuggingFace, Python, JavaScript, and more
- **Comprehensive Analysis**: Code components, commit history, documentation, dependencies
- **Extensible**: New repository types can be added
- **JSON Output**: Structured analysis results

## Supported Repository Types

| Type | Description | Auto-Detection |
|------|-------------|----------------|
| `huggingface` | HuggingFace Transformers | ✅ |
| `python_lib` | General Python libraries | (Coming soon) |
| `javascript` | JavaScript/TypeScript projects | (Coming soon) |
| `generic` | All other repositories | ✅ (fallback) |

## Usage

### Basic Usage

```bash
# Analyze the current repository
python analyze_repo.py .

# Analyze a specific repository
python analyze_repo.py /path/to/repository

# Analyze via GitHub URL
python analyze_repo.py https://github.com/user/repo
```

### Options

```bash
python analyze_repo.py <repo_path> [OPTIONS]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--type`, `-t` | Specify repository type | Auto-detection |
| `--output-dir`, `-o` | Output directory path | `analyzer/results` |
| `--max-commits` | Maximum number of commits to scan | Unlimited |
| `--fast-mode` | Fast test mode (limited commit scanning) | - |

### Usage Examples

#### 1. Basic Analysis (Unlimited Commits)
```bash
python analyze_repo.py https://github.com/huggingface/transformers
```

**Result**: `analyzer/results/transformers_YYYYMMDD_HHMMSS.json`

#### 2. Fast Test Mode
```bash
python analyze_repo.py https://github.com/huggingface/transformers --fast-mode
```

Commit scan limits:
- HuggingFace: 5,000
- Generic: 1,000

#### 3. Specifying Type
```bash
python analyze_repo.py /path/to/repo --type huggingface
```

#### 4. Custom Commit Count
```bash
python analyze_repo.py /path/to/repo --max-commits 500
```

#### 5. Custom Output Path
```bash
python analyze_repo.py /path/to/repo --output-dir ./my_results
```

#### 6. Combining All Options
```bash
python analyze_repo.py https://github.com/django/django \
  --type python_lib \
  --output-dir ./django_analysis \
  --max-commits 2000
```

## Output Format

Analysis results are saved as a JSON file:

```json
{
  "repo_type": "huggingface",
  "repo_path": "/path/to/repo",
  "components": [
    {
      "name": "PreTrainedModel",
      "path": "src/transformers/modeling_utils.py",
      "type": "class",
      "metadata": {...}
    }
  ],
  "commits": [
    {
      "sha": "a1b2c3d4",
      "date": "2024-01-15",
      "message": "Add new feature",
      "author": "Developer",
      "tags": ["feature", "add"]
    }
  ],
  "documentation": [...],
  "structure": {...},
  "dependencies": {...},
  "extensions": {...}
}
```

### Key Fields

- **repo_type**: Detected repository type
- **components**: Code components (classes, functions, modules)
- **commits**: Important commit history
- **documentation**: Documentation summaries
- **structure**: Directory structure
- **dependencies**: Dependency information
- **extensions**: Type-specific extension data (e.g., HF models)

## Performance Considerations

### Commit Scan Count

| Mode | Commits | Speed | Use Case |
|------|---------|-------|----------|
| Default | Unlimited | Slow | Full analysis |
| `--fast-mode` | Limited (5000/1000) | Fast | Development/Testing |
| `--max-commits N` | Specified | Variable | Custom |

**Note**: Only a maximum of 40 commits are ever passed to the LLM, so even with unlimited scanning, inference cost remains the same.

### Memory Usage

- Small repos (< 1000 commits): No issues
- Medium repos (< 10000 commits): Fine
- Large repos (> 50000 commits): `--fast-mode` recommended

## Programmatic Usage

Use directly from Python code:

```python
from analyzer import RepoAnalyzer

# Auto-detection
analyzer = RepoAnalyzer("/path/to/repo")
analysis = analyzer.analyze()

print(f"Type: {analyzer.repo_type}")
print(f"Components: {len(analysis.components)}")
print(f"Commits: {len(analysis.commits)}")

# Specifying type
analyzer = RepoAnalyzer(
    repo_path="/path/to/repo",
    repo_type="huggingface",
    config={"max_commit_scan": 5000}
)
analysis = analyzer.analyze()

# Save results
import json
with open("result.json", "w") as f:
    json.dump(analysis.to_dict(), f, indent=2)
```

## Adding a New Analyzer

To support a new repository type:

### 1. Create an Analyzer Class

```python
# analyzer/analyzers/my_analyzer.py

from analyzer.base import BaseRepoAnalyzer
from analyzer.models import RepoType, UniversalRepoAnalysis
from analyzer.registry import register_analyzer

@register_analyzer
class MyAnalyzer(BaseRepoAnalyzer):
    @classmethod
    def get_repo_type(cls) -> RepoType:
        return RepoType.MY_TYPE

    @classmethod
    def can_handle(cls, repo_path: Path) -> tuple[bool, float]:
        # Detection logic (confidence: 0.0-1.0)
        confidence = 0.0
        if (repo_path / "my_indicator_file").exists():
            confidence += 0.8
        return (confidence > 0.5, confidence)

    def analyze(self) -> UniversalRepoAnalysis:
        # Analysis logic
        return UniversalRepoAnalysis(...)
```

### 2. Add to RepoType

```python
# analyzer/models.py

class RepoType(str, Enum):
    ...
    MY_TYPE = "my_type"
```

### 3. Add Import

```python
# analyzer/analyzers/__init__.py

from analyzer.analyzers import my_analyzer
```

## Architecture

```
analyzer/
├── __init__.py              # Public API
├── analyzer.py              # RepoAnalyzer (main interface)
├── base.py                  # BaseRepoAnalyzer (abstract class)
├── detector.py              # RepoTypeDetector (type detection)
├── registry.py              # AnalyzerRegistry (registration system)
├── models.py                # Data models
├── analyzers/               # Type-specific analyzers
│   ├── huggingface.py
│   ├── generic.py
│   └── ...
└── results/                 # Analysis results (JSON)
```

## Troubleshooting

### Not a Git Repository
```
ValueError: /path is not a valid git repository
```
-> Specify the repository root that contains a `.git` folder.

### Out of Memory
```
MemoryError: ...
```
-> Use `--fast-mode` or `--max-commits 1000`

### Type Detection Failed
```
Detected type: generic
```
-> Explicitly specify the type with the `--type` option

## License

This project follows the license of the parent project.
