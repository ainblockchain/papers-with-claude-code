// Fake Hanyang exam-absence reference material used during Phase 1 of the
// sheet edit stage. In the real workflow this info would come from Google
// searches, official documents, and team contacts — surfaced here so the
// learner can focus on the editing motion without getting stuck on domain
// knowledge.

export interface RelatedInfoBullet {
  title: string;
  body: string;
}

export const EXAM_ABSENCE_INFO = {
  heading: '한양대 시험 결시/병결 처리 정보',
  bullets: [
    {
      title: '병결 사유 증빙',
      body: '병원 진단서 / 의사 소견서 등을 준비합니다.',
    },
    {
      title: '제출 기한',
      body: '시험일로부터 7일 이내 학과 사무실에 제출 (학과별 상이).',
    },
    {
      title: '담당 교수 연락',
      body:
        '시험을 주관한 교수에게 즉시 연락해 상황 설명 → 교수 인정 시 추가시험·대체 평가 가능.',
    },
    {
      title: '학과 사무실 문의',
      body:
        '학과마다 병결 처리 세부 규정이 다르므로 학과 사무실 안내를 따릅니다.',
    },
    {
      title: '보건센터 활용',
      body:
        '학교 보건센터 진료 기록도 병결 증빙 자료로 활용할 수 있습니다.',
    },
  ] as RelatedInfoBullet[],
  disclaimer:
    '위 내용은 학습용 가상 정보입니다. 실제 수정 시에는 Google 검색, 대학 공식 문서, 담당 부서 확인 등 여러 방법으로 정보를 수집합니다.',
};
