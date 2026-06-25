export type HubMode = "roast" | "translate" | "wisdom";

export interface ChatMessage {
  id: string;
  sender: "user" | "yoda" | "ragebaiter";
  text: string;
  timestamp: Date | string; // Allow serialization
  mode?: HubMode;
  isFallback?: boolean;
  isModelFallback?: boolean;
  actualModelUsed?: string;
  character?: "yoda" | "ragebaiter";
  isUnhinged?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  ragebaitLevel: number; // 0 to 1 tuning slider
  responseLength: "short" | "medium" | "long";
  selectedModel?: string;
  character?: "yoda" | "ragebaiter";
  mode?: HubMode;
  isUnhinged?: boolean;
}

export interface PromptChip {
  text: string;
  label: string;
}
