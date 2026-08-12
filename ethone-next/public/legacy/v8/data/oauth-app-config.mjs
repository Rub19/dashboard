// Public OAuth app identifiers (Client IDs). Not secret: they are always
// visible in the browser's redirect URL anyway. Each app's Client Secret
// stays exclusively in the ETHONE Worker and is never exposed here.
const GOOGLE_CLIENT_ID = "644274299172-hsan3pc3a2fri6p5m4olmeiont98dk15.apps.googleusercontent.com";

export const OAUTH_APP_CLIENT_IDS = Object.freeze({
  spotify: "6619fbf6315e4e68948dc08532251912",
  github: "Ov23li7gnklQJ7ipkgZG",
  "google-calendar": GOOGLE_CLIENT_ID,
  notion: "3aad872b-594c-81d4-84e4-00377bd542e3",
  todoist: "498125e861a443339edf551bb605413e",
  "google-drive": GOOGLE_CLIENT_ID,
  youtube: GOOGLE_CLIENT_ID,
  reddit: ""
});
