// ==============================================================================
// AVATAR CHIPS (components/roundtable/AvatarChips.tsx)
// ==============================================================================
// Lightweight hand-drawn SVG heads for the table — deliberately NOT the heavy
// YodaGlobe. One <CharacterChip> per seat; the speaking seat gets a pulsing
// sketch ring and a gentle lean-in bob.

import { motion } from "motion/react";
import type { ReactElement } from "react";
import type { CharacterId } from "../../types";
import { CHARACTERS } from "../../lib/characters";

const INK = "#1e1b18";

function YodaHead() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* ears */}
      <path d="M14 30 Q2 22 6 16 Q10 12 16 24 Z" fill="#a7f3d0" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 30 Q62 22 58 16 Q54 12 48 24 Z" fill="#a7f3d0" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* face */}
      <ellipse cx="32" cy="34" rx="18" ry="16" fill="#bbf7d0" stroke={INK} strokeWidth="3" />
      {/* wispy hair */}
      <path d="M24 20 Q26 14 30 17 M34 16 Q36 12 40 16" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {/* sleepy wise eyes */}
      <path d="M23 32 Q26 29 29 32" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M35 32 Q38 29 41 32" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* smile */}
      <path d="M27 41 Q32 45 37 41" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* wrinkles */}
      <path d="M20 26 Q23 25 25 26 M39 26 Q41 25 44 26" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RagebaiterHead() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* horn spikes */}
      <path d="M20 18 L16 8 L26 14 Z" fill="#fda4af" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 18 L48 8 L38 14 Z" fill="#fda4af" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* face */}
      <ellipse cx="32" cy="36" rx="17" ry="16" fill="#fecdd3" stroke={INK} strokeWidth="3" />
      {/* mischievous eyes */}
      <path d="M22 30 L29 33 M42 30 L35 33" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="26" cy="35" r="1.8" fill={INK} />
      <circle cx="38" cy="35" r="1.8" fill={INK} />
      {/* wide troll grin */}
      <path d="M23 42 Q32 50 41 42 Q37 46 32 46 Q27 46 23 42 Z" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M27 43.5 L27 46 M32 44.5 L32 47 M37 43.5 L37 46" stroke={INK} strokeWidth="1.2" />
    </svg>
  );
}

function PalpaccioHead() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* hood */}
      <path d="M32 6 Q10 10 12 44 Q14 52 20 54 Q16 40 18 30 Q20 16 32 14 Q44 16 46 30 Q48 40 44 54 Q50 52 52 44 Q54 10 32 6 Z"
        fill="#fcd34d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* face in shadow */}
      <ellipse cx="32" cy="36" rx="13" ry="14" fill="#fef3c7" stroke={INK} strokeWidth="2.5" />
      {/* hooded eyes */}
      <path d="M24 33 Q27 31 30 33 M34 33 Q37 31 40 33" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="27" cy="34.5" r="1.4" fill={INK} />
      <circle cx="37" cy="34.5" r="1.4" fill={INK} />
      {/* knowing smirk */}
      <path d="M26 44 Q32 46 38 43" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      {/* gaunt cheek lines */}
      <path d="M23 39 Q22 41 23 43 M41 38 Q42 40 41 42" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AnnaHead() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* antenna */}
      <line x1="32" y1="14" x2="32" y2="6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="5" r="2.5" fill="#7dd3fc" stroke={INK} strokeWidth="2" />
      {/* droid head */}
      <rect x="14" y="14" width="36" height="34" rx="14" fill="#bae6fd" stroke={INK} strokeWidth="3" />
      {/* faceplate seam */}
      <path d="M14 40 Q32 44 50 40" fill="none" stroke={INK} strokeWidth="1.5" />
      {/* rectangular photoreceptor eyes */}
      <rect x="21" y="26" width="8" height="6" rx="2" fill="#f0f9ff" stroke={INK} strokeWidth="2.2" />
      <rect x="35" y="26" width="8" height="6" rx="2" fill="#f0f9ff" stroke={INK} strokeWidth="2.2" />
      <circle cx="25" cy="29" r="1.5" fill={INK} />
      <circle cx="39" cy="29" r="1.5" fill={INK} />
      {/* speaker grille mouth */}
      <path d="M26 43 L38 43 M27 45.5 L37 45.5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      {/* side bolts */}
      <circle cx="17.5" cy="31" r="1.6" fill="none" stroke={INK} strokeWidth="1.4" />
      <circle cx="46.5" cy="31" r="1.6" fill="none" stroke={INK} strokeWidth="1.4" />
    </svg>
  );
}

function DinnHead() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* mandalorian helmet dome */}
      <path d="M15 34 Q15 12 32 12 Q49 12 49 34 L49 46 Q49 50 45 50 L19 50 Q15 50 15 46 Z"
        fill="#d6d3d1" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* dome ridge */}
      <path d="M18 26 Q32 20 46 26" fill="none" stroke={INK} strokeWidth="1.6" />
      {/* T-visor */}
      <path d="M20 32 Q32 28 44 32 L44 37 Q38 35 35 37 L35 46 L29 46 L29 37 Q26 35 20 37 Z"
        fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* cheek dents */}
      <path d="M19 43 L24 43 M40 43 L45 43" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      {/* ear caps */}
      <rect x="12" y="30" width="5" height="10" rx="2" fill="#a8a29e" stroke={INK} strokeWidth="2" />
      <rect x="47" y="30" width="5" height="10" rx="2" fill="#a8a29e" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

const HEADS: Record<CharacterId, () => ReactElement> = {
  yoda: YodaHead,
  ragebaiter: RagebaiterHead,
  palpaccio: PalpaccioHead,
  anna: AnnaHead,
  dinn: DinnHead,
};

interface CharacterChipProps {
  id: CharacterId;
  size?: number;
  speaking?: boolean;
  dimmed?: boolean;
}

export function CharacterChip({ id, size = 56, speaking = false, dimmed = false }: CharacterChipProps) {
  const config = CHARACTERS[id];
  const Head = HEADS[id];
  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={speaking ? { y: [0, -3, 0] } : { y: 0 }}
      transition={speaking ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
    >
      {speaking && (
        <motion.span
          className={`absolute inset-[-5px] rounded-[45%_55%_50%_50%/55%_45%_55%_45%] ring-[3px] ${config.accent.ring}`}
          animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.35, 0.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className={`w-full h-full rounded-[48%_52%_50%_50%/52%_48%_54%_46%] border-[2.5px] border-[#1e1b18] ${config.accent.softBg} overflow-hidden ${dimmed ? "opacity-40 grayscale" : ""} transition-all duration-300`}
        title={config.name}
      >
        <Head />
      </div>
    </motion.div>
  );
}
