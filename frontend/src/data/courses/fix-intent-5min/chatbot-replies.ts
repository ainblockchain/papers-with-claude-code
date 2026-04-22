// Two canned replies the Stage-4 Dev chatbot swaps between, based on
// whether the user's question is judged to be on-topic for the intent
// the learner just fixed (exam absence / 결시 처리). Kept as plain
// strings so the chat view can render them verbatim.

export const ON_TOPIC_REPLY = `시험에 결시하게 되었을 때는 다음 절차를 따르시면 돼요.

1) 병결 사유 증빙 서류(진단서·공결확인서 등) 준비
2) 담당 교수님께 결시 사실·사유 통지(시험일 기준 7일 이내 권장)
3) 소속 학과 사무실에 결시 신청 및 서류 제출
4) 학사 규정에 따라 대체 시험 또는 성적 처리 진행

자세한 규정은 학사팀 또는 소속 단과대학에 문의해주세요!`;

export const OFF_TOPIC_REPLY = `지금 하신 질문은 이번에 수정한 인텐트 범위와 달라 보여요.
Stage 1 에서 발견했던 "시험 못보면 어떻게 되는거야" 같은 문장을 그대로 넣어 보면, 새로 추가한 인텐트가 제대로 매칭되는지 확인할 수 있어요.`;
