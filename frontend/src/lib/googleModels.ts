// ==============================================================================
// GOOGLE MODEL CATALOG (lib/googleModels.ts)
// ==============================================================================
// Curated from the live generativelanguage.googleapis.com models list
// (2026-07-14). Only text-chat models that support generateContent — no
// image/tts/robotics variants. Note: there is NO plain "gemini-3.1-flash";
// the 3.1 line ships as -lite and -pro-preview. The 1.5 line is retired (404).

export interface GoogleModelOption {
  id: string;
  label: string;
}

export const GOOGLE_MODEL_OPTIONS: GoogleModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (newest, fastest)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro (preview)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (deep brain)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (default)" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (classic)" },
  { id: "gemini-flash-latest", label: "Flash — always latest (alias)" },
  { id: "gemini-pro-latest", label: "Pro — always latest (alias)" },
  { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B (open)" },
  { id: "gemma-4-31b-it", label: "Gemma 4 31B (open)" },
];

export const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash";
