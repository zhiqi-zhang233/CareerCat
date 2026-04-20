"use client";

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { COGNITO_CONFIG, hasCognitoConfig, isCognitoMode } from "./authConfig";
import { createLocalSession, getStoredSession, resetLocalSession } from "./session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  authMode: string;
  status: AuthStatus;
  userId: string;
  email: string;
  error: string;
  isCognito: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: () => void;
  createNewLocalAccount: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getUserPool() {
  if (!hasCognitoConfig()) return null;

  return new CognitoUserPool({
    UserPoolId: COGNITO_CONFIG.userPoolId,
    ClientId: COGNITO_CONFIG.clientId,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const isCognito = isCognitoMode();
  const isConfigured = !isCognito || hasCognitoConfig();

  const loadCurrentUser = useCallback(() => {
    setError("");

    if (!isCognito) {
      const session = getStoredSession() || createLocalSession();
      setUserId(session.user_id);
      setEmail("");
      setStatus("authenticated");
      return;
    }

    const userPool = getUserPool();
    const currentUser = userPool?.getCurrentUser();

    if (!userPool || !currentUser) {
      setUserId("");
      setEmail("");
      setStatus("unauthenticated");
      return;
    }

    currentUser.getSession((sessionError: Error | null, session: CognitoUserSession) => {
      if (sessionError || !session?.isValid()) {
        setUserId("");
        setEmail("");
        setStatus("unauthenticated");
        return;
      }

      const idToken = session.getIdToken();
      const payload = idToken.decodePayload() as { sub?: string; email?: string };
      setUserId(payload.sub || "");
      setEmail(payload.email || currentUser.getUsername());
      setStatus("authenticated");
    });
  }, [isCognito]);

  useEffect(() => {
    const timer = window.setTimeout(loadCurrentUser, 0);
    return () => window.clearTimeout(timer);
  }, [loadCurrentUser]);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    const userPool = getUserPool();
    if (!userPool) {
      throw new Error("Cognito is not configured.");
    }

    const user = new CognitoUser({
      Username: nextEmail,
      Pool: userPool,
    });
    const authDetails = new AuthenticationDetails({
      Username: nextEmail,
      Password: password,
    });

    await new Promise<void>((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: () => resolve(),
        onFailure: (authError) => reject(authError),
      });
    });

    loadCurrentUser();
  }, [loadCurrentUser]);

  const signUp = useCallback(async (nextEmail: string, password: string) => {
    const userPool = getUserPool();
    if (!userPool) {
      throw new Error("Cognito is not configured.");
    }

    const attributes = [
      new CognitoUserAttribute({
        Name: "email",
        Value: nextEmail,
      }),
    ];

    return new Promise<{ needsConfirmation: boolean }>((resolve, reject) => {
      userPool.signUp(nextEmail, password, attributes, [], (signUpError, result) => {
        if (signUpError) {
          reject(signUpError);
          return;
        }

        resolve({ needsConfirmation: !result?.userConfirmed });
      });
    });
  }, []);

  const confirmSignUp = useCallback(async (nextEmail: string, code: string) => {
    const userPool = getUserPool();
    if (!userPool) {
      throw new Error("Cognito is not configured.");
    }

    const user = new CognitoUser({
      Username: nextEmail,
      Pool: userPool,
    });

    await new Promise<void>((resolve, reject) => {
      user.confirmRegistration(code, true, (confirmError) => {
        if (confirmError) {
          reject(confirmError);
          return;
        }

        resolve();
      });
    });
  }, []);

  const resendConfirmationCode = useCallback(async (nextEmail: string) => {
    const userPool = getUserPool();
    if (!userPool) {
      throw new Error("Cognito is not configured.");
    }

    const user = new CognitoUser({
      Username: nextEmail,
      Pool: userPool,
    });

    await new Promise<void>((resolve, reject) => {
      user.resendConfirmationCode((resendError) => {
        if (resendError) {
          reject(resendError);
          return;
        }

        resolve();
      });
    });
  }, []);

  const signOut = useCallback(() => {
    if (isCognito) {
      getUserPool()?.getCurrentUser()?.signOut();
      setUserId("");
      setEmail("");
      setStatus("unauthenticated");
      return;
    }

    resetLocalSession();
    loadCurrentUser();
  }, [isCognito, loadCurrentUser]);

  const createNewLocalAccount = useCallback(() => {
    resetLocalSession();
    loadCurrentUser();
  }, [loadCurrentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authMode: isCognito ? "cognito" : "local",
      status,
      userId,
      email,
      error,
      isCognito,
      isConfigured,
      signIn,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      signOut,
      createNewLocalAccount,
      clearError: () => setError(""),
    }),
    [
      confirmSignUp,
      createNewLocalAccount,
      email,
      error,
      isCognito,
      isConfigured,
      signIn,
      signOut,
      signUp,
      resendConfirmationCode,
      status,
      userId,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
