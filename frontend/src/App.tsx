import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trash2, Heart, RefreshCw, Key, Eye, EyeOff, Bot, Skull, Zap, Flame, Mail, Volume2, VolumeX, AudioLines, LogIn, LogOut, Github, Chrome, Cloud, RefreshCcw } from "lucide-react";
import { ChatMessage, HubMode, ChatSession } from "./types";
import YodaGlobe from "./components/YodaGlobe";
import InputArea from "./components/InputArea";
import ChatHistory from "./components/ChatHistory";
import { SoundFX, CharacterTTS } from "./utils/audio";
import { 
  auth, 
  googleProvider, 
  githubProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  dbSaveSession,
  dbDeleteSession,
  dbLoadSessions
} from "./lib/firebase";

const CONSOLE_LOG_GREETING_ROAST: ChatMessage = {
  id: "welcome-1",
  sender: "yoda",
  character: "yoda",
  isUnhinged: false,
  text: "Underestimate me, you do? Hmmm. Ready to be roasted into hyperdrive, you are! Trash talk, type you must, hmmm.",
  timestamp: new Date().toISOString(),
  mode: "roast",
};

const CONSOLE_LOG_GREETING_TRANSLATE: ChatMessage = {
  id: "welcome-1",
  sender: "yoda",
  character: "yoda",
  isUnhinged: false,
  text: "Translate your English, I shall. Speak differently, we must. Type anything, you can, yes.",
  timestamp: new Date().toISOString(),
  mode: "translate",
};

const CONSOLE_LOG_GREETING_WISDOM: ChatMessage = {
  id: "welcome-1",
  sender: "yoda",
  character: "yoda",
  isUnhinged: false,
  text: "Seek answers, you do? Fear leads to anger, anger leads to hate, hate leads to suffering. Ask your heart's trouble, you should.",
  timestamp: new Date().toISOString(),
  mode: "wisdom",
};

// Dynamic greeting generator
function getDynamicGreeting(char: "yoda" | "ragebaiter", mode: HubMode, unhinged: boolean): ChatMessage {
  if (char === "ragebaiter") {
    if (mode === "roast") {
      return {
        id: `welcome-${Date.now()}`,
        sender: "ragebaiter",
        character: "ragebaiter",
        isUnhinged: unhinged,
        text: unhinged 
          ? "LMAO FIRST! 💀 Absolute L of a workspace layout. Imagine trying to talk to me with a setup that basic. Go touch some grass, you absolute clown. Type your best response so I can clip it, compile it, and ratio you to oblivion! 😂🤡" 
          : "Yo, drop your bad takes here. YouTube comments and Discord are primed. Try roasting me, but remember you're literally an NPC and your opinions are mid. 🤫",
        timestamp: new Date().toISOString(),
        mode: "roast"
      };
    } else if (mode === "translate") {
      return {
        id: `welcome-${Date.now()}`,
        sender: "ragebaiter",
        character: "ragebaiter",
        isUnhinged: unhinged,
        text: unhinged
          ? "INPUT DETECTED. Prepare for me to translate your soft, vanilla opinions into absolute, clickbaited nuclear headlines! 🚨 Prepare to get cancelled, ratio'd, and banned from the server! Give me anything!"
          : "Translation engine ready. I will turn your boring English sentences into braindead YouTube titles or passive-aggressive Discord drama posts. Fire away!",
        timestamp: new Date().toISOString(),
        mode: "translate"
      };
    } else {
      return {
        id: `welcome-${Date.now()}`,
        sender: "ragebaiter",
        character: "ragebaiter",
        isUnhinged: unhinged,
        text: unhinged
          ? "UNHINGED WISDOM: Why write automated unit tests when you can just test in production and blame the cloud provider? Delete the database, delete your node_modules, and live in chaos! YOLO!"
          : "Need hacks? I will teach you how to win pointless internet arguments, copy-paste stack overflow code without understanding it, and claim light mode is superior just to start a flame war.",
        timestamp: new Date().toISOString(),
        mode: "wisdom"
      };
    }
  }

  // Yoda Character Greetings
  if (unhinged) {
    if (mode === "roast") {
      return {
        id: `welcome-${Date.now()}`,
        sender: "yoda",
        character: "yoda",
        isUnhinged: true,
        text: "FEEL THE POWER OF THE DARK SIDE, YOU SHALL! No Jedi mercy here. Challenge me, you dare, weak worm? Burn, you will! Hahaha!",
        timestamp: new Date().toISOString(),
        mode: "roast"
      };
    } else if (mode === "translate") {
      return {
        id: `welcome-${Date.now()}`,
        sender: "yoda",
        character: "yoda",
        isUnhinged: true,
        text: "Invert your pathetic words, I must, then curse them with Sith lightning, I will! Type your sentences now, yes!",
        timestamp: new Date().toISOString(),
        mode: "translate"
      };
    } else {
      return {
        id: `welcome-${Date.now()}`,
        sender: "yoda",
        character: "yoda",
        isUnhinged: true,
        text: "EMBRACE THE WRATH! Fear is your ultimate ally! Do not 'try', strike down your lazy coding blocks with absolute red force! Hmmm!",
        timestamp: new Date().toISOString(),
        mode: "wisdom"
      };
    }
  }

  // Default clean Yoda greetings
  if (mode === "roast") return CONSOLE_LOG_GREETING_ROAST;
  if (mode === "translate") return CONSOLE_LOG_GREETING_TRANSLATE;
  return CONSOLE_LOG_GREETING_WISDOM;
}

export default function App() {
  // Auth states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Session States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // Sub-states linked to Active Session
  const [activeMode, setActiveMode] = useState<HubMode>("roast");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [character, setCharacter] = useState<"yoda" | "ragebaiter">("yoda");
  const [isUnhinged, setIsUnhinged] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [ragebaitLevel, setRagebaitLevel] = useState<number>(0.5);
  const [responseLength, setResponseLength] = useState<"short" | "medium" | "long">("medium");

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("jedi_custom_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [gateApiKeyInput, setGateApiKeyInput] = useState<string>("");
  const [showGateApiKey, setShowGateApiKey] = useState<boolean>(false);

  const handleSignInWithGoogle = async () => {
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Auth] Signed in with Google:", result.user.displayName);
    } catch (error: any) {
      console.error("[Auth] Google Sign-In failed:", error);
      setErrorStatus(`Google Sign-In failed: ${error.message || error}`);
    }
  };

  const handleSignInWithGithub = async () => {
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    try {
      const result = await signInWithPopup(auth, githubProvider);
      console.log("[Auth] Signed in with GitHub:", result.user.displayName);
    } catch (error: any) {
      console.error("[Auth] GitHub Sign-In failed:", error);
      setErrorStatus(`GitHub Sign-In failed: ${error.message || error}`);
    }
  };

  const handleSignOut = async () => {
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    try {
      await signOut(auth);
      setUser(null);
      // Let onAuthStateChanged reload local storage sessions
    } catch (error: any) {
      console.error("[Auth] Sign Out failed:", error);
    }
  };

  const [soundModeEnabled, setSoundModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("yoda_hub_sound_mode");
    return saved !== null ? saved === "true" : true;
  });
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("yoda_hub_tts_mode");
    return saved !== null ? saved === "true" : false;
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredVoiceName, setPreferredVoiceName] = useState<string>(() => {
    return localStorage.getItem("yoda_hub_preferred_voice") || "";
  });

  useEffect(() => {
    const loadVoices = () => {
      const voices = CharacterTTS.getHighQualityVoices();
      setSystemVoices(voices);
      
      const saved = localStorage.getItem("yoda_hub_preferred_voice");
      if (!saved && voices.length > 0) {
        const bestDefault = voices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes("natural") || name.includes("neural") || name.includes("premium") || name.includes("google") || name.includes("siri");
        }) || voices[0];
        if (bestDefault) {
          setPreferredVoiceName(bestDefault.name);
          localStorage.setItem("yoda_hub_preferred_voice", bestDefault.name);
        }
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleVoiceSelect = (voiceName: string) => {
    setPreferredVoiceName(voiceName);
    localStorage.setItem("yoda_hub_preferred_voice", voiceName);
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    
    const previewText = character === "yoda"
      ? "Strong in the Force, this voice is. Real human speech, you hear!"
      : "Oh look at me, I am using a super realistic human voice now, stay mad!";
    
    CharacterTTS.speak(
      previewText,
      character,
      isUnhinged,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      voiceName
    );
  };

  const handleSoundToggle = () => {
    const nextVal = !soundModeEnabled;
    setSoundModeEnabled(nextVal);
    localStorage.setItem("yoda_hub_sound_mode", String(nextVal));
    if (nextVal) {
      SoundFX.playRetroBlip(0.35);
    } else {
      // Still play a gentle physical click on disabling sounds if the user wants feedback
      SoundFX.playMinecraftClick(0.3);
    }
  };

  const handleTtsToggle = () => {
    const nextVal = !ttsEnabled;
    setTtsEnabled(nextVal);
    localStorage.setItem("yoda_hub_tts_mode", String(nextVal));
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    if (nextVal) {
      SoundFX.playR2D2Beeps(0.25);
    } else {
      CharacterTTS.stop();
      setIsSpeaking(false);
    }
  };

  // Initialize and Migrate Session state on startup + Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        console.log("[Auth] Active Session authenticated:", currentUser.email);
        try {
          const dbSessions = await dbLoadSessions(currentUser.uid);
          if (dbSessions.length > 0) {
            setSessions(dbSessions);
            const first = dbSessions[0];
            setActiveSessionId(first.id);
            setActiveMode(first.mode || "roast");
            setMessages(first.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
            setCharacter(first.character || "yoda");
            setIsUnhinged(!!first.isUnhinged);
            setSelectedModel(first.selectedModel || "gemini-2.5-flash");
            setRagebaitLevel(first.ragebaitLevel ?? 0.5);
            setResponseLength(first.responseLength ?? "medium");
          } else {
            // Migrating local guest sessions to cloud
            const savedSessions = localStorage.getItem("yoda_hub_sessions_v1");
            if (savedSessions) {
              const parsed = JSON.parse(savedSessions) as ChatSession[];
              if (parsed.length > 0) {
                setSessions(parsed);
                const first = parsed[0];
                setActiveSessionId(first.id);
                setActiveMode(first.mode || "roast");
                setMessages(first.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
                setCharacter(first.character || "yoda");
                setIsUnhinged(!!first.isUnhinged);
                setSelectedModel(first.selectedModel || "gemini-2.5-flash");
                setRagebaitLevel(first.ragebaitLevel ?? 0.5);
                setResponseLength(first.responseLength ?? "medium");
                
                // Save them to Firestore
                for (const session of parsed) {
                  await dbSaveSession(currentUser.uid, session);
                }
              }
            } else {
              // No DB sessions, no local sessions -> create default
              createDefaultInitialSession(currentUser.uid);
            }
          }
        } catch (e) {
          console.error("[Auth] Error fetching cloud sessions:", e);
        }
      } else {
        console.log("[Auth] Guest mode active.");
        try {
          const savedSessions = localStorage.getItem("yoda_hub_sessions_v1");
          if (savedSessions) {
            const parsed = JSON.parse(savedSessions) as ChatSession[];
            setSessions(parsed);
            if (parsed.length > 0) {
              const first = parsed[0];
              setActiveSessionId(first.id);
              setActiveMode(first.mode || "roast");
              setMessages(first.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
              setCharacter(first.character || "yoda");
              setIsUnhinged(!!first.isUnhinged);
              setSelectedModel(first.selectedModel || "gemini-2.5-flash");
              setRagebaitLevel(first.ragebaitLevel ?? 0.5);
              setResponseLength(first.responseLength ?? "medium");
            }
          } else {
            createDefaultInitialSession();
          }
        } catch (err) {
          console.error("Hyperspace sessions initialization interrupted:", err);
        }
      }
    });

    const createDefaultInitialSession = (uid?: string) => {
      const defaultSession: ChatSession = {
        id: "session-default",
        title: "Veer's chat saga 1",
        messages: [getDynamicGreeting("yoda", "roast", false)],
        createdAt: new Date().toISOString(),
        ragebaitLevel: 0.5,
        responseLength: "medium",
        selectedModel: "gemini-2.5-flash",
        character: "yoda",
        mode: "roast",
        isUnhinged: false
      };

      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      setActiveMode("roast");
      setMessages(defaultSession.messages);
      setCharacter("yoda");
      setIsUnhinged(false);
      setSelectedModel("gemini-2.5-flash");
      setRagebaitLevel(0.5);
      setResponseLength("medium");

      localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify([defaultSession]));
      if (uid) {
        dbSaveSession(uid, defaultSession);
      }
    };

    return () => unsubscribe();
  }, []);

  // Sync state modifications to current active session
  const syncActiveStateToSessionsList = (updatedFields: Partial<ChatSession>) => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, ...updatedFields };
        }
        return s;
      });
      localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify(next));
      return next;
    });
  };

  // Autosave current active session to Firestore / local storage on any state changes
  useEffect(() => {
    if (isAuthLoading) return;
    if (sessions.length === 0) return;

    // Save locally
    localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify(sessions));

    // Save active session to Firestore if user logged in
    if (user && activeSessionId) {
      const active = sessions.find(s => s.id === activeSessionId);
      if (active) {
        dbSaveSession(user.uid, active);
      }
    }
  }, [sessions, user, activeSessionId, isAuthLoading]);

  // Sync session selections
  useEffect(() => {
    if (!activeSessionId || sessions.length === 0) return;
    const active = sessions.find(s => s.id === activeSessionId);
    if (active) {
      CharacterTTS.stop();
      setIsSpeaking(false);
      setActiveMode(active.mode || "roast");
      setMessages(active.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
      setCharacter(active.character || "yoda");
      setIsUnhinged(!!active.isUnhinged);
      setSelectedModel(active.selectedModel || "gemini-2.5-flash");
      setRagebaitLevel(active.ragebaitLevel ?? 0.5);
      setResponseLength(active.responseLength ?? "medium");
    }
  }, [activeSessionId]);

  // Create new session
  const handleCreateSession = () => {
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `Veer's chat saga ${sessions.length + 1}`,
      messages: [getDynamicGreeting("yoda", "roast", false)],
      createdAt: new Date().toISOString(),
      ragebaitLevel: 0.5,
      responseLength: "medium",
      selectedModel: "gemini-2.5-flash",
      character: "yoda",
      mode: "roast",
      isUnhinged: false
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify(updated));
    setActiveSessionId(newId);
    setErrorStatus(null);
  };

  // Delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
    }
    
    // Delete from Firestore
    if (user) {
      dbDeleteSession(user.uid, id);
    }

    if (sessions.length <= 1) {
      // Re-initialize fresh session if deleting last one
      const newId = `session-${Date.now()}`;
      const fresh: ChatSession = {
        id: newId,
        title: "Veer's chat saga 1",
        messages: [getDynamicGreeting("yoda", "roast", false)],
        createdAt: new Date().toISOString(),
        ragebaitLevel: 0.5,
        responseLength: "medium",
        selectedModel: "gemini-2.5-flash",
        character: "yoda",
        mode: "roast",
        isUnhinged: false
      };
      setSessions([fresh]);
      localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify([fresh]));
      setActiveSessionId(newId);
      
      if (user) {
        dbSaveSession(user.uid, fresh);
      }
      return;
    }

    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify(filtered));
    
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const syncToHyperspace = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    syncActiveStateToSessionsList({ messages: newMsgs });
  };

  const handleApiKeyChange = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("jedi_custom_api_key", key);
  };

  // Change character selection
  const handleCharacterChange = (char: "yoda" | "ragebaiter") => {
    setCharacter(char);
    CharacterTTS.stop();
    setIsSpeaking(false);
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
      if (char === "ragebaiter") {
        setTimeout(() => SoundFX.playLaserBlaster(0.25), 50);
      } else {
        setTimeout(() => SoundFX.playLightsaberIgnite(isUnhinged, 0.25), 50);
      }
    }
    const updatedMessages = messages.length <= 1 
      ? [getDynamicGreeting(char, activeMode, isUnhinged)]
      : messages;
    setMessages(updatedMessages);
    syncActiveStateToSessionsList({ character: char, messages: updatedMessages });
  };

  // Toggle Unhinged Mode
  const handleUnhingedToggle = () => {
    const nextUnhinged = !isUnhinged;
    setIsUnhinged(nextUnhinged);
    CharacterTTS.stop();
    setIsSpeaking(false);
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.4);
      setTimeout(() => SoundFX.playLightsaberIgnite(nextUnhinged, 0.3), 50);
    }
    const updatedMessages = messages.length <= 1 
      ? [getDynamicGreeting(character, activeMode, nextUnhinged)]
      : messages;
    setMessages(updatedMessages);
    syncActiveStateToSessionsList({ isUnhinged: nextUnhinged, messages: updatedMessages });
  };

  // Handle Mode Tab Changes
  const handleModeChange = (mode: HubMode) => {
    setActiveMode(mode);
    setErrorStatus(null);
    CharacterTTS.stop();
    setIsSpeaking(false);
    if (soundModeEnabled) {
      SoundFX.playMinecraftClick(0.35);
      setTimeout(() => SoundFX.playRetroBlip(0.22), 50);
    }
    
    const updatedMessages = messages.length <= 1 
      ? [getDynamicGreeting(character, mode, isUnhinged)]
      : messages;
    
    setMessages(updatedMessages);
    syncActiveStateToSessionsList({ mode, messages: updatedMessages });
  };

  // Submit conversation/retort requests
  const handleSendThought = async (inputText: string) => {
    if (!inputText.trim() || isGenerating || !activeSessionId) return;

    setErrorStatus(null);
    setIsGenerating(true);
    CharacterTTS.stop();
    setIsSpeaking(false);

    if (soundModeEnabled) {
      if (character === "ragebaiter") {
        SoundFX.playLaserBlaster(0.2);
      } else {
        SoundFX.playLightsaberIgnite(isUnhinged, 0.22);
      }
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: inputText,
      timestamp: new Date().toISOString(),
      mode: activeMode,
    };

    const updatedMessages = [...messages, userMsg];

    // Auto rename session based on first user question
    let updatedTitle = undefined;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && (currentSession.title.startsWith("Holocron Dialogue") || currentSession.title.startsWith("Transmission Alpha"))) {
      updatedTitle = inputText.trim().length > 30 
        ? inputText.trim().slice(0, 30) + "..." 
        : inputText.trim();
    }

    setMessages(updatedMessages);
    const fieldsOptimistic: Partial<ChatSession> = {
      messages: updatedMessages
    };
    if (updatedTitle) {
      fieldsOptimistic.title = updatedTitle;
    }
    syncActiveStateToSessionsList(fieldsOptimistic);

    try {
      const response = await fetch("/api/yoda/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          mode: activeMode,
          character: character,
          isUnhinged: isUnhinged,
          customApiKey: customApiKey,
          selectedModel: selectedModel,
          history: updatedMessages.slice(0, -1), // Send full conversation memory history!
          ragebaitLevel: ragebaitLevel,
          responseLength: responseLength
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error === "INVALID_API_KEY") {
          throw new Error("INVALID_API_KEY");
        }
        throw new Error(errJson.error === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : (errJson.message || errJson.error || "The Force is unbalanced or server returned " + response.status));
      }

      const data = await response.json();
      
      if (data.isFallback) {
        setErrorStatus(data.fallbackReason || "QUOTA_EXCEEDED");
      }
      
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: character,
        character: character,
        isUnhinged: isUnhinged,
        text: data.reply,
        timestamp: new Date().toISOString(),
        mode: activeMode,
        isFallback: data.isFallback,
        isModelFallback: data.modelFallbackOccurred,
        actualModelUsed: data.actualModelUsed,
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      
      const fieldsFinal: Partial<ChatSession> = {
        messages: finalMessages
      };
      if (updatedTitle) {
        fieldsFinal.title = updatedTitle;
      }
      syncActiveStateToSessionsList(fieldsFinal);

      // Play success audio
      if (soundModeEnabled) {
        if (character === "ragebaiter") {
          SoundFX.playLaserBlaster(0.18);
        } else {
          SoundFX.playR2D2Beeps(0.24);
        }
      }

      // Trigger TTS voice
      if (ttsEnabled) {
        CharacterTTS.speak(
          data.reply,
          character,
          isUnhinged,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          preferredVoiceName
        );
      }
    } catch (err: any) {
      console.error("Transmission failure:", err);
      setErrorStatus(err.message || "Dark side interference occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Retry/regenerate the last turn response
  const handleRetry = async () => {
    if (isGenerating || !activeSessionId) return;

    const userMessages = messages.filter(m => m.sender === "user");
    if (userMessages.length === 0) return;
    const lastUserMsg = userMessages[userMessages.length - 1];

    const lastUserIndex = messages.lastIndexOf(lastUserMsg);
    if (lastUserIndex === -1) return;
    const truncatedMessages = messages.slice(0, lastUserIndex + 1);

    setErrorStatus(null);
    setIsGenerating(true);
    CharacterTTS.stop();
    setIsSpeaking(false);

    if (soundModeEnabled) {
      if (character === "ragebaiter") {
        SoundFX.playLaserBlaster(0.2);
      } else {
        SoundFX.playLightsaberIgnite(isUnhinged, 0.22);
      }
    }

    setMessages(truncatedMessages);
    syncActiveStateToSessionsList({ messages: truncatedMessages });

    try {
      const response = await fetch("/api/yoda/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: lastUserMsg.text,
          mode: lastUserMsg.mode || activeMode,
          character: character,
          isUnhinged: isUnhinged,
          customApiKey: customApiKey,
          selectedModel: selectedModel,
          history: truncatedMessages.slice(0, -1),
          ragebaitLevel: ragebaitLevel,
          responseLength: responseLength
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error === "INVALID_API_KEY") {
          throw new Error("INVALID_API_KEY");
        }
        throw new Error(errJson.error === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : (errJson.message || errJson.error || "Server returned " + response.status));
      }

      const data = await response.json();
      
      if (data.isFallback) {
        setErrorStatus(data.fallbackReason || "QUOTA_EXCEEDED");
      }
      
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: character,
        character: character,
        isUnhinged: isUnhinged,
        text: data.reply,
        timestamp: new Date().toISOString(),
        mode: lastUserMsg.mode || activeMode,
        isFallback: data.isFallback,
        isModelFallback: data.modelFallbackOccurred,
        actualModelUsed: data.actualModelUsed,
      };

      const finalMessages = [...truncatedMessages, botMsg];
      setMessages(finalMessages);
      syncActiveStateToSessionsList({ messages: finalMessages });

      // Play success audio
      if (soundModeEnabled) {
        if (character === "ragebaiter") {
          SoundFX.playLaserBlaster(0.18);
        } else {
          SoundFX.playR2D2Beeps(0.24);
        }
      }

      // Trigger TTS voice
      if (ttsEnabled) {
        CharacterTTS.speak(
          data.reply,
          character,
          isUnhinged,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          preferredVoiceName
        );
      }
    } catch (err: any) {
      console.error("Transmission failure on retry:", err);
      setErrorStatus(err.message || "Interference occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Purge/reset history
  const handlePurgeHistory = () => {
    CharacterTTS.stop();
    setIsSpeaking(false);
    if (soundModeEnabled) {
      SoundFX.playRetroBlip(0.18);
    }
    const freshGreeting = getDynamicGreeting(character, activeMode, isUnhinged);
    setMessages([freshGreeting]);
    syncActiveStateToSessionsList({ messages: [freshGreeting] });
    setErrorStatus(null);
  };

  // Ambient backdrop color switcher
  const getAmbientBackdropColors = () => {
    if (isUnhinged) {
      return "from-red-950/20 via-neutral-950 to-black";
    }
    if (character === "ragebaiter") {
      switch (activeMode) {
        case "roast":
          return "from-amber-950/25 via-black to-zinc-950";
        case "translate":
          return "from-orange-950/25 via-black to-zinc-950";
        case "wisdom":
        default:
          return "from-red-950/15 via-black to-zinc-950";
      }
    }
    switch (activeMode) {
      case "roast":
        return "from-red-950/15 via-black to-neutral-950";
      case "translate":
        return "from-sky-950/15 via-black to-neutral-950";
      case "wisdom":
      default:
        return "from-emerald-950/15 via-black to-neutral-950";
    }
  };

  const getActiveTabBorderColor = () => {
    if (isUnhinged) {
      return "border-red-500/55 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
    }
    switch (activeMode) {
      case "roast":
        return "border-red-500/40 text-red-400";
      case "translate":
        return "border-sky-500/40 text-sky-400";
      case "wisdom":
      default:
        return "border-emerald-500/40 text-emerald-400";
    }
  };

  return (

    <div
      id="yoda-holy-hub-app"
      className={`min-h-screen ${isUnhinged ? "bg-[#0a0405] text-rose-100 dark-halftone-dots" : "bg-[#f7f4eb] text-[#1e1b18] halftone-dots"} flex flex-col font-sans relative overflow-hidden pb-12 transition-all duration-500`}
    >
      {/* Absolute top wavy torn-paper decorative border */}
      <div className={`h-[4px] w-full ${isUnhinged ? "bg-[#e11d48]" : "bg-[#1e1b18]"} border-b-2 border-dashed ${isUnhinged ? "border-[#e11d48]" : "border-[#1e1b18]"}`} />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col z-10 relative">
        {/* Header Branding Panel styled as a wide hand-drawn sketchbook cover */}
        <header 
          id="yoda-hub-header" 
          className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isUnhinged ? "bg-[#180f11] border-rose-600 text-rose-100 shadow-[5px_5px_0px_0px_#e11d48]" : "bg-[#faf8f2] border-[#1e1b18] text-[#1e1b18] shadow-[5px_5px_0px_0px_#1e1b18]"} border-[3px] p-5 rounded-[12px_12px_28px_16px/14px_28px_16px_24px] mb-8 gap-4 transition-all duration-500`}
        >
          <div className="space-y-1.5 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono tracking-widest uppercase border-2 font-bold transition-all ${
                isUnhinged
                  ? "bg-rose-950 border-rose-600 text-rose-400"
                  : character === "ragebaiter"
                    ? "bg-amber-100 border-stone-900 text-amber-700"
                    : "bg-emerald-100 border-stone-900 text-emerald-700"
              }`}>
                {isUnhinged 
                  ? "⚠️ DARK SIDE" 
                  : "✨ LIGHT SIDE"}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full border ${isUnhinged ? "border-rose-600" : "border-stone-900"} ${
                isUnhinged 
                  ? "bg-red-500 animate-ping" 
                  : character === "ragebaiter"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400 animate-pulse"
              }`} />
              <span className={`text-[10px] font-mono font-bold ${isUnhinged ? "text-rose-400" : "text-stone-500"} uppercase tracking-wider`}>
                {isUnhinged 
                  ? "Dark Side Unleashed" 
                  : "Light Side Engaged"}
              </span>
            </div>
            
            {character === "ragebaiter" ? (
              <div>
                <h1 className={`text-2xl sm:text-3xl font-display font-black tracking-tight ${isUnhinged ? "text-rose-100" : "text-[#1e1b18]"} select-none flex items-center gap-2`}>
                  <span>{isUnhinged ? "Unhinged Troll's Dark Side Arena" : "Keyboard Warrior's Light Side Arena"}</span>
                  <span className={`text-xs ${isUnhinged ? "bg-rose-950 border-rose-600 text-rose-400" : "bg-red-100 border-[#1e1b18] text-red-600"} border-2 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest animate-pulse`}>Max Outrage</span>
                </h1>
                <p className={`text-xs ${isUnhinged ? "text-rose-300" : "text-stone-600"} font-sans max-w-xl`}>
                  Enter the cybernetic comic panel. Witness a professional internet troll translate peaceful thoughts into absolute clickbait allegations or deliver massive ratios!
                </p>
              </div>
            ) : (
              <div>
                <h1 className={`text-2xl sm:text-3xl font-display font-black tracking-tight ${isUnhinged ? "text-rose-100" : "text-[#1e1b18]"} select-none flex items-center gap-2`}>
                  <span>{isUnhinged ? "Darth Yoda's Dark Side Holocron" : "Master Yoda's Light Side Holocron"}</span>
                  <span className={`text-xs ${isUnhinged ? "bg-rose-950 border-rose-600 text-rose-400" : "bg-emerald-100 border-[#1e1b18] text-emerald-700"} border-2 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest`}>Swamp Scroll</span>
                </h1>
                <p className={`text-xs ${isUnhinged ? "text-rose-300" : "text-stone-600"} font-sans max-w-xl`}>
                  Harness the ancient wisdom of the Jedi Grand Master. Seek profound guidance, request respectful training-ground roasts, or translate your dialect in a hand-drawn sketchbook!
                </p>
              </div>
            )}
          </div>

          {/* Cloud Auth / Sync Control Panel */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Quick reset status (looks like an adhesive postage stamp) */}
            <button
              id="power-cycle-btn"
              type="button"
              onClick={handlePurgeHistory}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold border-2 ${isUnhinged ? "border-rose-600 bg-[#2d1115] text-rose-100 hover:bg-rose-900 shadow-[3px_3px_0px_0px_#e11d48]" : "border-[#1e1b18] bg-white text-[#1e1b18] hover:bg-stone-50 shadow-[3px_3px_0px_0px_#1e1b18]"} sketch-btn-press transition-all pointer-events-auto cursor-pointer active:translate-y-0.5`}
              title={character === "ragebaiter" ? "Wipe Controversy Logs" : "Reset Station Data"}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {character === "ragebaiter" ? "Wipe Controversy Logs" : "Reset Station"}
            </button>

            {/* Firebase Auth Interface Card */}
            <div className={`p-2 rounded-xl border-2 flex items-center gap-3.5 transition-all ${
              isUnhinged 
                ? "bg-[#180a0c] border-rose-950 text-rose-200" 
                : "bg-[#f5f1e5] border-[#1e1b18] text-[#1e1b18]"
            }`}>
              {isAuthLoading ? (
                <div className="flex items-center gap-2 px-3 py-1">
                  <RefreshCcw className="w-3 h-3 animate-spin text-stone-500" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wide">Connecting...</span>
                </div>
              ) : user ? (
                // LOGGED IN
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "User"} 
                      referrerPolicy="no-referrer"
                      className={`w-7 h-7 rounded-full border-2 ${isUnhinged ? "border-rose-500" : "border-[#1e1b18]"} object-cover`}
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono font-bold text-xs uppercase ${
                      isUnhinged ? "border-rose-500 bg-rose-950 text-rose-300" : "border-[#1e1b18] bg-white text-stone-800"
                    }`}>
                      {(user.displayName || user.email || "U").substring(0, 1)}
                    </div>
                  )}
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono font-black truncate max-w-[120px]" title={user.displayName || ""}>
                        {user.displayName || "Force Ally"}
                      </span>
                      <Cloud className={`w-3 h-3 ${isUnhinged ? "text-rose-500" : "text-emerald-600"} fill-current`} />
                    </div>
                    <p className={`text-[8px] font-mono font-bold uppercase tracking-wider ${isUnhinged ? "text-rose-400/80" : "text-emerald-700/80"}`}>
                      Saga Saved to Cloud
                    </p>
                  </div>

                  <button
                    onClick={handleSignOut}
                    type="button"
                    title="Sign Out of Cloud Session"
                    className={`p-1.5 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                      isUnhinged 
                        ? "border-rose-900 bg-stone-950 text-rose-400 hover:bg-rose-950" 
                        : "border-[#1e1b18] bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                // LOGGED OUT / GUEST
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wide block">
                      Secure your Saga:
                    </span>
                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider block ${isUnhinged ? "text-rose-400/85" : "text-stone-500"}`}>
                      Guest mode (Local browser storage)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Google Login */}
                    <button
                      onClick={handleSignInWithGoogle}
                      type="button"
                      className={`flex items-center gap-1 px-2.5 py-1 border-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer ${
                        isUnhinged
                          ? "bg-[#250d10] border-rose-800 text-rose-200 hover:bg-[#3d1318]"
                          : "bg-white border-[#1e1b18] text-[#1e1b18] hover:bg-[#faf6ea] shadow-[2px_2px_0px_0px_#1e1b18]"
                      }`}
                    >
                      <Chrome className="w-3 h-3 text-red-500" />
                      Google
                    </button>

                    {/* GitHub Login */}
                    <button
                      onClick={handleSignInWithGithub}
                      type="button"
                      className={`flex items-center gap-1 px-2.5 py-1 border-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer ${
                        isUnhinged
                          ? "bg-[#250d10] border-rose-800 text-rose-200 hover:bg-[#3d1318]"
                          : "bg-white border-[#1e1b18] text-[#1e1b18] hover:bg-[#faf6ea] shadow-[2px_2px_0px_0px_#1e1b18]"
                      }`}
                    >
                      <Github className={`w-3 h-3 ${isUnhinged ? "text-rose-200" : "text-[#1e1b18]"}`} />
                      GitHub
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </header>

        {/* Interactive Hand-drawn Sketch Cabinet (Controls) */}
        <section 
          id="galactic-controls-cabinet" 
          className={`mb-8 p-6 rounded-[20px_20px_28px_16px/12px_28px_12px_24px] border-[3px] ${isUnhinged ? "border-rose-600 bg-[#1a0f10] shadow-[5px_5px_0px_0px_#e11d48] text-rose-100" : "border-[#1e1b18] bg-[#faf8f2] text-[#1e1b18] shadow-[5px_5px_0px_0px_#1e1b18]"} transition-all duration-300`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Choose Character (Stamps) */}
            <div className="md:col-span-5 space-y-2">
              <label className={`text-xs font-mono font-bold uppercase tracking-wide block ${isUnhinged ? "text-rose-400" : "text-stone-600"}`}>
                1. Select Character Avatar
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCharacterChange("yoda")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-mono font-bold border-2 transition-all cursor-pointer ${isUnhinged ? "border-rose-600" : "border-[#1e1b18]"} ${
                    character === "yoda"
                      ? isUnhinged
                        ? "bg-rose-600 text-white shadow-[3px_3px_0px_0px_#ef4444]"
                        : "bg-[#10b981] text-white shadow-[3px_3px_0px_0px_#1e1b18]"
                      : isUnhinged
                        ? "bg-[#181011] text-rose-500 hover:text-rose-300 shadow-[1px_1px_0px_0px_#881337]"
                        : "bg-white text-stone-500 hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Master Yoda
                </button>
                <button
                  type="button"
                  onClick={() => handleCharacterChange("ragebaiter")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-mono font-bold border-2 transition-all cursor-pointer ${isUnhinged ? "border-rose-600" : "border-[#1e1b18]"} ${
                    character === "ragebaiter"
                      ? isUnhinged
                        ? "bg-rose-600 text-white shadow-[3px_3px_0px_0px_#ef4444]"
                        : "bg-[#f59e0b] text-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
                      : isUnhinged
                        ? "bg-[#181011] text-rose-500 hover:text-rose-300 shadow-[1px_1px_0px_0px_#881337]"
                        : "bg-white text-stone-500 hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                  }`}
                >
                  <Zap className="w-4 h-4 animate-pulse" />
                  Ragebaiter Jar Jar
                </button>
              </div>
            </div>

            {/* Model Selection (Sketch Dropdown) */}
            <div className="md:col-span-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-mono font-bold uppercase tracking-wide ${isUnhinged ? "text-rose-400" : "text-stone-600"}`}>
                  2. Select Sketch Model
                </label>
                <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">Google Models</span>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  syncActiveStateToSessionsList({ selectedModel: e.target.value });
                  if (soundModeEnabled) {
                    SoundFX.playMinecraftClick(0.35);
                  }
                }}
                className={`w-full ${isUnhinged ? "bg-[#181011] text-rose-100 border-rose-600 focus:ring-[#f43f5e] shadow-[2px_2px_0px_0px_#ef4444]" : "bg-white border-[#1e1b18] text-[#1e1b18] focus:ring-[#10b981] shadow-[2px_2px_0px_0px_#1e1b18]"} border-2 rounded-lg py-2.5 px-3 text-xs font-mono outline-none transition-all cursor-pointer font-bold`}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Brain)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fastest)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Classic)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Classic Pro)</option>
                <option value="gemma-4-26b-a4b-it">Gemma 4 26B (gemma-4-26b-a4b-it)</option>
                <option value="gemma-4-26b">Gemma 4 26B (Gemma 2 27B)</option>
                <option value="gemma-4-31b">Gemma 4 31B (Gemma 2 9B)</option>
                <option value="gemma-2-2b-it">Gemma 2 2B Instruct</option>
              </select>
            </div>

            {/* Unhinged (Scribble Mode) */}
            <div className="md:col-span-3 flex flex-col justify-center items-center md:items-end space-y-2">
              <label className={`text-xs font-mono font-bold uppercase tracking-wide ${isUnhinged ? "text-rose-400" : "text-stone-600"}`}>
                3. Force Side Alignment
              </label>
              <button
                type="button"
                onClick={handleUnhingedToggle}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono font-bold tracking-widest uppercase border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isUnhinged
                    ? "bg-[#f43f5e] text-white border-rose-500 shadow-[3px_3px_0px_0px_#f43f5e] animate-pulse"
                    : "bg-white text-stone-500 border-[#1e1b18] hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                }`}
              >
                <Skull className={`w-4 h-4 ${isUnhinged ? "animate-pulse" : ""}`} />
                {isUnhinged ? "DARK SIDE 👹" : "LIGHT SIDE 🍵"}
              </button>
            </div>

          </div>

          {/* Row 1.5: Dynamic Session Tuning & Customizations */}
          <div className={`mt-4 pt-4 border-t-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} grid grid-cols-1 md:grid-cols-12 gap-6 items-center`}>
            {/* Ragebait Slider (only active for ragebaiter character) */}
            <div className={`md:col-span-6 space-y-2 transition-all duration-300 ${character === "ragebaiter" ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <div className="flex justify-between items-center">
                <label className={`text-xs font-mono font-bold uppercase tracking-wide flex items-center gap-1 ${isUnhinged ? "text-rose-400" : "text-stone-600"}`}>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Ragebait Spark Tuning (Per Session)
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 border-2 rounded shadow-sm ${isUnhinged ? "text-rose-400 bg-rose-950 border-rose-600" : "text-amber-600 bg-amber-50 border-[#1e1b18]"}`}>
                  {ragebaitLevel.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={ragebaitLevel}
                  disabled={character !== "ragebaiter"}
                  onChange={(e) => {
                    const level = parseFloat(e.target.value);
                    setRagebaitLevel(level);
                    syncActiveStateToSessionsList({ ragebaitLevel: level });
                    if (soundModeEnabled) {
                      SoundFX.playMinecraftClick(0.28);
                    }
                  }}
                  className={`flex-1 cursor-pointer h-2 rounded-lg appearance-none border-2 ${isUnhinged ? "accent-rose-500 bg-rose-950 border-rose-600" : "accent-[#f59e0b] bg-[#f1ebd9] border-[#1e1b18]"}`}
                />
                <span className={`text-xs font-mono font-bold min-w-[125px] text-right px-2.5 py-1 rounded border-2 ${isUnhinged ? "text-rose-300 bg-[#181011] border-rose-600 shadow-[1px_1px_0px_0px_#ef4444]" : "text-stone-700 bg-white border-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"}`}>
                  {ragebaitLevel < 0.2 ? "Hesitant Poster 🥺" :
                   ragebaitLevel < 0.5 ? "Mild Sarcasm 😏" :
                   ragebaitLevel < 0.8 ? "Smug Debater 🤡" : "MAX BRAINDEAD 💀"}
                </span>
              </div>
            </div>

            {/* Response Length Preferences */}
            <div className="md:col-span-6 space-y-2">
              <label className={`text-xs font-mono font-bold uppercase tracking-wide block ${isUnhinged ? "text-rose-400" : "text-stone-600"}`}>
                Cartoon Speech Balloon Size Preference (Per Session)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => {
                      setResponseLength(len);
                      syncActiveStateToSessionsList({ responseLength: len });
                      if (soundModeEnabled) {
                        SoundFX.playMinecraftClick(0.35);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono border-2 font-bold transition-all uppercase cursor-pointer ${isUnhinged ? "border-rose-600" : "border-[#1e1b18]"} ${
                      responseLength === len
                        ? isUnhinged
                          ? "bg-rose-600 text-white border-rose-500 shadow-[2px_2px_0px_0px_#ef4444]"
                          : "bg-[#1e1b18] text-white shadow-[2px_2px_0px_0px_#1e1b18]"
                        : isUnhinged
                          ? "bg-[#181011] text-rose-500 hover:text-rose-300 shadow-[1px_1px_0px_0px_#881337]"
                          : "bg-white text-stone-500 hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                    }`}
                  >
                    {len === "short" ? "Tiny (≤15 w)" :
                     len === "medium" ? "Medium (2-3 sent)" : "Full Page (4-6 sent)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 1.8: Audio Controls Cabin */}
          <div className={`mt-4 pt-4 border-t-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} grid grid-cols-1 md:grid-cols-12 gap-6 items-center`}>
            {/* Audio Indicator Panel */}
            <div className="md:col-span-4 flex flex-col justify-center space-y-1">
              <label className={`text-xs font-mono font-bold uppercase tracking-wide flex items-center gap-1.5 ${isUnhinged ? "text-rose-400" : "text-stone-700"}`}>
                <AudioLines className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse text-rose-500" : ""}`} />
                4. Holocron Transmission Audio
              </label>
              <p className={`text-[10px] ${isUnhinged ? "text-rose-400/80" : "text-stone-500"} leading-tight`}>
                Activate retro-arcade force synthesis sounds and real-time synthesized character voice transmissions.
              </p>
            </div>

            {/* Sound Effects Toggle Button */}
            <div className="md:col-span-4 space-y-2">
              <button
                type="button"
                onClick={handleSoundToggle}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  soundModeEnabled
                    ? isUnhinged
                      ? "bg-rose-950 text-rose-200 border-rose-500 shadow-[3px_3px_0px_0px_#f43f5e]"
                      : "bg-[#10b981] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
                    : isUnhinged
                      ? "bg-[#181011] text-stone-600 border-rose-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.4)]"
                      : "bg-white text-stone-400 border-[#1e1b18] hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                }`}
              >
                {soundModeEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                {soundModeEnabled ? "RETRO SOUNDS: ON 🔊" : "RETRO SOUNDS: OFF 🔇"}
              </button>
            </div>

            {/* Character TTS Toggle Button */}
            <div className="md:col-span-4 space-y-2">
              <button
                type="button"
                onClick={handleTtsToggle}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  ttsEnabled
                    ? isUnhinged
                      ? "bg-rose-600 text-white border-rose-500 shadow-[3px_3px_0px_0px_#f43f5e] animate-pulse"
                      : "bg-[#f59e0b] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
                    : isUnhinged
                      ? "bg-[#181011] text-stone-600 border-rose-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.4)]"
                      : "bg-white text-stone-400 border-[#1e1b18] hover:text-[#1e1b18] shadow-[1px_1px_0px_0px_#1e1b18]"
                }`}
              >
                <AudioLines className={`w-4 h-4 ${isSpeaking ? "animate-bounce" : ""}`} />
                {ttsEnabled ? "CHARACTER VOICE: ON 🎙️" : "CHARACTER VOICE: OFF 📴"}
              </button>
            </div>
          </div>

          {/* Voice Selector sub-row if TTS is enabled */}
          {ttsEnabled && (
            <div className={`mt-3 p-3 rounded-lg border-2 grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${
              isUnhinged 
                ? "bg-[#14080a] border-rose-950 text-rose-200" 
                : "bg-stone-50 border-stone-200 text-stone-800"
            }`}>
              <div className="md:col-span-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#f59e0b]" />
                  Choose Transmission Voice:
                </span>
                <p className={`text-[9px] ${isUnhinged ? "text-rose-400/70" : "text-stone-500"} leading-snug mt-0.5`}>
                  Premium neural/google/apple voices sound highly human. Select one below!
                </p>
              </div>
              
              <div className="md:col-span-8">
                <select
                  id="preferred-voice-select"
                  value={preferredVoiceName}
                  onChange={(e) => handleVoiceSelect(e.target.value)}
                  className={`w-full py-1.5 px-2.5 rounded text-xs font-mono border-2 transition-all cursor-pointer ${
                    isUnhinged
                      ? "bg-stone-950 border-rose-900 text-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      : "bg-white border-stone-300 text-stone-800 focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  }`}
                >
                  {systemVoices.length === 0 ? (
                    <option value="">Default System Voice (Loading...)</option>
                  ) : (
                    systemVoices.map((voice) => {
                      const isPremium = voice.name.toLowerCase().includes("natural") || 
                                        voice.name.toLowerCase().includes("neural") || 
                                        voice.name.toLowerCase().includes("premium") || 
                                        voice.name.toLowerCase().includes("google") || 
                                        voice.name.toLowerCase().includes("siri");
                      return (
                        <option key={voice.name} value={voice.name}>
                          {isPremium ? "⭐ " : "🗣️ "} 
                          {voice.name} ({voice.lang}) {voice.localService ? "[Offline HD]" : "[Cloud Neural]"}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Row 2: API Keys Management */}
          <div className={`mt-5 pt-4 border-t-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
            <div className="flex-1 max-w-lg space-y-1">
              <div className={`flex items-center gap-1.5 ${isUnhinged ? "text-rose-300" : "text-stone-800"}`}>
                <Key className="w-4 h-4 text-stone-600" />
                <span className="text-xs font-mono font-bold">Custom Google AI Studio Key (Optional)</span>
              </div>
              <p className={`text-[10px] ${isUnhinged ? "text-rose-400" : "text-stone-500"} leading-relaxed font-sans font-medium`}>
                Save your own custom Google key privately inside your browser storage for unlimited hand-drawn transmissions! Key remains server-secured.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <input
                type={showApiKey ? "text" : "password"}
                value={customApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Starts with AIzaSy..."
                className={`w-full ${isUnhinged ? "bg-[#181011] text-rose-100 border-rose-600 focus:ring-[#f43f5e] shadow-[2px_2px_0px_0px_#ef4444]" : "bg-white border-[#1e1b18] text-[#1e1b18] focus:ring-[#10b981] shadow-[2px_2px_0px_0px_#1e1b18]"} border-2 text-xs font-mono rounded-lg pl-3 pr-9 py-2 outline-none placeholder:text-stone-400 transition-all font-bold`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer border-0 bg-transparent"
                title={showApiKey ? "Hide Key" : "Show Key"}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div id="dashboard-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          
          {/* LEFT COLUMN: Sessions Sidebar (Sketch Notebook Spine) */}
          <section 
            id="sessions-sidebar" 
            className={`lg:col-span-3 flex flex-col space-y-4 p-5 rounded-2xl border-[3px] ${isUnhinged ? "border-rose-600 bg-[#140b0c] shadow-[4px_4px_0px_0px_#e11d48]" : "border-[#1e1b18] bg-[#fbf8f0] shadow-[4px_4px_0px_0px_#1e1b18]"} min-h-[350px] transition-all duration-500`}
          >
            <div className={`flex items-center justify-between border-b-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} pb-3`}>
              <span className={`text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 ${isUnhinged ? "text-rose-400" : "text-stone-700"}`}>
                {character === "ragebaiter" ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-500" />
                    Bait Threads
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-emerald-600" />
                    Jedi Scrolls
                  </>
                )}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border-2 rounded-md ${isUnhinged ? "text-rose-400 bg-rose-950 border-rose-600" : "text-stone-500 bg-white border-stone-900/10"}`}>{sessions.length} Threads</span>
            </div>

            {/* New Session Button */}
            <button
              type="button"
              onClick={handleCreateSession}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono border-2 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold uppercase tracking-wider active:translate-y-0.5 ${
                isUnhinged
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-[3px_3px_0px_0px_#f43f5e]"
                  : character === "ragebaiter"
                    ? "bg-[#f59e0b] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
                    : "bg-[#10b981] text-[#1e1b18] border-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
              }`}
            >
              {character === "ragebaiter" ? (
                <>
                  <Flame className="w-3.5 h-3.5" />
                  New Outrage Thread
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  New Dialogue
                </>
              )}
            </button>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[480px] space-y-2 pr-1 scrollbar-thin">
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setErrorStatus(null);
                      if (soundModeEnabled) {
                        SoundFX.playMinecraftClick(0.35);
                      }
                    }}
                    className={`group relative p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${isUnhinged ? "border-rose-600" : "border-[#1e1b18]"} ${
                      isActive
                        ? isUnhinged
                          ? "bg-[#2a1316] text-rose-100 shadow-[2px_2px_0px_0px_#ef4444]"
                          : "bg-[#fefce8] text-stone-900 shadow-[2px_2px_0px_0px_#1e1b18]"
                        : isUnhinged
                          ? "bg-[#160e10] text-rose-500 hover:text-rose-300 hover:shadow-[1px_1px_0px_0px_#881337]"
                          : "bg-white text-stone-500 hover:text-stone-900 hover:shadow-[1px_1px_0px_0px_#1e1b18]"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      {isActive ? (
                        <input
                          type="text"
                          value={s.title}
                          onChange={(e) => {
                            const updated = sessions.map(item => {
                              if (item.id === s.id) {
                                  return { ...item, title: e.target.value };
                              }
                              return item;
                            });
                            setSessions(updated);
                            localStorage.setItem("yoda_hub_sessions_v1", JSON.stringify(updated));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`bg-transparent border-0 border-b ${isUnhinged ? "border-rose-500 focus:border-rose-400 text-rose-100" : "border-stone-800 focus:border-stone-900 text-stone-900"} outline-none text-xs font-bold py-0.5 w-full font-mono`}
                          placeholder="Name session..."
                          title="Click to rename this scroll"
                        />
                      ) : (
                        <span className={`text-xs font-bold truncate font-mono ${isUnhinged ? "text-rose-200" : "text-stone-800"}`}>
                          {s.title}
                        </span>
                      )}
                      <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {s.messages.length} transcript{s.messages.length !== 1 && "s"} · {s.character === "ragebaiter" ? "Jar Jar" : "Yoda"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer border-0 bg-transparent"
                      title="Delete dialogue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Feedback & Developer Info Card */}
            <div className={`mt-4 pt-4 border-t-2 ${isUnhinged ? "border-rose-950/40 text-rose-300" : "border-stone-900/10 text-stone-700"} space-y-2`}>
              <div className="flex items-center gap-1.5">
                <Mail className={`w-3.5 h-3.5 ${isUnhinged ? "text-rose-400" : "text-stone-600"}`} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Help & Feedback</span>
              </div>
              <div className={`p-3 rounded-xl border-2 text-[11px] leading-relaxed font-mono ${
                isUnhinged 
                  ? "bg-[#1f0d0f] border-rose-800/60 text-rose-200" 
                  : "bg-white border-stone-950/15 text-stone-600"
              } shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]`}>
                gimme feedback and any issue on <a href="mailto:veerthesani@gmail.com" className={`underline font-bold ${isUnhinged ? "text-rose-300 hover:text-rose-100" : "text-stone-900 hover:text-stone-700"}`}>veerthesani@gmail.com</a> and more updatee comin (if i am in mood else forget bout it)
              </div>
            </div>
          </section>

          {/* MIDDLE & RIGHT COLUMNS (Gated by Authentication) */}
          {isAuthLoading ? (
            <div className={`lg:col-span-9 flex flex-col items-center justify-center p-12 rounded-2xl border-[3px] text-center ${
              isUnhinged 
                ? "border-rose-600 bg-[#140b0c] text-rose-200 shadow-[4px_4px_0px_0px_#e11d48]" 
                : "border-[#1e1b18] bg-[#fbf8f0] text-[#1e1b18] shadow-[4px_4px_0px_0px_#1e1b18]"
            } min-h-[500px] transition-all duration-500`}>
              <div className="relative mb-6">
                <div className={`w-16 h-16 rounded-full border-4 border-dashed animate-spin ${isUnhinged ? "border-rose-500" : "border-[#10b981]"}`} />
                <Bot className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isUnhinged ? "text-rose-400" : "text-[#10b981]"}`} />
              </div>
              <h3 className="font-display font-black text-lg uppercase tracking-wider mb-2">Connecting to Jedi Archives...</h3>
              <p className="text-xs font-mono text-stone-500 max-w-xs">Reading cosmic frequencies and preparing the interactive sketching canvas...</p>
            </div>
          ) : (!user && !customApiKey) ? (
            /* SECURE GATEWAY FOR ANONYMOUS USERS */
            <div className={`lg:col-span-9 flex flex-col justify-between p-8 rounded-2xl border-[3px] ${
              isUnhinged 
                ? "border-rose-600 bg-[#110608] text-rose-100 shadow-[4px_4px_0px_0px_#e11d48]" 
                : "border-[#1e1b18] bg-[#fbf8f0] text-[#1e1b18] shadow-[4px_4px_0px_0px_#1e1b18]"
            } min-h-[500px] transition-all duration-500 relative overflow-hidden`}>
              {/* Decorative Background Vibe Grid */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none font-mono text-[8px] leading-none overflow-hidden select-none p-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="whitespace-nowrap mb-1">
                    {"JEDI_LOCK_SHIELD_ACTIVE_SYS_ENCRYPTED_AUTH_SECURE_RECORDS_".repeat(10)}
                  </div>
                ))}
              </div>

              <div className="max-w-2xl mx-auto my-auto text-center space-y-6 relative z-10">
                <div className="flex justify-center">
                  <div className={`p-4 rounded-full border-2 ${
                    isUnhinged 
                      ? "bg-[#250a0d] border-rose-500 text-rose-400 animate-pulse" 
                      : "bg-[#faf6ea] border-[#1e1b18] text-[#1e1b18]"
                  } shadow-[3px_3px_0px_0px_currentColor]`}>
                    <Skull className="w-10 h-10" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase">
                    {character === "ragebaiter" 
                      ? "Bait Terminal: Access Restructured" 
                      : "Grandmaster's Holocron is Locked"}
                  </h2>
                  <p className={`text-xs sm:text-sm font-mono max-w-lg mx-auto leading-relaxed ${
                    isUnhinged ? "text-rose-300" : "text-stone-600"
                  }`}>
                    {character === "ragebaiter"
                      ? "To deploy internet rage, customize outrage intensities, and record controversy transcripts on the cloud database, authenticating your digital credentials is required."
                      : "A disturbance in the Force, there is! To write upon the sacred Jedi scrolls, sketch with light, and talk with the Sages, sign in with Google or GitHub, or enter your own Google AI Studio API key, you must."}
                  </p>
                </div>

                {/* Main Auth Interaction Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <button
                    onClick={handleSignInWithGoogle}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-6 py-3 border-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all hover:-translate-y-1 active:translate-y-0 cursor-pointer w-full sm:w-auto ${
                      isUnhinged
                        ? "bg-[#250d10] border-rose-500 text-rose-100 hover:bg-[#3d1318] shadow-[4px_4px_0px_0px_#ef4444]"
                        : "bg-white border-[#1e1b18] text-[#1e1b18] hover:bg-[#faf6ea] shadow-[4px_4px_0px_0px_#1e1b18]"
                    }`}
                  >
                    <Chrome className="w-4 h-4 text-red-500" />
                    Sign In with Google
                  </button>

                  <button
                    onClick={handleSignInWithGithub}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-6 py-3 border-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all hover:-translate-y-1 active:translate-y-0 cursor-pointer w-full sm:w-auto ${
                      isUnhinged
                        ? "bg-[#250d10] border-rose-500 text-rose-100 hover:bg-[#3d1318] shadow-[4px_4px_0px_0px_#ef4444]"
                        : "bg-white border-[#1e1b18] text-[#1e1b18] hover:bg-[#faf6ea] shadow-[4px_4px_0px_0px_#1e1b18]"
                    }`}
                  >
                    <Github className={`w-4 h-4 ${isUnhinged ? "text-rose-100" : "text-[#1e1b18]"}`} />
                    Sign In with GitHub
                  </button>
                </div>

                {/* Alternative: Enter Custom API key directly */}
                <div className={`p-5 rounded-xl border-2 text-left max-w-md w-full mx-auto space-y-3.5 ${
                  isUnhinged 
                    ? "bg-[#180a0c] border-rose-950 text-rose-300" 
                    : "bg-[#faf6ea] border-[#1e1b18] text-[#1e1b18] shadow-[3px_3px_0px_0px_#1e1b18]"
                }`}>
                  <div className="text-center">
                    <p className="text-xs font-mono font-black uppercase tracking-wide flex items-center justify-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      No Login? Enter Custom API Key
                    </p>
                    <p className="text-[10px] font-sans text-stone-500 mt-1 leading-relaxed">
                      Unlock Guest Mode directly. Your key is stored purely locally in your browser and never shared.
                    </p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (gateApiKeyInput.trim()) {
                        handleApiKeyChange(gateApiKeyInput.trim());
                        if (soundModeEnabled) {
                          SoundFX.playLightsaberIgnite(isUnhinged, 0.4);
                        }
                      }
                    }}
                    className="flex flex-col gap-2"
                  >
                    <div className="relative flex items-center">
                      <input
                        type={showGateApiKey ? "text" : "password"}
                        placeholder="Paste AI Studio API Key (AIzaSy...)"
                        value={gateApiKeyInput}
                        onChange={(e) => setGateApiKeyInput(e.target.value)}
                        className={`w-full text-xs font-mono px-3.5 py-2.5 rounded-lg border-2 bg-white transition-all ${
                          isUnhinged 
                            ? "border-rose-900 focus:border-rose-500 text-rose-200 bg-stone-900" 
                            : "border-[#1e1b18] focus:border-[#d97706] text-[#1e1b18]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGateApiKey(!showGateApiKey)}
                        className="absolute right-3 text-stone-400 hover:text-stone-700 p-1 rounded transition-colors"
                        title={showGateApiKey ? "Hide key" : "Show key"}
                      >
                        {showGateApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!gateApiKeyInput.trim()}
                      className={`w-full py-2 border-2 rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !gateApiKeyInput.trim()
                          ? "opacity-40 cursor-not-allowed border-stone-300 bg-stone-100 text-stone-400"
                          : isUnhinged
                            ? "bg-rose-900 hover:bg-rose-950 border-rose-500 text-white"
                            : "bg-amber-500 hover:bg-amber-600 border-[#1e1b18] text-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1e1b18] active:translate-y-0.5"
                      }`}
                    >
                      Unlock Hologram Station ⚡
                    </button>
                  </form>
                </div>

                {/* Interactive hand-drawn parchment features list */}
                <div className={`p-4 rounded-xl border-2 text-left space-y-2.5 max-w-md mx-auto ${
                  isUnhinged 
                    ? "bg-[#1d0a0d] border-rose-950 text-rose-300" 
                    : "bg-[#faf6ea]/60 border-[#1e1b18]/20 text-stone-700"
                }`}>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block border-b pb-1 border-current">
                    Why Authenticate? (Force Perks):
                  </span>
                  <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500">🌌</span>
                      <p><b>Persistent Sagas</b>: Sessions are permanently backed up to Firebase Firestore and sync across your devices.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500">📜</span>
                      <p><b>Scroll Renaming</b>: Name and organize multiple chat threads with custom titles.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500">🎨</span>
                      <p><b>Hand-drawn Sketch Canvas</b>: Unlock custom styles, voice select configurations, and advanced features.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Footnote */}
              <div className="text-center font-mono text-[9px] uppercase tracking-widest text-stone-500 pt-4 border-t border-dashed border-stone-500/10">
                🔒 Protected by Firebase Authentication & Firestore Security Rules
              </div>
            </div>
          ) : (
            <>
              {/* MIDDLE COLUMN: Yoda Cartoon Panel & Input (4 Cols) */}
              <section 
                id="hologram-station" 
                className={`lg:col-span-4 flex flex-col justify-start space-y-6 p-6 rounded-2xl border-[3px] ${isUnhinged ? "border-rose-600 bg-[#140b0c] shadow-[4px_4px_0px_0px_#e11d48]" : "border-[#1e1b18] bg-[#fbf8f0] shadow-[4px_4px_0px_0px_#1e1b18]"} relative transition-all duration-500`}
              >
                <div className={`text-center font-mono text-[10px] uppercase tracking-widest border-b-2 ${isUnhinged ? "border-rose-950/40 text-rose-400" : "border-stone-900/10 text-stone-600"} pb-2 font-bold`}>
                  {character === "ragebaiter" ? "BAITING SCREEN GRID" : "SAGES DESK OBSERVATION"}
                </div>

                {/* Interactive Cartoon Avatar Sphere */}
                <YodaGlobe 
                  mode={activeMode} 
                  isGenerating={isGenerating} 
                  character={character}
                  isUnhinged={isUnhinged}
                  isSpeaking={isSpeaking}
                />

                {/* Mode selection + Text Submission Area */}
                <div className={`border-t-2 ${isUnhinged ? "border-rose-950/40" : "border-stone-900/10"} pt-5`}>
                  <InputArea
                    currentMode={activeMode}
                    onModeChange={handleModeChange}
                    onSubmit={handleSendThought}
                    isGenerating={isGenerating}
                    character={character}
                    isUnhinged={isUnhinged}
                  />
                </div>

                {/* Direct Errors Handling Display */}
                <AnimatePresence>
                  {errorStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-xl border-2 ${isUnhinged ? "bg-[#2d1215] border-rose-600 text-rose-100 shadow-[2px_2px_0px_0px_#ef4444]" : "bg-red-50 border-[#1e1b18] text-[#1e1b18] shadow-[2px_2px_0px_0px_#1e1b18]"} text-xs font-sans leading-relaxed`}
                    >
                      <strong className="block mb-1 font-mono text-sm font-black tracking-wide uppercase text-red-500">
                        ⚠️ Disturbances in the Brushstrokes
                      </strong>
                      {errorStatus === "INVALID_API_KEY" ? (
                        <div className="space-y-2 mt-1.5">
                          <p className={`${isUnhinged ? "text-rose-200" : "text-stone-800"} font-bold`}>
                            Google API Key Verification Failed! 🛑
                          </p>
                          <p className={`${isUnhinged ? "text-rose-400" : "text-stone-600"} text-[11px] leading-relaxed`}>
                            The API key entered in the panel above was rejected by Google servers. Verify your custom key (usually begins with <code className="text-red-500 bg-rose-950/40 px-1 py-0.5 rounded font-mono font-bold">AIzaSy</code>).
                          </p>
                        </div>
                      ) : errorStatus === "QUOTA_EXCEEDED" ? (
                        <div className="space-y-3 mt-1.5">
                          <p className={`${isUnhinged ? "text-rose-200" : "text-stone-800"} font-bold`}>
                            Exceeded daily free transmission quotas!
                          </p>
                          
                          <div className={`p-3 rounded-lg border-2 ${isUnhinged ? "bg-[#180e0f] border-rose-900 text-rose-300" : "bg-white border-stone-950 text-stone-600"} text-[11px] leading-relaxed space-y-1.5 font-sans`}>
                            <span className="font-mono font-bold block text-rose-400 uppercase tracking-widest text-[9px]">How to bypass:</span>
                            <div>1. Copy your personal API key from Google AI Studio.</div>
                            <div>2. Paste it in the <b className={isUnhinged ? "text-rose-200" : "text-stone-900"}>Custom API Key</b> field at the top of this dashboard!</div>
                            <div>3. High-capacity direct line is immediately restored.</div>
                          </div>
                          
                          <p className={`text-[10px] ${isUnhinged ? "text-rose-500" : "text-stone-500"} italic`}>
                            *Note: Activated local offline grandmaster scrolls so you can keep chatting seamlessly!
                          </p>
                        </div>
                      ) : errorStatus === "SERVICE_UNAVAILABLE" ? (
                        <div className="space-y-2 mt-1.5">
                          <p className={`${isUnhinged ? "text-rose-200" : "text-stone-800"} font-bold`}>
                            The galactic cloud servers are saturated! 🌀
                          </p>
                          <p className={`${isUnhinged ? "text-rose-400" : "text-stone-600"} text-xs`}>
                            Switched automatically to Yoda's local parchment backups. Direct transmissions will resume momentarily!
                          </p>
                        </div>
                      ) : (
                        <p className={`${isUnhinged ? "text-rose-300" : "text-stone-800"} font-mono mt-1 font-bold`}>{errorStatus}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* RIGHT COLUMN: Chat Transcript Dialogue (5 Cols) */}
              <section 
                id="transmission-terminal" 
                className={`lg:col-span-5 flex flex-col space-y-4 p-6 rounded-2xl border-[3px] ${isUnhinged ? "border-rose-600 bg-[#140b0c] shadow-[4px_4px_0px_0px_#e11d48]" : "border-[#1e1b18] bg-[#fbf8f0] shadow-[4px_4px_0px_0px_#1e1b18]"} h-full min-h-[500px] transition-all duration-500`}
              >
                <ChatHistory
                  messages={messages}
                  isGenerating={isGenerating}
                  onClear={handlePurgeHistory}
                  onSendReply={handleSendThought}
                  onRetry={handleRetry}
                  character={character}
                  isUnhinged={isUnhinged}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer with stamp indicator and vintage copyright */}
        <footer className={`mt-12 py-6 border-t-2 ${isUnhinged ? "border-rose-950/40 text-rose-500" : "border-stone-900/10 text-stone-500"} flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono gap-4 transition-colors`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full border border-stone-900 animate-ping ${isUnhinged ? "bg-red-500" : character === "ragebaiter" ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="font-bold">
              {isUnhinged 
                ? "Force Status: Dark Side Unleashed" 
                : character === "ragebaiter" 
                  ? "Outrage Log: Light Side Flame status active" 
                  : "Force Status: Light Side green tea certifiably brewed"}
            </span>
          </div>
          <div className={`flex items-center gap-1 font-bold ${isUnhinged ? "text-rose-500" : "text-stone-500"}`}>
            {character === "ragebaiter" ? (
              <>
                <span>Do not over-analyze internet arguments. Made with</span>
                <Heart className="w-3.5 h-3.5 text-red-500 inline fill-red-500 animate-pulse" />
                <span>by Outrage Sketch Unit</span>
              </>
            ) : (
              <>
                <span>Drawn or drawn not. There is no trial. Made with</span>
                <Heart className="w-3.5 h-3.5 text-red-500 inline fill-red-500" />
                <span>by swamp padawans</span>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

