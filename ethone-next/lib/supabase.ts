"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bvgifyzhpzkbrwdjrqsg.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
