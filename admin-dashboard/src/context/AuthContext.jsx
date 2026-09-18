import React, { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setAdmin(api.getStoredAdmin() || { name: "Site Administrator", email: "", role: "admin" });
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
