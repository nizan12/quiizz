import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB--dQ0VYcLOyuezxL3VSLvBiJghc_1R1M",
  authDomain: "quiz-b90d4.firebaseapp.com",
  projectId: "quiz-b90d4",
  storageBucket: "quiz-b90d4.firebasestorage.app",
  messagingSenderId: "312113798652",
  appId: "1:312113798652:web:8b688aab2bce78e9ed6679",
  measurementId: "G-F6GC4TW4W6",
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export {
  app,
  db,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
};
