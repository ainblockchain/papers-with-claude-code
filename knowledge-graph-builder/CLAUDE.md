# Project Guidelines

## Project Root
이 프로젝트의 루트는 `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder`이다.

## Reference Codebase

- "본래 의도", "기존의", "기존 구현" 등의 표현이 나오면 `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder/knowledge_graph_builder` 하위를 탐색해 원래 의도를 파악한다.
- **해당 디렉토리의 파일은 절대 수정하지 않는다.** 읽기(참조)만 허용.

## Analyzer 아키텍처 (`analyzer/`)

새로 개발 중인 범용 레포 분석기. `knowledge_graph_builder/`의 HF 전용 구조를 확장해 임의의 논문 레포를 분석한다.

### UniversalRepoAnalysis 필드 정의

| 필드 | 타입 | 설명 |
|---|---|---|
| `components` | `list[ComponentInfo]` | 클래스/함수 목록 (name, path, type, metadata) |
| `commits` | `list[CommitInfo]` | 키워드 필터된 커밋 (sha, date, message, tags) |
| `documentation` | `list[DocumentationInfo]` | README/docs 요약 (path, title, summary, category) |
| `structure` | `dict` | **모델 클래스 계층**: `{ClassName: {inherits: [...], file: path}}` |
| `dependencies` | `dict` | **패키지 의존성**: `{frameworks, domain_libs, data, other, raw, source_files}` |
| `extensions` | `dict` | 레포 타입 특화 데이터 (HF: `extensions.models`) |

### `structure` 설계 의도
- 디렉토리 트리가 **아님**
- Python 클래스 상속/구성 관계 → 모델 아키텍처 계층을 나타냄
- `components`(flat list)와 구분: structure는 **클래스 간 관계**
- learning path에서 prerequisite node 자동 배치에 활용 가능
- `HuggingFaceAnalyzer`: `modeling_utils.py` + 대표 모델 10개만 스캔 (규모 제한)
- `GenericAnalyzer`: 전체 Python 파일 최대 50개 스캔

### `dependencies` 설계 의도
- `requirements.txt`, `pyproject.toml`, `setup.py`, `package.json` 파싱
- 카테고리 분류:
  - `frameworks`: torch, jax, tensorflow 등 → 프레임워크 선행 지식
  - `domain_libs`: peft, flash-attn, diffusers 등 → 도메인 특화 선행 지식
  - `data`: numpy, datasets, pandas 등
  - `other`: 나머지
- learning path에서 "이 논문을 읽기 전에 알아야 할 것" 자동 추출에 활용
- 구현 위치: `BaseRepoAnalyzer.scan_dependencies()` (모든 analyzer 공유)

### Analyzer 파일 구조

```
analyzer/
├── base.py          # BaseRepoAnalyzer: scan_dependencies() 공유 구현
├── models.py        # UniversalRepoAnalysis 데이터 모델
├── registry.py      # @register_analyzer 데코레이터
└── analyzers/
    ├── huggingface.py  # HF Transformers 전용 (구조: 대표 모델 10개)
    └── generic.py      # 범용 fallback (구조: 전체 파일 50개 한도)
```
