import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HubMode, PromptChip } from "../types";
import { Flame, Languages, ShieldAlert, Send } from "lucide-react";

interface InputAreaProps {
  currentMode: HubMode;
  onModeChange: (mode: HubMode) => void;
  onSubmit: (text: string) => void;
  isGenerating: boolean;
  character: "yoda" | "ragebaiter";
  isUnhinged: boolean;
}

export default function InputArea({
  currentMode,
  onModeChange,
  onSubmit,
  isGenerating,
  character,
  isUnhinged,
}: InputAreaProps) {
  const [inputText, setInputText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSubmit(inputText);
    setInputText("");
  };

  const getQuickChips = (): PromptChip[] => {
    if (character === "ragebaiter") {
      switch (currentMode) {
        case "roast":
          return [
            { text: "Your hot takes are worse than a corrupt partition on a floppy disk!", label: "💾 Insult Floppy" },
            { text: "I bet you use single equal signs in your javascript code!", label: "🤡 JS Equality" },
            { text: "You have less credibility than a clickbait thumbnail with a red circle!", label: "🔴 Ratio Bait" },
            { text: "Your coding setup is powered by hamsters and potato batteries!", label: "🥔 Potato Power" },
          ];
        case "translate":
          return [
            { text: "I think TypeScript is a very reliable programming language.", label: "🛡️ TypeScript Safe" },
            { text: "I had a wonderful dinner and then slept for eight hours.", label: "😴 Healthy Sleep" },
            { text: "Let us collaborate peacefully to solve this server infrastructure issue.", label: "🤝 Peaceful Server" },
          ];
        case "wisdom":
        default:
          return [
            { text: "How should I handle production outages on a weekend?", label: "🚨 Weekend Outage" },
            { text: "My project manager is asking for status reports every ten minutes.", label: "📊 Micro-Mgmt" },
            { text: "I want to deploy directly to master with no automated test runners.", label: "🚀 YOLO Deploy" },
          ];
      }
    }

    switch (currentMode) {
      case "roast":
        return [
          { text: "Master yoda sucks", label: "💥 Yoda Sucks" },
          { text: "Your giant green ears make you look like a space swamp bat!", label: "🦇 Ears Roast" },
          { text: "Stormtroopers aim better than you speak!", label: "🎯 Speech Roast" },
          { text: "Failed you have, into exile you must go!", label: "Order Roast 🪐" },
        ];
      case "translate":
        return [
          { text: "I'm going to eat a giant sandwich and drink hot tea.", label: "🥪 Tea & Sandwich" },
          { text: "This application builds successfully with zero compilations errors.", label: "💻 Coding Success" },
          { text: "May the Force be with you on all of your future adventures.", label: "✨ Force Blessing" },
        ];
      case "wisdom":
      default:
        return [
          { text: "I'm feeling afraid of failure in my goals.", label: "🛑 Fear of Failure" },
          { text: "How do I achieve peace in a chaotic world?", label: "Leaf of Peace 🍃" },
          { text: "I am procrastinating on writing my codes.", label: "⏳ Writer's Block" },
        ];
    }
  };

  const chips = getQuickChips();

  // Artistic pastel sticky-note color schemes for sug chips
  const getChipStyle = (idx: number) => {
    if (isUnhinged) {
      const darkBgs = [
        "bg-[#4c0519] hover:bg-[#881337] text-rose-100",
        "bg-[#311015] hover:bg-[#4c1018] text-rose-100",
        "bg-[#450a0a] hover:bg-[#7f1d1d] text-rose-100",
        "bg-[#1c1917] hover:bg-[#292524] text-rose-100",
      ];
      const rotation = idx % 2 === 0 ? "rotate-1" : "-rotate-1";
      return `${darkBgs[idx % darkBgs.length]} ${rotation} border-2 border-rose-600 hover:rotate-0 hover:scale-[1.03] shadow-[2px_2px_0px_0px_#f43f5e]`;
    }

    const pastelBgs = [
      "bg-[#fef08a] hover:bg-[#fde047]", // Soft yellow note
      "bg-[#fed7aa] hover:bg-[#fdba74]", // Soft orange note
      "bg-[#bfdbfe] hover:bg-[#93c5fd]", // Soft blue note
      "bg-[#bbf7d0] hover:bg-[#86efac]", // Soft mint note
      "bg-[#fbcfe8] hover:bg-[#f9a8d4]", // Soft rose note
    ];
    const rotation = idx % 2 === 0 ? "rotate-1" : "-rotate-1";
    return `${pastelBgs[idx % pastelBgs.length]} ${rotation} text-[#1e1b18] border-2 border-[#1e1b18] hover:rotate-0 hover:scale-[1.03] shadow-[2px_2px_0px_0px_#1e1b18]`;
  };

  const getActiveTabClass = (mode: HubMode) => {
    if (isUnhinged) {
      if (currentMode !== mode) {
        return "bg-rose-950/20 border-rose-900/50 text-rose-400 hover:bg-rose-950/40";
      }
      return "bg-[#ef4444] text-white border-rose-500 shadow-[3px_3px_0px_0px_#ef4444]";
    }

    if (currentMode !== mode) {
      return "bg-[#f5ebd9]/40 border-transparent text-[#78716c] hover:bg-[#f5ebd9]/80";
    }
    
    if (character === "ragebaiter") {
      switch (mode) {
        case "roast":
          return "bg-[#f59e0b] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
        case "translate":
          return "bg-[#f97316] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
        case "wisdom":
          return "bg-[#ef4444] text-white border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
      }
    }
    
    switch (mode) {
      case "roast":
        return "bg-[#ef4444] text-white border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
      case "translate":
        return "bg-[#38bdf8] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
      case "wisdom":
        return "bg-[#10b981] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]";
    }
  };

  const getInputPlaceholder = () => {
    if (character === "ragebaiter") {
      switch (currentMode) {
        case "roast":
          return "Provoke the Keyboard Warrior... e.g. 'I bet you use single equal signs!'";
        case "translate":
          return "Write some normal English for him to turn into absolute internet flame bait...";
        case "wisdom":
          return "Ask for his questionable system advice or YOLO deployment shortcuts...";
      }
    }
    switch (currentMode) {
      case "roast":
        return "Challenge Master Yoda... e.g. 'Master yoda sucks'";
      case "translate":
        return "Enter your boring English sentences for translation...";
      case "wisdom":
        return "Seek grandmaster guidance or mention your heavy heart...";
    }
  };

  const getSubmitButtonClass = () => {
    if (isGenerating || !inputText.trim()) {
      if (isUnhinged) {
        return "bg-[#331c1e] border-rose-950 text-rose-900 cursor-not-allowed shadow-[1px_1px_0px_0px_#5c1117]";
      }
      return "bg-stone-200 border-[#1e1b18] text-stone-400 cursor-not-allowed shadow-[1px_1px_0px_0px_#1e1b18]";
    }
    if (isUnhinged) {
      return "bg-[#ef4444] hover:bg-[#dc2626] text-white hover:scale-105 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#f43f5e] border-rose-500";
    }
    if (character === "ragebaiter") {
      return "bg-[#f59e0b] hover:bg-[#d97706] text-[#1e1b18] hover:scale-105 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#1e1b18]";
    }
    return "bg-[#10b981] hover:bg-[#059669] text-[#1e1b18] hover:scale-105 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#1e1b18]";
  };

  return (
    <div id="input-area" className="w-full space-y-6">
      
      {/* Mode selectors (Looks like a comic panel strip) */}
      <div className={`sketch-border-1 border-2 ${isUnhinged ? "bg-[#181112] border-rose-600" : "bg-[#fffcf5] border-[#1e1b18]"} p-1.5 sketch-shadow-sm flex gap-2`}>
        <button
          id="tab-roast"
          type="button"
          onClick={() => !isGenerating && onModeChange("roast")}
          disabled={isGenerating}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-lg text-xs font-mono tracking-wide uppercase transition-all duration-200 border-2 ${isUnhinged ? "border-rose-600" : "border-stone-900"} font-bold sketch-btn-press cursor-pointer ${getActiveTabClass("roast")}`}
        >
          <Flame className="w-4 h-4" />
          <span className="hidden sm:inline">
            {character === "ragebaiter" ? "Flame Duel" : "order order roast"}
          </span>
          <span className="sm:hidden font-sans">Roast</span>
        </button>

        <button
          id="tab-translate"
          type="button"
          onClick={() => !isGenerating && onModeChange("translate")}
          disabled={isGenerating}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-lg text-xs font-mono tracking-wide uppercase transition-all duration-200 border-2 ${isUnhinged ? "border-rose-600" : "border-stone-900"} font-bold sketch-btn-press cursor-pointer ${getActiveTabClass("translate")}`}
        >
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">
            {character === "ragebaiter" ? "Outrage Net" : "Yoda-speak"}
          </span>
          <span className="sm:hidden font-sans">Translate</span>
        </button>

        <button
          id="tab-wisdom"
          type="button"
          onClick={() => !isGenerating && onModeChange("wisdom")}
          disabled={isGenerating}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-lg text-xs font-mono tracking-wide uppercase transition-all duration-200 border-2 ${isUnhinged ? "border-rose-600" : "border-stone-900"} font-bold sketch-btn-press cursor-pointer ${getActiveTabClass("wisdom")}`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="hidden sm:inline">
            {character === "ragebaiter" ? "YOLO Hackz" : "Jedi Wisdom"}
          </span>
          <span className="sm:hidden font-sans">Wisdom</span>
        </button>
      </div>

      {/* Input Form with Notebook Ruling theme */}
      <form onSubmit={handleSend} className="space-y-4">
        <div className="relative">
          {/* Sketchy container behind the text area */}
          <div className={`absolute inset-0 ${isUnhinged ? "bg-rose-950 border-rose-600" : "bg-[#1e1b18] border-[#1e1b18]"} rounded-xl border-2 transform translate-x-1 translate-y-1`} />
          
          <textarea
            id="user-jedi-input"
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isGenerating}
            placeholder={getInputPlaceholder()}
            className={`relative w-full ${isUnhinged ? "bg-[#181011] text-rose-100 placeholder:text-rose-950/40 border-rose-600 focus:ring-[#f43f5e]" : "bg-[#fdfdfc] text-[#1e1b18] placeholder:text-stone-400 border-[#1e1b18] focus:ring-[#10b981]"} border-[3px] rounded-xl px-4 py-3.5 pr-14 outline-none resize-none font-sans text-sm md:text-base transition-all disabled:opacity-60`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          
          <div className="absolute right-3 bottom-3 flex items-center gap-2 z-10">
            <button
              id="submit-thought"
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className={`p-2.5 rounded-lg border-2 ${isUnhinged ? "border-rose-500" : "border-[#1e1b18]"} transition-all duration-200 cursor-pointer ${getSubmitButtonClass()}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggested sticky notes chips container */}
        <div id="quick-chips-section" className="space-y-2">
          <label className={`text-[10px] font-mono uppercase tracking-widest ${isUnhinged ? "text-rose-400" : "text-stone-500"} block select-none`}>
            {character === "ragebaiter" ? "📝 SUGGESTED CONTROVERSIES" : "🍵 COZY SWAMP STUDY NOTES (CLIPS)"}
          </label>
          <div className="flex flex-wrap gap-2.5">
            <AnimatePresence mode="popLayout">
              {chips.map((chip, idx) => (
                <motion.button
                  key={chip.text}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                  type="button"
                  onClick={() => !isGenerating && setInputText(chip.text)}
                  disabled={isGenerating}
                  className={`text-xs font-mono px-3.5 py-1.5 rounded-md font-bold transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${getChipStyle(idx)}`}
                >
                  {chip.label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </form>
    </div>
  );
}
