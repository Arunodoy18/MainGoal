import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Form from "./pages/Form";
import Results from "./pages/Results";
import Screening from "./pages/Screening";
import ScreeningResults from "./pages/ScreeningResults";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/screening" element={<Screening />} />
        <Route path="/screening/results" element={<ScreeningResults />} />
        <Route path="/doctor" element={<Form />} />
        <Route path="/doctor/results" element={<Results />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}