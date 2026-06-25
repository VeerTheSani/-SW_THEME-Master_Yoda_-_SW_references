import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";
import { Copy, Sparkles, Check, Trash2, ShieldQuestion, RotateCcw, Send } from "lucide-react";
import { useState } from "react";

interface ChatHistoryProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onClear: () => void;
  onSendReply?: (text: string) => void;
  onRetry?: () => void;
  character: "yoda" | "ragebaiter";
  isUnhinged: boolean;
}

export default function ChatHistory({ 
  messages, 
  isGenerating, 
  onClear,
  onSendReply,
  onRetry,
  character,
  isUnhinged
}: ChatHistoryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoastMetrics = (text: string) => {
    const len = text.length;
    let damage = "85%";
    let classification = "Singeing Saber";
    let loreBurn = "Anakin's Sand allergy triggered";

    if (len < 50) {
      damage = "55%";
      classification = "Tadpole Spark";
      loreBurn = "Stormtrooper accuracy levels of danger";
    } else if (len > 140) {
      damage = "99.9%";
      classification = "Supernova Extermination";
      loreBurn = "Order 66 levels of catastrophic burn";
    } else {
      damage = "88%";
      classification = "Kyber Blast";
      loreBurn = "Swamp of Dagobah dampness vaporized";
    }

    return { damage, classification, loreBurn };
  };

  const getRagebaitMetrics = (text: string) => {
    const len = text.length;
    let rageLevel = "CRITICAL";
    let warningCount = "3 Warnings";
    let triggerRatio = "98.7% Triggered";

    if (len < 50) {
      rageLevel = "MILDLY INSULTING";
      warningCount = "0 Warnings";
      triggerRatio = "45% Triggered";
    } else if (len > 140) {
      rageLevel = "PERMANENT BAN RISK";
      warningCount = "5 Warnings";
      triggerRatio = "99.9% Triggered";
    }

    return { rageLevel, warningCount, triggerRatio };
  };

  if (messages.length === 0) {
    return (
      <div id="tutorial-card" className={`border-[3px] ${isUnhinged ? "border-rose-600 bg-[#1a1112] text-rose-100 shadow-[4px_4px_0px_0px_#e11d48]" : "border-[#1e1b18] bg-[#fdfbf7] text-[#1e1b18] shadow-[4px_4px_0px_0px_#1e1b18]"} pb-6 pt-8 px-6 rounded-[20px_10px_22px_12px/12px_22px_12px_20px] text-center space-y-4 max-w-sm mx-auto my-4 select-none`}>
        <div className={`mx-auto w-12 h-12 ${isUnhinged ? "bg-rose-950 border-rose-600" : "bg-[#faf6ef] border-[#1e1b18]"} rounded-full flex items-center justify-center border-2`}>
          <ShieldQuestion className={`w-5 h-5 ${isUnhinged ? "text-rose-400" : "text-stone-500"}`} />
        </div>
        <div className="space-y-1.5">
          <h3 className={`font-bold ${isUnhinged ? "text-rose-100" : "text-[#1e1b18]"} text-sm font-mono tracking-wider`}>Scroll of Transmission is Empty</h3>
          <p className={`text-xs ${isUnhinged ? "text-rose-300" : "text-stone-600"} font-sans leading-relaxed max-w-[280px] mx-auto`}>
            Choose your companion on top, select Roast, Translate, or seek Wisdom, and send a message to begin drawing transcripts!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="messages-container" className="space-y-6 flex flex-col h-full w-full">
      
      {/* Top Controls styled as hand-drawn headings */}
      <div className="flex justify-between items-center px-1">
        <h4 className={`text-[11px] font-mono font-bold tracking-widest ${isUnhinged ? "text-rose-400" : "text-stone-600"} uppercase`}>
          📜 DRAWN TRANSCRIPTIONS ({messages.length})
        </h4>
        <button
          id="clear-temple-history"
          type="button"
          onClick={onClear}
          className={`flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase ${isUnhinged ? "text-rose-400 hover:text-red-500" : "text-stone-600 hover:text-red-500"} transition-colors pointer-events-auto cursor-pointer`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Purge Scrolls
        </button>
      </div>

      {/* Message List */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 flex-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isBot = msg.sender === "yoda" || msg.sender === "ragebaiter";
            const isYoda = msg.sender === "yoda";
            const isRagebaiter = msg.sender === "ragebaiter";
            const isUnhinged = !!msg.isUnhinged;
            
            const roastMetrics = isYoda && msg.mode === "roast" ? getRoastMetrics(msg.text) : null;
            const ragebaitMetrics = isRagebaiter && msg.mode === "roast" ? getRagebaitMetrics(msg.text) : null;

            let characterName = "✏️ You";
            if (isBot) {
              if (isYoda) {
                characterName = isUnhinged ? "👹 Darth Yoda (Dark Side)" : "🍵 Master Yoda (Light Side)";
              } else {
                characterName = isUnhinged ? "👹 Dark Side Troll" : "📢 Keyboard Warrior (Light Side)";
              }
            }

            // Determine custom comic balloon color schemes
            let bubbleStyle = "";
            let borderClass = isUnhinged ? "border-rose-600" : "border-[#1e1b18]";
            let shadowClass = isUnhinged ? "shadow-[3px_3px_0px_0px_#f43f5e]" : "shadow-[3px_3px_0px_0px_#1e1b18]";

            if (isUnhinged) {
              if (isBot) {
                bubbleStyle = `bg-[#201214] text-rose-100 ${borderClass} ${shadowClass}`;
              } else {
                bubbleStyle = `bg-[#181112] text-rose-200 ${borderClass} ${shadowClass}`;
              }
            } else {
              // Classic Light Modes
              if (isBot) {
                if (msg.isUnhinged) {
                  bubbleStyle = `bg-[#ffe4e6] text-[#4c0519] ${borderClass} ${shadowClass}`;
                } else if (isRagebaiter) {
                  bubbleStyle = `bg-[#fff7ed] text-[#431407] ${borderClass} ${shadowClass}`;
                } else {
                  if (msg.mode === "roast") {
                    bubbleStyle = `bg-[#fef2f2] text-[#450a0a] ${borderClass} ${shadowClass}`;
                  } else if (msg.mode === "translate") {
                    bubbleStyle = `bg-[#f0f9ff] text-[#0c4a6e] ${borderClass} ${shadowClass}`;
                  } else {
                    bubbleStyle = `bg-[#ecfdf5] text-[#064e3b] ${borderClass} ${shadowClass}`;
                  }
                }
              } else {
                bubbleStyle = `bg-[#fffdfa] text-stone-900 ${borderClass} ${shadowClass}`;
              }
            }

            // Wobbly, uneven comic panel radiuses for bot vs user
            const radiusClass = isBot 
              ? "rounded-[12px_28px_16px_24px/24px_12px_28px_16px]"
              : "rounded-[28px_12px_24px_16px/12px_24px_16px_28px]";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex flex-col gap-1.5 ${isBot ? "items-start" : "items-end"}`}
              >
                {/* Meta details */}
                <span className={`text-[10px] font-mono font-bold uppercase px-2 tracking-wider ${
                  isBot 
                    ? isUnhinged 
                      ? "text-red-500" 
                      : isRagebaiter 
                        ? "text-amber-600" 
                        : "text-emerald-700" 
                    : isUnhinged ? "text-rose-400" : "text-stone-500"
                }`}>
                  {characterName} • {msg.mode ? msg.mode.toUpperCase() : "THOUGHT"}
                </span>

                {/* Speech container (Hand-sketched wavy comic panels) */}
                <div className={`relative p-4 max-w-[85%] text-base leading-relaxed border-[3px] ${radiusClass} ${bubbleStyle} transition-all`}>
                  <p className="whitespace-pre-wrap font-sans font-medium select-text">
                    {msg.text}
                  </p>

                  {/* Actions for Bot Outputs */}
                  {isBot && (
                    <div className={`mt-3.5 pt-3.5 border-t-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} flex items-center justify-between gap-4`}>
                      {/* Left: Quick tag decoration */}
                      <span className={`flex items-center gap-1.5 text-[10px] ${isUnhinged ? "text-rose-400" : "text-stone-500"} font-mono font-semibold`}>
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        {msg.isModelFallback
                          ? `Routed to ${msg.actualModelUsed || "gemini-3.5-flash"}`
                          : msg.isFallback 
                            ? "Swamp Local Holocron" 
                            : isUnhinged 
                              ? "Dark Side Transmission" 
                              : isRagebaiter 
                                ? "Outrage Baiter API" 
                                : "Light Side Brushstroke"}
                      </span>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5">
                        {onRetry && messages[messages.length - 1]?.id === msg.id && (
                          <button
                            type="button"
                            onClick={onRetry}
                            disabled={isGenerating}
                            className={`flex items-center gap-1 px-2 py-1 rounded border-2 ${isUnhinged ? "border-rose-600 bg-rose-950 text-rose-100 hover:bg-rose-900 shadow-[1px_1px_0px_0px_#ef4444]" : "border-[#1e1b18] bg-white text-[#1e1b18] hover:bg-stone-50 shadow-[1px_1px_0px_0px_#1e1b18]"} font-mono text-[10px] font-bold sketch-btn-press transition-all cursor-pointer`}
                            title="Redraw this transcription panel"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                        <button
                          id={`copy-btn-${msg.id}`}
                          type="button"
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className={`p-1 rounded border-2 ${isUnhinged ? "border-rose-600 bg-rose-950 text-rose-100 hover:bg-rose-900 shadow-[1px_1px_0px_0px_#ef4444]" : "border-[#1e1b18] bg-white text-[#1e1b18] hover:bg-stone-50 shadow-[1px_1px_0px_0px_#1e1b18]"} sketch-btn-press transition-all cursor-pointer`}
                          title="Copy to clipboard"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scorecards styled like notebook cards with stamp metrics */}
                {isYoda && roastMetrics && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className={`mt-1 flex flex-col gap-1 p-2.5 ${isUnhinged ? "bg-[#331317] border-rose-500 text-rose-100 shadow-[2px_2px_0px_0px_#ef4444]" : "bg-[#fef2f2] border-[#1e1b18] text-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18]"} border-[2px] rounded-xl text-left max-w-[280px] font-mono ml-2 pointer-events-none`}
                  >
                    <div className="flex justify-between text-[11px] gap-4 font-bold">
                      <span className="text-red-500">💥 SINGE DAMAGE: {roastMetrics.damage}</span>
                      <span className={isUnhinged ? "text-rose-300" : "text-stone-600"}>[{roastMetrics.classification}]</span>
                    </div>
                    <span className={`text-[10px] ${isUnhinged ? "text-rose-400" : "text-stone-500"} font-sans`}>Lore Trigger: {roastMetrics.loreBurn}</span>
                  </motion.div>
                )}

                {isRagebaiter && ragebaitMetrics && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className={`mt-1 flex flex-col gap-1 p-2.5 ${isUnhinged ? "bg-[#311713] border-rose-500 text-rose-100 shadow-[2px_2px_0px_0px_#ef4444]" : "bg-[#fff7ed] border-[#1e1b18] text-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18]"} border-[2px] rounded-xl text-left max-w-[280px] font-mono ml-2 pointer-events-none`}
                  >
                    <div className="flex justify-between text-[11px] gap-4 font-bold">
                      <span className="text-amber-500">🔥 TRASH BAIT: {ragebaitMetrics.rageLevel}</span>
                      <span className={isUnhinged ? "text-rose-300" : "text-stone-600"}>[{ragebaitMetrics.triggerRatio}]</span>
                    </div>
                    <span className={`text-[10px] ${isUnhinged ? "text-rose-400" : "text-stone-500"} font-sans`}>Status Log: {ragebaitMetrics.warningCount}</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {/* Sketch Loading Panel */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1.5 items-start"
            >
              <span className={`text-[10px] font-mono font-bold ${isUnhinged ? "text-rose-400" : "text-stone-500"} uppercase tracking-wider`}>
                SYSTEM • BRUSH IN PROCESS...
              </span>
              <div className={`p-3.5 rounded-xl ${isUnhinged ? "bg-[#1c1112] border-rose-600 text-rose-100 shadow-[2px_2px_0px_0px_#f43f5e]" : "bg-white border-[#1e1b18] text-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18]"} border-2 flex items-center justify-center space-x-2`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isUnhinged ? "bg-rose-400" : "bg-stone-700"} animate-bounce [animation-delay:-0.3s]`}></span>
                <span className={`w-2.5 h-2.5 rounded-full ${isUnhinged ? "bg-rose-500" : "bg-stone-500"} animate-bounce [animation-delay:-0.15s]`}></span>
                <span className={`w-2.5 h-2.5 rounded-full ${isUnhinged ? "bg-rose-400" : "bg-stone-700"} animate-bounce`}></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Follow-up Reply Box (Looks like an uneven envelope panel) */}
      {onSendReply && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!replyText.trim() || isGenerating) return;
            onSendReply(replyText);
            setReplyText("");
          }}
          className={`p-3 ${isUnhinged ? "bg-[#181011] border-rose-600 shadow-[3px_3px_0px_0px_#e11d48] focus-within:ring-[#f43f5e]" : "bg-white border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18] focus-within:ring-[#10b981]"} border-[3px] rounded-[15px_15px_15px_15px/200px_200px_200px_200px] flex gap-2 items-center transition-all`}
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isGenerating}
            placeholder={
              character === "ragebaiter"
                ? "Type a braindead counter-argument..."
                : "Type a follow-up thought to Master Yoda..."
            }
            className={`flex-1 bg-transparent text-sm ${isUnhinged ? "text-rose-100 placeholder-rose-950/60" : "text-[#1e1b18] placeholder-stone-400"} outline-none border-none focus:ring-0 font-sans`}
          />
          <button
            type="submit"
            disabled={isGenerating || !replyText.trim()}
            className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ${
              replyText.trim() && !isGenerating
                ? isUnhinged
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-[2px_2px_0px_0px_#f43f5e]"
                  : "bg-[#10b981] hover:bg-[#059669] text-[#1e1b18] border-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18]"
                : isUnhinged
                  ? "text-rose-950 bg-transparent border-transparent"
                  : "text-stone-300 bg-transparent border-transparent"
            } disabled:cursor-not-allowed`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
