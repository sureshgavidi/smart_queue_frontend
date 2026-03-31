import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWpPDuEGD7ASqvfN4ve8vNyoUh27YpJxY",
  authDomain: "smart-queue-d6d5e.firebaseapp.com",
  projectId: "smart-queue-d6d5e",
  storageBucket: "smart-queue-d6d5e.firebasestorage.app",
  messagingSenderId: "479839056285",
  appId: "1:479839056285:web:512bd9f3e05462535c3f74",
  measurementId: "G-KY56XVHPK2"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();