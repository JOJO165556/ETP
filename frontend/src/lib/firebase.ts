/*
 * Client Firebase Auth — migration de l'OAuth custom (Authlib) vers Firebase :
 * Google, Facebook, email/password et Phone + App Check.
 *
 * Le projet n'est PAS encore cree dans Firebase, toutes les valeurs ci-dessous
 * sont des placeholders. Le lib bascule en mode dgrade (aucune initialisation
 * Firebase) tant que NEXT_PUBLIC_FIREBASE_* ne sont pas renseignes.
 *
 * Le flux : Firebase sign in cote client (SDK web), puis l'ID token est envoye
 * a l'endpoint ETP /api/v1/auth/firebase qui verifie cote serveur avec
 * firebase-admin et pose les cookies de session ETP.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  GoogleAuthProvider,
  FacebookAuthProvider,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { initializeAppCheck, getToken, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import type { FirebaseSessionUser } from "@/types";

/* --- Configuration (placeholders : https://firebase.google.com/docs/web/setup) --- */

interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

/*
 * IMPORTANT : Next.js substitue process.env.NEXT_PUBLIC_* statiquement a la
 * compilation (webpack DefinePlugin). Il ne faut donc JAMAIS acceder aux
 * variables par un nom de cle calcule (process.env["NEXT_PUBLIC_" + ...]) :
 * la substitution ne s'applique pas et la valeur serait toujours indefinie
 * cote navigateur. Acces directs uniquement.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

function getFirebaseConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

/* --- Initialisation lazy, uniquement cote navigateur --- */

let _app: FirebaseApp | null = null;
let _appCheck: AppCheck | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (_app) return _app;
  if (!isFirebaseConfigured()) return null;
  _app = initializeApp(getFirebaseConfig());
  return _app;
}

/**
 * App Check : active uniquement si un site key reCAPTCHA v3 est defini.
 * Le token est ensuite attache a chaque appel backend (header
 * X-Firebase-AppCheck) si disponible. Tant que FIREBASE_APP_CHECK_ENABLED
 * n'est pas renseigne, aucun token n'est envoye et le backend traite la
 * verification comme satisfaite (mode dgrade).
 */
export async function getFirebaseAppCheckToken(): Promise<string | null> {
  try {
    const app = getFirebaseApp();
    if (!app || !process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY) return null;
    if (!_appCheck) {
      _appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
        ),
      });
    }
    const { token } = await getToken(_appCheck);
    return token;
  } catch {
    return null;
  }
}

function toSessionUser(user: User): FirebaseSessionUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

/** Connexion Google via popup. */
export async function signInWithGoogle(): Promise<FirebaseSessionUser> {
  const auth = getAuth(getFirebaseApp()!);
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return toSessionUser(result.user);
}

/** Connexion Facebook via popup. */
export async function signInWithFacebook(): Promise<FirebaseSessionUser> {
  const auth = getAuth(getFirebaseApp()!);
  const result = await signInWithPopup(auth, new FacebookAuthProvider());
  return toSessionUser(result.user);
}

/** Connexion email/mot de passe (100% Firebase). */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseSessionUser> {
  const auth = getAuth(getFirebaseApp()!);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return toSessionUser(result.user);
}

/** Creation de compte email/mot de passe (100% Firebase). */
export async function createAccountWithEmail(
  email: string,
  password: string
): Promise<FirebaseSessionUser> {
  const auth = getAuth(getFirebaseApp()!);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return toSessionUser(credential.user);
}

/* --- Connexion par numero de telephone (SMS) --- */

export interface PhoneVerificationHandle {
  confirmation: ConfirmationResult;
}

/**
 * Envoie un code SMS sur le numero donne. Le conteneur reCAPTCHA doit etre
 * present et visible dans le DOM (position absolue / invisible autorisee).
 */
export async function requestPhoneCode(
  phone: string
): Promise<PhoneVerificationHandle> {
  const auth = getAuth(getFirebaseApp()!);
  const verifier = new RecaptchaVerifier(auth, "firebase-recaptcha", {
    size: "invisible",
  });
  const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  return { confirmation };
}

/** Confirme le code SMS recu. */
export async function confirmPhoneCode(
  handle: PhoneVerificationHandle,
  code: string
): Promise<FirebaseSessionUser> {
  const result = await handle.confirmation.confirm(code);
  return toSessionUser(result.user);
}

/** Deconnexion cote Firebase (session popup). */
export async function signOutFirebase(): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  await signOut(getAuth(app));
}

/** Envoie le lien firebase de reinitialisation de mot de passe. */
export async function sendPasswordReset(email: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  await sendPasswordResetEmail(getAuth(app), email);
}

/**
 * Echange l'ID token Firebase contre une session ETP :
 * call /api/v1/auth/firebase (proxifie vers le backend) + pose des cookies
 * HttpOnly via /api/auth/set-cookie.
 */
export async function exchangeFirebaseSession(
  user: FirebaseSessionUser,
  profile?: { first_name?: string; last_name?: string; role?: string }
): Promise<boolean> {
  const auth = getAuth(getFirebaseApp()!);
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return false;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const appCheckToken = await getFirebaseAppCheckToken();
  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }

  const res = await fetch("/api/v1/auth/firebase", {
    method: "POST",
    headers,
    body: JSON.stringify({ id_token: idToken, ...profile }),
  });
  if (!res.ok) return false;

  const tokens = await res.json();
  const cookie = await fetch("/api/auth/set-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokens),
  });
  return cookie.ok;
}