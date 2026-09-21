import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Overview from "./pages/Overview.jsx";
import Workers from "./pages/Workers.jsx";
import WorkerDetail from "./pages/WorkerDetail.jsx";
import Certificates from "./pages/Certificates.jsx";
import About from "./pages/About.jsx";
import VerifyCertificate from "./pages/VerifyCertificate.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public — this is the URL a certificate's QR code points to. */}
      <Route path="/verify/:code" element={<VerifyCertificate />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Overview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers"
        element={
          <ProtectedRoute>
            <Workers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers/:id"
        element={
          <ProtectedRoute>
            <WorkerDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/results" element={<Navigate to="/workers" replace />} />
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <Certificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
