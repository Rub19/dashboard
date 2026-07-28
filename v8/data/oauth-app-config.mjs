// Public OAuth app identifiers (Client IDs). Not secret: they are always
// visible in the browser's redirect URL anyway. Each app's Client Secret
// stays exclusively in the ETHONE Worker and is never exposed here.
export const OAUTH_APP_CLIENT_IDS = Object.freeze({
  github: "Ov23li7gnklQJ7ipkgZG",
  "google-calendar": "644274299172-hsan3pc3a2fri6p5m4olmeiont98dk15.apps.googleusercontent.com",
  notion: "3aad872b-594c-81d4-84e4-00377bd542e3"
});
