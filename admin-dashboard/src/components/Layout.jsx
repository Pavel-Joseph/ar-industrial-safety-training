import React from "react";
import Topbar from "./Topbar.jsx";
import TopNav from "./TopNav.jsx";

export default function Layout({ title, subtitle, children }) {
  return (
    <div className="shell">
      <div className="main">
        <Topbar title={title} subtitle={subtitle} />
        <TopNav />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
