import React, { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // A stored token means a previous session exists. We don't have a
    // "whoami" endpoint in the draft contract yet, so we optimistically
    // restore a minimal admin record; Person 2 can add GET /api/auth/me
    // later and this is the only place that would need to change.
    const token = api.getToken();
    if (token) {
      setAdmin({ name: "Site Administrator", email: "admin@site.local", role: "admin" });
    }
    setChecking(false);
  }, []);

  async function signIn(email, password) {
    const { admin: signedInAdmin } = await api.login(email, password);
    setAdmin(signedInAdmin);
    return signedInAdmin;
  }

  function signOut() {
    api.logout();
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, checking, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
