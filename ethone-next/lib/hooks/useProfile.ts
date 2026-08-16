"use client";

import { usePublicProfileContext } from "@/components/PublicProfileProvider";

export type Profile = {
  public_id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  discoverable?: boolean;
};

export function useProfile() {
  return usePublicProfileContext();
}
