"use client";

import { useAuth } from "./AuthContext";

export function useLocalUserId() {
  const { userId } = useAuth();
  return userId;
}
