// ==============================================================================
// ROUNDTABLE STREAM CLIENT (lib/roundtableStream.ts)
// ==============================================================================
// Consumes the backend's NDJSON stream: one JSON event per line, dispatched to
// the caller as it arrives. Abortable via AbortController for mid-round cancel.

import type {
  CharacterId,
  CharacterMemoryGraph,
  RoundtableMode,
  RoundtableStreamEvent,
} from "../types";

export interface RoundtableRequestBody {
  text: string;
  mode: RoundtableMode;
  participants: Array<{ characterId: CharacterId; memory: CharacterMemoryGraph }>;
  history: Array<{ id: string; sender: string; text: string }>;
  customApiKey?: string;
  providerBaseUrl?: string;
  selectedModel?: string;
  responseLength?: string;
  maxTurns?: number;
  targetCharacterId?: CharacterId | null;
  parallelReplies?: boolean;
  scorekeeperEnabled?: boolean;
  // Visitor-typed model for the HOST's default relay (beats the env default).
  houseModel?: string;
  // Separate moderator/Adjudicator brain — active when moderatorModel is set.
  moderatorProviderBaseUrl?: string;
  moderatorApiKey?: string;
  moderatorModel?: string;
}

export async function streamRoundtable(
  body: RoundtableRequestBody,
  onEvent: (event: RoundtableStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/roundtable/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `The table did not convene (HTTP ${response.status}).`;
    try {
      const err = await response.json();
      if (err?.detail) detail = typeof err.detail === "string" ? err.detail : detail;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatchLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as RoundtableStreamEvent);
    } catch {
      // a torn/garbled line — skip rather than kill the round
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      dispatchLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }
  }
  dispatchLine(buffer); // trailing line without newline
}
