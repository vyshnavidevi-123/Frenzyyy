import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDYYbo7hvXtP8U46l4G8YtEKNd81Dqed1I",

  authDomain: "playverse-12de5.firebaseapp.com",

  projectId: "playverse-12de5",

  storageBucket: "playverse-12de5.firebasestorage.app",

  messagingSenderId: "154951448096",

  appId: "1:154951448096:web:e0834a9b930ea928ffae45",

  measurementId: "G-DMMX379NJZ"

};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
