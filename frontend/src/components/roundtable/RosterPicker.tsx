// ==============================================================================
// ROSTER PICKER (components/roundtable/RosterPicker.tsx)
// ==============================================================================
// Seat 3 of 5: sketch trading cards with seat-order badges, plus the
// Boardroom / Pitch Room mode plate.

import { motion } from "motion/react";
import type { CharacterId, RoundtableMode } from "../../types";
import { CHARACTERS, CHARACTER_ORDER } from "../../lib/characters";
import { CharacterChip } from "./AvatarChips";

interface RosterPickerProps {
  seated: CharacterId[];
  onToggleSeat: (id: CharacterId) => void;
  mode: RoundtableMode;
  onModeChange: (mode: RoundtableMode) => void;
  disabled?: boolean;
}

const MODE_PLATES: Array<{ id: RoundtableMode; label: string; blurb: string }> = [
  { id: "boardroom", label: "Boardroom", blurb: "Bring a decision. The board debates and rules." },
  { id: "pitch", label: "Pitch Room", blurb: "Pitch your idea. The panel grills and scores it." },
];

export function RosterPicker({ seated, onToggleSeat, mode, onModeChange, disabled }: RosterPickerProps) {
  return (
    <div className="space-y-4">
      {/* Mode plates */}
      <div className="flex gap-3">
        {MODE_PLATES.map((plate) => {
          const active = mode === plate.id;
          return (
            <button
              key={plate.id}
              onClick={() => onModeChange(plate.id)}
              disabled={disabled}
              className={`flex-1 text-left px-4 py-2.5 border-[2.5px] border-[#1e1b18] sketch-border-2 sketch-btn-press transition-all ${
                active
                  ? "bg-[#1e1b18] text-[#f7f4eb] sketch-shadow-md"
                  : "bg-[#fbf8f0] text-stone-800 hover:bg-stone-100"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-display text-xs uppercase tracking-wider">{plate.label}</div>
              <div className={`font-mono text-[11px] leading-tight mt-0.5 ${active ? "text-stone-300" : "text-stone-500"}`}>
                {plate.blurb}
              </div>
            </button>
          );
        })}
      </div>

      {/* Roster cards */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
          Seat three at the table — {seated.length}/3 seated
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {CHARACTER_ORDER.map((id) => {
            const config = CHARACTERS[id];
            const seatIndex = seated.indexOf(id);
            const isSeated = seatIndex !== -1;
            const tableFull = seated.length >= 3 && !isSeated;
            return (
              <motion.button
                key={id}
                id={`roster-card-${id}`}
                onClick={() => !disabled && !tableFull && onToggleSeat(id)}
                whileTap={{ scale: disabled || tableFull ? 1 : 0.96 }}
                disabled={disabled || tableFull}
                className={`relative text-left p-2.5 border-[2.5px] border-[#1e1b18] sketch-border-1 transition-all ${
                  isSeated
                    ? `${config.accent.softBg} ${config.accent.shadow}`
                    : tableFull
                      ? "bg-stone-100 opacity-45 cursor-not-allowed"
                      : "bg-[#fbf8f0] hover:bg-stone-50 sketch-btn-press"
                }`}
              >
                {isSeated && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1e1b18] text-[#f7f4eb] font-display text-[10px] flex items-center justify-center border-2 border-[#f7f4eb]">
                    {seatIndex + 1}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <CharacterChip id={id} size={40} dimmed={tableFull} />
                  <div className="min-w-0">
                    <div className="font-sans font-bold text-[13px] leading-tight truncate">{config.shortName}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wide text-stone-500 truncate">{config.title}</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] leading-snug text-stone-600 mt-1.5 line-clamp-2">
                  {config.modeBlurb[mode]}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
