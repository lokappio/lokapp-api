import * as admin from "firebase-admin";

export function customBootstrap(): void {
  // Initialize the firebase admin app
  admin.initializeApp({
    credential: admin.credential.cert(<admin.ServiceAccount>JSON.parse(process.env.FIREBASE_CONFIG))
  });
}