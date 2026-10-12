export interface Guide {
  id: string;
  ageMin: number;
  ageMax: number;
  category: "수면 특징" | "낮잠" | "밤중 각성" | "루틴" | "안전 수면" | "발달" | "환경";
  title: string;
  summary: string;
  body: string[];
  tips?: string[];
  minutes: number;
  source: string;
  keywords: string[];
}

export const AGE_GROUPS = [
  { key: "0-3", label: "0~3개월", min: 0, max: 3 },
  { key: "4-6", label: "4~6개월", min: 4, max: 6 },
  { key: "7-9", label: "7~9개월", min: 7, max: 9 },
  { key: "10-12", label: "10~12개월", min: 10, max: 12 },
  { key: "13-18", label: "13~18개월", min: 13, max: 18 },
  { key: "19-24", label: "19~24개월", min: 19, max: 24 },
] as const;

export function ageGroupFor(months: number) {
  return AGE_GROUPS.find((g) => months >= g.min && months <= g.max) ?? AGE_GROUPS[AGE_GROUPS.length - 1];
}

const SRC_AAP = "AAP 안전수면 권고(2022) 요약";
const SRC_GENERAL = "소아 수면 일반 지침 요약 · 출시 전 전문가 검토 예정";

/**
 * Curated content. The AI coach only retrieves and paraphrases these entries —
 * it should not invent new medical recommendations.
 */
export const GUIDES: Guide[] = [
  // 0~3
  {
    id: "newborn-sleep",
    ageMin: 0, ageMax: 3, category: "수면 특징",
    title: "신생아 수면은 원래 불규칙해요",
    summary: "짧게 자주 자고 자주 깨는 것이 이 시기의 정상적인 모습이에요.",
    body: [
      "신생아는 하루 대부분을 자지만 한 번에 길게 자지 않아요. 배고픔과 소화 리듬에 따라 2~3시간마다 깨는 것이 흔해요.",
      "얕은 잠(활동 수면)의 비율이 높아 자면서 낑낑대거나 몸을 움직이기도 해요. 바로 안아 올리기 전에 잠시 지켜보면 스스로 다시 잠들기도 해요.",
      "이 시기에는 '수면 교육'보다 아기의 신호를 읽고 충분히 먹이고 편안하게 해주는 것이 우선이에요.",
    ],
    tips: ["깨어 있는 시간이 짧으니(약 45~90분) 졸린 신호를 일찍 알아차려 주세요."],
    minutes: 3, source: SRC_GENERAL, keywords: ["신생아", "불규칙", "자주 깨", "짧게"],
  },
  {
    id: "day-night",
    ageMin: 0, ageMax: 3, category: "루틴",
    title: "낮과 밤 구분 도와주기",
    summary: "낮에는 밝고 활기차게, 밤에는 어둡고 조용하게.",
    body: [
      "생체 리듬은 생후 몇 달에 걸쳐 서서히 자리 잡아요. 낮에는 자연광을 충분히 받고 일상 소리 속에서 지내게 해주세요.",
      "밤중 수유나 기저귀 교체는 어두운 조명에서 말수를 줄이고 차분하게 해주면 '밤은 자는 시간'이라는 신호가 돼요.",
    ],
    tips: ["밤중 수유 때는 무드등 정도의 약한 조명을 사용해 보세요."],
    minutes: 2, source: SRC_GENERAL, keywords: ["낮밤", "밤낮", "바뀌", "생체리듬"],
  },
  {
    id: "sleepy-cues",
    ageMin: 0, ageMax: 6, category: "수면 특징",
    title: "졸림 신호 관찰하기",
    summary: "하품, 눈 비비기, 멍한 시선은 '이제 재워주세요'라는 신호예요.",
    body: [
      "초기 신호: 하품, 시선 회피, 멍하게 바라보기, 움직임이 줄어듦.",
      "늦은 신호: 눈 비비기, 귀 잡아당기기, 칭얼거림, 몸을 뒤로 젖히기. 늦은 신호가 보이면 이미 많이 피곤한 상태일 수 있어요.",
      "앱의 예상 시간은 참고용이에요. 실제 아기의 신호가 더 중요해요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["졸림", "신호", "하품", "눈비비", "칭얼"],
  },
  // safe sleep (all ages)
  {
    id: "safe-sleep",
    ageMin: 0, ageMax: 24, category: "안전 수면",
    title: "안전한 수면 환경 기본 원칙",
    summary: "등을 대고, 단단하고 평평한 곳에서, 빈 침대에서 재워주세요.",
    body: [
      "만 1세까지는 낮잠과 밤잠 모두 반드시 바로 눕혀(등을 대고) 재워주세요.",
      "단단하고 평평한 매트리스에 몸에 맞는 시트만 사용하고, 베개·이불·범퍼·인형 등 부드러운 물건은 침대에 두지 않아요.",
      "같은 방에서 아기 전용 침대를 사용하는 것(방 공유, 침대 공유는 피하기)이 권장돼요. 소파나 쿠션 위에서 함께 잠드는 것은 특히 위험해요.",
      "덥지 않게 입히고 실내를 너무 덥지 않게 유지해 주세요. 머리와 얼굴은 덮지 않아요.",
      "흡연 노출을 피하고, 기울어진 수면 제품이나 경사 쿠션은 수면용으로 사용하지 않아요.",
    ],
    tips: ["아기가 스스로 뒤집고 되돌아올 수 있게 되면, 바로 눕힌 뒤 스스로 자세를 바꾸는 것은 괜찮아요.", "속싸개는 뒤집기 조짐이 보이면 중단해 주세요."],
    minutes: 3, source: SRC_AAP, keywords: ["안전", "SIDS", "영아돌연사", "엎드려", "뒤집기", "이불", "베개", "범퍼", "속싸개", "같이 자"],
  },
  // 4~6
  {
    id: "rhythm-4-6",
    ageMin: 4, ageMax: 6, category: "수면 특징",
    title: "수면 리듬이 자리 잡는 시기",
    summary: "낮잠이 3회 정도로 정리되고 밤잠이 조금씩 길어져요.",
    body: [
      "4개월 무렵에는 수면 구조가 어른과 비슷하게 바뀌면서 일시적으로 자주 깨는 시기(흔히 '4개월 수면 퇴행'이라 불러요)가 올 수 있어요.",
      "깨어 있는 시간은 대략 1시간 30분~2시간 45분 사이에서 조금씩 늘어나요.",
      "매일 비슷한 시간에 하루를 시작하면 낮잠과 밤잠 리듬이 잡히는 데 도움이 돼요.",
    ],
    minutes: 3, source: SRC_GENERAL, keywords: ["4개월", "퇴행", "리듬", "낮잠 3회"],
  },
  {
    id: "bedtime-routine",
    ageMin: 3, ageMax: 24, category: "루틴",
    title: "짧고 일관된 취침 루틴 만들기",
    summary: "매일 같은 순서의 20~30분 루틴이 잠들 준비 신호가 돼요.",
    body: [
      "목욕 → 잠옷·기저귀 → 수유 → 그림책 → 자장가처럼 매일 같은 순서를 반복해 보세요.",
      "조명을 낮추고 자극적인 놀이는 루틴 전에 마무리해요.",
      "졸리지만 완전히 잠들지 않은 상태로 침대에 눕히는 연습은 스스로 잠드는 데 도움이 될 수 있어요.",
    ],
    tips: ["앱의 '수면 루틴'에서 단계와 시간을 설정하고, 예상 밤잠 시간에 맞춰 시작해 보세요."],
    minutes: 2, source: SRC_GENERAL, keywords: ["루틴", "취침", "재우기", "잠투정", "목욕"],
  },
  {
    id: "short-naps",
    ageMin: 3, ageMax: 9, category: "낮잠",
    title: "낮잠이 30~40분에 끝나요",
    summary: "짧은 낮잠은 이 시기에 흔해요. 너무 걱정하지 않아도 괜찮아요.",
    body: [
      "한 번의 수면 주기는 약 30~45분이라, 주기가 끝날 때 깨는 일이 흔해요. 낮잠 통합은 6개월 전후로 서서히 좋아지는 경우가 많아요.",
      "너무 피곤하거나(깨어 있는 시간이 길었거나) 덜 피곤했을 때 모두 낮잠이 짧아질 수 있어요.",
      "어둡고 조용한 환경, 일정한 백색소음이 도움이 될 수 있어요.",
    ],
    tips: ["짧은 낮잠 뒤에는 다음 깨어 있는 시간을 조금 짧게 잡아보세요. 앱 예측에도 반영돼요."],
    minutes: 2, source: SRC_GENERAL, keywords: ["짧", "낮잠", "30분", "40분", "금방 깨"],
  },
  // 7~9
  {
    id: "nap-transition-3-2",
    ageMin: 7, ageMax: 9, category: "낮잠",
    title: "낮잠 3회에서 2회로 줄어드는 신호",
    summary: "세 번째 낮잠을 거부하거나 밤잠 시작이 늦어진다면 전환 시기일 수 있어요.",
    body: [
      "대개 생후 7~9개월 사이에 낮잠이 하루 2회로 줄어들어요.",
      "신호: 늦은 오후 세 번째 낮잠을 거부함, 낮잠을 자면 밤잠 시작이 많이 늦어짐, 낮잠 시간이 들쭉날쭉해짐.",
      "전환기에는 하루 2회와 3회가 섞여도 괜찮아요. 2회로 지내는 날은 밤잠을 평소보다 조금 일찍 시작하면 도움이 될 수 있어요.",
    ],
    minutes: 3, source: SRC_GENERAL, keywords: ["낮잠 전환", "3회", "2회", "낮잠 거부"],
  },
  {
    id: "night-waking-7-9",
    ageMin: 6, ageMax: 12, category: "밤중 각성",
    title: "밤중에 다시 자주 깰 때",
    summary: "기기·서기 등 운동 발달과 분리불안 시기에 밤중 각성이 늘기도 해요.",
    body: [
      "새로운 운동 기술을 익히는 시기에는 자다가 일어나 앉거나 기는 연습을 하기도 해요. 낮 동안 충분히 연습할 기회를 주면 도움이 될 수 있어요.",
      "분리불안이 시작되면 깼을 때 보호자를 찾으며 우는 일이 늘어요. 짧고 차분하게 안심시키고, 일관된 방식으로 반응해 주세요.",
      "열, 호흡 곤란, 평소와 다른 심한 보챔이 함께 있다면 수면 문제가 아니라 건강 문제일 수 있으니 의료진과 상담하세요.",
    ],
    minutes: 3, source: SRC_GENERAL, keywords: ["밤중", "자주 깨", "새벽", "분리불안", "깨", "각성"],
  },
  {
    id: "wake-window-table",
    ageMin: 0, ageMax: 24, category: "수면 특징",
    title: "월령별 깨어 있는 시간(Wake Window) 참고표",
    summary: "다음 잠 시간을 잡을 때 참고하는 일반 범위예요.",
    body: [
      "0~1개월: 약 35분~1시간 · 2개월: 1~1시간 40분 · 3개월: 1시간 15분~2시간",
      "4개월: 1시간 30분~2시간 15분 · 5~6개월: 2시간~2시간 45분 · 7~9개월: 2시간 30분~3시간 30분",
      "10~12개월: 3~4시간 · 13~15개월: 3시간 30분~5시간 · 16~24개월: 4시간 30분~6시간",
      "하루 중 첫 번째 깨어 있는 시간이 가장 짧고, 밤잠 전이 가장 긴 경우가 많아요. 개인차가 크니 아기의 신호를 함께 보세요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["깨어있는 시간", "웨이크윈도우", "wake window", "몇 시간", "언제 재"],
  },
  // 10~12
  {
    id: "activity-10-12",
    ageMin: 10, ageMax: 12, category: "발달",
    title: "활동량이 늘면 잠도 달라져요",
    summary: "걷기 연습 등 활동량 증가로 낮잠과 밤잠 패턴이 흔들릴 수 있어요.",
    body: [
      "깨어 있는 시간이 3~4시간으로 늘어나며 낮잠은 보통 2회를 유지해요.",
      "오전 낮잠을 거부하는 날이 생겨도 바로 1회로 줄이기보다는 1~2주 지켜보는 것이 좋아요.",
      "규칙적인 취침 시간과 루틴이 이 시기의 변화를 부드럽게 넘기는 데 도움이 돼요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["활동", "걷기", "돌", "낮잠 변화"],
  },
  // 13~18
  {
    id: "nap-transition-2-1",
    ageMin: 13, ageMax: 18, category: "낮잠",
    title: "낮잠 1회로 전환하기",
    summary: "보통 15~18개월 무렵 낮잠이 하루 1회로 줄어요.",
    body: [
      "오전 낮잠을 계속 거부하거나, 오전 낮잠을 자면 오후 낮잠을 거부하는 날이 1~2주 이어진다면 전환 신호일 수 있어요.",
      "전환 초기에는 낮잠을 점심 직후로 조금씩 옮기고, 피곤해 보이는 날은 밤잠을 일찍 시작해 주세요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["1회", "낮잠 전환", "오전 낮잠"],
  },
  {
    id: "daycare-sleep",
    ageMin: 12, ageMax: 24, category: "루틴",
    title: "어린이집 낮잠과 가정 수면 맞추기",
    summary: "어린이집 낮잠 시간을 기준으로 아침·저녁 일정을 맞춰보세요.",
    body: [
      "어린이집 낮잠은 보통 점심 이후 고정된 시간에 진행돼요. 등원일에는 이 시간을 기준으로 기상과 밤잠 시간을 계획해 보세요.",
      "주말에는 평일과 기상·취침 시간을 크게 다르지 않게 유지하면 월요일 적응이 쉬워요.",
      "선생님과 낮잠 시간·길이를 공유하면 저녁 수면 계획에 도움이 돼요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["어린이집", "등원", "주말"],
  },
  {
    id: "bedtime-resistance",
    ageMin: 13, ageMax: 24, category: "루틴",
    title: "자기 싫다고 할 때",
    summary: "선택권은 작게, 경계는 일관되게.",
    body: [
      "자기주장이 커지는 시기에는 취침을 거부하는 일이 흔해요.",
      "'파란 잠옷? 노란 잠옷?'처럼 작은 선택권을 주면 협조가 쉬워질 수 있어요.",
      "루틴의 순서와 끝(불 끄기)은 매일 같게 유지해 주세요. 낮잠이 너무 늦거나 길면 밤잠이 늦어질 수 있어요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["거부", "안 자", "자기 싫", "떼", "취침 저항"],
  },
  // 19~24
  {
    id: "consistent-19-24",
    ageMin: 19, ageMax: 24, category: "루틴",
    title: "일관된 수면 루틴과 주말 스케줄",
    summary: "주말에도 기상·취침 시간을 1시간 이내로 유지해 보세요.",
    body: [
      "이 시기에는 하루 1회 낮잠(1.5~2.5시간)과 11~14시간의 총 수면이 일반적이에요.",
      "주말 늦잠과 늦은 취침은 월요일 컨디션에 영향을 줄 수 있어요.",
      "아이와 함께 루틴 순서를 그림으로 만들어 보는 것도 도움이 돼요.",
    ],
    minutes: 2, source: SRC_GENERAL, keywords: ["주말", "일관", "루틴", "24개월"],
  },
  {
    id: "when-to-ask",
    ageMin: 0, ageMax: 24, category: "안전 수면",
    title: "이럴 땐 의료진과 상담하세요",
    summary: "수면 앱이 판단할 수 없는 신호들이에요.",
    body: [
      "숨쉬기 힘들어 보이거나, 자는 동안 호흡이 멈추는 것 같거나, 입술이 파랗게 변하면 즉시 119 또는 응급실에 연락하세요.",
      "열이 나거나, 평소와 달리 축 처지거나, 심하게 보채며 달래지지 않을 때는 의료진과 상담하세요.",
      "심한 코골이가 지속되거나 체중 증가가 걱정될 때도 소아청소년과 상담을 권해요.",
    ],
    minutes: 1, source: SRC_GENERAL, keywords: ["호흡", "숨", "코골이", "열", "아파", "병원", "응급"],
  },
];

/** "이번 주 우리 아기에게 필요한 수면 정보": 2~3 age-relevant picks */
export function recommendedGuides(months: number, count = 3): Guide[] {
  const fits = GUIDES.filter((g) => months >= g.ageMin && months <= g.ageMax && g.id !== "when-to-ask");
  const span = (g: Guide) => g.ageMax - g.ageMin;
  const specific = fits.filter((g) => span(g) <= 6).sort((a, b) => span(a) - span(b));
  const general = fits.filter((g) => span(g) > 6);
  return [...specific, ...general].slice(0, count);
}

/** Simple keyword retrieval used by the AI coach (client fallback + server context). */
export function searchGuides(query: string, months: number, limit = 3): Guide[] {
  const q = query.replace(/\s/g, "");
  return GUIDES.map((g) => {
    let score = 0;
    for (const k of g.keywords) if (q.includes(k.replace(/\s/g, ""))) score += 3;
    if (months >= g.ageMin && months <= g.ageMax) score += 1;
    return { g, score };
  })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g);
}
