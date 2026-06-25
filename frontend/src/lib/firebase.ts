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
import { ChatSession } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDMm--MM0-MSOTLeiFvc5Gtt-KupX3ouqs",
  authDomain: "bold-tempest-hlll2.firebaseapp.com",
  projectId: "bold-tempest-hlll2",
  storageBucket: "bold-tempest-hlll2.firebasestorage.app",
  messagingSenderId: "405032464740",
  appId: "1:405032464740:web:08e9b9c689470a70950a71"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app, "ai-studio-25645647-56c2-4567-9044-6c98e8a2b3cf");


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
