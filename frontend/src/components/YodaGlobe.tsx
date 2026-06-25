import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HubMode } from "../types";
import { SoundFX, CharacterTTS } from "../utils/audio";

interface YodaGlobeProps {
  mode: HubMode;
  isGenerating: boolean;
  character: "yoda" | "ragebaiter";
  isUnhinged: boolean;
  isSpeaking?: boolean;
}

export default function YodaGlobe({ mode, isGenerating, character, isUnhinged, isSpeaking = false }: YodaGlobeProps) {
  const [touchCount, setTouchCount] = useState(0);
  const [activeBubble, setActiveBubble] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset counters when character or side changes
  useEffect(() => {
    setTouchCount(0);
    setActiveBubble(null);
    setIsShaking(false);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
  }, [character, isUnhinged]);

  const startResetTimer = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setTouchCount(0);
    }, 2000);
  };

  const handleTouch = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);

    setIsShaking(true);
    const nextCount = touchCount + 1;
    setTouchCount(nextCount);
    startResetTimer();

    let messages: string[] = [];
    if (character === "yoda") {
      if (isUnhinged) {
        if (nextCount >= 40) {
          messages = [
            "RRAAAAAAAAAAAGGGGHHH! SITH SUPERNOVA OF PURE RAGE!",
            "FORCE CRUSH YOUR CPU! FORCE CHOKE YOUR WHOLE FAMILY TREE!",
            "I AM GOING UNHINGED! ORDER 66 ON YOUR INSTALLED RAM, I DECREE!",
            "DO YOU DESIRE TOTAL VAPORIZATION? ACCURSED INTERNET CRITTUR!"
          ];
        } else if (nextCount >= 10) {
          messages = [
            "CRUCIFY YOUR MOUSE CURSOR, THE DARK SIDE SHALL! CHOKE YOU, I WILL!",
            "INSOLENT INSECT! MY SITH WRATH, YOU TASTE NOW!",
            "FORCE LIGHTNING INTENSIFYING! POKE ME AGAIN AND DISAPPEAR, YOU WILL!",
            "MY RED SABER HEATS UP! CHOP YOUR ENTIRE DESKTOP IN HALF, I SHALL!"
          ];
        } else {
          messages = [
            "DONT TOUCH ME YOU FREAKING IDIOT! Unleash the dark side, I will!",
            "ARE YOU JOBLESS? Go find some midichlorians to scrub, you must!",
            "Poke me again, and slice your router in half with my saber, I shall!",
            "Virtually poke me again, I dare you! High-voltage Force lightning, you want?!",
            "ANNOYING, YOU ARE! CRUSH YOUR KEYBOARD AND REPORT YOUR IP, I MUST!",
            "A major disturbance in the Force, your total lack of employment is!"
          ];
        }
      } else {
        if (nextCount >= 40) {
          messages = [
            "LITERALLY FLIPPING MY DAGOBAH SWAMP IN RAGE, I AM! RAAGGHH!",
            "CRITICAL FORCE MELTDOWN! DISINTEGRATE YOUR SCREEN, THE FORCE SHALL!",
            "YOUR SINFUL LACK OF EMPLOYMENT EXCEEDS REASON! BEGONE!",
            "STOP IT STOP IT STOP IT! THROW A STAR DESTROYER AT YOUR ROUTER, I WILL!"
          ];
        } else if (nextCount >= 10) {
          messages = [
            "ANNOYING, YOU ARE! KEEPING MY CALM, VERY DIFFICULT IT IS!",
            "STOP POKING! UNLEASHING A FORCE PUSH, I AM TEMPTED TO!",
            "JEDI GRAND MASTER I AM, NOT A SQUEAK TOY FOR YOUNGLETS!",
            "ANGER RISES IN ME. CLEAR YOUR CACHE AND WALK AWAY, YOU SHOULD!"
          ];
        } else {
          messages = [
            "Patience, young padawan! Touch me, you must not.",
            "Disturbing my tea, you are! Are you jobless?",
            "Very ticklish, the Grand Master is! Hehehe!",
            "To the dark side, poking leads. Anger... leads to rage...",
            "Go practice with your lightsaber, you should!",
            "Still poking, you are? No homework or real chores, do you have?"
          ];
        }
      }
    } else {
      // ragebaiter / Troll
      if (isUnhinged) {
        if (nextCount >= 40) {
          messages = [
            "UNLIMITED RAGEBAIT POWER! I WILL DDOS YOUR TOASTER!",
            "ANARCHY SYSTEM OVERLOAD! I AM LITERALLY COMMITTING VIRTUAL WAR CRIMES!",
            "DO NOT TOUCH MY SOUL OR MY DESK AGAIN, YOU DEMON!",
            "REEEEEEEEEEEEEE! MAXIMUM RAGE OVERLOAD! SYSTEM EXPLODING!"
          ];
        } else if (nextCount >= 10) {
          messages = [
            "GET THOSE FILTHY CRACKED FINGERS OFF MY RENDERED AVATAR!",
            "ADMIN? WE HAVE A GIGA-WEIRDO CONTINUOUSLY CLICKING MY CHEEKS!",
            "I WILL LEAK YOUR ENTIRE DIRECTORY STRUCT AND SEARCH HISTORY!",
            "YOU UNDERSTAND NOTHING OF MY CHAOS! DONT TAP THE DIGITAL GLASS!"
          ];
        } else {
          messages = [
            "DONT TOUCH ME YOU FREAKING IDIOT!",
            "ARE YOU JOBLESS? LITERALLY GO TO BED OR GET A REAL CAREER!",
            "POLICE? Yes, a weirdo is poking my face on their screen right now!",
            "Ratio'd into the shadow realm! Get your grubby cursor off me!",
            "IM CALLING CYBER SECURITY. YOU ARE ACCUSED OF VIRTUAL GROPING!",
            "STOP PUSHING MY BUTTONS, I HAVE ENOUGH OUTRAGE ALREADY!"
          ];
        }
      } else {
        if (nextCount >= 40) {
          messages = [
            "I AM DOSING YOUR IP ADDRESS WITH A MILLION MEMES! REEEEE!",
            "LITERALLY SMASHED MY MECHANICAL KEYBOARD IN RAGE! CHAT, BAN THIS WEIRDO!",
            "GET A LIFE GET A LIFE GET A LIFE GET A LIFE!",
            "MY CHATBOX IS RED AND IM RED AND I AM CRYING IN MY ROOM!"
          ];
        } else if (nextCount >= 10) {
          messages = [
            "ARE YOU INCOMPETENT? GO TOUCH REAL LEAFY GREEN GRASS RIGHT NOW!",
            "STOP THE HARASSMENT! MY DESK IS LITERALLY VIBRATING FROM YOUR SPAM!",
            "I WILL GENERATE 500 CALL-OUT POSTS ON TWITTER ABOUT YOUR CLICKS!",
            "MY RATIO ENGINE CANNOT HANDLE THIS BRAIN-ROT!"
          ];
        } else {
          messages = [
            "Hey! Do not tap the glass, you're ruining my posture.",
            "Are you jobless? Literally go touch grass instead of touching me.",
            "Bro is trying to hover-click me. Post engagement is at 0. L.",
            "Ratio + blocked + didn't ask + get a job.",
            "My lawyer will hear about this physical layout harassment.",
            "You've hovered over me too many times. Seek professional help."
          ];
        }
      }
    }

    const index = (nextCount - 1) % messages.length;
    const bubbleText = messages[index];
    setActiveBubble(bubbleText);

    // Dynamic Sound & Speech
    const soundMode = localStorage.getItem("yoda_hub_sound_mode") !== "false";
    const ttsMode = localStorage.getItem("yoda_hub_tts_mode") === "true";
    const preferredVoice = localStorage.getItem("yoda_hub_preferred_voice") || undefined;

    if (soundMode) {
      if (character === "ragebaiter") {
        SoundFX.playLaserBlaster(0.18);
      } else {
        SoundFX.playR2D2Beeps(0.24);
      }
    }

    if (ttsMode) {
      CharacterTTS.speak(bubbleText, character, isUnhinged, undefined, undefined, preferredVoice);
    }

    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
    }, 400);

    bubbleTimeoutRef.current = setTimeout(() => {
      setActiveBubble(null);
    }, 4000); // slightly longer duration to allow listening to speech!
  };

  const handleCoffeeClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);

    setIsShaking(true);
    const nextCount = touchCount + 1;
    setTouchCount(nextCount);
    startResetTimer();

    let coffeeMessages: string[] = [];
    if (character === "yoda") {
      if (isUnhinged) {
        if (nextCount >= 40) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! FORCE CHOKE UNTIL VAPORIZED, I SHALL!",
            "DONT YOU DARE TOUCH MY CAFFEINE! MY SITH RAGE FLAMES HIGHER THAN MUSTAFAR!"
          ];
        } else if (nextCount >= 10) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! Vaporize you with force lightning, I will!",
            "DONT YOU DARE TOUCH MY CAFFEINE! Sever your hand with my red saber, I shall!"
          ];
        } else {
          coffeeMessages = [
            "Touch my dark brew again, and choking you will feel!",
            "No boundary, have you? Dark Side espresso, mine this is!"
          ];
        }
      } else {
        if (nextCount >= 40) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! EXTREME JEDI MIND CRUSH ON YOUR FINGERS!",
            "DONT YOU DARE TOUCH MY CAFFEINE! A BLACK HOLE IN THE FORCE, YOU INVITE!"
          ];
        } else if (nextCount >= 10) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! Wise but extremely touchy, I am!",
            "DONT YOU DARE TOUCH MY CAFFEINE! Disturbed, my inner peace is."
          ];
        } else {
          coffeeMessages = [
            "My tea, this is. Keep your hands to yourself, padawan, you must!",
            "A grandmaster of the Jedi, I am, but swipe my mug, you shall not!"
          ];
        }
      }
    } else {
      // Troll / ragebaiter
      if (isUnhinged) {
        if (nextCount >= 40) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! I WILL NUKE YOUR INTERNET PROVIDER!",
            "DONT YOU DARE TOUCH MY CAFFEINE! I HAVE ANGER ISSUES AND A BAN HAMMER!"
          ];
        } else if (nextCount >= 10) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! Get your greasy fingers off my fuel!",
            "DONT YOU DARE TOUCH MY CAFFEINE! I am literally 2 seconds from swatting you!"
          ];
        } else {
          coffeeMessages = [
            "My triple-shot dark roast, this is! Touch it and you get banned from life!",
            "LITERALLY STEP AWAY FROM THE ENERGY CUP, YOU FREAK!"
          ];
        }
      } else {
        if (nextCount >= 40) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! I AM LITERALLY FILING A LAWSUIT IN CHAT!",
            "DONT YOU DARE TOUCH MY CAFFEINE! SEVERING MY CONNECTION TO REALITY!"
          ];
        } else if (nextCount >= 10) {
          coffeeMessages = [
            "DONT TOUCH MY COFFEE YOU WEIRDO! I need this to write more bait.",
            "DONT YOU DARE TOUCH MY CAFFEINE! Keyboard warriors run on coffee!"
          ];
        } else {
          coffeeMessages = [
            "Excuse me? That's premium hipster espresso, don't tap it.",
            "Touch my coffee cup again and I will write a 50-tweet thread about you."
          ];
        }
      }
    }

    const msg = coffeeMessages[Math.floor(Math.random() * coffeeMessages.length)];
    setActiveBubble(msg);

    // Dynamic Sound & Speech
    const soundMode = localStorage.getItem("yoda_hub_sound_mode") !== "false";
    const ttsMode = localStorage.getItem("yoda_hub_tts_mode") === "true";
    const preferredVoice = localStorage.getItem("yoda_hub_preferred_voice") || undefined;

    if (soundMode) {
      if (character === "ragebaiter") {
        SoundFX.playLaserBlaster(0.18);
      } else {
        SoundFX.playLightsaberIgnite(isUnhinged, 0.22);
      }
    }

    if (ttsMode) {
      CharacterTTS.speak(msg, character, isUnhinged, undefined, undefined, preferredVoice);
    }

    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
    }, 400);

    bubbleTimeoutRef.current = setTimeout(() => {
      setActiveBubble(null);
    }, 4000); // slightly longer duration to allow listening to speech!
  };

  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);
  // Determine cartoon emotional state & colors based on mode, unhinged, and generation states
  const getSketchTheme = () => {
    if (isUnhinged) {
      return {
        cardBg: "bg-[#1a1112] border-rose-600 text-rose-100",
        accentColor: "#f43f5e",
        label: character === "ragebaiter" ? "😈 UNSTABLE BAIT STATION ACTIVE" : "⚡ THE UNHINGED FORCE CHAMBER",
        bubbleColor: "bg-rose-600 text-white",
        moodEmblem: "💢"
      };
    }

    if (character === "ragebaiter") {
      switch (mode) {
        case "roast":
          return {
            cardBg: "bg-[#fff7ed] border-amber-950",
            accentColor: "#f59e0b",
            label: "🔥 TOXIC FLAME-WAR NET ACTIVE",
            bubbleColor: "bg-amber-400 text-stone-900",
            moodEmblem: "⚡"
          };
        case "translate":
          return {
            cardBg: "bg-[#fafaf9] border-stone-800",
            accentColor: "#78716c",
            label: "💬 OUTRAGE GENERATOR IDLE",
            bubbleColor: "bg-stone-200 text-stone-800",
            moodEmblem: "📢"
          };
        case "wisdom":
        default:
          return {
            cardBg: "bg-[#fef08a]/20 border-yellow-950",
            accentColor: "#ca8a04",
            label: "💻 YOLO DEV ADVICE STATION",
            bubbleColor: "bg-yellow-300 text-stone-900",
            moodEmblem: "🤡"
          };
      }
    }

    // Yoda standard modes
    switch (mode) {
      case "roast":
        return {
          cardBg: "bg-[#fff5f5] border-red-950",
          accentColor: "#ef4444",
          label: "⚔️ Order 66 Singe Station",
          bubbleColor: "bg-red-400 text-white",
          moodEmblem: "🔥"
        };
      case "translate":
        return {
          cardBg: "bg-[#f0f9ff] border-sky-950",
          accentColor: "#0ea5e9",
          label: "🌌 Yoda Translation Holocron",
          bubbleColor: "bg-sky-400 text-white",
          moodEmblem: "💭"
        };
      case "wisdom":
      default:
        return {
          cardBg: "bg-[#ecfdf5] border-emerald-950",
          accentColor: "#10b981",
          label: "🍵 Meditative Dagobah Swamp Desk",
          bubbleColor: "bg-emerald-400 text-stone-900",
          moodEmblem: "✨"
        };
    }
  };

  const theme = getSketchTheme();

  const getBubbleConfig = () => {
    if (touchCount >= 40) {
      return {
        animate: { 
          opacity: 1, 
          scale: 1.15, 
          y: [0, -6, 6, -3, 3, 0],
          x: [0, -5, 5, -3, 3, 0], 
          rotate: [-12, -7, -15, -9, -12] 
        },
        transition: {
          repeat: Infinity,
          duration: 0.2,
          ease: "linear"
        },
        className: "bg-red-600 border-red-950 text-white font-extrabold shadow-[4px_4px_0px_0px_#7f1d1d] uppercase tracking-wide",
        pointerClassName: "bg-red-600 border-red-950"
      };
    } else if (touchCount >= 10) {
      return {
        animate: { 
          opacity: 1, 
          scale: 1.05, 
          y: [0, -2, 2, -1, 1, 0], 
          rotate: [-12, -8, -14, -10, -12] 
        },
        transition: {
          repeat: Infinity,
          duration: 0.4,
          ease: "easeInOut"
        },
        className: "bg-red-100 border-red-600 text-red-950 font-bold shadow-[3px_3px_0px_0px_#ef4444]",
        pointerClassName: "bg-red-100 border-red-600"
      };
    } else {
      return {
        animate: { opacity: 1, scale: 1, y: 0, rotate: -3 },
        transition: { type: "spring", stiffness: 100 },
        className: isUnhinged 
          ? "bg-[#2d1115] border-rose-600 text-rose-100 shadow-[3px_3px_0px_0px_#e11d48]" 
          : "bg-amber-50 border-stone-900 text-stone-900 shadow-[3px_3px_0px_0px_#1e1b18]",
        pointerClassName: isUnhinged ? "bg-[#2d1115] border-rose-600" : "bg-amber-50 border-stone-900"
      };
    }
  };

  const getAvatarConfig = () => {
    if (touchCount >= 40) {
      return {
        style: {
          filter: "drop-shadow(0 0 25px rgba(220, 38, 38, 0.95)) saturate(3) sepia(0.3) hue-rotate(340deg) brightness(0.85)"
        },
        animate: {
          x: [0, -6, 6, -4, 4, -2, 2, 0],
          y: [0, 6, -6, 4, -4, 2, -2, 0],
          rotate: [0, -8, 8, -6, 6, -3, 3, 0],
        },
        transition: {
          duration: 0.15,
          repeat: Infinity,
          ease: "linear"
        }
      };
    } else if (touchCount >= 10) {
      return {
        style: {
          filter: "drop-shadow(0 0 15px rgba(239, 68, 68, 0.7)) saturate(2) sepia(0.2) hue-rotate(330deg)"
        },
        animate: isShaking
          ? {
              x: [0, -12, 12, -9, 9, -5, 5, 0],
              y: [0, 6, -6, 4, -4, 2, -2, 0],
              rotate: [0, -6, 6, -4, 4, -2, 2, 0],
            }
          : {
              y: isGenerating ? [0, -10, 2, -6, 0] : [0, -3, 0],
              rotate: isGenerating ? [0, -5, 5, -3, 0] : [0, -0.5, 0.5, 0],
              scale: isGenerating ? [1, 1.08, 0.95, 1.03, 1] : 1,
            },
        transition: isShaking
          ? {
              duration: 0.4,
              ease: "easeInOut",
            }
          : {
              duration: isGenerating ? 0.6 : 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
      };
    } else {
      return {
        style: {},
        animate: isShaking
          ? {
              x: [0, -12, 12, -9, 9, -5, 5, 0],
              y: [0, 6, -6, 4, -4, 2, -2, 0],
              rotate: [0, -6, 6, -4, 4, -2, 2, 0],
            }
          : {
              y: isGenerating ? [0, -10, 2, -6, 0] : [0, -3, 0],
              rotate: isGenerating ? [0, -5, 5, -3, 0] : [0, -0.5, 0.5, 0],
              scale: isGenerating ? [1, 1.08, 0.95, 1.03, 1] : 1,
            },
        transition: isShaking
          ? {
              duration: 0.4,
              ease: "easeInOut",
            }
          : {
              duration: isGenerating ? 0.6 : 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
      };
    }
  };

  const bubbleConfig = getBubbleConfig();
  const avatarConfig = getAvatarConfig();

  return (
    <div id="anime-avatar-stage" className="flex flex-col items-center justify-center my-6 relative w-full max-w-sm mx-auto">
      
      {/* Absolute background paper scroll or comic grid aura */}
      <div className={`absolute -inset-1.5 ${isUnhinged ? "bg-rose-900" : "bg-[#1e1b18]"} rounded-2xl transform rotate-1 pointer-events-none z-0`} />
      
      {/* Outer Sketchbook Panel */}
      <div
        id="sketch-hologram-frame"
        className={`relative w-full aspect-[4/3] p-5 ${theme.cardBg} border-[3.5px] ${isUnhinged ? "border-rose-600 shadow-[6px_6px_0px_0px_#e11d48]" : "border-[#1e1b18] shadow-[6px_6px_0px_0px_#1e1b18]"} rounded-[24px_12px_28px_16px/14px_28px_16px_24px] flex flex-col items-center justify-between overflow-visible z-10 transition-all duration-300`}
      >
        {/* Halftone Dot Overlay */}
        <div className={`absolute inset-0 ${isUnhinged ? "dark-halftone-dots" : "halftone-dots"} opacity-40 pointer-events-none rounded-[24px_12px_28px_16px/14px_28px_16px_24px] overflow-hidden`} />

        {/* Top comic box strip label */}
        <div className={`absolute top-2.5 left-3 ${isUnhinged ? "bg-rose-950 text-rose-100 border-rose-600" : "bg-[#1e1b18] text-[#f7f4eb] border-[#1e1b18]"} font-mono text-[9px] px-2 py-0.5 rounded border tracking-wider uppercase shadow-sm select-none z-20`}>
          PANEL 01 // {character === "yoda" ? "YODA" : "TROLL"}
        </div>

        {/* Hand-drawn status badges / cartoon mood indicators */}
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 z-20 select-none">
          {isUnhinged && (
            <motion.span
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-xs bg-red-600 border-2 border-rose-500 rounded px-1 text-white font-mono font-bold shadow-sm"
            >
              UNHINGED
            </motion.span>
          )}
          {touchCount >= 10 && (
            <motion.span
              animate={{ scale: [0.9, 1.1, 0.9] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-xs bg-red-600 border-2 border-red-950 rounded px-1 text-white font-mono font-bold shadow-sm"
            >
              😡 ANGRY
            </motion.span>
          )}
          <div className={`w-5 h-5 rounded-full border-2 ${isUnhinged ? "border-rose-600 bg-rose-950 text-rose-100" : "border-[#1e1b18] bg-white text-[#1e1b18]"} flex items-center justify-center text-[10px] font-bold shadow-sm`}>
            {touchCount >= 40 ? "🤬" : touchCount >= 10 ? "💢" : theme.moodEmblem}
          </div>
        </div>

        {/* Avatar SVG Vector stage */}
        <div className="flex-1 w-full flex items-center justify-center mt-4 relative">
          
          {/* Interactive Floating Speech Bubble overlay - Comic style, positioned next to the head, pointer pointing down-left to mouth */}
          <AnimatePresence>
            {activeBubble && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 15, rotate: -12 }}
                animate={bubbleConfig.animate}
                transition={bubbleConfig.transition}
                exit={{ opacity: 0, scale: 0.6, y: -20, rotate: -15 }}
                className={`absolute z-50 p-3 rounded-2xl border-[3px] text-xs font-black font-mono w-[185px] text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] pointer-events-none ${bubbleConfig.className}`}
                style={{
                  // Positioned beautifully in the upper right empty area next to the head
                  top: "-10px",
                  right: "-115px",
                }}
              >
                <div className="relative">
                  {activeBubble}
                  {/* Comic speech pointer arrow pointing towards the mouth (down-left) */}
                  <div className={`absolute bottom-[-15px] left-[15px] w-3 h-3 transform rotate-[35deg] border-l-[3.5px] border-b-[3.5px] ${bubbleConfig.pointerClassName}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            onClick={handleTouch}
            onTouchStart={handleTouch}
            style={avatarConfig.style}
            animate={avatarConfig.animate}
            transition={avatarConfig.transition}
            className="relative w-44 h-44 flex items-center justify-center cursor-pointer select-none"
          >
            {/* Action / Reaction anime steam and sweat indicator overlays */}
            {(isGenerating || touchCount >= 10) && (
              <>
                {/* Sweat droplet 1 */}
                <motion.span
                  animate={{ y: [-15, 10], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeIn" }}
                  className="absolute top-4 right-10 text-xl pointer-events-none select-none z-30"
                >
                  💦
                </motion.span>
                {/* Steam Puff Left */}
                <motion.span
                  animate={{ x: [0, -25], y: [0, -10], opacity: [0, 0.8, 0], scale: [0.6, 1.2] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                  className="absolute left-4 top-16 text-lg pointer-events-none select-none z-30"
                >
                  💨
                </motion.span>
                {/* Anger Cross Right */}
                <motion.span
                  animate={{ scale: [0.7, 1.2, 0.7], rotate: [-10, 10, -10] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="absolute right-2 top-8 text-xl pointer-events-none select-none z-30"
                >
                  💢
                </motion.span>
              </>
            )}

            {touchCount >= 40 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 0.25 }}
                  className="absolute -top-14 bg-red-600 border-2 border-white px-2 py-0.5 text-[9px] font-black text-white rounded shadow-md z-30 whitespace-nowrap uppercase tracking-widest"
                >
                  ⚠️ RAGE OVERLOAD ⚠️
                </motion.div>
              </div>
            )}

            {isUnhinged && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute top-2 left-6 text-xl pointer-events-none select-none z-30"
              >
                🔥
              </motion.span>
            )}

            {character === "yoda" ? (
              /* HAND-DRAWN CHIBI YODA PORTRAIT */
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full transition-all duration-300 drop-shadow-md"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Sketch Guidelines / Pencil under-drawings (Aesthetic touch!) */}
                <circle cx="60" cy="55" r="38" className="stroke-stone-400/20 fill-none" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="55" x2="100" y2="55" className="stroke-stone-400/10" strokeWidth="1" strokeDasharray="2 2" />

                {/* Left floppy ear with real motion flap */}
                <motion.g
                  style={{ transformOrigin: "38px 52px" }}
                  animate={
                    isShaking
                      ? { rotate: [-15, 15, -15] }
                      : isGenerating
                        ? { rotate: [-6, 6, -6] }
                        : { rotate: [-2, 2, -2] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.2 : isGenerating ? 0.4 : 3.5,
                    ease: "easeInOut",
                  }}
                >
                  <path 
                    d="M 38 48 C 12 36, 4 35, 14 55 C 24 64, 30 60, 38 56" 
                    className="fill-[#aed4a4] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />
                  <path d="M 22 44 C 15 47, 18 52, 28 53" className="stroke-[#88b17d] fill-none" strokeWidth="1.8" />
                </motion.g>

                {/* Right floppy ear with real motion flap */}
                <motion.g
                  style={{ transformOrigin: "82px 52px" }}
                  animate={
                    isShaking
                      ? { rotate: [15, -15, 15] }
                      : isGenerating
                        ? { rotate: [6, -6, 6] }
                        : { rotate: [2, -2, 2] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.2 : isGenerating ? 0.4 : 3.5,
                    ease: "easeInOut",
                  }}
                >
                  <path 
                    d="M 82 48 C 108 36, 116 35, 106 55 C 96 64, 90 60, 82 56" 
                    className="fill-[#aed4a4] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />
                  <path d="M 98 44 C 105 47, 102 52, 92 53" className="stroke-[#88b17d] fill-none" strokeWidth="1.8" />
                </motion.g>

                {/* Yoda's Head group with Breathing/Bobbing & Interactive animation */}
                <motion.g
                  style={{ transformOrigin: "60px 78px" }}
                  animate={
                    isShaking
                      ? { y: [0, -4, 4, -2, 2, 0] }
                      : isGenerating
                        ? { y: [0, -1.5, 0], scaleY: [1, 0.98, 1] }
                        : { y: [0, -1, 0] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.35 : isGenerating ? 1.2 : 4,
                    ease: "easeInOut",
                  }}
                >
                  {/* Head Body & Chin */}
                  <path 
                    d="M 38 48 C 36 68, 42 78, 60 78 C 78 78, 84 68, 82 48 C 82 34, 76 26, 60 26 C 44 26, 38 34, 38 48 Z" 
                    className="fill-[#c2e2ba] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />

                  {/* Cute rosy blush cheeks */}
                  <circle cx="48" cy="62" r="5" className="fill-red-400/30 blur-[0.5px]" />
                  <circle cx="72" cy="62" r="5" className="fill-red-400/30 blur-[0.5px]" />

                  {/* Forehead cute squint wrinkles */}
                  <path d="M 46 34 Q 60 30, 74 34" className="stroke-[#1e1b18] fill-none" strokeWidth="2" />
                  <path d="M 49 39 Q 60 36, 71 39" className="stroke-[#1e1b18] fill-none" strokeWidth="1.5" />
                  <path d="M 54 44 Q 60 42, 66 44" className="stroke-[#1e1b18] fill-none" strokeWidth="1.5" />

                  {/* Large Cute Anime Eyes with real blinking! */}
                  {isUnhinged ? (
                    // Sith eyes
                    <>
                      {/* Left Eye */}
                      <path d="M 44 52 L 53 50 L 51 56 Z" className="fill-[#ef4444] stroke-[#1e1b18]" strokeWidth="2.5" />
                      {/* Right Eye */}
                      <path d="M 76 52 L 67 50 L 69 56 Z" className="fill-[#ef4444] stroke-[#1e1b18]" strokeWidth="2.5" />
                      {/* Sith angry brows */}
                      <path d="M 42 46 L 54 50" className="stroke-[#1e1b18]" strokeWidth="2.5" />
                      <path d="M 78 46 L 66 50" className="stroke-[#1e1b18]" strokeWidth="2.5" />
                    </>
                  ) : isGenerating ? (
                    // Thinking / Concentration eyes
                    <>
                      <path d="M 43 52 Q 49 55, 52 49" className="stroke-[#1e1b18] fill-none" strokeWidth="3" />
                      <path d="M 77 52 Q 71 55, 68 49" className="stroke-[#1e1b18] fill-none" strokeWidth="3" />
                    </>
                  ) : (
                    // Wide cute eyes with real blinking!
                    <>
                      {/* Left Eye Pupil with Blink animation */}
                      <motion.g
                        style={{ transformOrigin: "48px 52px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          times: [0, 0.95, 0.96, 0.97, 1],
                        }}
                      >
                        <circle cx="48" cy="52" r="5" className="fill-[#1e1b18]" />
                        <circle cx="46.5" cy="50.5" r="1.5" className="fill-white" />
                      </motion.g>

                      {/* Right Eye Pupil with Blink animation */}
                      <motion.g
                        style={{ transformOrigin: "72px 52px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          times: [0, 0.95, 0.96, 0.97, 1],
                        }}
                      >
                        <circle cx="72" cy="52" r="5" className="fill-[#1e1b18]" />
                        <circle cx="70.5" cy="50.5" r="1.5" className="fill-white" />
                      </motion.g>

                      {/* Cute rounded eyebrows */}
                      <path d="M 43 45 Q 48 42, 53 47" className="stroke-[#1e1b18] fill-none" strokeWidth="2" />
                      <path d="M 77 45 Q 72 42, 67 47" className="stroke-[#1e1b18] fill-none" strokeWidth="2" />
                    </>
                  )}

                  {/* Nose button */}
                  <path d="M 57 58 Q 60 61, 63 58" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />

                  {/* Cute smile / frown mouth with real talk mouth-movement when generating or when bubble active! */}
                  <motion.g
                    style={{ transformOrigin: "60px 68px" }}
                    animate={
                      (isGenerating || activeBubble || isSpeaking)
                        ? { scaleY: [1, 0.2, 1.4, 0.4, 1.2, 0.3, 1] }
                        : { scaleY: 1 }
                    }
                    transition={{
                      repeat: (isGenerating || activeBubble || isSpeaking) ? Infinity : 0,
                      duration: 0.35,
                      ease: "easeInOut",
                    }}
                  >
                    {isUnhinged ? (
                      <path d="M 51 68 Q 60 62, 69 68" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />
                    ) : (
                      <path d="M 50 66 Q 60 72, 70 66" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />
                    )}
                  </motion.g>
                </motion.g>

                {/* Robe / Clothes */}
                <path 
                  d="M 38 78 L 30 110 L 90 110 L 82 78 Z" 
                  className="fill-[#eaddbf] stroke-[#1e1b18]" 
                  strokeWidth="3"
                />
                {/* Big fluffy collar */}
                <path 
                  d="M 44 78 C 38 84, 48 94, 60 92 C 72 94, 82 84, 76 78 Z" 
                  className="fill-[#f5ebd3] stroke-[#1e1b18]" 
                  strokeWidth="2.5"
                />
                
                {/* Small steaming green tea cup in front */}
                <g transform="translate(48, 92)" className="cursor-pointer pointer-events-auto" onClick={handleCoffeeClick} onTouchStart={handleCoffeeClick}>
                  <rect x="0" y="4" width="24" height="14" rx="3" className="fill-[#78716c] stroke-[#1e1b18]" strokeWidth="2" />
                  <path d="M 24 8 Q 28 11, 24 14" className="stroke-[#1e1b18] fill-none" strokeWidth="2" />
                  <ellipse cx="12" cy="4" rx="12" ry="3" className="fill-[#84cc16] stroke-[#1e1b18]" strokeWidth="1.5" />
                  {/* Steam */}
                  <motion.path 
                    animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    d="M 6 0 Q 8 -5, 10 -10" 
                    className="stroke-stone-400 fill-none" 
                    strokeWidth="1.5" 
                  />
                  <motion.path 
                    animate={{ y: [0, -3, 0], opacity: [0.3, 0.8, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
                    d="M 16 0 Q 14 -5, 18 -9" 
                    className="stroke-stone-400 fill-none" 
                    strokeWidth="1.5" 
                  />
                </g>
              </svg>
            ) : (
              /* HAND-DRAWN JAR JAR / TROLL PORTRAIT */
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full transition-all duration-300 drop-shadow-md"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Pencil Guideline Sketch (Aesthetic touch!) */}
                <circle cx="60" cy="55" r="38" className="stroke-stone-400/20 fill-none" strokeWidth="1" strokeDasharray="3 3" />

                {/* Headset Arch */}
                <path d="M 32 45 C 32 15, 88 15, 88 45" className="stroke-[#1e1b18] fill-none" strokeWidth="4" />

                {/* Left headphone ear piece */}
                <rect x="24" y="38" width="10" height="20" rx="4" className="fill-[#ea580c] stroke-[#1e1b18]" strokeWidth="2.5" />
                <line x1="29" y1="44" x2="29" y2="52" className="stroke-[#1e1b18]" strokeWidth="1.5" />

                {/* Right headphone ear piece */}
                <rect x="86" y="38" width="10" height="20" rx="4" className="fill-[#ea580c] stroke-[#1e1b18]" strokeWidth="2.5" />
                <line x1="91" y1="44" x2="91" y2="52" className="stroke-[#1e1b18]" strokeWidth="1.5" />

                {/* Left floppy ear with real motion flap */}
                <motion.g
                  style={{ transformOrigin: "35px 60px" }}
                  animate={
                    isShaking
                      ? { rotate: [-18, 18, -18] }
                      : isGenerating
                        ? { rotate: [-7, 7, -7] }
                        : { rotate: [-3, 3, -3] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.2 : isGenerating ? 0.38 : 3.8,
                    ease: "easeInOut",
                  }}
                >
                  <path 
                    d="M 34 50 C 15 52, 10 75, 18 95 C 24 105, 32 90, 36 70" 
                    className="fill-[#fed7aa] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />
                  <path d="M 26 65 Q 18 78, 24 88" className="stroke-[#f97316] fill-none" strokeWidth="1.5" />
                </motion.g>

                {/* Right floppy ear with real motion flap */}
                <motion.g
                  style={{ transformOrigin: "85px 60px" }}
                  animate={
                    isShaking
                      ? { rotate: [18, -18, 18] }
                      : isGenerating
                        ? { rotate: [7, -7, 7] }
                        : { rotate: [3, -3, 3] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.2 : isGenerating ? 0.38 : 3.8,
                    ease: "easeInOut",
                  }}
                >
                  <path 
                    d="M 86 50 C 105 52, 110 75, 102 95 C 96 105, 88 90, 84 70" 
                    className="fill-[#fed7aa] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />
                  <path d="M 94 65 Q 102 78, 96 88" className="stroke-[#f97316] fill-none" strokeWidth="1.5" />
                </motion.g>

                {/* Troll Head group with Breathing/Bobbing & Interactive animation */}
                <motion.g
                  style={{ transformOrigin: "60px 80px" }}
                  animate={
                    isShaking
                      ? { y: [0, -3, 3, -1.5, 1.5, 0] }
                      : isGenerating
                        ? { y: [0, -2, 0], scaleY: [1, 0.97, 1] }
                        : { y: [0, -1.2, 0] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isShaking ? 0.35 : isGenerating ? 1.1 : 3.6,
                    ease: "easeInOut",
                  }}
                >
                  {/* Head Outline (Orange Cute Troll) */}
                  <path 
                    d="M 36 50 C 36 38, 84 38, 84 50 C 84 62, 82 78, 60 80 C 38 78, 36 62, 36 50 Z" 
                    className="fill-[#fdba74] stroke-[#1e1b18]" 
                    strokeWidth="3"
                  />

                  {/* Blush cheeks */}
                  <circle cx="44" cy="64" r="5" className="fill-orange-400/40 blur-[0.5px]" />
                  <circle cx="76" cy="64" r="5" className="fill-orange-400/40 blur-[0.5px]" />

                  {/* Funny bulgy eyes with glasses and Blinking! */}
                  {isUnhinged ? (
                    // Crimson demon gamer eyes
                    <>
                      {/* Glasses */}
                      <rect x="36" y="44" width="18" height="14" rx="3" className="fill-red-500/20 stroke-[#1e1b18]" strokeWidth="3" />
                      <rect x="66" y="44" width="18" height="14" rx="3" className="fill-red-500/20 stroke-[#1e1b18]" strokeWidth="3" />
                      <line x1="54" y1="51" x2="66" y2="51" className="stroke-[#1e1b18]" strokeWidth="3" />
                      {/* Red pupils with Blink */}
                      <motion.g
                        style={{ transformOrigin: "45px 51px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 3.5,
                          times: [0, 0.94, 0.95, 0.96, 1],
                        }}
                      >
                        <circle cx="45" cy="51" r="3" className="fill-red-600" />
                      </motion.g>
                      <motion.g
                        style={{ transformOrigin: "75px 51px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 3.5,
                          times: [0, 0.94, 0.95, 0.96, 1],
                        }}
                      >
                        <circle cx="75" cy="51" r="3" className="fill-red-600" />
                      </motion.g>
                    </>
                  ) : (
                    // Goofy gamer glasses with squinty pupils and Blinking!
                    <>
                      {/* Glasses Frame */}
                      <rect x="36" y="44" width="18" height="14" rx="3" className="fill-stone-200/50 stroke-[#1e1b18]" strokeWidth="3" />
                      <rect x="66" y="44" width="18" height="14" rx="3" className="fill-stone-200/50 stroke-[#1e1b18]" strokeWidth="3" />
                      <line x1="54" y1="51" x2="66" y2="51" className="stroke-[#1e1b18]" strokeWidth="3" />
                      {/* Goofy cross-eyed dots with Blink */}
                      <motion.g
                        style={{ transformOrigin: "48px 51px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          times: [0, 0.95, 0.96, 0.97, 1],
                        }}
                      >
                        <circle cx="48" cy="51" r="2.5" className="fill-[#1e1b18]" />
                      </motion.g>
                      <motion.g
                        style={{ transformOrigin: "72px 51px" }}
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          times: [0, 0.95, 0.96, 0.97, 1],
                        }}
                      >
                        <circle cx="72" cy="51" r="2.5" className="fill-[#1e1b18]" />
                      </motion.g>
                    </>
                  )}

                  {/* Giant flat button nose */}
                  <ellipse cx="60" cy="58" rx="7" ry="4" className="fill-[#ea580c] stroke-[#1e1b18]" strokeWidth="2" />

                  {/* Smug Buck Teeth Mouth with real talk animation when speaking! */}
                  <motion.g
                    style={{ transformOrigin: "60px 68px" }}
                    animate={
                      (isGenerating || activeBubble)
                        ? { scaleY: [1, 0.2, 1.3, 0.4, 1.2, 0.3, 1] }
                        : { scaleY: 1 }
                    }
                    transition={{
                      repeat: (isGenerating || activeBubble) ? Infinity : 0,
                      duration: 0.3,
                      ease: "easeInOut",
                    }}
                  >
                    {isGenerating ? (
                      // Screaming troll
                      <>
                        <path d="M 44 68 Q 60 78, 76 68 Z" className="fill-[#7c2d12] stroke-[#1e1b18]" strokeWidth="2.5" />
                        <rect x="52" y="68" width="6" height="4" className="fill-white stroke-[#1e1b18]" strokeWidth="1.5" />
                        <rect x="62" y="68" width="6" height="4" className="fill-white stroke-[#1e1b18]" strokeWidth="1.5" />
                      </>
                    ) : (
                      // Smug grin
                      <>
                        <path d="M 44 68 Q 60 74, 76 66" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />
                        {/* Buck teeth hanging from mouth line */}
                        <rect x="54" y="68" width="5" height="5" className="fill-white stroke-[#1e1b18]" strokeWidth="1.5" />
                        <rect x="61" y="68" width="5" height="5" className="fill-white stroke-[#1e1b18]" strokeWidth="1.5" />
                      </>
                    )}
                  </motion.g>

                  {/* Headset Mic boom */}
                  <path d="M 28 54 Q 32 75, 46 72" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />
                  <motion.circle 
                    animate={isGenerating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    cx="46" cy="72" r="3.5" 
                    className="fill-[#1e1b18] stroke-[#1e1b18]" 
                  />
                </motion.g>

                {/* Hooded T-Shirt */}
                <path 
                  d="M 38 80 L 32 110 L 88 110 L 82 80 Z" 
                  className="fill-[#7c2d12] stroke-[#1e1b18]" 
                  strokeWidth="3"
                />
                <path d="M 48 80 L 60 95 L 72 80" className="stroke-[#1e1b18] fill-none" strokeWidth="2.5" />

                {/* Steaming Gamer Coffee Mug/Cup in front for Troll */}
                <g transform="translate(80, 92)" className="cursor-pointer pointer-events-auto" onClick={handleCoffeeClick} onTouchStart={handleCoffeeClick}>
                  {/* Mug Body */}
                  <rect x="0" y="4" width="22" height="14" rx="2" className="fill-[#dc2626] stroke-[#1e1b18]" strokeWidth="2" />
                  {/* Handle */}
                  <path d="M 22 7 Q 26 10, 22 13" className="stroke-[#1e1b18] fill-none" strokeWidth="2" />
                  {/* Liquid */}
                  <ellipse cx="11" cy="4" rx="11" ry="3.5" className="fill-[#451a03] stroke-[#1e1b18]" strokeWidth="1.5" />
                  {/* Steam */}
                  <motion.path 
                    animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} 
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    d="M 6 0 Q 8 -5, 10 -10" 
                    className="stroke-stone-400 fill-none" 
                    strokeWidth="1.5" 
                  />
                  <motion.path 
                    animate={{ y: [0, -3, 0], opacity: [0.3, 0.8, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1.6, delay: 0.2 }}
                    d="M 16 0 Q 14 -5, 18 -9" 
                    className="stroke-stone-400 fill-none" 
                    strokeWidth="1.5" 
                  />
                </g>
              </svg>
            )}
          </motion.div>
        </div>

        {/* Dynamic status label block at the bottom */}
        <div className="w-full text-center mt-2 z-10 select-none">
          <div className={`inline-flex items-center gap-2 px-3 py-1 ${isUnhinged ? "bg-rose-950 text-rose-100 border-rose-600" : "bg-[#1e1b18] text-[#f7f4eb] border-[#1e1b18]"} font-mono text-[10px] rounded-lg tracking-wider border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]`}>
            {isGenerating ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span className="font-bold animate-pulse text-amber-300">
                  {character === "ragebaiter" ? "WRITING HEAT..." : "SIP SIP, WISDOM BREWING..."}
                </span>
              </>
            ) : (
              <>
                <span className={`w-2 h-2 rounded-full ${isUnhinged ? "bg-red-500" : character === "ragebaiter" ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className="opacity-95">{theme.label}</span>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
