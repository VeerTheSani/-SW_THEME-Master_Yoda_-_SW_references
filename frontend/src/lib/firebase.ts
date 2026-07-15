import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection
} from "firebase/firestore";
import { ChatSession, CharacterId, CharacterMemoryGraph, RoundtableEntry, RoundtableSession } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app, import.meta.env.VITE_FIRESTORE_DATABASE_ID);


export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Scopes for natural profile info
googleProvider.addScope("profile");
googleProvider.addScope("email");

githubProvider.addScope("read:user");

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };

/**
 * Saves a single chat session to Firestore under the user's document path.
 */
export async function dbSaveSession(userId: string, session: ChatSession) {
  try {
    const docRef = doc(db, "users", userId, "sessions", session.id);
    const sanitizedMessages = session.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      mode: m.mode || null,
      isFallback: !!m.isFallback,
      isModelFallback: !!m.isModelFallback,
      actualModelUsed: m.actualModelUsed || null,
      character: m.character || null,
      isUnhinged: !!m.isUnhinged
    }));

    await setDoc(docRef, {
      id: session.id,
      title: session.title,
      messages: sanitizedMessages,
      createdAt: session.createdAt,
      ragebaitLevel: session.ragebaitLevel,
      responseLength: session.responseLength,
      selectedModel: session.selectedModel || "gemini-2.5-flash",
      character: session.character || "yoda",
      mode: session.mode || "roast",
      isUnhinged: !!session.isUnhinged,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Firestore dbSaveSession failed:", e);
  }
}

/**
 * Deletes a chat session from Firestore.
 */
export async function dbDeleteSession(userId: string, sessionId: string) {
  try {
    const docRef = doc(db, "users", userId, "sessions", sessionId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Firestore dbDeleteSession failed:", e);
  }
}

/**
 * Loads all chat sessions for a given user from Firestore.
 */
export async function dbLoadSessions(userId: string): Promise<ChatSession[]> {
  try {
    const colRef = collection(db, "users", userId, "sessions");
    const snap = await getDocs(colRef);
    const sessions: ChatSession[] = [];
    
    snap.forEach(d => {
      const data = d.data();
      sessions.push({
        id: d.id,
        title: data.title || "Untitled Transmission",
        createdAt: data.createdAt || new Date().toISOString(),
        ragebaitLevel: data.ragebaitLevel ?? 0.5,
        responseLength: data.responseLength ?? "medium",
        selectedModel: data.selectedModel || "gemini-2.5-flash",
        character: data.character || "yoda",
        mode: data.mode || "roast",
        isUnhinged: !!data.isUnhinged,
        messages: (data.messages || []).map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.timestamp),
          mode: m.mode || undefined,
          isFallback: !!m.isFallback,
          isModelFallback: !!m.isModelFallback,
          actualModelUsed: m.actualModelUsed || undefined,
          character: m.character || undefined,
          isUnhinged: !!m.isUnhinged
        }))
      });
    });

    // Sort ascending by creation time so they appear chronologically in sidebar
    return sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (e) {
    console.error("Firestore dbLoadSessions failed:", e);
    return [];
  }
}

// ==============================================================================
// THE ROUNDTABLE — per-character graph memory + table session persistence
// ==============================================================================

/**
 * Saves one character's knowledge graph to users/{uid}/characterMemory/{characterId}.
 * Field-by-field sanitize, house pattern: Firestore rejects `undefined`.
 */
export async function dbSaveCharacterMemory(userId: string, graph: CharacterMemoryGraph) {
  try {
    const docRef = doc(db, "users", userId, "characterMemory", graph.characterId);
    await setDoc(docRef, {
      characterId: graph.characterId,
      version: graph.version ?? 0,
      updatedAt: graph.updatedAt || new Date().toISOString(),
      nodes: (graph.nodes || []).map(n => ({
        id: n.id,
        label: n.label || "",
        type: n.type || "concept",
        summary: n.summary || "",
        stance: n.stance ?? null,
        salience: n.salience ?? 0.5,
        mentions: n.mentions ?? 1,
        createdAt: n.createdAt || "",
        updatedAt: n.updatedAt || ""
      })),
      edges: (graph.edges || []).map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relation: e.relation || "related_to",
        stance: e.stance ?? null,
        weight: e.weight ?? 0.5,
        note: e.note ?? null,
        createdAt: e.createdAt || "",
        updatedAt: e.updatedAt || ""
      }))
    });
  } catch (e) {
    console.error("Firestore dbSaveCharacterMemory failed:", e);
  }
}

/**
 * Loads every character memory graph stored for this user, keyed by characterId.
 */
export async function dbLoadCharacterMemories(userId: string): Promise<Partial<Record<CharacterId, CharacterMemoryGraph>>> {
  try {
    const colRef = collection(db, "users", userId, "characterMemory");
    const snap = await getDocs(colRef);
    const memories: Partial<Record<CharacterId, CharacterMemoryGraph>> = {};
    snap.forEach(d => {
      const data = d.data();
      memories[d.id as CharacterId] = {
        characterId: d.id as CharacterId,
        version: data.version ?? 0,
        updatedAt: data.updatedAt || "",
        nodes: (data.nodes || []).map((n: any) => ({
          id: n.id,
          label: n.label || "",
          type: n.type || "concept",
          summary: n.summary || "",
          stance: n.stance ?? null,
          salience: n.salience ?? 0.5,
          mentions: n.mentions ?? 1,
          createdAt: n.createdAt || "",
          updatedAt: n.updatedAt || ""
        })),
        edges: (data.edges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation || "related_to",
          stance: e.stance ?? null,
          weight: e.weight ?? 0.5,
          note: e.note ?? null,
          createdAt: e.createdAt || "",
          updatedAt: e.updatedAt || ""
        }))
      };
    });
    return memories;
  } catch (e) {
    console.error("Firestore dbLoadCharacterMemories failed:", e);
    return {};
  }
}

function sanitizeRoundtableEntry(entry: RoundtableEntry): Record<string, any> {
  if (entry.kind === "user") {
    return { kind: "user", id: entry.id, text: entry.text, targetCharacterId: entry.targetCharacterId ?? null, timestamp: entry.timestamp };
  }
  if (entry.kind === "turn") {
    return {
      kind: "turn",
      id: entry.id,
      speaker: entry.speaker,
      turnIndex: entry.turnIndex ?? 0,
      directive: entry.directive ?? null,
      routerReasoning: entry.routerReasoning ?? null,
      innerThought: entry.innerThought || "",
      publicReply: entry.publicReply || "",
      stanceScore: entry.stanceScore ?? null,
      recalledNodeLabels: entry.recalledNodeLabels ?? [],
      isFallback: !!entry.isFallback,
      judgeScore: entry.judgeScore ?? null,
      judgeVerdict: entry.judgeVerdict ?? null,
      timestamp: entry.timestamp
    };
  }
  const synthesis = entry.synthesis;
  return {
    kind: "synthesis",
    id: entry.id,
    timestamp: entry.timestamp,
    synthesis: synthesis.kind === "pitch"
      ? {
          kind: "pitch",
          verdict: synthesis.verdict,
          summary: synthesis.summary || "",
          scorecard: (synthesis.scorecard || []).map(s => ({
            judge: s.judge, score: s.score ?? 0, objection: s.objection || ""
          }))
        }
      : {
          kind: "boardroom",
          decision: synthesis.decision || "",
          rationale: synthesis.rationale || "",
          dissent: synthesis.dissent ?? null,
          actionItems: (synthesis.actionItems || []).map(a => ({ owner: a.owner || "user", item: a.item || "" }))
        }
  };
}

/**
 * Saves a roundtable session (table transcript) to users/{uid}/roundtableSessions/{id}.
 * Note: turn entries drop memoryDelta on purpose — deltas are already merged into
 * the character graphs; the transcript only needs what is displayed.
 */
export async function dbSaveRoundtableSession(userId: string, session: RoundtableSession) {
  try {
    const docRef = doc(db, "users", userId, "roundtableSessions", session.id);
    await setDoc(docRef, {
      id: session.id,
      title: session.title || "Table session",
      mode: session.mode,
      participants: session.participants || [],
      entries: (session.entries || []).map(sanitizeRoundtableEntry),
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Firestore dbSaveRoundtableSession failed:", e);
  }
}

/**
 * Loads all roundtable sessions for this user, oldest first.
 */
export async function dbLoadRoundtableSessions(userId: string): Promise<RoundtableSession[]> {
  try {
    const colRef = collection(db, "users", userId, "roundtableSessions");
    const snap = await getDocs(colRef);
    const sessions: RoundtableSession[] = [];
    snap.forEach(d => {
      const data = d.data();
      sessions.push({
        id: d.id,
        title: data.title || "Table session",
        mode: data.mode === "boardroom" ? "boardroom" : "pitch",
        participants: data.participants || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || "",
        entries: (data.entries || []).map((entry: any): RoundtableEntry => {
          if (entry.kind === "user") {
            return { kind: "user", id: entry.id, text: entry.text || "", targetCharacterId: entry.targetCharacterId ?? null, timestamp: entry.timestamp || "" };
          }
          if (entry.kind === "turn") {
            return {
              kind: "turn",
              id: entry.id,
              speaker: entry.speaker,
              turnIndex: entry.turnIndex ?? 0,
              directive: entry.directive ?? undefined,
              routerReasoning: entry.routerReasoning ?? undefined,
              innerThought: entry.innerThought || "",
              publicReply: entry.publicReply || "",
              stanceScore: entry.stanceScore ?? null,
              recalledNodeLabels: entry.recalledNodeLabels || [],
              isFallback: !!entry.isFallback,
              judgeScore: entry.judgeScore ?? null,
              judgeVerdict: entry.judgeVerdict ?? null,
              timestamp: entry.timestamp || ""
            };
          }
          return { kind: "synthesis", id: entry.id, synthesis: entry.synthesis, timestamp: entry.timestamp || "" };
        })
      });
    });
    return sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (e) {
    console.error("Firestore dbLoadRoundtableSessions failed:", e);
    return [];
  }
}

/**
 * Deletes a roundtable session.
 */
export async function dbDeleteRoundtableSession(userId: string, sessionId: string) {
  try {
    await deleteDoc(doc(db, "users", userId, "roundtableSessions", sessionId));
  } catch (e) {
    console.error("Firestore dbDeleteRoundtableSession failed:", e);
  }
}
