export interface GeneratedImage {
  id: string;
  prompt: string;
  optimizedPrompt: string;
  style: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
  isFavorite: boolean;
  model: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarId: string;
  plan: "Free" | "Starter" | "Creator Pro" | "Studio Max";
  joinedDate: string;
  creditsUsed: number;
  creditsMax: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  item: string;
  status: "Paid" | "Pending" | "Refunded";
  paymentMethod: string;
}

export interface ImageStyle {
  id: string;
  name_en: string;
  name_ko: string;
  emoji: string;
  description: string;
  exampleColor: string; // Tailwind class background
}
