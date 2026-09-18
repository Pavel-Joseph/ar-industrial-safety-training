import React from "react";
import { Flame, Wind, Mountain } from "lucide-react";

// Colour-codes each module everywhere it appears in a table or list (Fire =
// terracotta, Gas = bright teal, Bonus = sand) so an admin scanning a long
// results table can tell modules apart without reading every cell.

const PRESENTATION = {
  mod_fire: { Icon: Flame, cls: "tag-fire", label: "Fire" },
  mod_gas: { Icon: Wind, cls: "tag-gas", label: "Gas" },
  mod_bonus: { Icon: Mountain, cls: "tag-bonus", label: "Bonus" },
  "fire-response": { Icon: Flame, cls: "tag-fire", label: "Fire" },
  "gas-confined-space": { Icon: Wind, cls: "tag-gas", label: "Gas" },
  "jharkhand-mine-safety": { Icon: Mountain, cls: "tag-bonus", label: "Bonus" }
};

export default function ModuleTag({ moduleId, moduleName }) {
  const fallback =
    /gas/i.test(moduleName || "") ? PRESENTATION.mod_gas :
    /bonus|jharkhand/i.test(moduleName || "") ? PRESENTATION.mod_bonus :
    PRESENTATION.mod_fire;
  const { Icon, cls, label } = PRESENTATION[moduleId] || fallback;
  return (
    <span className={`tag ${cls}`}>
      <Icon size={13} strokeWidth={2.4} />
      {label}
    </span>
  );
}
