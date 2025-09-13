// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDe8M3e-BgXeIHciYVoFY0G9vGanMJrTnM",
    authDomain: "sample-firebase-ai-app1-8bd23.firebaseapp.com",
    projectId: "sample-firebase-ai-app1-8bd23",
    storageBucket: "sample-firebase-ai-app1-8bd23.firebasestorage.app",
    messagingSenderId: "906761503869",
    appId: "1:906761503869:web:ff6af13250aeb43e50dd14"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);