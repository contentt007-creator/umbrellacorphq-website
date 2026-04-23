/**
 * firebase-config.js — UCH Firebase Initialisation
 * THIS FILE IS GITIGNORED — never commit to version control.
 *
 * Uses Firebase v11 CDN ESM modules (no bundler required).
 * Import in pages as:  import { auth, db, storage } from '/firebase-config.js';
 * From subdirectories: import { auth, db, storage } from '../firebase-config.js';
 */

import { initializeApp }   from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import { getAuth }          from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';
import { getFirestore }     from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import { getStorage }       from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js';

const firebaseConfig = {
  apiKey:            'AIzaSyC2nm9K8-X4dCwNG50MMHTlhdJkIHo_B5U',
  authDomain:        'umbrella-corp-hq.firebaseapp.com',
  projectId:         'umbrella-corp-hq',
  storageBucket:     'umbrella-corp-hq.firebasestorage.app',
  messagingSenderId: '537421743180',
  appId:             '1:537421743180:web:348d628b2f0ec787b860e9',
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
