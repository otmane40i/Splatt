import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getFirebaseApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  return getApps()[0] ?? initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
    });
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  if (!app) return null;

  return getFirestore();
}

export function getFirebaseBucket() {
  const app = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!app || !bucketName) return null;

  return getStorage(app).bucket(bucketName);
}
