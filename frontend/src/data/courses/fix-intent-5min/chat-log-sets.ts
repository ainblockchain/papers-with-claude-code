import type { IntentRow } from '@/lib/courses/fix-intent-5min/course-state';

// Sourced from the hanyang-agent production 'chats' collection (read-only).
// Rows are categorised by whether the agent's intent classifier handled them
// correctly, and broken rows are sub-classified by the failure pattern so the
// course surface can emphasise variety of failure modes.

export type MismatchPattern =
  | 'unrelated'      // 주제가 완전히 다른 오분류
  | 'partial_match'  // 유사한 영역으로 갔지만 세부 intent는 틀린 경우
  | 'out_of_scope';  // 에이전트의 처리 범위 밖 요청이 억지로 분류된 경우

export const MISMATCH_PATTERN_LABELS: Record<MismatchPattern, string> = {
  unrelated: '주제 불일치',
  partial_match: '유사 주제, 세부 오분류',
  out_of_scope: '범위 밖 질문',
};

export interface ChatLogRow extends IntentRow {
  isBroken: boolean;
  pattern?: MismatchPattern;
}

export interface ChatLogSet {
  setId: string;
  title: string;
  rows: ChatLogRow[];
}

// Broken rows grouped by the pattern of misclassification observed in prod.
export const brokenRowsByPattern: Record<MismatchPattern, IntentRow[]> = {
  unrelated: [
    {
      sessionId: "8466b5e7-dce2-40a3-9933-27e90daf07bc",
      createdAt: "4월 19, 2026, 3:50 오후",
      intent: "대학원 과목 수강신청",
      userMessage: "자습실 예약",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교에서 자습실을 예약하려면 일반적으로 다음과 같은 방법을 따를 수 있습니다:

### 1. **백남학술정보관**
한양대학교의 대표적인 도서관인 백남학술정보관에서는 자습 공간을 예약할 수 있습니다.  
- **예약 방법**: [백남학술정보관 홈페이지](https://lib.hanyang.ac.kr/)에 접속하여 '시설예약' 메뉴를 이용하세요.
- **대상**: 한양대학교 재학생 및 교직원.

### 2. **단과대학별 공간 예약**
각 단과대학에서는 자체적으로 스터디룸이나 자습 공간을 운영하며, 예약 시스템이 다를 수 있습니다.  
- 예를 들어, **정책과학대학**은 [정책과학대학 공간예약 시스템](https://bookedroom.hanyang.ac.kr/front/reserve)을 통해 예약이 가능합니다.
- **자연과학대학**은 [자연과학대학 홈페이지](https://cns.hanyang.ac.kr/home)를 통해 예약 정보를 확인할 수 있습니다.

### 3. **기타 공간**
캠퍼스 내 특정 공간(예: 공학관, 경영관 등)의 자습실은 해당 단과대학 행정실에 문의하거나, 학과별 공지사항을 확인하시면 됩니다.

필요한 추가 정보가 있다면 말씀해주세요! 😊`,
    },
    {
      sessionId: "7d6f5946-34a8-41fd-ae5b-126ea5ccf59d",
      createdAt: "10월 19, 2025, 2:44 오전",
      intent: "기숙사",
      userMessage: "강사 이름 알 수 있어?",
      assistantContent: `^^Thinking^^웹 검색 중입니다...^^/Thinking^^^^Thinking^^웹 검색 결과를 종합하여 답변합니다.^^/Thinking^^강사 이름을 알고 싶으신 강의나 과목, 또는 다른 관련 정보를 알려주시면 검색을 통해 더 정확한 정보를 제공해드리겠습니다. 정확한 결과를 위해 강의명, 학과명, 또는 특정 정보가 필요합니다.`,
    },
    {
      sessionId: "8272d1e3-9e8a-4282-9d90-fd1dbe6c4827",
      createdAt: "3월 3, 2026, 3:15 오후",
      intent: "대학원 입학",
      userMessage: "개인정보 변경",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

입학원서 접수 후 휴대전화 번호를 포함한 개인정보를 변경하려면 다음과 같은 절차를 따르시면 됩니다:

1. **입학처에 직접 문의하기**  
   - 한양대학교 입학 관련 정보는 입학처에서 관리합니다.  
   - 개인정보 변경이 필요한 경우, 입학처에 전화 또는 이메일로 문의하여 변경 절차를 안내받으세요.  
   - 한양대학교 입학처 연락처: ☎ **02-2220-1901**

2. **원서 접수 사이트에서 변경 가능 여부 확인**  
   - 입학원서를 접수한 사이트(예: 유웨이, 진학사 등)를 통해 변경이 가능한지 확인하세요.  
   - 접수 마감 전이라면, 원서 접수 사이트에서 직접 수정이 가능할 수도 있습니다.

3. **변경 요청 시 유의사항**  
   - 변경 요청 시, 본인 확인을 위한 정보(수험번호, 이름 등)가 필요할 수 있습니다.  
   - 접수 마감 후에는 변경이 제한될 수 있으니, 가능한 빨리 요청하세요.

추가적으로, 한양대학교 입학 관련 공식 안내 페이지를 참고하실 수도 있습니다:  
👉 [한양대학교 입학안내 페이지](https://www.hanyang.ac.kr/web/www/admissions-guide)

궁금한 점이 더 있다면 언제든지 물어보세요! 😊^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
    },
  ],
  partial_match: [
    {
      sessionId: "bad6ed46-fa37-4b0d-a99f-b19c041399a9",
      createdAt: "4월 21, 2026, 10:49 오전",
      intent: "한양대 소개",
      userMessage: "미국연학",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교는 다양한 국제 교류 프로그램을 통해 학생들이 해외에서 학업 및 경험을 쌓을 수 있는 기회를 제공합니다. 미국 연학과 관련된 프로그램도 포함되어 있을 가능성이 높습니다. 아래는 한양대학교의 국제 교류 프로그램과 관련된 정보를 확인할 수 있는 주요 경로입니다:

---

### 🌍 **한양대학교 국제 교류 프로그램**
1. **국제처(Office of International Affairs)**  
   한양대학교 국제처는 교환학생, 단기 연수, 해외 인턴십 등 다양한 국제 프로그램을 운영합니다.  
   - **교환학생 프로그램**: 미국을 포함한 여러 국가의 대학과 협정을 맺고, 한 학기 또는 1년 동안 교환학생으로 학업을 진행할 수 있습니다.
   - **단기 연수 프로그램**: 여름방학이나 겨울방학 동안 미국 대학에서 단기 연수를 받을 수 있는 프로그램이 제공됩니다.
   - **해외 인턴십**: 미국 기업이나 기관에서 인턴십을 경험할 수 있는 기회도 있습니다.

   🔗 **국제처 홈페이지**: [oia.hanyang.ac.kr](http://oia.hanyang.ac.kr)

2. **HYUU(한양대학교 국제교류 커뮤니티)**  
   국제 교류와 관련된 학생들의 경험담, 정보 공유, FAQ 등을 확인할 수 있는 커뮤니티입니다.  
   - 교환학생 후기, 준비 과정, 필요한 서류 등 실질적인 정보를 얻을 수 있습니다.

---

### 📌 **추가적으로 확인할 사항**
- **참여 조건**: 학점, 어학 성적(예: TOEFL, IELTS), 학년 제한 등이 있을 수 있으니 국제처에서 제공하는 세부 정보를 확인하세요.
- **장학금 지원**: 국제 교류 프로그램에 참여하는 학생들에게 장학금이 제공될 수 있으니, 관련 정보를 꼭 확인하세요.

---

더 구체적인 정보가 필요하시다면, 국제처에 직접 문의하시는 것도 추천드립니다:
- **국제처 이메일**: [oia@hanyang.ac.kr](mailto:oia@hanyang.ac.kr)
- **전화번호**: 02-2220-0045

궁금한 점이 더 있으시면 언제든지 말씀해주세요! 😊`,
    },
    {
      sessionId: "aaedc37a-6ec1-409b-94b0-a9c02bf86a02",
      createdAt: "4월 13, 2026, 7:15 오후",
      intent: "강의계획서 안내",
      userMessage: "하이루 비교과 시스템은 어디서 봐? ",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교의 비교과 프로그램은 **HY-in 포털**에서 확인할 수 있습니다. 아래에 간단히 안내드릴게요!

📌 **하이루 비교과 시스템 확인 방법**
1. **HY-in 포털**에 로그인합니다.  
2. 상단 메뉴에서 **비교과 프로그램** 또는 **학생역량관리**를 선택합니다.  
3. 원하는 프로그램을 검색하거나 카테고리를 탐색합니다.

비교과 프로그램은 학생들의 역량 개발을 지원하기 위해 다양한 활동과 교육을 제공합니다. 프로그램 신청, 일정 확인, 결과 조회 등을 모두 이 시스템에서 할 수 있어요! 😊

혹시 더 궁금한 점이 있다면 말씀해주세요!`,
    },
    {
      sessionId: "e64c3c01-ad81-4ab4-aec1-79eed00f96f5",
      createdAt: "4월 19, 2026, 4:40 오후",
      intent: "재수강",
      userMessage: "시험 못보면 어떻게 되는거야",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

건강 악화로 인해 시험을 보지 못할 경우, 한양대학교에서는 아래와 같은 절차를 따를 수 있습니다:

---

### 1. **병결 사유 증빙**
- 시험에 결석한 경우, **병결 사유를 증빙할 수 있는 서류**(예: 병원 진단서, 의사 소견서 등)를 준비해야 합니다.
- 해당 서류는 **시험일로부터 7일 이내**에 제출하는 것이 일반적입니다. (정확한 기한은 학과나 교수님에 따라 다를 수 있으니 확인 필요)

---

### 2. **담당 교수님과의 소통**
- 시험을 주관하는 **담당 교수님께 즉시 연락**하여 상황을 설명하세요.
- 교수님께서 병결 사유를 인정하시면, **추가 시험(대체 시험)**을 제공하거나 다른 방식으로 성적을 평가할 수 있습니다.

---

### 3. **학과 사무실에 문의**
- 학과 사무실에 연락하여 병결 처리 및 시험 대체 방안에 대한 학교 정책을 확인하세요.
- 학과마다 세부 규정이 다를 수 있으므로, 학과 사무실의 안내를 따르는 것이 중요합니다.

---

### 4. **학교 규정 확인**
- 한양대학교의 학사 규정에 따라 병결 시험에 대한 처리 방식이 명시되어 있을 수 있습니다. 학사 안내 페이지나 학사팀에 문의하여 정확한 정보를 확인하세요.

---

### 5. **보건센터 활용**
- 학교 내 보건센터에서 진료를 받았다면, 해당 기록을 병결 증빙 자료로 활용할 수도 있습니다.

---

### 추가 문의
더 구체적인 정보가 필요하시다면, 한양대학교 학사팀이나 학과 사무실로 직접 문의하시길 권장합니다.  
- **학사팀 연락처**: [한양대학교 학사팀](https://www.hanyang.ac.kr/web/www/home)

빠른 쾌유를 빌며, 시험 관련 절차가 원활히 진행되길 바랍니다! 😊`,
    },
    {
      sessionId: "2d1682a9-1587-4751-91e8-7354a029fd6d",
      createdAt: "4월 21, 2026, 3:34 오후",
      intent: "학사 일정",
      userMessage: "?? 4/21일부터던데?",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

2026학년도 1학기 한양대학교 **학점 포기 신청 기간**은 **4월 21일(화)부터 4월 23일(목)**까지입니다. 😊

📌 **추가 정보**  
- 해당 일정은 **서울캠퍼스** 기준입니다.  
- 학점 포기 신청은 본인이 직접 **HY-in 포털**을 통해 진행해야 하며, 신청 가능 과목 및 세부 조건은 학사팀 공지사항을 참고하시기 바랍니다.

혹시 더 궁금한 점이 있다면 언제든 말씀해주세요! 😊`,
    },
  ],
  out_of_scope: [
    {
      sessionId: "8d3d11c1-0ec4-4792-ba12-73579549e0a1",
      createdAt: "4월 20, 2026, 11:42 오전",
      intent: "학생식당 메뉴",
      userMessage: "신소재공학관 점심 메뉴 크롤링 할수 있는 파이썬 코드 작성해줘",
      assistantContent: `"죄송합니다, 저는 한양대학교 관련 정보(학사, 시설, 식당, 행사, 장학금 등)만 안내드릴 수 있어요.😊 한양대 관련해서 궁금한 점이 있으시면 말씀해 주세요."`,
    },
    {
      sessionId: "e0811b76-1e27-4ba8-bd1c-5eaa8e3efe4a",
      createdAt: "4월 20, 2026, 11:11 오전",
      intent: "intent_about_agent",
      userMessage: "python으로 linked list 짜궈",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

아래는 Python으로 단순한 Linked List를 구현하는 코드입니다. Linked List는 노드(Node)로 구성되며, 각 노드는 데이터와 다음 노드를 가리키는 포인터를 포함합니다.

\`\`\`python
class Node:
    def __init__(self, data):
        self.data = data  # 노드의 데이터
        self.next = None  # 다음 노드를 가리키는 포인터

class LinkedList:
    def __init__(self):
        self.head = None  # Linked List의 시작 노드

    def append(self, data):
        new_node = Node(data)
        if not self.head:  # Linked List가 비어있다면
            self.head = new_node
            return
        current = self.head
        while current.next:  # 마지막 노드까지 이동
            current = current.next
        current.next = new_node  # 마지막 노드의 다음에 새 노드 추가

    def display(self):
        current = self.head
        while current:
            print(current.data, end=" -> ")
            current = current.next
        print("None")

    def delete(self, data):
        current = self.head
        if current and current.data == data:  # 삭제할 노드가 head일 경우
            self.head = current.next
            current = None
            return
        prev = None
        while current and current.data != data:
            prev = current
            current = current.next
        if current is None:  # 데이터가 없는 경우
            print("Data not found in the list.")
            return
        prev.next = current.next
        current = None

# 사용 예시
linked_list = LinkedList()
linked_list.append(1)
linked_list.append(2)
linked_list.append(3)
linked_list.display()  # 출력: 1 -> 2 -> 3 -> None

linked_list.delete(2)
linked_list.display()  # 출력: 1 -> 3 -> None
\`\`\`

### 주요 기능
1. **\`append(data)\`**: Linked List의 끝에 새로운 데이터를 추가합니다.
2. **\`display()\`**: Linked List의 모든 데이터를 출력합니다.
3. **\`delete(data)\`**: 특정 데이터를 가진 노드를 삭제합니다.

이 코드는 단순한 단일 연결 리스트(Singly Linked List)를 구현한 예제입니다. 필요에 따라 더 복잡한 기능을 추가할 수 있습니다! 😊`,
    },
    {
      sessionId: "7fb4201b-989e-4d01-8b35-77d57fb3caa0",
      createdAt: "4월 20, 2026, 12:59 오전",
      intent: "intent_about_agent",
      userMessage: "에듀스 제휴하는거 아니야?",
      assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교와 에듀스의 제휴 여부에 대한 정보는 제가 가진 배경지식에는 포함되어 있지 않습니다. 😅 하지만, 한양대학교는 다양한 외부 기관과 협력하여 학생들에게 유익한 서비스를 제공하고 있으니, 에듀스와의 제휴 여부를 확인하려면 한양대학교 경력개발센터나 관련 부서에 문의하시는 것이 가장 정확할 것 같습니다.

📞 **한양대학교 경력개발센터 연락처**: 02-2220-0040  
📧 **이메일**: career@hanyang.ac.kr  

또는 [한양대학교 경력개발센터 홈페이지](http://job.hanyang.ac.kr)를 방문하시면 더 많은 정보를 얻으실 수 있습니다! 😊`,
    },
  ],
};

// Correctly classified rows (intent matches the user's actual question).
export const cleanRows: IntentRow[] = [
  {
    sessionId: "2d1682a9-1587-4751-91e8-7354a029fd6d",
    createdAt: "4월 21, 2026, 3:33 오후",
    intent: "수강신청 기간",
    userMessage: "학점포기신청기간 알려줘",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

2026학년도 1학기 한양대학교의 **학점 포기 신청 기간**은 다음과 같습니다:

- **2026년 3월 23일(월) 오전 9시 ~ 3월 24일(화) 자정(24:00)**

📌 **유의사항**  
- 수강 포기 후 잔여 학점이 수강신청 최소 학점 이상이어야 합니다.  
- 최대 **2과목**까지 수강 포기가 가능합니다.  
- 학업연장자의 경우, 수강 포기 시 등록금 납부 일정에 유의하세요.

추가로 궁금한 점이 있다면 언제든 말씀해주세요! 😊`,
  },
  {
    sessionId: "27db9842-caf3-49d5-a0e2-8c717ddaf686",
    createdAt: "4월 20, 2026, 2:35 오후",
    intent: "학사 일정",
    userMessage: "중간고사 기간이 언제야",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

2026학년도 1학기 중간고사 기간은 학사일정에 명시되어 있지 않습니다. 하지만 **중간 강의평가 기간**이 **2026년 3월 30일(월)부터 4월 10일(금)**까지로 설정되어 있으니, 중간고사도 이와 비슷한 시기에 진행될 가능성이 높습니다.

정확한 시험 일정은 각 과목의 담당 교수님이나 강의 계획서를 통해 확인하시는 것이 가장 확실합니다. 추가로 궁금한 점이 있다면 말씀해 주세요! 😊`,
  },
  {
    sessionId: "8449edb1-356e-4e64-b9be-c82f9ae1d882",
    createdAt: "4월 20, 2026, 8:21 오전",
    intent: "한양대학교 주소",
    userMessage: "한양대에리카 장학금 관련 서류를 보내려하는데 주소가 궁금해요",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교 에리카 캠퍼스의 주소는 다음과 같습니다:

📍 **한양대학교 에리카 캠퍼스**  
**주소:** 15588 경기도 안산시 상록구 한양대학로 55  

장학금 관련 서류를 보내실 때는 해당 주소로 보내시면 됩니다. 혹시 더 자세한 문의가 필요하시면 한양대학교 에리카 캠퍼스 장학팀에 연락해 보시는 것도 좋습니다! 😊`,
  },
  {
    sessionId: "fa120c32-cff2-48aa-a010-e166f2ee42bf",
    createdAt: "4월 20, 2026, 2:08 오후",
    intent: "포털",
    userMessage: "포털 주소 좀",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교 포털 HY-in의 주소는 다음과 같습니다:

👉 [HY-in 바로가기](https://portal.hanyang.ac.kr/)

포털에서 학사, 증명서 발급, 장학금 등 다양한 서비스를 이용하실 수 있으니 참고하세요! 😊`,
  },
  {
    sessionId: "bf9279f8-e4d8-4371-ba7c-0d0b8d60cc33",
    createdAt: "4월 8, 2026, 5:03 오후",
    intent: "증명서",
    userMessage: "재학증명서 뽑기",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

재학증명서를 발급받는 방법은 다음과 같습니다:

---

### 📄 **재학증명서 발급 방법**
1. **인터넷 발급 (HY-in 포털)**
   - HY-in 포털에 로그인합니다.
   - 상단 메뉴에서 **「증명발급」**을 클릭합니다.
   - **인터넷증명발급(유료)**을 선택한 후, 재학증명서를 발급받으세요.

2. **무인 증명발급기(Kiosk)**
   - 위치:
     - 학생회관 앞(디지털라운지)
     - 학생회관 1층
     - 국제관 2층 HIT
   - 발급기에서 재학증명서를 출력할 수 있습니다.

3. **우편 발급**
   - HY-in 포털에 로그인 후, **우편증명 발급** 메뉴를 선택합니다.
   - 원하는 증명서를 선택하고 결제하면 우편으로 발송됩니다.

4. **FAX 민원**
   - 가까운 동주민센터, 구청, 도청 등에서 FAX 민원 서비스를 통해 신청 가능합니다.

---

### 💰 **발급 비용**
- **재학생·휴학생·수료생**: 국문 500원 / 영문 1,000원
- **졸업생·제적생**: 국·영문 1,000원

---

### 🔗 **자세한 정보**
더 자세한 내용은 [한양대학교 증명발급 페이지](https://www.hanyang.ac.kr/web/www/diploma_seoul)에서 확인하실 수 있습니다.

필요한 추가 정보가 있다면 언제든 말씀해주세요! 😊`,
  },
  {
    sessionId: "7819e029-3146-4fad-80fc-68ba661b0962",
    createdAt: "4월 16, 2026, 1:35 오후",
    intent: "학생증",
    userMessage: "앱에서 학생증 어떻게 발급 받아?",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교에서 **앱을 통해 학생증을 발급받는 방법**은 다음과 같습니다:

---

### **모바일 학생증 발급 방법**
1. **헤이영 캠퍼스 앱 설치**  
   - 앱스토어(iOS) 또는 구글 플레이스토어(Android)에서 **"헤이영 캠퍼스"** 앱을 다운로드하고 설치하세요.

2. **로그인**  
   - 앱 실행 후, 한양대학교 계정(HY-in 계정)으로 로그인합니다.

3. **모바일 학생증 발급**  
   - 로그인 후, 앱 내 **모바일 학생증 발급 메뉴**를 선택합니다.  
   - 본인 인증 절차를 완료하면 모바일 학생증이 발급됩니다.

4. **출입 및 사용**  
   - 발급된 모바일 학생증은 캠퍼스 내 출입, 도서관 이용, 식당 결제 등 다양한 용도로 사용할 수 있습니다.

---

### **도움이 필요할 때**
- **학생증 관련 문의**: 학생지원팀 ☎️ **02-2220-0085**  
- **앱 기술 지원**: IT 서비스센터 ☎️ **02-2220-1427**

앱에서 간편하게 학생증을 발급받아 편리하게 사용해 보세요! 😊`,
  },
  {
    sessionId: "f8dee4a6-a86c-4446-baf3-09cf2cf763b8",
    createdAt: "3월 4, 2026, 11:10 오전",
    intent: "졸업",
    userMessage: "졸업요건 관련 문의는요",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

졸업요건 관련 문의는 **졸업사정조회 메뉴**에서 개인별로 확인하실 수 있습니다.  
👉 **HY-in 로그인** → **MY홈** → **성적/졸업사정조회** → **졸업사정조회**  

만약 추가적인 문의가 필요하다면, **소속 단과대학 행정팀**으로 연락하시면 됩니다. 😊  
더 궁금한 점이 있다면 언제든지 물어보세요!^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
  {
    sessionId: "5995ff69-57fb-412c-bba5-5c53eba806b7",
    createdAt: "7월 22, 2025, 3:34 오후",
    intent: "증명서",
    userMessage: "졸업증명서",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

💡 **졸업증명서 발급 안내**  
한양대학교 졸업증명서는 아래 방법으로 발급 가능합니다:

---

### **1. 인터넷 발급**  
👉 HY-in 포털에서 발급 가능  
1. HY-in 로그인  
2. 상단 메뉴에서 **「증명발급」** 클릭  
3. **인터넷증명발급(유료)** 선택  
4. 졸업증명서 발급 완료  

💰 **발급 비용**: 국문 1,000원 / 영문 1,000원  

---

### **2. 방문 발급**  
👉 무인 증명발급기(Kiosk) 위치:  
- 한양플라자 1층  
- 학생회관 2층  
- 백남학술정보관 1층 로비(ATM 옆)  

---

### **3. FAX 민원 발급**  
👉 가까운 주민센터, 구청, 도청에서 FAX 민원 서비스로 신청 가능  

---

### **4. 우편 발급**  
👉 HY-in 포털 **「우편증명발급」** 메뉴에서 신청  
1. 원하는 증명서 선택  
2. 발송 주소 입력  
3. 추가 요청 사항 기재  
4. 총 발송비용 확인 후 입금  

📦 **소요 기간**: 국내 1–2일 / 해외 5–6일  

---

📌 **추가 정보**  
졸업증명서 발급에 대한 자세한 내용은 아래 링크를 참고하세요:  
🔗 [한양대학교 증명발급 페이지](https://www.hanyang.ac.kr/web/www/diploma_seoul)  

궁금한 점이 더 있으시면 언제든 말씀해주세요! 😊^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
  {
    sessionId: "1cb5c180-374a-4fe2-8be7-90dd9e694952",
    createdAt: "8월 13, 2025, 8:36 오전",
    intent: "기숙사",
    userMessage: "기숙사",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교 기숙사에 대한 자세한 정보는 아래 링크를 통해 확인하실 수 있습니다:  
[👉 한양대학교 기숙사 홈페이지](http://www.dormitory.hanyang.ac.kr/html/info/facilities)  

기숙사의 시설, 신청 방법, 규정 등 다양한 정보를 제공하고 있으니 참고해 주세요! 😊  
혹시 더 궁금한 점이 있다면 말씀해 주세요!^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
  {
    sessionId: "28c42a05-5a9c-4498-90b2-704aa4161257",
    createdAt: "4월 19, 2026, 10:31 오후",
    intent: "통학버스",
    userMessage: "한양대 정문 버스 알려줘",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교 정문을 경유하는 버스는 다음과 같습니다:

### 🚍 **버스 정보**
#### **간선버스**
- **121**
- **302**

#### **지선버스**
- **2012**
- **2014**
- **2016**
- **2222**
- **4211**

### 🛑 **정류장 이름**
- **한양대정문앞**
- **한양대앞·한양시장 인근**

이 버스들을 이용하면 한양대학교 정문으로 편리하게 이동할 수 있습니다. 추가로 궁금한 점이 있다면 말씀해주세요! 😊`,
  },
  {
    sessionId: "7137c383-ade4-489d-95d3-7f6a9b039d47",
    createdAt: "4월 10, 2026, 12:29 오후",
    intent: "휴학",
    userMessage: "지금 휴학할수있나요",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

현재 시점인 **2026년 4월 10일**은 대학원 휴·복학 신청 기간인 **1월/7월**이 아닙니다. 따라서 일반적인 휴학 신청은 지금 바로 진행하기 어려울 수 있습니다. 

다만, 휴학 사유가 **군복무, 임신 및 출산, 질병 등 특별한 경우**라면 예외적으로 신청이 가능할 수도 있으니, 본인 소속 **단과대학 및 대학원 행정팀**에 문의하셔서 정확한 안내를 받으시길 추천드립니다.

추가적으로 궁금한 점이 있으시면 말씀해주세요! 😊`,
  },
  {
    sessionId: "eb9f5f16-ae92-4ae0-9536-88aa09dfdd81",
    createdAt: "4월 20, 2026, 8:44 오전",
    intent: "복학",
    userMessage: "그니까 학고반수 학생이 내년에 복학하면 1학기로 돌아오는거지?",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

네, 맞습니다! 😊

학사경고(학고)를 받고 **1학기 중에 수업을 중단(반수)**한 학생이 내년 **3월에 복학**한다면, 이는 **1학기 복학**으로 처리됩니다. 따라서 **1학기부터 다시 시작**하게 됩니다.

---

### 이유는 다음과 같습니다:
1. **복학은 학기 단위로 진행**됩니다.  
   - 내년 3월에 복학하면, 이는 **1학기 복학**으로 간주됩니다.  
   - 2학기 복학은 8월 말~9월 초에 시작됩니다.

2. **학적 상태**는 휴학 당시의 학년과 학기로 복귀합니다.  
   - 예를 들어, 1학년 1학기 중 학사경고를 받고 휴학했다면, 복학 시 **1학년 1학기**로 돌아옵니다.

---

### 추가 참고:
복학 신청 및 학사 일정에 대한 자세한 정보는 [한양대학교 학사 일정](https://www.hanyang.ac.kr/web/www/-33)에서 확인하실 수 있습니다. 복학 절차나 학사경고 관련 추가 질문이 있다면 언제든 말씀해주세요! 😊`,
  },
  {
    sessionId: "eb9f5f16-ae92-4ae0-9536-88aa09dfdd81",
    createdAt: "4월 20, 2026, 8:46 오전",
    intent: "학과 정보 안내",
    userMessage: "음....한양에 약대 있어?",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

네, 한양대학교에는 **약학대학(약대)**이 존재합니다! 😊

---

### 한양대학교 약학대학 정보:
- **위치**: 서울캠퍼스에 위치하고 있습니다.
- **설립 목적**: 약학 및 제약 산업 분야의 전문 인재를 양성하기 위해 설립되었습니다.
- **교육 과정**: 약학대학에서는 약물학, 약제학, 생화학, 임상약학 등 다양한 약학 관련 과목을 배우며, 약사 국가시험 준비와 연구 역량을 키울 수 있는 커리큘럼을 제공합니다.

---

### 추가 정보:
약학대학에 대한 더 자세한 내용(입학 정보, 교수진, 연구 분야 등)은 [한양대학교 약학대학 홈페이지](https://pharmacy.hanyang.ac.kr)를 방문하시면 확인하실 수 있습니다.

궁금한 점이 더 있다면 언제든 물어보세요! 😊`,
  },
  {
    sessionId: "3eb33247-cabe-4ba2-b0ce-45e0c9c1bc05",
    createdAt: "3월 10, 2026, 4:31 오후",
    intent: "편입",
    userMessage: "편입요강",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교 편입학 요강에 대해 안내드립니다! 😊

### 한양대학교 편입학 관련 정보
1. **서울캠퍼스 2026학년도 편입 원서접수**
   - **기간**: 2025년 12월 9일(화) 오전 10시 ~ 12월 11일(목) 오후 5시
   - **공지사항 확인**: [서울캠퍼스 편입학 공지사항](https://go.hanyang.ac.kr/web/notice/notice_list.do?m_type=PYEONIP)

2. **ERICA캠퍼스 2026학년도 편입 원서접수**
   - **기간**: 아직 미정
   - **공지사항 확인**: [ERICA캠퍼스 편입학 공지사항](http://goerica.hanyang.ac.kr/admission/html/transfer/notice.asp)

3. **모집요강 업로드 일정**
   - 서울캠퍼스와 ERICA캠퍼스의 모집요강은 **12월 초**에 업로드되는 경우가 많습니다.
   - 예를 들어, 2025학년도 모집공고는 **2026년 1월 14일**에 업로드되었습니다.

### 추가 안내
편입학 관련 자세한 정보는 아래 입학처 홈페이지에서 확인하실 수 있습니다:
- [서울캠퍼스 입학처](http://go.hanyang.ac.kr/)
- [ERICA캠퍼스 입학처](http://goerica.hanyang.ac.kr/)

궁금한 점이 더 있으시면 언제든 말씀해주세요! 😊^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
  {
    sessionId: "3536776c-c5f2-4151-a7c6-02671f49527a",
    createdAt: "4월 15, 2026, 9:46 오전",
    intent: "등록금 얼마",
    userMessage: "인공지능학과 등록금",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

인공지능학과의 등록금은 매년 학과별로 상이하며, 내국인의 경우 **매년 1월 말**에 결정됩니다. 

등록금 고지서를 확인하는 방법은 다음과 같습니다:

### 1️⃣ HY-in 포털 이용
1. [HY-in 포털](https://portal.hanyang.ac.kr) 접속 후 로그인  
2. **등록장학 메뉴** → **등록금 고지서 출력**  
3. 고지서 확인 및 출력  

### 2️⃣ 한양대학교 홈페이지 이용
1. [한양대학교 홈페이지](https://www.hanyang.ac.kr) 접속  
2. 메인화면의 **[광장] → 재학생 등록안내 배너 클릭**  
3. **등록금 고지서 출력 버튼** 클릭 후 필수정보 입력  
4. 고지서 조회 및 인쇄  

📌 **주의사항**  
- 등록금 납부 후에는 해당 차수의 고지서를 추가 출력할 수 없으니, 꼭 납부 전에 출력하세요!  
- 신입생 및 편입생의 경우, 등록금 고지서 확인 일정이 재학생과 다를 수 있으니 **합격자 유의사항**을 참고하시기 바랍니다.

더 구체적인 금액 정보는 위 방법으로 고지서를 확인하거나, 학과 사무실에 문의하시면 됩니다! 😊`,
  },
  {
    sessionId: "e4b44adc-66da-43b9-af16-fecb3deb8252",
    createdAt: "2월 14, 2026, 6:16 오후",
    intent: "편입",
    userMessage: "편입생 학점인정 서류 제출",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

편입생 학점 인정 서류 제출과 관련된 정보는 한양대학교 입학처 홈페이지에서 확인하실 수 있습니다. 편입학 관련 공지사항은 아래 링크를 통해 확인하시면 됩니다:

- **서울캠퍼스 편입학 공지사항**: [go.hanyang.ac.kr](https://go.hanyang.ac.kr/web/notice/notice_list.do?m_type=PYEONIP)
- **ERICA캠퍼스 편입학 공지사항**: [goerica.hanyang.ac.kr](http://goerica.hanyang.ac.kr/admission/html/transfer/notice.asp)

학점 인정 서류 제출에 대한 구체적인 일정 및 방법은 캠퍼스별로 다를 수 있으니, 위의 링크에서 최신 공지사항을 확인하시기 바랍니다. 추가로 궁금한 점이 있으시면 말씀해주세요! 😊^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
  {
    sessionId: "10493982-5ee5-4e60-afeb-9ac13fd4ba0e",
    createdAt: "4월 17, 2026, 6:56 오후",
    intent: "교환학생",
    userMessage: "해외대학 복수학위 학위제도 있어",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

한양대학교는 해외 대학과의 협정을 통해 복수학위 프로그램을 운영하고 있습니다. 복수학위 프로그램은 본교와 해외 대학에서 각각 일정 기간 동안 수학하여 두 대학의 학위를 모두 취득할 수 있는 제도입니다. 

자세한 내용은 아래 링크를 통해 확인하실 수 있습니다:
- [서울캠퍼스 복수학위 안내](https://oia.hanyang.ac.kr/exchangeout)
- [에리카캠퍼스 복수학위 안내](https://global.hanyang.ac.kr/s2/s2_1_1.php)

복수학위 프로그램은 각 캠퍼스와 협정 대학에 따라 세부 조건이 다를 수 있으니, 위의 링크를 참고하시거나 국제처에 문의하시면 더 정확한 정보를 얻으실 수 있습니다! 😊`,
  },
  {
    sessionId: "d1fdf835-0a19-40af-9be2-963567e5dada",
    createdAt: "4월 21, 2026, 9:20 오후",
    intent: "no_intent",
    userMessage: "汉阳大学请病假流程",
    assistantContent: `^^Thinking^^웹 검색 중입니다...^^/Thinking^^^^Thinking^^웹 검색 결과를 종합하여 답변합니다.^^/Thinking^^검색 결과를 통해, 한양대학교에서 병결 관련 정보가 포함된 페이지를 확인할 수 있습니다.

1. [공결 신청 안내 (公假申请指南) - 한양대학교 경영전문대학원](https://mba.hanyang.ac.kr/front/zh/cmba/notice/read?id=AZwmh0jifLm09nkIf8iNSQ&sd=12&sp=1&so=CREATED_AT_DESC): 
   병결(공결) 신청 관련 세부 설명이 적혀 있으며, 한양대학교 포털인 HY-in을 통해 신청할 수 있습니다. 병결 사유는 발생 전 또는 발생 후 7일 이내 신청해야 합니다.

2. [本科生交流学习指南 - 哈尔滨工业大学](https://hituc.hit.edu.cn/_upload/article/files/af/5c/97618a6847dab9a51bfa1d0887fd/b52b537b-1592-4ad4-938e-26a72581aec6.pdf): 
   교환학생으로 한양대학교와 관련된 병결 절차 및 포괄적인 교류 프로그램 안내를 확인할 수 있습니다.

위 링크를 통해 필요한 병결 처리를 위한 절차를 자세히 확인할 수 있습니다. 추가적인 정보가 필요하시다면 말씀해주세요!`,
  },
  {
    sessionId: "0ca009a5-75f0-4d4e-9775-b9b1ffca7b26",
    createdAt: "4월 17, 2026, 2:01 오후",
    intent: "첫인사",
    userMessage: "안녕하세요?",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

반갑습니다! 😊 한양대학교와 관련된 궁금한 점이 있으시면 언제든지 물어보세요. 최선을 다해 도와드리겠습니다! 🐾`,
  },
  {
    sessionId: "5b9da0d9-e95f-4e82-8d56-b4036d29c9ab",
    createdAt: "8월 5, 2025, 11:16 오전",
    intent: "표절",
    userMessage: "카피킬러",
    assistantContent: `^^Thinking^^생각 중입니다...^^/Thinking^^

카피킬러는 표절검사 서비스로, 한양대학교에서도 사용 가능합니다.  
한양대학교 학생들은 아래 링크를 통해 접속하여 이용할 수 있습니다:  

🔗 **[카피킬러 한양대학교 전용 페이지](https://hanyang.copykiller.com/)**  

이곳에서 회원가입 후 로그인하면 표절검사 기능을 사용할 수 있습니다.  
논문, 과제, 보고서 작성 시 유용하게 활용해보세요! 😊^^Thinking^^지식 데이터베이스 결과를 종합하여 답변합니다.^^/Thinking^^`,
  },
];

// Flattens the broken pool and tags each row with its pattern.
export function getAllBrokenRows(): Array<IntentRow & { pattern: MismatchPattern }> {
  return (Object.entries(brokenRowsByPattern) as Array<[MismatchPattern, IntentRow[]]>)
    .flatMap(([pattern, rows]) => rows.map((r) => ({ ...r, pattern })));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds 'count' chat-log sets, each with exactly one broken row drawn from
 * the broken pool (across patterns, no duplicates) plus 'cleanPerSet' clean
 * rows (no duplicates across sets). The broken row's position inside the set
 * is shuffled, and setOrder/totalSets passed elsewhere should be independent
 * of this composition.
 */
export function buildChatLogSets(
  count: number = 3,
  cleanPerSet: number = 4,
): ChatLogSet[] {
  const shuffledBroken = shuffle(getAllBrokenRows()).slice(0, count);
  const shuffledClean = shuffle([...cleanRows]);

  let cursor = 0;
  return shuffledBroken.map((broken, i) => {
    const cleans = shuffledClean.slice(cursor, cursor + cleanPerSet);
    cursor += cleanPerSet;

    const rows: ChatLogRow[] = shuffle([
      { ...broken, isBroken: true },
      ...cleans.map((c) => ({ ...c, isBroken: false })),
    ]);

    return { setId: `set-${i + 1}`, title: `세트 ${i + 1}`, rows };
  });
}
