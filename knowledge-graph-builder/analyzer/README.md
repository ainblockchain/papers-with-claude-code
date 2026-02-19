# Universal Repository Analyzer

범용 Git 레포지토리 분석기. 모든 종류의 레포지토리를 분석하여 코드 구조, 커밋 히스토리, 문서 등을 추출합니다.

## 특징

- 🔍 **자동 타입 감지**: HuggingFace, Python, JavaScript 등 자동 인식
- 📊 **포괄적 분석**: 코드 컴포넌트, 커밋 히스토리, 문서, 의존성
- 🚀 **확장 가능**: 새로운 레포지토리 타입 추가 가능
- 💾 **JSON 출력**: 구조화된 분석 결과

## 지원하는 레포지토리 타입

| 타입 | 설명 | 자동 감지 |
|------|------|-----------|
| `huggingface` | HuggingFace Transformers | ✅ |
| `python_lib` | 일반 Python 라이브러리 | 🚧 (구현 예정) |
| `javascript` | JavaScript/TypeScript 프로젝트 | 🚧 (구현 예정) |
| `generic` | 기타 모든 레포지토리 | ✅ (fallback) |

## 사용 방법

### 기본 사용법

```bash
# 현재 레포지토리 분석
python analyze_repo.py .

# 특정 레포지토리 분석
python analyze_repo.py /path/to/repository

# GitHub URL로 분석
python analyze_repo.py https://github.com/user/repo
```

### 옵션

```bash
python analyze_repo.py <repo_path> [OPTIONS]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--type`, `-t` | 레포지토리 타입 명시 | 자동 감지 |
| `--output-dir`, `-o` | 결과 저장 경로 | `analyzer/results` |
| `--max-commits` | 스캔할 최대 커밋 수 | 무제한 |
| `--fast-mode` | 빠른 테스트 모드 (제한된 커밋 스캔) | - |

### 사용 예시

#### 1. 기본 분석 (무제한 커밋)
```bash
python analyze_repo.py https://github.com/huggingface/transformers
```

**결과**: `analyzer/results/transformers_YYYYMMDD_HHMMSS.json`

#### 2. 빠른 테스트 모드
```bash
python analyze_repo.py https://github.com/huggingface/transformers --fast-mode
```

커밋 스캔 제한:
- HuggingFace: 5,000개
- Generic: 1,000개

#### 3. 타입 명시
```bash
python analyze_repo.py /path/to/repo --type huggingface
```

#### 4. 커스텀 커밋 수
```bash
python analyze_repo.py /path/to/repo --max-commits 500
```

#### 5. 커스텀 출력 경로
```bash
python analyze_repo.py /path/to/repo --output-dir ./my_results
```

#### 6. 모든 옵션 조합
```bash
python analyze_repo.py https://github.com/django/django \
  --type python_lib \
  --output-dir ./django_analysis \
  --max-commits 2000
```

## 출력 형식

분석 결과는 JSON 파일로 저장됩니다:

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

### 주요 필드

- **repo_type**: 감지된 레포지토리 타입
- **components**: 코드 컴포넌트 (클래스, 함수, 모듈)
- **commits**: 중요 커밋 히스토리
- **documentation**: 문서 요약
- **structure**: 디렉토리 구조
- **dependencies**: 의존성 정보
- **extensions**: 타입별 확장 데이터 (예: HF의 models)

## 성능 고려사항

### 커밋 스캔 수

| 모드 | 커밋 수 | 속도 | 용도 |
|------|---------|------|------|
| 기본 | 무제한 | 느림 | 완전한 분석 |
| `--fast-mode` | 제한 (5000/1000) | 빠름 | 개발/테스트 |
| `--max-commits N` | 지정 | 가변 | 커스텀 |

**참고**: LLM에는 항상 최대 40개 커밋만 전달되므로, 무제한 스캔해도 inference 비용은 동일합니다.

### 메모리 사용

- 작은 레포 (< 1000 commits): 문제 없음
- 중간 레포 (< 10000 commits): 괜찮음
- 대형 레포 (> 50000 commits): `--fast-mode` 권장

## 프로그래매틱 사용

Python 코드에서 직접 사용:

```python
from analyzer import RepoAnalyzer

# 자동 감지
analyzer = RepoAnalyzer("/path/to/repo")
analysis = analyzer.analyze()

print(f"Type: {analyzer.repo_type}")
print(f"Components: {len(analysis.components)}")
print(f"Commits: {len(analysis.commits)}")

# 타입 명시
analyzer = RepoAnalyzer(
    repo_path="/path/to/repo",
    repo_type="huggingface",
    config={"max_commit_scan": 5000}
)
analysis = analyzer.analyze()

# 결과 저장
import json
with open("result.json", "w") as f:
    json.dump(analysis.to_dict(), f, indent=2)
```

## 새로운 Analyzer 추가

새로운 레포지토리 타입을 지원하려면:

### 1. Analyzer 클래스 생성

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
        # 감지 로직 (confidence: 0.0-1.0)
        confidence = 0.0
        if (repo_path / "my_indicator_file").exists():
            confidence += 0.8
        return (confidence > 0.5, confidence)

    def analyze(self) -> UniversalRepoAnalysis:
        # 분석 로직
        return UniversalRepoAnalysis(...)
```

### 2. RepoType에 추가

```python
# analyzer/models.py

class RepoType(str, Enum):
    ...
    MY_TYPE = "my_type"
```

### 3. Import 추가

```python
# analyzer/analyzers/__init__.py

from analyzer.analyzers import my_analyzer
```

## 아키텍처

```
analyzer/
├── __init__.py              # 공개 API
├── analyzer.py              # RepoAnalyzer (메인 인터페이스)
├── base.py                  # BaseRepoAnalyzer (추상 클래스)
├── detector.py              # RepoTypeDetector (타입 감지)
├── registry.py              # AnalyzerRegistry (등록 시스템)
├── models.py                # 데이터 모델
├── analyzers/               # 타입별 analyzer
│   ├── huggingface.py
│   ├── generic.py
│   └── ...
└── results/                 # 분석 결과 (JSON)
```

## 문제 해결

### Git 레포지토리가 아닙니다
```
ValueError: /path is not a valid git repository
```
→ `.git` 폴더가 있는 레포지토리 루트를 지정하세요.

### 메모리 부족
```
MemoryError: ...
```
→ `--fast-mode` 또는 `--max-commits 1000` 사용

### 타입 감지 실패
```
Detected type: generic
```
→ `--type` 옵션으로 명시적 지정

## 라이선스

이 프로젝트의 라이선스는 상위 프로젝트를 따릅니다.
