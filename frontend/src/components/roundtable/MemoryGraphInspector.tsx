// ==============================================================================
// MEMORY GRAPH INSPECTOR (components/roundtable/MemoryGraphInspector.tsx)
// ==============================================================================
// A character's mind, drawn as a hand-sketched radial graph: the self at the
// center, the other characters on the first ring, beliefs on the second,
// concepts/projects/events on the outer ring. Deterministic layout (stable
// hash → angle, salience → pull toward center), zero dependencies, no rAF.

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import type { CharacterId, CharacterMemoryGraph, MemoryEdge, MemoryNode } from "../../types";
import { CHARACTERS } from "../../lib/characters";
import { CharacterChip } from "./AvatarChips";

const INK = "#1e1b18";
const WIDTH = 520;
const HEIGHT = 400;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

function stableHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function ringFor(node: MemoryNode, selfNodeId: string): number {
  if (node.id === selfNodeId) return 0;
  if (node.type === "character") return 1;
  if (node.type === "belief") return 2;
  return 3;
}

const RING_RADII = [0, 74, 122, 164];

function positionFor(node: MemoryNode, selfNodeId: string): { x: number; y: number } {
  const ring = ringFor(node, selfNodeId);
  if (ring === 0) return { x: CENTER_X, y: CENTER_Y };
  const angle = stableHash(node.id) * Math.PI * 2;
  const radius = RING_RADII[ring] - node.salience * 16 + stableHash(node.id + "j") * 10;
  return {
    x: CENTER_X + Math.cos(angle) * radius * 1.18, // slight horizontal stretch
    y: CENTER_Y + Math.sin(angle) * radius * 0.82,
  };
}

function edgeColor(edge: MemoryEdge): string {
  if (edge.stance == null || Math.abs(edge.stance) < 0.15) return "#a8a29e";
  return edge.stance > 0 ? "#059669" : "#e11d48";
}

function nodeFill(node: MemoryNode): string {
  if (node.type === "character") {
    const characterId = node.id.replace("char:", "") as CharacterId;
    return characterId in CHARACTERS ? CHARACTERS[characterId].accent.hex : "#d6d3d1";
  }
  if (node.type === "belief") return "#fcd34d";
  if (node.type === "project") return "#7dd3fc";
  if (node.type === "event") return "#d6d3d1";
  return "#ffffff"; // concept
}

function stanceWord(stance: number | null | undefined): string {
  if (stance == null) return "neutral";
  if (stance >= 0.5) return `champions it (${stance.toFixed(1)})`;
  if (stance >= 0.15) return `leans positive (${stance.toFixed(1)})`;
  if (stance <= -0.5) return `despises it (${stance.toFixed(1)})`;
  if (stance <= -0.15) return `leans negative (${stance.toFixed(1)})`;
  return "neutral";
}

interface MemoryGraphInspectorProps {
  characterId: CharacterId;
  graph: CharacterMemoryGraph;
  onClose: () => void;
}

export function MemoryGraphInspector({ characterId, graph, onClose }: MemoryGraphInspectorProps) {
  const config = CHARACTERS[characterId];
  const selfNodeId = `char:${characterId}`;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const node of graph.nodes) map[node.id] = positionFor(node, selfNodeId);
    return map;
  }, [graph.nodes, selfNodeId]);

  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdges = selected
    ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
    : [];
  const freshCutoff = Date.now() - 10 * 60 * 1000; // updated in the last 10 minutes

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#1e1b18]/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto border-[3px] border-[#1e1b18] sketch-border-2 sketch-shadow-lg bg-[#f7f4eb] p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <CharacterChip id={characterId} size={44} />
            <div>
              <div className={`font-display text-sm uppercase tracking-wide ${config.accent.text}`}>
                Inside {config.shortName}'s mind
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                {graph.nodes.length} memories · {graph.edges.length} links · v{graph.version}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border-[2.5px] border-[#1e1b18] rounded-[40%_60%_50%_50%] bg-white hover:bg-stone-100 sketch-btn-press"
            title="Close"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* The graph */}
        <div className="border-[2.5px] border-[#1e1b18] sketch-border-1 bg-[#fbf8f0] halftone-dots overflow-hidden">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto select-none">
            {/* faint orbit rings */}
            {RING_RADII.slice(1).map((radius) => (
              <ellipse
                key={radius}
                cx={CENTER_X}
                cy={CENTER_Y}
                rx={radius * 1.18}
                ry={radius * 0.82}
                fill="none"
                stroke={INK}
                strokeOpacity="0.08"
                strokeWidth="1.5"
                strokeDasharray="5 7"
              />
            ))}
            {/* edges */}
            {graph.edges.map((edge) => {
              const from = positions[edge.source];
              const to = positions[edge.target];
              if (!from || !to) return null;
              const highlighted = selectedId && (edge.source === selectedId || edge.target === selectedId);
              return (
                <line
                  key={edge.id}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edgeColor(edge)}
                  strokeWidth={highlighted ? 2.6 : 1 + edge.weight * 1.4}
                  strokeOpacity={selectedId && !highlighted ? 0.15 : 0.65}
                  strokeDasharray={edge.stance != null && edge.stance < 0 ? "4 4" : undefined}
                >
                  <title>{`${edge.source} —${edge.relation}→ ${edge.target}${edge.note ? `\n"${edge.note}"` : ""}`}</title>
                </line>
              );
            })}
            {/* nodes */}
            {graph.nodes.map((node) => {
              const pos = positions[node.id];
              const radius = node.id === selfNodeId ? 17 : 6 + node.salience * 9;
              const isFresh = Date.parse(node.updatedAt || "") > freshCutoff;
              const isSelected = node.id === selectedId;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(isSelected ? null : node.id)}
                >
                  {isFresh && (
                    <circle r={radius + 5} fill="none" stroke={config.accent.hex} strokeWidth="2" strokeDasharray="3 4" opacity="0.85" />
                  )}
                  <circle
                    r={radius}
                    fill={nodeFill(node)}
                    stroke={INK}
                    strokeWidth={isSelected ? 3.2 : 2}
                    opacity={selectedId && !isSelected ? 0.45 : 1}
                  />
                  <text
                    y={radius + 11}
                    textAnchor="middle"
                    className="font-sans"
                    fontSize="10.5"
                    fill={INK}
                    opacity={selectedId && !isSelected ? 0.35 : 0.9}
                  >
                    {node.label.length > 22 ? node.label.slice(0, 21) + "…" : node.label}
                  </text>
                  <title>{`${node.label} (${node.type})\n${node.summary}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend + detail */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-wide text-stone-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#1e1b18] bg-[#fcd34d] inline-block" /> belief</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#1e1b18] bg-white inline-block" /> concept</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#1e1b18] bg-[#7dd3fc] inline-block" /> project</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#1e1b18] bg-[#d6d3d1] inline-block" /> event/char</span>
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-600 inline-block" /> likes</span>
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-rose-600 inline-block" style={{ backgroundImage: "linear-gradient(90deg, #e11d48 60%, transparent 40%)", backgroundSize: "6px 2px" }} /> opposes</span>
          <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full border-2 border-dashed inline-block`} style={{ borderColor: config.accent.hex }} /> fresh</span>
        </div>

        {selected ? (
          <div className="mt-2.5 border-[2.5px] border-[#1e1b18] sketch-border-1 bg-white p-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-sans font-bold text-[14.5px]">{selected.label}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-wide px-1.5 border border-stone-400 rounded text-stone-500">{selected.type}</span>
              <span className="font-mono text-[10.5px] text-stone-500">{config.shortName} {stanceWord(selected.stance)}</span>
              <span className="font-mono text-[10px] text-stone-400">salience {(selected.salience * 100).toFixed(0)}%</span>
            </div>
            <p className="font-sans text-[13.5px] text-stone-700 mt-1 italic">“{selected.summary}”</p>
            {selectedEdges.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {selectedEdges.slice(0, 6).map((edge) => (
                  <div key={edge.id} className="font-mono text-[10.5px] text-stone-600">
                    ↳ {edge.source === selected.id ? "" : "⟵ "}{edge.relation.replace(/_/g, " ")}{" "}
                    <span className="font-bold">
                      {(edge.source === selected.id ? edge.target : edge.source).replace(/^(char|concept|project|event|belief):/, "")}
                    </span>
                    {edge.note ? <span className="text-stone-400"> — “{edge.note}”</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2.5 font-mono text-[11px] text-stone-400 text-center">
            Click a memory to read what {config.shortName} really thinks about it.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
