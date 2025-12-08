import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

// Lazy initialization - only initialize when first accessed at runtime
let _app: App | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function getFirebaseAdmin(): { app: App; db: Firestore; storage: Storage } {
  if (_app && _db && _storage) {
    return { app: _app, db: _db, storage: _storage };
  }

  if (getApps().length === 0) {
    // Use environment variable for service account (both production and development)
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required. " +
        "Set it to the JSON content of your Firebase service account key."
      );
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    _app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    _app = getApps()[0];
  }

  _db = getFirestore(_app);
  _storage = getStorage(_app);
  return { app: _app, db: _db, storage: _storage };
}

// Export getters that lazily initialize
export const db = {
  collection: (path: string) => getFirebaseAdmin().db.collection(path),
  doc: (path: string) => getFirebaseAdmin().db.doc(path),
  runTransaction: <T>(fn: (transaction: FirebaseFirestore.Transaction) => Promise<T>) =>
    getFirebaseAdmin().db.runTransaction(fn),
  batch: () => getFirebaseAdmin().db.batch(),
};

export const app = new Proxy({} as App, {
  get: (_, prop) => {
    const firebaseApp = getFirebaseAdmin().app;
    const value = (firebaseApp as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(firebaseApp) : value;
  },
});

export const adminStorage = new Proxy({} as Storage, {
  get: (_, prop) => {
    const firebaseStorage = getFirebaseAdmin().storage;
    const value = (firebaseStorage as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(firebaseStorage) : value;
  },
});
