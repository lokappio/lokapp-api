import * as admin from "firebase-admin";

export function customBootstrap(): void {
  // Initialize the firebase admin app
  console.log(process.env.FIREBASE_CONFIG);
  admin.initializeApp({
    credential: admin.credential.cert(<admin.ServiceAccount>JSON.parse(process.env.FIREBASE_CONFIG))
  });
}