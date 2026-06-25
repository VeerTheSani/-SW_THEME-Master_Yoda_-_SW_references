// Web Audio API & SpeechSynthesis Character Sound Engine for Yoda Hub

let audioCtx: AudioContext | null = null;
let lightsaberHumSource: OscillatorNode | null = null;
let lightsaberHumGain: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Programmatically synthesizes retro-arcade and Star Wars themed sound effects using Web Audio API oscillators.
 * No external file dependencies, ensuring it runs reliably offline and inside sandboxed iframes.
 */
export const SoundFX = {
  /**
   * Retro-arcade click / blip sound
   */
  playRetroBlip(volume = 0.3) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio blip failed to play", e);
    }
  },

  /**
   * Minecraft classic crisp, woody UI click sound effect
   */
  playMinecraftClick(volume = 0.35) {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // 1. Wood knock (Triangle oscillator)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.06);

      gain1.gain.setValueAtTime(volume * 0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      // Lowpass to make it warmer/woodier
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      // 2. High-pitched mechanical snap (Sine oscillator)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1800, now);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.015);

      gain2.gain.setValueAtTime(volume * 0.5, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.065);

      osc2.start(now);
      osc2.stop(now + 0.02);
    } catch (e) {
      console.warn("Minecraft click audio failed to play", e);
    }
  },

  /**
   * R2-D2 style cute chirpy computer beeps
   */
  playR2D2Beeps(volume = 0.25) {
    try {
      const ctx = getAudioContext();
      const playBeep = (freq: number, startTime: number, duration: number, type: OscillatorType = "sine") => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        if (Math.random() > 0.5) {
          // Add pitch frequency sweep
          osc.frequency.exponentialRampToValueAtTime(freq * (1.2 + Math.random() * 0.4), startTime + duration);
        }

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Play a sequence of 3-4 quirky short beeps
      playBeep(900 + Math.random() * 600, now, 0.07, "sine");
      playBeep(1400 + Math.random() * 800, now + 0.08, 0.05, "triangle");
      playBeep(700 + Math.random() * 500, now + 0.14, 0.09, "sine");
      if (Math.random() > 0.3) {
        playBeep(1800 + Math.random() * 400, now + 0.22, 0.06, "sine");
      }
    } catch (e) {
      console.warn("R2D2 audio failed to play", e);
    }
  },

  /**
   * Laser Blaster sound effect (downward sweep) - perfect for troll roasts
   */
  playLaserBlaster(volume = 0.2) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);

      // Lowpass filter to make it less harsh and more retro-sci-fi
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Laser audio failed to play", e);
    }
  },

  /**
   * Lightsaber Ignition / Power-up sound
   */
  playLightsaberIgnite(isDarkSide = false, volume = 0.25) {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const duration = 0.45;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Sawtooth for hum, square for dark side harshness
      osc.type = isDarkSide ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(60, now);
      // Sweeps from low sub up to saber hum frequency
      osc.frequency.exponentialRampToValueAtTime(isDarkSide ? 95 : 120, now + duration);

      // Filter settings to shape the plasma hum
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.exponentialRampToValueAtTime(isDarkSide ? 250 : 380, now + duration);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Lightsaber ignition failed", e);
    }
  },

  /**
   * Starts a continuous, ultra-subtle ambient lightsaber/force hum in the background while Yoda speaks.
   */
  startSaberHum(isDarkSide = false, volume = 0.08) {
    try {
      this.stopSaberHum();

      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      // Deep resonant frequencies
      osc.frequency.setValueAtTime(isDarkSide ? 68 : 88, now);

      // Low frequency modulation for the iconic lightsaber motion wobble
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(7.5, now); // 7.5Hz wobble
      lfoGain.gain.setValueAtTime(5, now); // wobble range +/- 5Hz

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      osc.start(now);

      lightsaberHumSource = osc;
      lightsaberHumGain = gain;
    } catch (e) {
      console.warn("Failed to start saber hum", e);
    }
  },

  /**
   * Fades out and stops the continuous hum.
   */
  stopSaberHum() {
    try {
      if (lightsaberHumSource && lightsaberHumGain) {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        lightsaberHumGain.gain.cancelScheduledValues(now);
        lightsaberHumGain.gain.setValueAtTime(lightsaberHumGain.gain.value, now);
        lightsaberHumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        const sourceToStop = lightsaberHumSource;
        setTimeout(() => {
          try {
            sourceToStop.stop();
          } catch (e) {}
        }, 200);

        lightsaberHumSource = null;
        lightsaberHumGain = null;
      }
    } catch (e) {
      console.warn("Failed to stop hum", e);
    }
  }
};

/**
 * Text-to-Speech Engine
 * Provides character-customized synthesis utilizing standard window.speechSynthesis.
 * Avoids mechanical sounding TTS by filtering for high-quality premium human-sounding voices,
 * and allowing the user to choose their favorite from their system.
 */
export const CharacterTTS = {
  /**
   * Lists all available voices on the current system, sorted with high-quality/premium/natural/neural voices first.
   */
  getHighQualityVoices(): SpeechSynthesisVoice[] {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return [];
      const voices = window.speechSynthesis.getVoices();
      
      // Filter for English voices or others if needed
      const englishVoices = voices.filter(v => v.lang.startsWith("en") || v.lang.startsWith("en-"));
      
      // Sort so premium natural/neural/Google/Microsoft/Apple voices are at the very top
      return [...englishVoices].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // High quality indicators
        const aIsPremium = aName.includes("natural") || aName.includes("neural") || aName.includes("premium") || aName.includes("google") || aName.includes("siri");
        const bIsPremium = bName.includes("natural") || bName.includes("neural") || bName.includes("premium") || bName.includes("google") || bName.includes("siri");
        
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        
        // Secondary priority: Microsoft/Apple/Google brand voices
        const aBrand = aName.includes("microsoft") || aName.includes("apple") || aName.includes("google");
        const bBrand = bName.includes("microsoft") || bName.includes("apple") || bName.includes("google");
        
        if (aBrand && !bBrand) return -1;
        if (!aBrand && bBrand) return 1;
        
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      console.warn("Failed to get voices:", e);
      return [];
    }
  },

  /**
   * Speaks the provided text in the character's signature voice.
   */
  speak(
    text: string,
    character: "yoda" | "ragebaiter",
    isUnhinged: boolean,
    onStart?: () => void,
    onEnd?: () => void,
    preferredVoiceName?: string
  ) {
    try {
      // Cancel any ongoing speaking immediately
      window.speechSynthesis.cancel();
      SoundFX.stopSaberHum();

      if (!text) {
        if (onEnd) onEnd();
        return;
      }

      // Clean the text to avoid robotically reading out emojis, markdown links, asterisks or code fragments
      const cleanedText = text
        .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "") // Emojis
        .replace(/\*\*|__/g, "") // Bold
        .replace(/\*|_/g, "") // Italic
        .replace(/`[^`]+`/g, "") // Inline code
        .replace(/Ratio \+ L \+ Fell off/gi, "Ratio, L, Fell off") // Spell acronyms naturally
        .replace(/NPC/g, "N P C")
        .replace(/YOLO/gi, "Yo-low")
        .replace(/DDOS/gi, "D-dos")
        .trim();

      if (!cleanedText) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const voices = this.getHighQualityVoices();
      
      let selectedVoice: SpeechSynthesisVoice | null = null;

      // 1. Try preferred voice if specified
      if (preferredVoiceName) {
        selectedVoice = voices.find(v => v.name === preferredVoiceName) || null;
      }

      // 2. If no preferred voice, look for Premium/Natural/Neural Google or Apple voices
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes("natural") || name.includes("neural") || name.includes("premium") || name.includes("google") || name.includes("siri");
        }) || null;
      }

      // 3. Fallback to any english voice
      if (!selectedVoice) {
        selectedVoice = voices[0] || null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`[TTS Engine] Selected realistic voice: ${selectedVoice.name} (Local: ${selectedVoice.localService})`);
      }

      // Configure distinct, rich audio profiles for each character / Force Side
      if (character === "yoda") {
        if (isUnhinged) {
          // Sinister Darth Yoda
          utterance.pitch = 0.55; // Sinister deep baritone
          utterance.rate = 0.78;  // Very slow, looming, authoritative
          utterance.volume = 1.0;
          
          utterance.onstart = () => {
            if (onStart) onStart();
            // Deep, rumbling red lightsaber hum in background
            SoundFX.startSaberHum(true, 0.12);
          };
        } else {
          // Sagely, calm Yoda
          utterance.pitch = 0.85; // Slightly lower, cozy grandmaster tone
          utterance.rate = 0.82;  // Slow, wise, thoughtful pacing
          utterance.volume = 0.9;

          utterance.onstart = () => {
            if (onStart) onStart();
            // Soft Dagobah green hum in background
            SoundFX.startSaberHum(false, 0.06);
          };
        }
      } else {
        // Ragebaiter Jar Jar / Troll
        if (isUnhinged) {
          // Screaming high-pitched chaotic troll
          utterance.pitch = 1.45; // Comically high-pitched squeak
          utterance.rate = 1.25;  // Hyper-fast, frenzied, chaotic
          utterance.volume = 1.0;
        } else {
          // Snarky, passive-aggressive keyboard warrior
          utterance.pitch = 1.22; // Slightly higher cartoon pitch
          utterance.rate = 1.05;  // Punchy, snappy, fast talking
          utterance.volume = 0.85;
        }

        utterance.onstart = () => {
          if (onStart) onStart();
        };
      }

      utterance.onend = () => {
        SoundFX.stopSaberHum();
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        SoundFX.stopSaberHum();
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis failed", e);
      if (onEnd) onEnd();
    }
  },

  /**
   * Stop any current character speech.
   */
  stop() {
    try {
      window.speechSynthesis.cancel();
      SoundFX.stopSaberHum();
    } catch (e) {
      console.warn("Speech stop failed", e);
    }
  }
};
