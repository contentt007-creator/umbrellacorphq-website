/**
 * js/firebase.js — UCH Firebase Utility Layer
 *
 * High-level wrappers over Firestore, Auth, and Storage.
 * All freelancer pages import from here — never use raw Firebase APIs in page scripts.
 *
 * Collections:
 *   freelancers/{uid}          — freelancer profile document
 *   jobs/{jobId}               — client brief / job document
 *   notifications/{notifId}    — admin & freelancer notification feed
 *
 * Storage paths:
 *   freelancers/{uid}/profile/photo          — profile photo
 *   freelancers/{uid}/portfolio/{itemId}/thumb  — portfolio thumbnail
 *   freelancers/{uid}/portfolio/{itemId}/{n}    — full images
 *   jobs/{jobId}/attachments/{file}          — client-uploaded brief files
 *   jobs/{jobId}/deliverables/{file}         — freelancer-uploaded deliverables
 */

import { auth, db, storage } from '../firebase-config.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';

import {
  doc, collection, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, increment, Timestamp,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';

import {
  ref, uploadBytes, uploadString, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js';


// ─────────────────────────────────────────────────────────────────────────────
// TIER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const TIERS = {
  bronze: { label: 'Bronze', color: '#cd7f32', payout: 75 },
  silver: { label: 'Silver', color: '#c0c0c0', payout: 77 },
  gold:   { label: 'Gold',   color: '#FFD700', payout: 80 },
};

export function getTierSuggestion(completedJobs = 0, rating = 0) {
  if (completedJobs >= 20 && rating >= 4.5) return 'gold';
  if (completedJobs >= 8  && rating >= 4.0) return 'silver';
  return 'bronze';
}

// Talent types — only photographers & cinematographers
export const TALENT_TYPES = ['Photographer', 'Cinematographer'];

// Event specialisations (used as skill tags for filtering)
export const EVENT_TYPES = [
  'Wedding / Marriage',
  'Birthday Party',
  'Influencer Shoot',
  'Product Shoot',
  'Corporate Event',
  'Fashion / Editorial',
  'Engagement / Pre-wedding',
  'Baby Shower',
  'Music Video',
  'Documentary',
  'Real Estate',
  'Food Photography',
  'Street / Documentary',
];

// Backward-compat alias — showcase.js filters use SKILL_TAGS name
export const SKILL_TAGS = EVENT_TYPES;

// Equipment & gear tags
export const EQUIPMENT_TAGS = [
  // Camera bodies
  'Sony A7 Series', 'Sony FX Series', 'Canon R Series', 'Canon EOS Series',
  'Nikon Z Series', 'Fujifilm X Series', 'Blackmagic', 'RED Camera',
  // Drones & aerial
  'DJI Drone', 'DJI Mini', 'DJI Air',
  // Lenses
  '50mm Prime', '85mm Portrait', '35mm Wide', '24-70mm', '70-200mm', '16-35mm Wide',
  'Macro Lens', 'Fisheye',
  // Stabilisation
  'DJI Ronin', 'Zhiyun Gimbal', 'Tripod', 'Monopod', 'Slider',
  // Lighting
  'Studio Strobe', 'LED Panel', 'Ring Light', 'Softbox', 'Reflector', 'Natural Light Only',
  // Editing
  'Adobe Lightroom', 'Adobe Photoshop', 'Adobe Premiere', 'DaVinci Resolve',
  'Final Cut Pro', 'Capture One', 'After Effects',
];

export const BD_DISTRICTS = [
  'Bagerhat','Bandarban','Barguna','Barishal','Bhola','Bogura','Brahmanbaria',
  'Chandpur','Chapai Nawabganj','Chattogram','Chuadanga','Cox\'s Bazar',
  'Cumilla','Dhaka','Dinajpur','Faridpur','Feni','Gaibandha','Gazipur',
  'Gopalganj','Habiganj','Jamalpur','Jashore','Jhalokathi','Jhenaidah',
  'Joypurhat','Khagrachhari','Khulna','Kishoreganj','Kurigram','Kushtia',
  'Lakshmipur','Lalmonirhat','Madaripur','Magura','Manikganj','Meherpur',
  'Moulvibazar','Munshiganj','Mymensingh','Naogaon','Narail','Narayanganj',
  'Narsingdi','Natore','Netrokona','Nilphamari','Noakhali','Pabna',
  'Panchagarh','Patuakhali','Pirojpur','Rajbari','Rajshahi','Rangamati',
  'Rangpur','Satkhira','Shariatpur','Sherpur','Sirajganj','Sunamganj',
  'Sylhet','Tangail','Thakurgaon',
];


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new freelancer with Firebase Auth, then create their Firestore profile.
 * @param {string} email
 * @param {string} password
 * @param {object} profileData  — all fields from registration form (Step 1-3 data)
 * @returns {Promise<{uid, error}>}
 */
export async function registerFreelancer(email, password, profileData) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;
    await setDoc(doc(db, 'freelancers', uid), {
      ...profileData,
      id:            `FL-${uid.slice(0, 8).toUpperCase()}`,
      uid,
      email,
      status:        'pending',
      tier:          'bronze',
      joinDate:      serverTimestamp(),
      lastActive:    serverTimestamp(),
      completedJobs: 0,
      totalEarnings: 0,
      rating:        0,
      adminNotes:    '',
      assignedJobs:  [],
      ndaAgreed:     profileData.ndaAgreed     || false,
      ndaTimestamp:  profileData.ndaTimestamp   || null,
      termsAgreed:   profileData.termsAgreed    || false,
      portfolioItems: profileData.portfolioItems || [],
      availableForWork: profileData.availableForWork ?? true,
    });
    // Create admin notification
    await createNotification({
      type:    'new_application',
      title:   'New Freelancer Application',
      body:    `${profileData.fullName} applied as ${profileData.specialisation}`,
      refId:   uid,
      refType: 'freelancer',
    });
    return { uid, error: null };
  } catch (err) {
    return { uid: null, error: err };
  }
}

/**
 * Open the Google OAuth popup and return the signed-in user details.
 * Does NOT touch Firestore — caller decides what to do next.
 * Returns { uid, email, name, photo, error }
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred  = await signInWithPopup(auth, provider);
    return {
      uid:   cred.user.uid,
      email: cred.user.email   || '',
      name:  cred.user.displayName || '',
      photo: cred.user.photoURL    || '',
      error: null,
    };
  } catch (err) {
    return { uid: null, email: '', name: '', photo: '', error: err };
  }
}

/**
 * Create a minimal pending Firestore profile for a Google-authenticated user.
 * Call this after signInWithGoogle() when the profile doesn't yet exist.
 */
export async function createGoogleFreelancerProfile({ uid, email, name, photo }) {
  await setDoc(doc(db, 'freelancers', uid), {
    id:            `FL-${uid.slice(0, 8).toUpperCase()}`,
    uid,
    email,
    fullName:      name,
    profilePhoto:  photo,
    status:        'pending',
    tier:          'bronze',
    joinDate:      serverTimestamp(),
    lastActive:    serverTimestamp(),
    completedJobs: 0,
    totalEarnings: 0,
    rating:        0,
    skills:        [],
    eventTypes:    [],
    equipment:     [],
    portfolioItems: [],
    availableForWork: true,
    ndaAgreed:     false,
  });
}

/**
 * Login freelancer. Returns { uid, status, error }.
 * Checks Firestore status — pending/rejected/suspended get specific errors.
 */
export async function loginFreelancer(email, password) {
  try {
    const cred     = await signInWithEmailAndPassword(auth, email, password);
    const uid      = cred.user.uid;
    const profile  = await getFreelancerProfile(uid);
    if (!profile) return { uid: null, error: { code: 'not-found' } };

    if (profile.status === 'pending')   return { uid, status: 'pending',   error: { code: 'pending' } };
    if (profile.status === 'rejected')  return { uid, status: 'rejected',  error: { code: 'rejected' } };
    if (profile.status === 'suspended') return { uid, status: 'suspended', error: { code: 'suspended' } };

    // Update lastActive
    await updateDoc(doc(db, 'freelancers', uid), { lastActive: serverTimestamp() });
    return { uid, status: 'approved', error: null };
  } catch (err) {
    return { uid: null, error: err };
  }
}

export async function logoutFreelancer() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Change freelancer password (requires current password for reauthentication).
 */
export async function changeFreelancerPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'Not logged in' };
  try {
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// FREELANCER CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getFreelancerProfile(uid) {
  const snap = await getDoc(doc(db, 'freelancers', uid));
  return snap.exists() ? { ...snap.data(), uid: snap.id } : null;
}

export async function updateFreelancerProfile(uid, data) {
  await updateDoc(doc(db, 'freelancers', uid), {
    ...data,
    lastActive: serverTimestamp(),
  });
}

/**
 * Add a single gallery item to the freelancer's portfolioItems array.
 * Item shape: { id, title, category, storageUrl, thumbnail, description, tools[], approved, rejectionReason }
 */
export async function addGalleryItem(uid, item) {
  const ref  = doc(db, 'freelancers', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const items = snap.data().portfolioItems || [];
  items.push(item);
  await updateDoc(ref, { portfolioItems: items, lastActive: serverTimestamp() });
}

/**
 * Remove a gallery item by id and delete its file from Storage.
 */
export async function removeGalleryItem(uid, itemId, storageUrl) {
  // Remove from Firestore array
  const docRef = doc(db, 'freelancers', uid);
  const snap   = await getDoc(docRef);
  if (!snap.exists()) return;
  const items = (snap.data().portfolioItems || []).filter(i => i.id !== itemId);
  await updateDoc(docRef, { portfolioItems: items, lastActive: serverTimestamp() });

  // Delete from Storage (best-effort — don't block on failure)
  if (storageUrl) {
    try {
      const path = decodeURIComponent(storageUrl.split('/o/')[1]?.split('?')[0] || '');
      if (path) await deleteObject(ref(storage, path));
    } catch (_) { /* ignore storage delete errors */ }
  }
}

export async function getAllFreelancers() {
  const snap = await getDocs(collection(db, 'freelancers'));
  return snap.docs.map(d => ({ ...d.data(), uid: d.id }));
}

export async function getApprovedFreelancers() {
  const q    = query(collection(db, 'freelancers'), where('status', '==', 'approved'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), uid: d.id }));
}

export async function getPendingFreelancers() {
  const q    = query(collection(db, 'freelancers'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), uid: d.id }));
}

export async function getFreelancersBySkill(skill) {
  const q    = query(collection(db, 'freelancers'),
    where('status',  '==', 'approved'),
    where('skills',  'array-contains', skill));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), uid: d.id }));
}

/** Admin: approve / reject / suspend / tier change */
export async function adminUpdateFreelancer(uid, updates) {
  await updateDoc(doc(db, 'freelancers', uid), updates);
}

/** Admin: add a portfolio approval decision */
export async function approvePortfolioItem(uid, itemId, approved, rejectionReason = '') {
  const profile = await getFreelancerProfile(uid);
  if (!profile) return;
  const items = (profile.portfolioItems || []).map(item =>
    item.id === itemId ? { ...item, approved, rejectionReason } : item
  );
  await updateDoc(doc(db, 'freelancers', uid), { portfolioItems: items });
}

/** Admin: send notification to a specific freelancer */
export async function notifyFreelancer(uid, message) {
  await createNotification({
    type:       'admin_message',
    title:      'Message from UCH',
    body:       message,
    refId:      uid,
    refType:    'freelancer',
    targetUid:  uid,     // shown in freelancer dashboard
    forAdmin:   false,
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// JOB / BRIEF CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createJob(data) {
  const ref  = await addDoc(collection(db, 'jobs'), {
    ...data,
    submittedAt:         serverTimestamp(),
    status:             'new',
    assignedFreelancers: [],
    uchCutPercent:       25,
    freelancerPayout:    0,
    adminNotes:          '',
    deliverables:        [],
  });
  await createNotification({
    type:    'new_brief',
    title:   'New Client Brief',
    body:    `${data.projectTitle} — ${data.serviceType} — ${data.budget}`,
    refId:   ref.id,
    refType: 'job',
  });
  return ref.id;
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'jobs', jobId));
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

export async function updateJob(jobId, data) {
  await updateDoc(doc(db, 'jobs', jobId), data);
}

export async function getAllJobs() {
  const q    = query(collection(db, 'jobs'), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function getJobsByStatus(status) {
  const q    = query(collection(db, 'jobs'), where('status', '==', status), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function getFreelancerJobs(uid) {
  const q    = query(collection(db, 'jobs'), where('assignedFreelancers', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

/**
 * Assign a freelancer to a job. Updates both the job doc and the freelancer doc.
 */
export async function assignFreelancerToJob(jobId, freelancerUid, job) {
  const payout = job.budgetMin
    ? Math.round(job.budgetMin * (1 - (job.uchCutPercent || 25) / 100))
    : 0;
  await updateDoc(doc(db, 'jobs', jobId), {
    assignedFreelancers: [...(job.assignedFreelancers || []), freelancerUid],
    status:              'assigned',
    freelancerPayout:    payout,
  });
  await updateDoc(doc(db, 'freelancers', freelancerUid), {
    assignedJobs: [...((await getFreelancerProfile(freelancerUid))?.assignedJobs || []), jobId],
  });
  await notifyFreelancer(freelancerUid,
    `You have been assigned a new job: ${job.projectTitle}. Job ID: ${jobId}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotification(data) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    createdAt: serverTimestamp(),
    read:      false,
    forAdmin:  data.forAdmin !== false,   // default: admin notification
  });
}

export async function getAdminNotifications(limitN = 50) {
  const q    = query(
    collection(db, 'notifications'),
    where('forAdmin', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function getFreelancerNotifications(uid, limitN = 30) {
  const q    = query(
    collection(db, 'notifications'),
    where('targetUid', '==', uid),
    where('forAdmin',  '==', false),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

export async function getUnreadAdminCount() {
  const q    = query(
    collection(db, 'notifications'),
    where('forAdmin', '==', true),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  return snap.size;
}

/** Live listener — calls callback(notifications[]) on any change */
export function listenAdminNotifications(callback) {
  const q = query(
    collection(db, 'notifications'),
    where('forAdmin', '==', true),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a File object to Firebase Storage.
 * @returns {Promise<string>} download URL
 */
export async function uploadFile(storagePath, file) {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Upload a base64 data URL to Firebase Storage.
 * @param {string} dataUrl  e.g. "data:image/png;base64,..."
 * @returns {Promise<string>} download URL
 */
export async function uploadDataUrl(storagePath, dataUrl) {
  const storageRef = ref(storage, storagePath);
  await uploadString(storageRef, dataUrl, 'data_url');
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(storagePath) {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (_) { /* file may not exist */ }
}


// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING UTILITIES (shared across all pages)
// ─────────────────────────────────────────────────────────────────────────────

export function formatBDT(n) {
  if (!n && n !== 0) return '৳0';
  const s = String(Math.round(n));
  if (s.length <= 3) return '৳' + s;
  const last3  = s.slice(-3);
  const rest   = s.slice(0, -3);
  const groups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '৳' + groups + ',' + last3;
}

export function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION TODO
// ─────────────────────────────────────────────────────────────────────────────
// 1. Tighten Firestore security rules — add per-document uid checks
// 2. Add Firebase App Check to prevent API key abuse
// 3. Replace base64 portfolio images with direct Firebase Storage uploads
//    (base64 in Firestore hits the 1MB document size limit)
// 4. Add email notifications via Firebase Functions + SendGrid/EmailJS
// 5. Integrate bKash/Nagad/SSLCommerz for payment processing
// 6. Add Firebase Functions for server-side operations (tier auto-promotion, etc.)
