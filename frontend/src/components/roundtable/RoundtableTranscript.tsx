// ==============================================================================
// ROUNDTABLE TRANSCRIPT (components/roundtable/RoundtableTranscript.tsx)
// ==============================================================================
// The table's minutes: user cards, one-by-one turn panels (flippable), the
// moderator's live ticker while routing/speaking, and the closing synthesis.

import { Fragment, useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { CharacterId, RoundtableEntry, RoundtableMode } from "../../types";
import { CHARACTERS } from "../../lib/characters";
import { CharacterChip } from "./AvatarChips";
import { FlippableReply } from "./FlippableReply";
import { SynthesisCard } from "./SynthesisCard";

export interface LiveStatus {
  phase: "idle" | "routing" | "speaking";
  speaker?: CharacterId;
  directive?: string;
  reasoning?: string;
}

interface RoundtableTranscriptProps {
  entries: RoundtableEntry[];
  live: LiveStatus;
  mode: RoundtableMode;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-1">
      {[0, 1, 2].map((dotIndex) => (
        <motion.span
          key={dotIndex}
          className="w-1.5 h-1.5 rounded-full bg-stone-500 inline-block"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: dotIndex * 0.15 }}
        />
      ))}
    </span>
  );
}

export function RoundtableTranscript({ entries, live, mode }: RoundtableTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, live.phase, live.speaker]);

  return (
    <div className="space-y-3">
      {entries.length === 0 && live.phase === "idle" && (
        <div className="text-center py-10 px-4">
          <div className="font-display text-sm uppercase tracking-widest text-stone-400">The table awaits</div>
          <p className="font-mono text-[12px] text-stone-500 mt-1.5 max-w-sm mx-auto">
            Seat three characters, pick a mode, and address the table. Each keeps their own memory of everything said here.
          </p>
        </div>
      )}

      {entries.map((entry) => {
        if (entry.kind === "user") {
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto max-w-[85%] w-fit"
            >
              <div className="font-mono text-[9px] uppercase tracking-widest text-stone-400 text-right mb-0.5 mr-1">
                ✍️ You · {entry.targetCharacterId ? `direct to ${CHARACTERS[entry.targetCharacterId].shortName}` : "to the table"}
              </div>
              <div className="border-[2.5px] border-[#1e1b18] sketch-border-1 sketch-shadow-sm bg-white px-3.5 py-2.5">
                <p className="font-sans text-[15px] leading-snug text-stone-900 whitespace-pre-wrap">{entry.text}</p>
              </div>
            </motion.div>
          );
        }
        if (entry.kind === "turn") {
          return (
            <Fragment key={entry.id}>
              <FlippableReply entry={entry} mode={mode} />
            </Fragment>
          );
        }
        return (
          <Fragment key={entry.id}>
            <SynthesisCard synthesis={entry.synthesis} />
          </Fragment>
        );
      })}

      {/* Live moderator ticker */}
      {live.phase === "routing" && (
        <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-stone-400 rounded-xl bg-white/60 w-fit">
          <span className="font-mono text-[11px] text-stone-600 italic">
            🎙️ The moderator surveys the table<TypingDots />
          </span>
        </div>
      )}
      {live.phase === "speaking" && live.speaker && (
        <div className="flex items-center gap-2.5 px-3 py-2 border-2 border-dashed border-stone-400 rounded-xl bg-white/60 w-fit max-w-full">
          <CharacterChip id={live.speaker} size={30} speaking />
          <div className="min-w-0">
            <span className={`font-display text-[10px] uppercase tracking-wide ${CHARACTERS[live.speaker].accent.text}`}>
              {CHARACTERS[live.speaker].name} is speaking<TypingDots />
            </span>
            {live.directive && (
              <div className="font-mono text-[10.5px] text-stone-500 italic truncate" title={live.directive}>
                “{live.directive}”
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
