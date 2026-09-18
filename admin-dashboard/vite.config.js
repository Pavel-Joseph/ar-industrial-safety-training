import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Root-level admin dashboard app, kept fully separate from /backend
// per the Day 1 repository correction (see README "Repository placement").
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
