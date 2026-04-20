export const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || "local";

export const COGNITO_CONFIG = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || "us-east-2",
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || "",
};

export function isCognitoMode() {
  return AUTH_MODE === "cognito";
}

export function hasCognitoConfig() {
  return Boolean(COGNITO_CONFIG.userPoolId && COGNITO_CONFIG.clientId);
}
