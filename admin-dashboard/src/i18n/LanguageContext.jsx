import React, { createContext, useContext, useMemo, useState } from "react";
import { t } from "./strings.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem("dashboard_lang") || "en"
  );

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem("dashboard_lang", code);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang: changeLang,
      t: (key) => t(lang, key)
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
