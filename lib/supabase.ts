import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import "react-native-url-polyfill/auto";

// Priority: process.env → app.config.js extra → hardcoded fallback
// Hardcoded fallbacks ensure Expo Go (QR scan) doesn't throw on module load
const FALLBACK_URL = "https://vqsjleohxselivlkutkc.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc2psZW9oeHNlbGl2bGt1dGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzM2NDMsImV4cCI6MjA5MTEwOTY0M30.8OJOCiDP00Fd81veAX8pDMGPLgU4p7muOS5ePTxt4H0";

const extra = Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};
const supabaseUrl: string =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ??
  (extra.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ??
  (extra.supabaseUrl as string | undefined) ??
  FALLBACK_URL;
const supabaseAnonKey: string =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ??
  (extra.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ??
  (extra.supabaseAnonKey as string | undefined) ??
  FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
