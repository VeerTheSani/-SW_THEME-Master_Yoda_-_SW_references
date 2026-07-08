// ==============================================================================
// CHARACTER REGISTRY (lib/characters.ts)
// ==============================================================================
// Frontend single source of truth for every roundtable persona: display names,
// sketch-style accent classes, TTS voice profiles and the seed relationship
// priors that give a character's memory graph "table chemistry" from round 1.
// (Prompt personas live server-side in backend/app/services/characters.py.)

import type { CharacterId, MemoryEdge, RoundtableMode } from "../types";

export interface CharacterAccent {
  hex: string;          // primary accent color
  softBg: string;       // tailwind bg for cards/badges
  border: string;       // tailwind border color
  text: string;         // tailwind text color
  shadow: string;       // sketch hard-offset shadow class
  ring: string;         // speaking-pulse ring color class
}

export interface SeedRelation {
  target: CharacterId;
  relation: string;
  stance: number; // -1..1
  note: string;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  shortName: string;
  title: string;
  tagline: string;
  modeBlurb: Record<RoundtableMode, string>;
  accent: CharacterAccent;
  voice: { pitch: number; rate: number };
  seedRelations: SeedRelation[];
}

export const CHARACTER_ORDER: CharacterId[] = ["yoda", "ragebaiter", "palpaccio", "anna", "dinn"];

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  yoda: {
    id: "yoda",
    name: "Master Yoda",
    shortName: "Yoda",
    title: "Grand Strategist",
    tagline: "Nine hundred years of second-order thinking.",
    modeBlurb: {
      boardroom: "Long-horizon vision & ethics. Punctures groupthink in OSV.",
      pitch: "Gut-feel partner. Judges the founder, not the deck.",
    },
    accent: {
      hex: "#10b981",
      softBg: "bg-emerald-100",
      border: "border-emerald-600",
      text: "text-emerald-700",
      shadow: "shadow-[4px_4px_0px_0px_#059669]",
      ring: "ring-emerald-500",
    },
    voice: { pitch: 0.6, rate: 0.8 },
    seedRelations: [
      { target: "ragebaiter", relation: "distrusts", stance: -0.4, note: "Chaos without purpose, his path is." },
      { target: "palpaccio", relation: "distrusts", stance: -0.6, note: "The dark side of finance, I sense in him." },
      { target: "anna", relation: "respects", stance: 0.3, note: "Precise, the droid is. Wisdom, data alone is not." },
      { target: "dinn", relation: "respects", stance: 0.6, note: "A builder. Ships, he does. Hmmm." },
    ],
  },
  ragebaiter: {
    id: "ragebaiter",
    name: "Darth Ragebaiter",
    shortName: "Ragebaiter",
    title: "Chaos Growth Gremlin",
    tagline: "Your roadmap is mid and he will say so.",
    modeBlurb: {
      boardroom: "Devil's-advocate growth hacker. Ratio-checks every plan.",
      pitch: "Hostile hype-auditor. Roasts inflated TAM slides.",
    },
    accent: {
      hex: "#f43f5e",
      softBg: "bg-rose-100",
      border: "border-rose-600",
      text: "text-rose-700",
      shadow: "shadow-[4px_4px_0px_0px_#e11d48]",
      ring: "ring-rose-500",
    },
    voice: { pitch: 1.4, rate: 1.15 },
    seedRelations: [
      { target: "yoda", relation: "mocks", stance: -0.2, note: "old man talks backwards for engagement lol" },
      { target: "palpaccio", relation: "allied_with", stance: 0.3, note: "evil rich dude energy, lowkey based" },
      { target: "anna", relation: "mocks", stance: -0.5, note: "NPC calculator bot fr" },
      { target: "dinn", relation: "respects", stance: 0.2, note: "actually ships, rare W" },
    ],
  },
  palpaccio: {
    id: "palpaccio",
    name: "Chancellor Palpaccio",
    shortName: "Palpaccio",
    title: 'Managing Partner, "The Closer"',
    tagline: "Somehow... the margins returned.",
    modeBlurb: {
      boardroom: "CFO power-player. Everything is leverage.",
      pitch: "Lead investor. Term-sheet predator with a smile.",
    },
    accent: {
      hex: "#f59e0b",
      softBg: "bg-amber-100",
      border: "border-amber-600",
      text: "text-amber-700",
      shadow: "shadow-[4px_4px_0px_0px_#d97706]",
      ring: "ring-amber-500",
    },
    voice: { pitch: 0.7, rate: 0.9 },
    seedRelations: [
      { target: "yoda", relation: "opposes", stance: -0.5, note: "Sentiment is a liability on the balance sheet." },
      { target: "ragebaiter", relation: "uses", stance: 0.4, note: "Chaos is... useful leverage." },
      { target: "anna", relation: "values", stance: 0.5, note: "Numbers serve power. She serves numbers." },
      { target: "dinn", relation: "distrusts", stance: -0.3, note: "Operators forget who owns the vote." },
    ],
  },
  anna: {
    id: "anna",
    name: "AN-LYT “Anna”",
    shortName: "Anna",
    title: "Analysis & Protocol Droid",
    tagline: "Odds of success: 3,720 to 1.",
    modeBlurb: {
      boardroom: "Data & ops. Corrects your numbers to two decimals.",
      pitch: "Due-diligence unit. Scores unit economics, icily.",
    },
    accent: {
      hex: "#38bdf8",
      softBg: "bg-sky-100",
      border: "border-sky-600",
      text: "text-sky-700",
      shadow: "shadow-[4px_4px_0px_0px_#0284c7]",
      ring: "ring-sky-500",
    },
    voice: { pitch: 1.1, rate: 1.0 },
    seedRelations: [
      { target: "yoda", relation: "finds_inefficient", stance: -0.2, note: "OSV syntax increases parse time by 34%." },
      { target: "ragebaiter", relation: "distrusts", stance: -0.7, note: "Output is 98.2% statistical noise." },
      { target: "palpaccio", relation: "monitors", stance: -0.4, note: "Probability of hidden agenda: 91%." },
      { target: "dinn", relation: "allied_with", stance: 0.6, note: "Execution data: verifiable. Refreshing." },
    ],
  },
  dinn: {
    id: "dinn",
    name: "Dinn Korr",
    shortName: "Dinn",
    title: "Chief Operating Officer",
    tagline: "Shipped is the way.",
    modeBlurb: {
      boardroom: "Execution & logistics. Cuts scope ruthlessly.",
      pitch: "Operator judge. A demo outweighs ten projections.",
    },
    accent: {
      hex: "#78716c",
      softBg: "bg-stone-200",
      border: "border-stone-600",
      text: "text-stone-700",
      shadow: "shadow-[4px_4px_0px_0px_#57534e]",
      ring: "ring-stone-500",
    },
    voice: { pitch: 0.8, rate: 1.05 },
    seedRelations: [
      { target: "palpaccio", relation: "distrusts", stance: -0.6, note: "Financial engineering isn't building." },
      { target: "anna", relation: "allied_with", stance: 0.5, note: "Good data. No nonsense." },
      { target: "yoda", relation: "respects", stance: 0.4, note: "Wise. Slow. Needs a deadline." },
      { target: "ragebaiter", relation: "tolerates", stance: -0.3, note: "Loud. Occasionally useful." },
    ],
  },
};

export function getCharacter(id: CharacterId): CharacterConfig {
  return CHARACTERS[id];
}

export function charNodeId(id: CharacterId): string {
  return `char:${id}`;
}

/** Seed `char:` relationship edges for a brand-new memory graph. */
export function seedRelationEdges(selfId: CharacterId, now: string): MemoryEdge[] {
  return CHARACTERS[selfId].seedRelations.map((rel) => ({
    id: `${charNodeId(selfId)}|${rel.relation}|${charNodeId(rel.target)}`,
    source: charNodeId(selfId),
    target: charNodeId(rel.target),
    relation: rel.relation,
    stance: rel.stance,
    weight: 0.6,
    note: rel.note,
    createdAt: now,
    updatedAt: now,
  }));
}
