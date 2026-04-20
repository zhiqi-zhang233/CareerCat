"use client";

import {
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { COGNITO_CONFIG, hasCognitoConfig, isCognitoMode } from "./authConfig";

function getUserPool() {
  if (!hasCognitoConfig()) return null;

  return new CognitoUserPool({
    UserPoolId: COGNITO_CONFIG.userPoolId,
    ClientId: COGNITO_CONFIG.clientId,
  });
}

export async function getCurrentAuthToken() {
  if (!isCognitoMode() || typeof window === "undefined") return "";

  const userPool = getUserPool();
  const currentUser = userPool?.getCurrentUser();
  if (!currentUser) return "";

  return new Promise<string>((resolve) => {
    currentUser.getSession((error: Error | null, session: CognitoUserSession) => {
      if (error || !session?.isValid()) {
        resolve("");
        return;
      }

      resolve(session.getIdToken().getJwtToken());
    });
  });
}
