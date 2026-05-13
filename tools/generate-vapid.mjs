#!/usr/bin/env node
// One-shot VAPID key generator. Run once when setting up the push backend:
//   node tools/generate-vapid.mjs
// Prints a public + private key pair you paste into:
//   - js/config.js (the public key — safe to commit)
//   - Cloudflare Worker env vars (private key — KEEP SECRET)

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID keys generated.\n");
console.log("PUBLIC  (paste into js/config.js → vapidPublicKey):");
console.log("  " + keys.publicKey + "\n");
console.log("PRIVATE (paste into Cloudflare Worker secret VAPID_PRIVATE_KEY):");
console.log("  " + keys.privateKey + "\n");
console.log("Also set VAPID_PUBLIC_KEY = " + keys.publicKey + " on the worker (used to send pushes).");
console.log("Also set VAPID_SUBJECT  = mailto:zach@example.com");
