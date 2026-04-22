import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Dossiers from "@/pages/Dossiers";
import DossierDetail from "@/pages/DossierDetail";
import CompteRendus from "@/pages/CompteRendus";
import Chiffrage from "@/pages/Chiffrage";
import Catalogue from "@/pages/Catalogue";
import Schemas from "@/pages/Schemas";
import PowerPoint from "@/pages/PowerPoint";
import Bibliotheque from "@/pages/Bibliotheque";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/pipeline" replace />} />
        <Route path="pipeline" element={<Dashboard />} />
        <Route path="dossiers" element={<Dossiers />} />
        <Route path="dossiers/:id" element={<DossierDetail />} />
        <Route path="comptes-rendus" element={<CompteRendus />} />
        <Route path="chiffrage" element={<Chiffrage />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="schemas" element={<Schemas />} />
        <Route path="powerpoint" element={<PowerPoint />} />
        <Route path="bibliotheque" element={<Bibliotheque />} />
      </Route>
    </Routes>
  );
}
