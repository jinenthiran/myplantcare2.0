import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Blueprint-synchronized validation constants
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function sanitizeSafeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return ID_REGEX.test(cleaned) ? cleaned : `doc_${Date.now()}`;
}

export async function syncUserPreferencesToFirestore(params: {
  userId: string;
  displayName: string;
  theme: 'dark' | 'light';
  preferredLanguage: 'en' | 'ta';
  preferredModel: 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
}) {
  if (!auth.currentUser || auth.currentUser.uid !== params.userId) return;
  const safeUid = sanitizeSafeId(params.userId);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  const safeDisplayName = (params.displayName || 'Botanical Explorer').trim().slice(0, 80) || 'Botanical Explorer';
  const safeTheme = params.theme === 'light' ? 'light' : 'dark';
  const safeLang = params.preferredLanguage === 'ta' ? 'ta' : 'en';
  const validModels = ['gemini-4-argon', 'gemini-4-carbon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'] as const;
  const safeModel = validModels.includes(params.preferredModel) ? params.preferredModel : 'gemini-3.8-flash';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        userId: safeUid,
        displayName: safeDisplayName,
        theme: safeTheme,
        preferredLanguage: safeLang,
        preferredModel: safeModel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: safeDisplayName,
        theme: safeTheme,
        preferredLanguage: safeLang,
        preferredModel: safeModel,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBotanicalNoteToFirestore(params: {
  userId: string;
  plantName: string;
  noteText: string;
  category: 'Observation' | 'Search Grounding' | 'Live Voice Summary' | 'Care Log';
}) {
  if (!auth.currentUser || auth.currentUser.uid !== params.userId) return null;
  const safeUid = sanitizeSafeId(params.userId);
  const noteId = sanitizeSafeId(`note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `botanicalNotes/${noteId}`;

  const safePlantName = (params.plantName || 'Sanctuary Specimen').trim().slice(0, 100) || 'Sanctuary Specimen';
  const safeNoteText = (params.noteText || 'Recorded observation.').trim().slice(0, 1000) || 'Recorded observation.';
  const allowedCategories = ['Observation', 'Search Grounding', 'Live Voice Summary', 'Care Log'] as const;
  const safeCategory = allowedCategories.includes(params.category) ? params.category : 'Observation';

  try {
    await setDoc(doc(db, 'botanicalNotes', noteId), {
      userId: safeUid,
      plantName: safePlantName,
      noteText: safeNoteText,
      category: safeCategory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return noteId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteBotanicalNoteFromFirestore(noteId: string) {
  if (!auth.currentUser) return;
  const safeId = sanitizeSafeId(noteId);
  const path = `botanicalNotes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'botanicalNotes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToBotanicalNotes(
  userId: string,
  onNotes: (notes: any[]) => void
): Unsubscribe {
  const safeUid = sanitizeSafeId(userId);
  const path = 'botanicalNotes';
  const q = query(collection(db, path), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onNotes(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveGardenLayoutToFirestore(params: {
  userId: string;
  title: string;
  lightingPreset: 'golden' | 'daylight' | 'bioluminescent';
  specimenCount: number;
}) {
  if (!auth.currentUser || auth.currentUser.uid !== params.userId) return null;
  const safeUid = sanitizeSafeId(params.userId);
  const layoutId = sanitizeSafeId(`layout_${Date.now()}`);
  const path = `gardenLayouts/${layoutId}`;

  const safeTitle = (params.title || '3D Conservatory Snapshot').trim().slice(0, 100) || '3D Conservatory Snapshot';
  const allowedLights = ['golden', 'daylight', 'bioluminescent'] as const;
  const safeLight = allowedLights.includes(params.lightingPreset) ? params.lightingPreset : 'golden';
  const safeCount = Math.max(1, Math.min(50, Math.round(Number(params.specimenCount) || 5)));

  try {
    await setDoc(doc(db, 'gardenLayouts', layoutId), {
      userId: safeUid,
      title: safeTitle,
      lightingPreset: safeLight,
      specimenCount: safeCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return layoutId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToGardenLayouts(
  userId: string,
  onLayouts: (layouts: any[]) => void
): Unsubscribe {
  const safeUid = sanitizeSafeId(userId);
  const path = 'gardenLayouts';
  const q = query(collection(db, path), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onLayouts(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
