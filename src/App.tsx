import { Navigate, Route, Routes } from "react-router-dom";
import BuilderPage from "./pages/BuilderPage";
import DnsPage from "./pages/DnsPage";
import ShellLayout from "./pages/ShellLayout";

function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<Navigate to="/builder" replace />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/dns" element={<DnsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
