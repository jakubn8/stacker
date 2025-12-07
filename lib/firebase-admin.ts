import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function initializeFirebaseAdmin(): { app: App; adminDb: Firestore } {
  let app: App;

  if (getApps().length === 0) {
    // In production (Vercel), use environment variable
    // In development, use local service account file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Local development - use file
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("./firebase-service-account.json");
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    }
  } else {
    app = getApps()[0];
  }

  const adminDb = getFirestore(app);
  return { app, adminDb };
}

// Initialize on import
const { app, adminDb: db } = initializeFirebaseAdmin();

export { db, app };
