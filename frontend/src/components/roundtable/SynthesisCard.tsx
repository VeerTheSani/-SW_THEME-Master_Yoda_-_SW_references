// ==============================================================================
// SYNTHESIS CARD (components/roundtable/SynthesisCard.tsx)
// ==============================================================================
// The round's closing card. Boardroom: decision plaque + rationale + owner-tagged
// action items. Pitch: per-judge score dials + a big slammed-down verdict stamp.

import { motion } from "motion/react";
import type { BoardroomSynthesis, PitchSynthesis } from "../../types";
import type { CharacterId } from "../../types";
import { CHARACTERS } from "../../lib/characters";
import { CharacterChip } from "./AvatarChips";

const VERDICT_STYLES: Record<PitchSynthesis["verdict"], { label: string; color: string; border: string }> = {
  invest: { label: "FUNDED", color: "text-emerald-600", border: "border-emerald-600" },
  counteroffer: { label: "COUNTEROFFER", color: "text-amber-600", border: "border-amber-600" },
  pass: { label: "PASS", color: "text-rose-600", border: "border-rose-600" },
};

function isCharacterId(owner: string): owner is CharacterId {
  return owner in CHARACTERS;
}

function OwnerChip({ owner }: { owner: string }) {
  if (isCharacterId(owner)) {
    return (
      <span className="inline-flex items-center gap-1">
        <CharacterChip id={owner} size={20} />
        <span className="font-mono text-[10px] font-bold">{CHARACTERS[owner].shortName}</span>
      </span>
    );
  }
  return <span className="font-mono text-[10px] font-bold uppercase">👤 {owner}</span>;
}

export function SynthesisCard({ synthesis }: { synthesis: BoardroomSynthesis | PitchSynthesis }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="border-[3px] border-[#1e1b18] sketch-border-3 sketch-shadow-lg bg-[#f3efe2] p-4 relative overflow-hidden"
    >
      <div className="halftone-dots absolute inset-0 opacity-30 pointer-events-none" />

      {synthesis.kind === "pitch" ? (
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="font-display text-xs uppercase tracking-[0.25em] text-stone-500 pt-1">Panel deal memo</div>
            <motion.div
              initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.25 }}
              className={`font-display text-xl px-3 py-1 border-[3.5px] ${VERDICT_STYLES[synthesis.verdict].border} ${VERDICT_STYLES[synthesis.verdict].color} tracking-wider select-none`}
              style={{ borderRadius: "12px 4px 14px 6px" }}
            >
              {VERDICT_STYLES[synthesis.verdict].label}
            </motion.div>
          </div>

          <div className="mt-3 space-y-2">
            {synthesis.scorecard.map((judgeScore) => {
              const judge = isCharacterId(judgeScore.judge) ? judgeScore.judge : null;
              const accentHex = judge ? CHARACTERS[judge].accent.hex : "#78716c";
              return (
                <div key={judgeScore.judge} className="flex items-center gap-2.5">
                  {judge && <CharacterChip id={judge} size={30} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-[13px]">{judge ? CHARACTERS[judge].shortName : judgeScore.judge}</span>
                      <div className="flex-1 max-w-[120px] h-2.5 border-2 border-[#1e1b18] rounded-full bg-white overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.max(0, Math.min(10, judgeScore.score)) * 10}%`, backgroundColor: accentHex }} />
                      </div>
                      <span className="font-display text-[12px]">{judgeScore.score.toFixed(1)}</span>
                    </div>
                    <div className="font-mono text-[11px] text-stone-600 leading-tight truncate" title={judgeScore.objection}>
                      ⚠ {judgeScore.objection}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 font-sans text-[14px] leading-snug text-stone-800 border-t-2 border-dashed border-stone-400 pt-2.5">
            {synthesis.summary}
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">Board resolution</div>
          <p className="mt-2 font-sans font-bold text-[16px] leading-snug text-stone-900">{synthesis.decision}</p>
          <p className="mt-1.5 font-sans text-[13.5px] leading-snug text-stone-700">{synthesis.rationale}</p>

          {synthesis.actionItems.length > 0 && (
            <div className="mt-3 border-t-2 border-dashed border-stone-400 pt-2.5 space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 font-bold">Action items</div>
              {synthesis.actionItems.map((actionItem, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 w-3.5 h-3.5 shrink-0 border-2 border-[#1e1b18] bg-white" style={{ borderRadius: "30% 60% 40% 60%" }} />
                  <div className="min-w-0">
                    <span className="font-sans text-[13.5px] text-stone-800">{actionItem.item}</span>
                    <span className="ml-2 inline-flex align-middle"><OwnerChip owner={actionItem.owner} /></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {synthesis.dissent && (
            <div className="mt-2.5 font-mono text-[11.5px] text-rose-700 italic">Dissent noted: {synthesis.dissent}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
