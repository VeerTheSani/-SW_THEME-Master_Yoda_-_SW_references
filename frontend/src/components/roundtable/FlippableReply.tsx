// ==============================================================================
// FLIPPABLE REPLY (components/roundtable/FlippableReply.tsx)
// ==============================================================================
// One character turn as a comic panel. Front: the public reply balloon with a
// stance meter and a memory-delta badge. Flip it (like a trading card) to read
// the character's HIDDEN REASONING and what memories they recalled.

import { useState } from "react";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import type { RoundtableMode, RoundtableTurnEntry } from "../../types";
import { CHARACTERS } from "../../lib/characters";
import { CharacterChip } from "./AvatarChips";

function StanceMeter({ score, mode, accentHex }: { score: number; mode: RoundtableMode; accentHex: string }) {
  if (mode === "pitch") {
    const pct = Math.max(0, Math.min(10, score)) * 10;
    return (
      <div className="flex items-center gap-1.5" title={`Score: ${score}/10`}>
        <span className="font-mono text-[9px] uppercase tracking-wide text-stone-500 font-bold">Score</span>
        <div className="w-16 h-2.5 border-2 border-[#1e1b18] rounded-full bg-white overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accentHex }} />
        </div>
        <span className="font-display text-[11px]">{score.toFixed(1)}</span>
      </div>
    );
  }
  const clamped = Math.max(-1, Math.min(1, score));
  const pct = ((clamped + 1) / 2) * 100;
  return (
    <div className="flex items-center gap-1.5" title={`Stance: ${clamped >= 0 ? "+" : ""}${clamped.toFixed(2)}`}>
      <span className="font-mono text-[9px] uppercase tracking-wide text-rose-600 font-bold">Kill</span>
      <div className="relative w-16 h-2.5 border-2 border-[#1e1b18] rounded-full bg-gradient-to-r from-rose-200 via-white to-emerald-200">
        <div
          className="absolute top-[-4px] w-[3px] h-[14px] bg-[#1e1b18] rounded"
          style={{ left: `calc(${pct}% - 1.5px)` }}
        />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wide text-emerald-600 font-bold">Back</span>
    </div>
  );
}

function deltaBadgeText(entry: RoundtableTurnEntry): string | null {
  const delta = entry.memoryDelta;
  if (!delta) return null;
  const parts: string[] = [];
  const addN = delta.add_nodes?.length ?? 0;
  const addE = delta.add_edges?.length ?? 0;
  const updates = (delta.update_nodes?.length ?? 0) + (delta.update_edges?.length ?? 0);
  if (addN) parts.push(`+${addN} memor${addN === 1 ? "y" : "ies"}`);
  if (addE) parts.push(`+${addE} link${addE === 1 ? "" : "s"}`);
  if (updates) parts.push(`${updates} shift${updates === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : null;
}

interface FlippableReplyProps {
  entry: RoundtableTurnEntry;
  mode: RoundtableMode;
}

export function FlippableReply({ entry, mode }: FlippableReplyProps) {
  const [flipped, setFlipped] = useState(false);
  const config = CHARACTERS[entry.speaker];
  const badge = deltaBadgeText(entry);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: -0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="w-full"
      style={{ perspective: 1200 }}
    >
      <motion.div
        className="relative w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.3, 0.6, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT — the public reply */}
        <div
          className={`relative border-[2.5px] border-[#1e1b18] sketch-border-2 ${config.accent.shadow} bg-[#fbf8f0] p-3.5 ${flipped ? "pointer-events-none" : ""}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <CharacterChip id={entry.speaker} size={38} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`font-display text-[11px] uppercase tracking-wide ${config.accent.text}`}>{config.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">turn {entry.turnIndex + 1}</span>
                {entry.isFallback && (
                  <span className="font-mono text-[9px] uppercase px-1.5 border border-stone-400 rounded text-stone-500">offline</span>
                )}
              </div>
              {typeof entry.stanceScore === "number" && (
                <StanceMeter score={entry.stanceScore} mode={mode} accentHex={config.accent.hex} />
              )}
            </div>
            <button
              onClick={() => setFlipped(true)}
              className="shrink-0 p-1.5 border-2 border-[#1e1b18] rounded-[40%_60%_50%_50%] bg-white hover:bg-stone-100 sketch-btn-press"
              title="Flip: read their hidden reasoning"
            >
              <RefreshCw size={13} strokeWidth={2.5} />
            </button>
          </div>
          <p className="font-sans text-[15px] leading-snug text-stone-800 whitespace-pre-wrap">{entry.publicReply}</p>
          {badge && (
            <div className="mt-2 inline-block font-mono text-[9.5px] uppercase tracking-wide px-2 py-0.5 border-[1.5px] border-dashed border-stone-400 rounded-full text-stone-500 bg-white/60">
              🧠 {badge}
            </div>
          )}
        </div>

        {/* BACK — the hidden reasoning */}
        <div
          className={`absolute inset-0 border-[2.5px] border-[#1e1b18] sketch-border-2 sketch-shadow-md bg-[#26221d] text-stone-200 p-3.5 overflow-y-auto ${flipped ? "" : "pointer-events-none"}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[10px] uppercase tracking-[0.2em] text-amber-300 border-[1.5px] border-amber-300 px-2 py-0.5 -rotate-2 inline-block">
              Hidden reasoning
            </span>
            <button
              onClick={() => setFlipped(false)}
              className="p-1.5 border-2 border-stone-400 rounded-[40%_60%_50%_50%] hover:bg-stone-700 sketch-btn-press"
              title="Flip back"
            >
              <RefreshCw size={13} strokeWidth={2.5} className="text-stone-300" />
            </button>
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-stone-100 whitespace-pre-wrap">{entry.innerThought}</p>
          {entry.recalledNodeLabels && entry.recalledNodeLabels.length > 0 && (
            <div className="mt-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-stone-400 mb-1">Memories recalled</div>
              <div className="flex flex-wrap gap-1">
                {entry.recalledNodeLabels.slice(0, 8).map((label, index) => (
                  <span key={index} className="font-mono text-[10px] px-1.5 py-0.5 border border-stone-500 rounded-full text-stone-300">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {entry.directive && (
            <div className="mt-3 font-mono text-[10px] text-stone-400 italic">Moderator's direction: “{entry.directive}”</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
