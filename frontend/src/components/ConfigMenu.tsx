// ==============================================================================
// CONFIGURATION MENU (components/ConfigMenu.tsx)
// ==============================================================================
// One place for every API setting: which power source is active (Google AI
// Studio direct, or your own OpenAI-compatible relay), that source's key, and
// its model. Edits are DRAFTS — nothing takes effect until "Save & apply".

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { DEFAULT_GOOGLE_MODEL, GOOGLE_MODEL_OPTIONS } from "../lib/googleModels";

// What the backend's /api/config exposes: which host-funded power sources
// exist. URLs and keys never reach the browser — labels and booleans only.
export interface ServerConfig {
  defaultProvider: { active: boolean; model: string; label: string };
  serverGemini: { active: boolean };
}

export interface ProviderConfig {
  source: "house" | "google" | "custom";
  googleKey: string;
  googleModel: string;
  relayUrl: string;
  relayKey: string;
  relayModel: string;
  // Visitor-typed model for the host's relay (empty = host's default model).
  houseModel: string;
  // The Roundtable's backstage brain (moderator + Adjudicator judge).
  // "same" = whatever the main source is; or its own Google / relay setup.
  moderatorSource: "same" | "google" | "custom";
  moderatorGoogleKey: string;
  moderatorGoogleModel: string;
  moderatorRelayUrl: string;
  moderatorRelayKey: string;
  moderatorRelayModel: string;
}

export const PROVIDER_CONFIG_KEY = "yoda_provider_config_v1";
export const DEFAULT_MODERATOR_GOOGLE_MODEL = "gemini-3.1-flash-lite";

export function defaultProviderConfig(): ProviderConfig {
  return {
    source: "google",
    googleKey: "",
    googleModel: DEFAULT_GOOGLE_MODEL,
    relayUrl: "",
    relayKey: "",
    relayModel: "",
    houseModel: "",
    moderatorSource: "same",
    moderatorGoogleKey: "",
    moderatorGoogleModel: DEFAULT_MODERATOR_GOOGLE_MODEL,
    moderatorRelayUrl: "",
    moderatorRelayKey: "",
    moderatorRelayModel: "",
  };
}

// Resolve what the Roundtable should send as the moderator override —
// null means "same brain as the main provider" (backend default behavior).
export function resolveModeratorOverride(config: ProviderConfig): { url: string; key: string; model: string } | null {
  if (config.moderatorSource === "google") {
    return {
      url: "",
      // Falls back to the main Google key, then the server's key (backend rule).
      key: config.moderatorGoogleKey || config.googleKey,
      model: config.moderatorGoogleModel.trim() || DEFAULT_MODERATOR_GOOGLE_MODEL,
    };
  }
  if (config.moderatorSource === "custom") {
    const url = config.moderatorRelayUrl.trim();
    const model = config.moderatorRelayModel.trim();
    if (!url || !model) return null; // incomplete — behave as "same"
    return { url, key: config.moderatorRelayKey, model };
  }
  return null;
}

interface ConfigMenuProps {
  open: boolean;
  initial: ProviderConfig;
  isUnhinged: boolean;
  serverConfig?: ServerConfig | null;
  onClose: () => void;
  onApply: (config: ProviderConfig) => void;
}

type Section = "house" | "google" | "custom" | "moderator";

export function ConfigMenu({ open, initial, isUnhinged, serverConfig, onClose, onApply }: ConfigMenuProps) {
  const [draft, setDraft] = useState<ProviderConfig>(initial);
  const [section, setSection] = useState<Section>(initial.source);
  const [showKey, setShowKey] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [googleModelIsCustom, setGoogleModelIsCustom] = useState(false);

  // Re-seed drafts every time the menu opens; discard leftovers from last time.
  const houseAvailable = Boolean(serverConfig?.defaultProvider.active);
  const houseLabel = serverConfig?.defaultProvider.label || "Host's relay (free)";

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setSection(initial.source === "house" && !houseAvailable ? "google" : initial.source);
      setShowKey(false);
      setJustApplied(false);
      setGoogleModelIsCustom(!GOOGLE_MODEL_OPTIONS.some((option) => option.id === initial.googleModel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const relayIncomplete = draft.source === "custom" && (!draft.relayUrl.trim() || !draft.relayModel.trim());
  const moderatorIncomplete = draft.moderatorSource === "custom" && (!draft.moderatorRelayUrl.trim() || !draft.moderatorRelayModel.trim());

  const handleApply = () => {
    if (relayIncomplete || moderatorIncomplete) return;
    onApply(draft);
    setJustApplied(true);
    setTimeout(onClose, 700);
  };

  const paper = isUnhinged ? "bg-[#140b0c]" : "bg-[#f7f4eb]";
  const ink = isUnhinged ? "border-rose-600" : "border-[#1e1b18]";
  const label = `text-[10px] font-mono font-bold uppercase tracking-wide ${isUnhinged ? "text-rose-300" : "text-stone-600"}`;
  const inputCls = `mt-1 w-full ${isUnhinged ? "bg-[#181011] text-rose-100 border-rose-600 focus:ring-[#f43f5e]" : "bg-white border-[#1e1b18] text-[#1e1b18] focus:ring-[#10b981] shadow-[2px_2px_0px_0px_#1e1b18]"} border-2 text-xs font-mono rounded-lg px-3 py-2 outline-none placeholder:italic placeholder:text-stone-400 transition-all font-bold`;

  const menuItem = (id: Section, icon: string, title: string, subtitle: string) => {
    const selected = section === id;
    const isActiveSource = id === "moderator" ? draft.moderatorSource !== "same" : draft.source === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setSection(id)}
        className={`w-full text-left px-3 py-2.5 border-[2.5px] sketch-border-1 sketch-btn-press transition-all ${ink} ${
          selected
            ? (isUnhinged ? "bg-rose-950/60" : "bg-white sketch-shadow-sm")
            : (isUnhinged ? "bg-transparent opacity-60 hover:opacity-100" : "bg-transparent opacity-60 hover:opacity-100")
        }`}
      >
        <div className={`flex items-center justify-between gap-2 text-xs font-mono font-bold ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
          <span>{icon} {title}</span>
          {isActiveSource && (
            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full border-2 ${
              id === "google" ? "border-emerald-600 bg-emerald-100 text-emerald-800"
                : id === "custom" ? "border-amber-600 bg-amber-100 text-amber-800"
                  : "border-sky-600 bg-sky-100 text-sky-800"
            }`}>{id === "moderator" ? "OWN BRAIN" : id === "house" ? "ACTIVE · FREE" : "ACTIVE"}</span>
          )}
        </div>
        <div className={`text-[9.5px] font-mono mt-0.5 ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>{subtitle}</div>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#1e1b18]/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto border-[3px] ${ink} sketch-border-2 sketch-shadow-lg ${paper} p-4 sm:p-5`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-dashed border-stone-400/40">
          <div>
            <div className={`font-display text-sm uppercase tracking-wider ${isUnhinged ? "text-rose-100" : "text-[#1e1b18]"}`}>
              ⚙ Transmission Configuration
            </div>
            <div className={`font-mono text-[10px] uppercase tracking-widest mt-0.5 ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
              Power source · keys · models — applies only when you save
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 border-[2.5px] ${ink} rounded-[40%_60%_50%_50%] ${isUnhinged ? "bg-[#181011] hover:bg-rose-950" : "bg-white hover:bg-stone-100"} sketch-btn-press`}
            title="Close without saving"
          >
            <X size={15} strokeWidth={2.5} className={isUnhinged ? "text-rose-300" : ""} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          {/* Left rail: the provider menu */}
          <div className="space-y-2">
            {houseAvailable && menuItem("house", "🏠", houseLabel, "Provided by this site's host — free")}
            {menuItem("google", "🛰", "Google AI Studio", "Direct to Gemini — the official channel")}
            {menuItem("custom", "📡", "Custom relay (proxy)", "OpenRouter or any OpenAI-compatible URL")}
            {menuItem("moderator", "⚖", "Moderator & Judge", "The Roundtable's backstage brain")}
          </div>

          {/* Right pane: the selected section's settings */}
          <div className={`border-[2.5px] ${ink} sketch-border-2 p-3.5 ${isUnhinged ? "bg-[#181011]" : "bg-[#fbf8f0]"}`}>
            {section === "house" ? (
              <div className="space-y-3.5">
                <label className={`flex items-center gap-2 cursor-pointer ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
                  <input
                    type="radio"
                    checked={draft.source === "house"}
                    onChange={() => setDraft({ ...draft, source: "house" })}
                    className="accent-sky-600 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-mono font-bold">Use {houseLabel} as the power source</span>
                </label>
                <p className={`text-[10px] font-sans font-medium leading-relaxed ${isUnhinged ? "text-rose-400" : "text-stone-500"}`}>
                  This site's host pays for the AI — you bring nothing. Transmissions run through the host's own
                  provider; no key, no setup, free.
                </p>

                <div>
                  <label className={label}>Model</label>
                  <input
                    type="text"
                    value={draft.houseModel}
                    onChange={(e) => setDraft({ ...draft, houseModel: e.target.value })}
                    placeholder={serverConfig?.defaultProvider.model || "host's default model"}
                    className={inputCls}
                  />
                  <p className={`mt-1 text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
                    Host's default: <b>{serverConfig?.defaultProvider.model || "unknown"}</b>. Type any model the
                    host's provider supports, or leave empty to stay on the default.
                  </p>
                </div>
              </div>
            ) : section === "google" ? (
              <div className="space-y-3.5">
                <label className={`flex items-center gap-2 cursor-pointer ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
                  <input
                    type="radio"
                    checked={draft.source === "google"}
                    onChange={() => setDraft({ ...draft, source: "google" })}
                    className="accent-emerald-600 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-mono font-bold">Use Google AI Studio as the power source</span>
                </label>

                <div>
                  <label className={label}>API key (optional — falls back to the server's key)</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={draft.googleKey}
                      onChange={(e) => setDraft({ ...draft, googleKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className={`${inputCls} pr-9`}
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 p-0.5 text-stone-500 hover:text-stone-800 border-0 bg-transparent cursor-pointer" title={showKey ? "Hide key" : "Show key"}>
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {serverConfig?.serverGemini.active && !draft.googleKey.trim() && (
                    <p className={`mt-1 text-[10px] font-mono ${isUnhinged ? "text-rose-400" : "text-sky-700"}`}>
                      🎁 No key? This site's host provides a Gemini key — leave empty for free access.
                    </p>
                  )}
                </div>

                <div>
                  <label className={label}>Model</label>
                  {!googleModelIsCustom ? (
                    <>
                      <select
                        value={draft.googleModel}
                        onChange={(e) => setDraft({ ...draft, googleModel: e.target.value })}
                        className={`${inputCls} cursor-pointer`}
                      >
                        {GOOGLE_MODEL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setGoogleModelIsCustom(true)}
                        className={`mt-1 text-[10px] font-mono underline decoration-dashed cursor-pointer border-0 bg-transparent ${isUnhinged ? "text-rose-400" : "text-stone-500 hover:text-stone-800"}`}
                      >
                        …or type any model id
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={draft.googleModel}
                        onChange={(e) => setDraft({ ...draft, googleModel: e.target.value })}
                        placeholder="e.g. gemini-3.1-flash-lite"
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => { setGoogleModelIsCustom(false); setDraft({ ...draft, googleModel: DEFAULT_GOOGLE_MODEL }); }}
                        className={`mt-1 text-[10px] font-mono underline decoration-dashed cursor-pointer border-0 bg-transparent ${isUnhinged ? "text-rose-400" : "text-stone-500 hover:text-stone-800"}`}
                      >
                        ← back to the list
                      </button>
                    </>
                  )}
                  <p className={`mt-1 text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
                    List pulled from the live Gemini API. Note: 3.1 ships as “Lite” and “Pro preview” — a plain 3.1 Flash doesn't exist.
                  </p>
                </div>
              </div>
            ) : section === "custom" ? (
              <div className="space-y-3.5">
                <label className={`flex items-center gap-2 cursor-pointer ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
                  <input
                    type="radio"
                    checked={draft.source === "custom"}
                    onChange={() => setDraft({ ...draft, source: "custom" })}
                    className="accent-amber-600 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-mono font-bold">Use my own relay as the power source</span>
                </label>
                <p className={`text-[10px] font-sans font-medium leading-relaxed ${isUnhinged ? "text-rose-400" : "text-stone-500"}`}>
                  Every transmission reroutes through your OpenAI-compatible endpoint — OpenRouter, a local gateway, anything with a <code>/chat/completions</code> route. Google is bypassed entirely.
                </p>

                <div>
                  <label className={label}>Base URL</label>
                  <input
                    type="text"
                    value={draft.relayUrl}
                    onChange={(e) => setDraft({ ...draft, relayUrl: e.target.value })}
                    placeholder="https://openrouter.ai/api/v1"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={label}>API key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={draft.relayKey}
                      onChange={(e) => setDraft({ ...draft, relayKey: e.target.value })}
                      placeholder="sk-or-v1-..."
                      className={`${inputCls} pr-9`}
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 p-0.5 text-stone-500 hover:text-stone-800 border-0 bg-transparent cursor-pointer" title={showKey ? "Hide key" : "Show key"}>
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={label}>Model name</label>
                  <input
                    type="text"
                    value={draft.relayModel}
                    onChange={(e) => setDraft({ ...draft, relayModel: e.target.value })}
                    placeholder="google/gemini-2.5-flash"
                    className={inputCls}
                  />
                  <p className={`mt-1 text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
                    Sent exactly as typed — use your provider's catalog id.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className={`text-[10px] font-sans font-medium leading-relaxed ${isUnhinged ? "text-rose-400" : "text-stone-500"}`}>
                  The Roundtable's backstage calls — the <b>moderator</b> who picks speakers and the <b>⚖ Adjudicator</b> who
                  grades replies — can run on their own model or provider, separate from the characters.
                </p>

                {([
                  ["same", "Same as the main power source", "Default — one brain runs everything"],
                  ["google", "Google AI Studio", "A fast Gemini referees while characters run elsewhere"],
                  ["custom", "Separate relay (proxy)", "Its own OpenAI-compatible endpoint"],
                ] as const).map(([value, title, hint]) => (
                  <label key={value} className={`flex items-start gap-2 cursor-pointer ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
                    <input
                      type="radio"
                      checked={draft.moderatorSource === value}
                      onChange={() => setDraft({ ...draft, moderatorSource: value })}
                      className="accent-sky-600 w-3.5 h-3.5 mt-0.5"
                    />
                    <span>
                      <span className="block text-xs font-mono font-bold">{title}</span>
                      <span className={`block text-[9.5px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>{hint}</span>
                    </span>
                  </label>
                ))}

                {draft.moderatorSource === "google" && (
                  <>
                    <div>
                      <label className={label}>Google API key (optional — falls back to the main Google key, then the server's)</label>
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          value={draft.moderatorGoogleKey}
                          onChange={(e) => setDraft({ ...draft, moderatorGoogleKey: e.target.value })}
                          placeholder="AIzaSy..."
                          className={`${inputCls} pr-9`}
                        />
                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 p-0.5 text-stone-500 hover:text-stone-800 border-0 bg-transparent cursor-pointer" title={showKey ? "Hide key" : "Show key"}>
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={label}>Moderator model</label>
                      <input
                        type="text"
                        value={draft.moderatorGoogleModel}
                        onChange={(e) => setDraft({ ...draft, moderatorGoogleModel: e.target.value })}
                        placeholder={DEFAULT_MODERATOR_GOOGLE_MODEL}
                        className={inputCls}
                      />
                      <p className={`mt-1 text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
                        Small + fast is ideal — these are short structured calls.
                      </p>
                    </div>
                  </>
                )}

                {draft.moderatorSource === "custom" && (
                  <>
                    <div>
                      <label className={label}>Base URL</label>
                      <input
                        type="text"
                        value={draft.moderatorRelayUrl}
                        onChange={(e) => setDraft({ ...draft, moderatorRelayUrl: e.target.value })}
                        placeholder="https://integrate.api.nvidia.com/v1"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={label}>API key</label>
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          value={draft.moderatorRelayKey}
                          onChange={(e) => setDraft({ ...draft, moderatorRelayKey: e.target.value })}
                          placeholder="nvapi-... / sk-or-v1-..."
                          className={`${inputCls} pr-9`}
                        />
                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 p-0.5 text-stone-500 hover:text-stone-800 border-0 bg-transparent cursor-pointer" title={showKey ? "Hide key" : "Show key"}>
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={label}>Model name</label>
                      <input
                        type="text"
                        value={draft.moderatorRelayModel}
                        onChange={(e) => setDraft({ ...draft, moderatorRelayModel: e.target.value })}
                        placeholder="meta/llama-3.1-8b-instruct"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                <p className={`text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
                  Only affects the Roundtable. If this brain fails mid-round, the main provider takes over automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer: cancel / save */}
        <div className="mt-4 pt-3 border-t-2 border-dashed border-stone-400/40 flex items-center justify-between gap-3">
          <div className={`text-[10px] font-mono ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
            {relayIncomplete
              ? "⚠ The relay needs at least a Base URL and a model name."
              : moderatorIncomplete
                ? "⚠ The moderator's relay needs at least a Base URL and a model name."
                : dirty
                  ? "Unsaved changes — nothing applies until you save."
                  : "No changes."}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-2 border-[2.5px] ${ink} sketch-border-1 sketch-btn-press text-[11px] font-mono font-bold uppercase tracking-wide ${isUnhinged ? "bg-[#181011] text-rose-300" : "bg-white text-stone-600 hover:bg-stone-100"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!dirty || relayIncomplete || moderatorIncomplete || justApplied}
              className={`flex items-center gap-1.5 px-4 py-2 border-[2.5px] ${ink} sketch-border-1 sketch-btn-press text-[11px] font-display uppercase tracking-wide transition-all ${
                justApplied
                  ? "bg-emerald-500 text-white"
                  : dirty && !relayIncomplete && !moderatorIncomplete
                    ? (isUnhinged ? "bg-rose-600 text-white shadow-[3px_3px_0px_0px_#e11d48]" : "bg-[#1e1b18] text-[#f7f4eb] sketch-shadow-sm")
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              {justApplied ? (<><Check size={14} strokeWidth={3} /> Applied</>) : "Save & apply"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
