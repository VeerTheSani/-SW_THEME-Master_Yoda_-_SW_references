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

// ==============================================================================
// THE ROUNDTABLE — multi-character table with per-character graph memory
// ==============================================================================

export type ViewMode = "single" | "roundtable";
export type RoundtableMode = "boardroom" | "pitch";
export type CharacterId = "yoda" | "ragebaiter" | "palpaccio" | "anna" | "dinn";

// ---- Graph memory (mirrors backend/app/models/roundtable_schemas.py) ----

export type MemoryNodeType = "character" | "concept" | "project" | "event" | "belief";

export interface MemoryNode {
  id: string; // "concept:dark-mode-pivot" | "char:anna" | "event:..." | "belief:..."
  label: string;
  type: MemoryNodeType;
  summary: string; // in the character's own voice
  stance?: number | null; // -1..1
  salience: number; // 0..1
  mentions: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEdge {
  id: string; // `${source}|${relation}|${target}`
  source: string;
  target: string;
  relation: string;
  stance?: number | null;
  weight: number; // 0..1
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterMemoryGraph {
  characterId: CharacterId;
  version: number;
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  updatedAt: string;
}

export interface MemoryDelta {
  add_nodes: Array<Pick<MemoryNode, "id" | "label" | "type" | "summary"> & { stance?: number | null }>;
  update_nodes: Array<{ id: string; stance?: number | null; summary?: string | null; salience_boost?: number | null }>;
  add_edges: Array<Pick<MemoryEdge, "source" | "target" | "relation"> & { stance?: number | null; note?: string | null }>;
  update_edges: Array<{ id: string; stance?: number | null; weight_boost?: number | null; note?: string | null }>;
}

// ---- Round transcript entries ----

export interface RoundtableUserEntry {
  kind: "user";
  id: string;
  text: string;
  targetCharacterId?: CharacterId | null;
  timestamp: string;
}

export interface RoundtableTurnEntry {
  kind: "turn";
  id: string;
  speaker: CharacterId;
  turnIndex: number;
  directive?: string;
  routerReasoning?: string;
  innerThought: string;
  publicReply: string;
  stanceScore?: number | null;
  memoryDelta?: MemoryDelta;
  recalledNodeLabels?: string[];
  isFallback?: boolean;
  // The Adjudicator (optional AI scorekeeper): independent post-reply grade.
  judgeScore?: number | null;
  judgeVerdict?: string | null;
  timestamp: string;
}

export interface BoardroomSynthesis {
  kind: "boardroom";
  decision: string;
  rationale: string;
  actionItems: Array<{ owner: string; item: string }>;
  dissent?: string | null;
}

export interface PitchSynthesis {
  kind: "pitch";
  verdict: "invest" | "pass" | "counteroffer";
  scorecard: Array<{ judge: string; score: number; objection: string }>;
  summary: string;
}

export interface RoundtableSynthesisEntry {
  kind: "synthesis";
  id: string;
  synthesis: BoardroomSynthesis | PitchSynthesis;
  timestamp: string;
}

export type RoundtableEntry = RoundtableUserEntry | RoundtableTurnEntry | RoundtableSynthesisEntry;

export interface RoundtableSession {
  id: string;
  title: string;
  mode: RoundtableMode;
  participants: CharacterId[];
  entries: RoundtableEntry[];
  createdAt: string;
  updatedAt: string;
}

// ---- NDJSON stream events (protocol v1) ----

export type RoundtableStreamEvent =
  | { event: "round_start"; data: { mode: RoundtableMode; participants: CharacterId[]; maxTurns: number } }
  | { event: "router_decision"; data: { action: "speak" | "end_round"; next_speaker?: CharacterId; directive?: string; reasoning: string; turnIndex: number } }
  | { event: "turn_start"; data: { speaker: CharacterId; turnIndex: number; directive?: string } }
  | { event: "memory_recall"; data: { speaker: CharacterId; turnIndex: number; nodeIds: string[]; nodeLabels: string[] } }
  | { event: "turn_complete"; data: { speaker: CharacterId; turnIndex: number; innerThought: string; publicReply: string; stanceScore?: number | null; memoryDelta: MemoryDelta; isFallback: boolean } }
  | { event: "turn_error"; data: { speaker: CharacterId; turnIndex: number; message: string; fallbackReply: string; isFallback: true } }
  | { event: "turn_score"; data: { speaker: CharacterId; turnIndex: number; score: number; verdict: string } }
  | { event: "round_synthesis"; data: BoardroomSynthesis | PitchSynthesis }
  | { event: "round_end"; data: { turnsTaken: number } }
  | { event: "error"; data: { message: string; recoverable?: boolean } };
