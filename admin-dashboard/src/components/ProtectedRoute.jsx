import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { admin, checking } = useAuth();

  if (checking) return null;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}
