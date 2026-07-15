// ==============================================================================
// ROUNDTABLE PANEL (components/roundtable/RoundtablePanel.tsx)
// ==============================================================================
// The table itself. Owns the round lifecycle: seats + mode → user addresses the
// table → NDJSON stream drives one-by-one turns → per-turn memory deltas are
// merged into each character's graph → synthesis closes the round.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CircleStop, Send, Users } from "lucide-react";
import type {
  CharacterId,
  CharacterMemoryGraph,
  RoundtableEntry,
  RoundtableMode,
  RoundtableSession,
  RoundtableStreamEvent,
  RoundtableTurnEntry,
} from "../../types";
import { CHARACTERS, parseMention } from "../../lib/characters";
import { applyMemoryDelta, decayAndPrune } from "../../lib/memoryGraph";
import { streamRoundtable } from "../../lib/roundtableStream";
import { CharacterChip } from "./AvatarChips";
import { MemoryGraphInspector } from "./MemoryGraphInspector";
import { RosterPicker } from "./RosterPicker";
import { RoundtableTranscript, type LiveStatus } from "./RoundtableTranscript";

const DEFAULT_SEATS: CharacterId[] = ["yoda", "ragebaiter", "anna"];
const MAX_TURNS = 6;

const MODE_CHIPS: Record<RoundtableMode, Array<{ label: string; text: string }>> = {
  pitch: [
    { label: "🚀 SaaS pitch", text: "I'm building an AI copilot that predicts supply-chain stockouts for mid-size retailers. Subscription model, $99/seat. Asking $500k for 10%." },
    { label: "🧃 Weird one", text: "Subscription juice boxes for programmers: each flavor is paired with a programming language. Fund me." },
  ],
  boardroom: [
    { label: "⚖️ Build vs buy", text: "Our team of 6 wants to rewrite the whole backend in Rust for performance. Competitors ship features weekly. What should we do?" },
    { label: "📉 Hard call", text: "Revenue is flat and we have 8 months of runway. Do we cut the experimental AI team or double down on it?" },
  ],
};

interface RoundtablePanelProps {
  customApiKey: string;
  providerBaseUrl?: string;
  selectedModel: string;
  memories: Record<CharacterId, CharacterMemoryGraph>;
  onMemoriesChange: (next: Record<CharacterId, CharacterMemoryGraph>) => void;
  initialSession?: RoundtableSession | null;
  onSessionChange?: (session: RoundtableSession) => void;
}

function validSeats(participants: CharacterId[] | undefined): CharacterId[] | null {
  if (!participants || participants.length !== 3) return null;
  const unique = new Set(participants);
  if (unique.size !== 3 || participants.some((id) => !(id in CHARACTERS))) return null;
  return participants;
}

export function RoundtablePanel({
  customApiKey,
  providerBaseUrl,
  selectedModel,
  memories,
  onMemoriesChange,
  initialSession,
  onSessionChange,
}: RoundtablePanelProps) {
  const [inspecting, setInspecting] = useState<CharacterId | null>(null);
  const [seated, setSeated] = useState<CharacterId[]>(() => validSeats(initialSession?.participants) ?? DEFAULT_SEATS);
  const [mode, setMode] = useState<RoundtableMode>(initialSession?.mode ?? "pitch");
  const [entries, setEntries] = useState<RoundtableEntry[]>(initialSession?.entries ?? []);
  const [live, setLive] = useState<LiveStatus>({ phase: "idle" });
  const [isRunning, setIsRunning] = useState(false);
  const [inputText, setInputText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState((initialSession?.entries?.length ?? 0) === 0);
  // Admin multi-reply style: chosen speakers go one-by-one (reacting to each
  // other) or all at once (independent, faster).
  const [parallelReplies, setParallelReplies] = useState(
    () => localStorage.getItem("roundtable_parallel_replies") === "true",
  );
  const handleReplyStyleChange = (parallel: boolean) => {
    setParallelReplies(parallel);
    localStorage.setItem("roundtable_parallel_replies", String(parallel));
  };
  // The Adjudicator: an independent AI critic that grades every reply after it
  // lands (-10..+10, negatives welcome). Opt-in — off by default.
  const [scorekeeperEnabled, setScorekeeperEnabled] = useState(
    () => localStorage.getItem("roundtable_scorekeeper") === "true",
  );
  const handleScorekeeperToggle = () => {
    setScorekeeperEnabled((enabled: boolean) => {
      localStorage.setItem("roundtable_scorekeeper", String(!enabled));
      return !enabled;
    });
  };

  // Persist the table's minutes whenever they change (id stays stable).
  const sessionIdRef = useRef(initialSession?.id ?? `table-${Date.now()}`);
  const createdAtRef = useRef(initialSession?.createdAt ?? new Date().toISOString());
  const hasPersistedRef = useRef(Boolean(initialSession));
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  useEffect(() => {
    if (!onSessionChangeRef.current) return;
    if (entries.length === 0 && !hasPersistedRef.current) return; // nothing to save yet
    hasPersistedRef.current = true;
    const firstUserEntry = entries.find((entry) => entry.kind === "user");
    onSessionChangeRef.current({
      id: sessionIdRef.current,
      title: firstUserEntry && firstUserEntry.kind === "user" ? firstUserEntry.text.slice(0, 48) : "Table session",
      mode,
      participants: seated,
      entries,
      createdAt: createdAtRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [entries, seated, mode]);

  const abortRef = useRef<AbortController | null>(null);
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  // Per-round scratch: recall labels + router context arrive before turn_complete.
  const recallRef = useRef<Record<number, string[]>>({});
  const routerRef = useRef<Record<number, { directive?: string; reasoning?: string }>>({});

  const seatedFull = seated.length === 3;

  const handleToggleSeat = (id: CharacterId) => {
    setSeated((current) =>
      current.includes(id) ? current.filter((seatId) => seatId !== id) : current.length < 3 ? [...current, id] : current,
    );
  };

  const publicHistory = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind !== "synthesis")
        .map((entry) =>
          entry.kind === "user"
            ? { id: entry.id, sender: "user", text: entry.text }
            : { id: entry.id, sender: entry.speaker, text: entry.publicReply },
        )
        .slice(-30),
    [entries],
  );

  const handleEvent = (event: RoundtableStreamEvent, roundStartIso: string) => {
    switch (event.event) {
      case "round_start":
        break;
      case "router_decision":
        routerRef.current[event.data.turnIndex] = { directive: event.data.directive, reasoning: event.data.reasoning };
        setLive({ phase: "routing", reasoning: event.data.reasoning });
        break;
      case "turn_start":
        setLive({ phase: "speaking", speaker: event.data.speaker, directive: event.data.directive });
        break;
      case "memory_recall":
        recallRef.current[event.data.turnIndex] = event.data.nodeLabels;
        break;
      case "turn_complete": {
        const router = routerRef.current[event.data.turnIndex] ?? {};
        const turnEntry: RoundtableTurnEntry = {
          kind: "turn",
          id: `turn-${roundStartIso}-${event.data.turnIndex}`,
          speaker: event.data.speaker,
          turnIndex: event.data.turnIndex,
          directive: router.directive,
          routerReasoning: router.reasoning,
          innerThought: event.data.innerThought,
          publicReply: event.data.publicReply,
          stanceScore: event.data.stanceScore,
          memoryDelta: event.data.memoryDelta,
          recalledNodeLabels: recallRef.current[event.data.turnIndex],
          isFallback: event.data.isFallback,
          timestamp: new Date().toISOString(),
        };
        setEntries((current) => [...current, turnEntry]);
        // Merge this turn's delta into the speaker's own graph, live.
        const speakerId = event.data.speaker;
        const merged = applyMemoryDelta(memoriesRef.current[speakerId], event.data.memoryDelta);
        onMemoriesChange({ ...memoriesRef.current, [speakerId]: merged });
        setLive({ phase: "routing" });
        break;
      }
      case "turn_error": {
        const router = routerRef.current[event.data.turnIndex] ?? {};
        const turnEntry: RoundtableTurnEntry = {
          kind: "turn",
          id: `turn-${roundStartIso}-${event.data.turnIndex}`,
          speaker: event.data.speaker,
          turnIndex: event.data.turnIndex,
          directive: router.directive,
          routerReasoning: router.reasoning,
          innerThought: "(The connection to this mind flickered — a reserve line was delivered instead.)",
          publicReply: event.data.fallbackReply,
          isFallback: true,
          timestamp: new Date().toISOString(),
        };
        setEntries((current) => [...current, turnEntry]);
        setLive({ phase: "routing" });
        break;
      }
      case "turn_score": {
        // The Adjudicator's grade lands after its turn_complete — stamp it onto
        // that turn's card (matched by this round's entry id).
        const scoredId = `turn-${roundStartIso}-${event.data.turnIndex}`;
        setEntries((current) =>
          current.map((entry: RoundtableEntry) =>
            entry.kind === "turn" && entry.id === scoredId && entry.speaker === event.data.speaker
              ? { ...entry, judgeScore: event.data.score, judgeVerdict: event.data.verdict }
              : entry,
          ),
        );
        break;
      }
      case "round_synthesis":
        setEntries((current) => [
          ...current,
          { kind: "synthesis", id: `synth-${roundStartIso}`, synthesis: event.data, timestamp: new Date().toISOString() },
        ]);
        break;
      case "round_end": {
        // Round housekeeping: decay untouched memories, prune overflow.
        const next = { ...memoriesRef.current };
        for (const seatId of seated) {
          next[seatId] = decayAndPrune(next[seatId], roundStartIso);
        }
        onMemoriesChange(next);
        break;
      }
      case "error":
        setErrorText(event.data.message);
        break;
    }
  };

  const handleSend = async (rawText?: string) => {
    const raw = (rawText ?? inputText).trim();
    if (!raw || isRunning || !seatedFull) return;

    const { targetId, cleanedText } = parseMention(raw, seated);
    const text = targetId ? cleanedText : raw;

    setErrorText(null);
    setShowRoster(false);
    setInputText("");
    recallRef.current = {};
    routerRef.current = {};
    const roundStartIso = new Date().toISOString();

    setEntries((current) => [
      ...current,
      { kind: "user", id: `user-${roundStartIso}`, text, targetCharacterId: targetId, timestamp: roundStartIso },
    ]);
    setIsRunning(true);
    setLive(targetId ? { phase: "speaking", speaker: targetId } : { phase: "routing" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamRoundtable(
        {
          text,
          mode,
          participants: seated.map((seatId) => ({ characterId: seatId, memory: memoriesRef.current[seatId] })),
          history: publicHistory,
          customApiKey: customApiKey || undefined,
          providerBaseUrl: providerBaseUrl || undefined,
          selectedModel,
          responseLength: "medium",
          maxTurns: targetId ? 1 : MAX_TURNS,
          targetCharacterId: targetId,
          parallelReplies,
          scorekeeperEnabled,
        },
        (event) => handleEvent(event, roundStartIso),
        controller.signal,
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setErrorText(error instanceof Error ? error.message : "The table lost its connection.");
      }
    } finally {
      setIsRunning(false);
      setLive({ phase: "idle" });
      abortRef.current = null;
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
  };

  const seatPositions = ["-rotate-2 translate-y-2", "-translate-y-1", "rotate-2 translate-y-2"];

  return (
    <section id="roundtable-panel" className="lg:col-span-9 flex flex-col gap-4">
      {/* ---- TABLE STAGE ---- */}
      <div className="border-[3px] border-[#1e1b18] sketch-border-2 sketch-shadow-md bg-[#fbf8f0] p-4 relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-display text-sm uppercase tracking-wider">
              The Roundtable <span className="text-stone-400">·</span>{" "}
              <span className={mode === "pitch" ? "text-amber-600" : "text-sky-700"}>
                {mode === "pitch" ? "Pitch Room" : "Boardroom"}
              </span>
            </div>
            <div className="font-mono text-[10.5px] uppercase tracking-widest text-stone-500 mt-0.5">
              Three minds · three private memories · one moderator
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin multi-reply style toggle */}
            <div className="flex border-[2.5px] border-[#1e1b18] sketch-border-1 overflow-hidden font-mono text-[11px] uppercase tracking-wide font-bold">
              <button
                onClick={() => handleReplyStyleChange(false)}
                disabled={isRunning}
                className={`px-2.5 py-1.5 ${!parallelReplies ? "bg-[#1e1b18] text-[#f7f4eb]" : "bg-white hover:bg-stone-100"} ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Chosen speakers reply one after another, reacting to each other"
              >
                🎙️ In turn
              </button>
              <button
                onClick={() => handleReplyStyleChange(true)}
                disabled={isRunning}
                className={`px-2.5 py-1.5 border-l-[2.5px] border-[#1e1b18] ${parallelReplies ? "bg-[#1e1b18] text-[#f7f4eb]" : "bg-white hover:bg-stone-100"} ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Chosen speakers reply at the same time, independently of each other"
              >
                ⚡ All at once
              </button>
            </div>
            {/* The Adjudicator: independent brutal scoring of every reply (opt-in) */}
            <button
              id="scorekeeper-toggle"
              onClick={handleScorekeeperToggle}
              disabled={isRunning}
              className={`px-2.5 py-1.5 border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-btn-press font-mono text-[11px] uppercase tracking-wide font-bold transition-all ${
                scorekeeperEnabled ? "bg-rose-600 text-white shadow-[2px_2px_0px_0px_#1e1b18]" : "bg-white text-stone-500 hover:bg-stone-100"
              } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              title={scorekeeperEnabled
                ? "The Adjudicator is watching: an independent AI grades every reply from -10 to +10, brutally. Click to disable."
                : "Enable the Adjudicator: an independent AI grades every reply from -10 to +10 — negatives included."}
            >
              ⚖ Judge {scorekeeperEnabled ? "ON" : "off"}
            </button>
            {entries.length > 0 && (
              <button
                onClick={() => {
                  setEntries([]);
                  setErrorText(null);
                }}
                disabled={isRunning}
                className={`px-3 py-1.5 border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-btn-press font-mono text-[11px] uppercase tracking-wide font-bold bg-white hover:bg-rose-50 ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Clear the table's minutes (character memories are kept)"
              >
                🧹 Clear minutes
              </button>
            )}
            <button
              onClick={() => setShowRoster((show) => !show)}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-btn-press font-mono text-[11px] uppercase tracking-wide font-bold ${
                showRoster ? "bg-[#1e1b18] text-[#f7f4eb]" : "bg-white hover:bg-stone-100"
              } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Users size={13} strokeWidth={2.5} /> Seats & mode
            </button>
          </div>
        </div>

        {/* Seats around the tabletop */}
        <div className="mt-4 flex items-end justify-center gap-8 sm:gap-14">
          {seated.map((seatId, seatIndex) => (
            <div key={seatId} className={`relative z-10 flex flex-col items-center ${seatPositions[seatIndex]}`}>
              <CharacterChip
                id={seatId}
                size={58}
                speaking={live.phase === "speaking" && live.speaker === seatId}
                dimmed={live.phase === "speaking" && live.speaker !== seatId}
              />
              <button
                id={`inspect-memory-${seatId}`}
                onClick={() => setInspecting(seatId)}
                className={`mt-1 font-mono text-[9.5px] uppercase tracking-wide font-bold ${CHARACTERS[seatId].accent.text} hover:underline decoration-dashed`}
                title={`Open ${CHARACTERS[seatId].shortName}'s memory graph`}
              >
                {CHARACTERS[seatId].shortName} 🧠
              </button>
            </div>
          ))}
          {seated.length < 3 && (
            <div className="font-mono text-[11px] text-stone-400 self-center pb-4">…{3 - seated.length} empty seat{seated.length === 2 ? "" : "s"}</div>
          )}
        </div>

        {/* The tabletop with the moderator's scribble */}
        <div
          className="mt-1.5 mx-auto max-w-xl border-[3px] border-[#1e1b18] bg-[#ece5d3] px-4 py-2.5 text-center relative"
          style={{ borderRadius: "48% 52% 46% 54% / 22% 24% 20% 22%" }}
        >
          <motion.div
            key={live.reasoning ?? live.directive ?? live.phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[11px] text-stone-600 italic leading-snug min-h-[16px]"
          >
            {live.phase === "routing" && (live.reasoning ? `🎙️ ${live.reasoning}` : "🎙️ The moderator surveys the table…")}
            {live.phase === "speaking" && live.speaker && `🎙️ The floor goes to ${CHARACTERS[live.speaker].name}.`}
            {live.phase === "idle" && (entries.length ? "The table stands adjourned — address it again." : "The table is set. State your business.")}
          </motion.div>
        </div>

        {/* Roster drawer */}
        {showRoster && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="mt-4 pt-4 border-t-2 border-dashed border-stone-300">
              <RosterPicker seated={seated} onToggleSeat={handleToggleSeat} mode={mode} onModeChange={setMode} disabled={isRunning} />
            </div>
          </motion.div>
        )}
      </div>

      {/* ---- TRANSCRIPT ---- */}
      <div className="flex-1 min-h-[240px] max-h-[52vh] overflow-y-auto border-[3px] border-[#1e1b18] sketch-border-3 sketch-shadow-md bg-[#f7f4eb] p-4">
        <RoundtableTranscript entries={entries} live={live} mode={mode} />
      </div>

      {errorText && (
        <div className="border-[2.5px] border-rose-600 sketch-border-1 bg-rose-50 px-3.5 py-2 font-mono text-[12px] text-rose-700">
          ⚠ {errorText}
        </div>
      )}

      {/* ---- INPUT ---- */}
      <div className="border-[3px] border-[#1e1b18] sketch-border-1 sketch-shadow-md bg-[#fbf8f0] p-3.5">
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {MODE_CHIPS[mode].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.text)}
              disabled={isRunning || !seatedFull}
              className="font-mono text-[10.5px] px-2.5 py-1 border-2 border-[#1e1b18] rounded-full bg-white hover:bg-stone-100 sketch-btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 items-end">
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder={
              mode === "pitch"
                ? "Pitch the panel your idea… or type @name to ask one judge directly"
                : "Bring your decision to the board… or type @name to ask one member directly"
            }
            disabled={isRunning}
            className="flex-1 resize-none font-sans text-[15px] bg-white border-[2.5px] border-[#1e1b18] sketch-border-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-60"
          />
          {isRunning ? (
            <button
              onClick={handleAbort}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-shadow-sm sketch-btn-press bg-rose-100 hover:bg-rose-200 font-display text-[11px] uppercase tracking-wide"
              title="Adjourn the round"
            >
              <CircleStop size={15} strokeWidth={2.5} /> Adjourn
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || !seatedFull}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-shadow-sm sketch-btn-press bg-emerald-200 hover:bg-emerald-300 font-display text-[11px] uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              title={seatedFull ? "Address the table" : "Seat 3 characters first"}
            >
              <Send size={15} strokeWidth={2.5} /> Address
            </button>
          )}
        </div>
      </div>

      {/* ---- MEMORY INSPECTOR ---- */}
      {inspecting && (
        <MemoryGraphInspector
          characterId={inspecting}
          graph={memories[inspecting]}
          onClose={() => setInspecting(null)}
        />
      )}
    </section>
  );
}
