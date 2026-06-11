import { ImageStyle, GeneratedImage, Invoice, UserProfile } from "./types";

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "anime",
    name_ko: "애니메이션",
    name_en: "Anime",
    emoji: "🌸",
    description: "생동감 넘치는 색감과 선명한 라인의 일본식 애니 스타일",
    exampleColor: "from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30"
  },
  {
    id: "3d-render",
    name_ko: "3D 렌더",
    name_en: "3D Render",
    emoji: "⚡",
    description: "피사체에 입체적 깊이와 디테일한 질감을 더한 입체 그래픽",
    exampleColor: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30"
  },
  {
    id: "watercolor",
    name_ko: "수채화",
    name_en: "Watercolor",
    emoji: "🎨",
    description: "물감의 번짐과 질감이 돋보이는 부드럽고 따뜻한 감성",
    exampleColor: "from-yellow-500/20 to-amber-500/20 text-amber-400 border-amber-500/30"
  },
  {
    id: "cyberpunk",
    name_ko: "사이버펑크",
    name_en: "Cyberpunk",
    emoji: "🌆",
    description: "화려한 네온사인과 어두운 도시가 조화된 공상과학 분위기",
    exampleColor: "from-violet-500/20 to-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30"
  },
  {
    id: "oil-painting",
    name_ko: "유화",
    name_en: "Oil Painting",
    emoji: "🖌️",
    description: "클래식하고 무거운 붓 터치와 깊은 색감의 캔버스 화풍",
    exampleColor: "from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30"
  },
  {
    id: "pixel-art",
    name_ko: "픽셀 아트",
    name_en: "Pixel Art",
    emoji: "👾",
    description: "레트로 비디오 게임 감성의 정교한 16비트 도트 아트",
    exampleColor: "from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30"
  },
  {
    id: "pencil-sketch",
    name_ko: "연필 스케치",
    name_en: "Pencil Sketch",
    emoji: "✏️",
    description: "연필 선과 정교한 명암 조절로 완성한 수제 손그림 느낌",
    exampleColor: "from-neutral-500/20 to-slate-500/20 text-neutral-300 border-neutral-500/30"
  },
  {
    id: "cinematic",
    name_ko: "시네마틱",
    name_en: "Cinematic",
    emoji: "🎬",
    description: "영화 속 한 장면 같은 분위기 있는 조명과 와이드 구도",
    exampleColor: "from-rose-500/20 to-red-600/20 text-rose-400 border-rose-500/30"
  },
  {
    id: "origami",
    name_ko: "종이접기",
    name_en: "Origami",
    emoji: "📄",
    description: "정밀하게 접힌 오리가미 형상의 종이 질감 입체 예술",
    exampleColor: "from-teal-500/20 to-emerald-400/20 text-teal-400 border-teal-500/30"
  },
  {
    id: "pop-art",
    name_ko: "팝 아트",
    name_en: "Pop Art",
    emoji: "💥",
    description: "앤디 워홀 느낌의 대담한 윤곽선과 망점, 조화로운 총천연색",
    exampleColor: "from-yellow-400/20 to-rose-400/20 text-yellow-300 border-yellow-400/30"
  }
];

export const INITIAL_USER: UserProfile = {
  name: "김이지",
  email: "joeun0926@gmail.com",
  avatarId: "avatar-3",
  plan: "Creator Pro",
  joinedDate: "2026-06-01",
  creditsUsed: 15,
  creditsMax: 100
};

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "INV-2026-004",
    date: "2026-06-01",
    amount: 19000,
    item: "Creator Pro 요금제 정기 결제",
    status: "Paid",
    paymentMethod: "신한카드 (•••• 4920)"
  },
  {
    id: "INV-2026-003",
    date: "2026-05-01",
    amount: 19000,
    item: "Creator Pro 요금제 정기 결제",
    status: "Paid",
    paymentMethod: "신한카드 (•••• 4920)"
  },
  {
    id: "INV-2026-002",
    date: "2026-04-01",
    amount: 19000,
    item: "Creator Pro 요금제 정기 결제",
    status: "Paid",
    paymentMethod: "신한카드 (•••• 4920)"
  },
  {
    id: "INV-2026-001",
    date: "2026-03-31",
    amount: 9000,
    item: "Starter 요금제 일할 결제",
    status: "Paid",
    paymentMethod: "신한카드 (•••• 4920)"
  }
];

export const AVATAR_OPTIONS = [
  { id: "avatar-1", emoji: "🐱", label: "호기심 고양이" },
  { id: "avatar-2", emoji: "🦁", label: "왕자 사자" },
  { id: "avatar-3", emoji: "🦊", label: "똑똑한 여우" },
  { id: "avatar-4", emoji: "🐼", label: "여유로운 판다" },
  { id: "avatar-5", emoji: "🐰", label: "민첩한 토끼" },
  { id: "avatar-6", emoji: "🦄", label: "몽환적인 유니콘" }
];

// Preset images that use extremely beautiful SVG mock data with custom CSS filters, so they look stunning and load instantly!
export const INITIAL_IMAGES: GeneratedImage[] = [
  {
    id: "preset-1",
    prompt: "네온사인 가득한 빗속 밤거리를 걷는 멋진 사이버펑크 고양이",
    optimizedPrompt: "A sleek, cool domestic cat with luminous eyes walking through a rainy neon-lit cyberpunk alleyway, reflection on asphalt puddle, dense futuristic details, high quality illustration",
    style: "cyberpunk",
    aspectRatio: "1:1",
    imageUrl: "https://images.unsplash.com/photo-1574158622643-69d34d72650a?q=80&w=600&auto=format&fit=crop",
    createdAt: "2026-06-11T05:30:00Z",
    isFavorite: true,
    model: "imagen-3.0-generate-002"
  },
  {
    id: "preset-2",
    prompt: "구름 위를 떠다니는 신기한 수채화 성",
    optimizedPrompt: "A beautiful, floating medieval castle perched on a giant fluffy cloud in the sky, watercolor painting style with subtle golden-hour yellow washes and dry brush strokes, whimsical art masterpiece",
    style: "watercolor",
    aspectRatio: "16:9",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
    createdAt: "2026-06-11T03:15:00Z",
    isFavorite: false,
    model: "imagen-3.0-generate-002"
  },
  {
    id: "preset-3",
    prompt: "붉은 머리칼을 휘날리며 미소짓는 귀여운 검사 캐릭터",
    optimizedPrompt: "A spirited young anime warrior girl with fiery long red hair, gripping a small wooden training katana, smiling proudly, soft natural cherry-blossom light background, gorgeous cinematic render",
    style: "anime",
    aspectRatio: "4:3",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop",
    createdAt: "2026-06-10T19:40:00Z",
    isFavorite: true,
    model: "imagen-3.0-generate-002"
  },
  {
    id: "preset-4",
    prompt: "공중정원 입구에 놓인 황금색 오리가미 새",
    optimizedPrompt: "Artistic origami geometric folded shape of a small golden bird standing at the stone entrance of a celestial hanging garden, clean paper folds, high-end 3D paper model layout with depth of field",
    style: "origami",
    aspectRatio: "1:1",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop",
    createdAt: "2026-06-09T14:10:00Z",
    isFavorite: false,
    model: "imagen-3.0-generate-002"
  }
];
