import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, AlertTriangle, X } from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";

// Toast Component
function ErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/80 p-4 font-medium text-red-200 shadow-lg shadow-red-900/20 backdrop-blur-md"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
      <div className="flex-1 break-words text-sm">{message}</div>
      <button onClick={onClose} className="shrink-0 text-red-400 hover:text-red-200">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

const initialForm = {
  age: 45,
  bmi: 24.5,
  sex: "M",
  disc_level: "L4-L5",
  pfirrmann_grade: 3,
  proteoglycan_loss: 1,
  cell_cluster: 1,
  tears_fissure: 1,
  blood_vessels: 0,
  inflammatory_cells: 0,
  mean_od: 0.45,
  fissure_major_axis: 1500,
  nuclei_count: 5000,
  tissue_area_fraction: 0.65,
  harm_entropy: 2.1,
  harm_contrast: 40.5,
  tissue_entropy: 3.2,
};

export default function Form() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" || type === "range" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!apiBaseUrl) {
      setError("API URL is not configured.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/predict`, form);
      // Small artificial delay to show loader for UX
      setTimeout(() => {
        navigate("/doctor/results", { state: { result: response.data } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  };

  const renderInput = (label, name, min, max, step = 1) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input
        required
        type="number"
        name={name}
        min={min}
        max={max}
        step={step}
        value={form[name]}
        onChange={handleChange}
        className="w-full rounded-xl bg-panelSoft px-4 py-3 text-text outline-none ring-1 ring-white/10 transition-all focus:ring-accent"
      />
    </label>
  );

  const renderSlider = (label, name, min, max, step = 1) => (
    <label className="flex flex-col gap-2">
      <div className="flex justify-between text-sm font-medium text-muted">
        <span>{label}</span>
        <span className="text-accent">{form[name]}</span>
      </div>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={form[name]}
        onChange={handleChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-panelSoft accent-accent"
      />
    </label>
  );

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-12 text-text-primary lg:px-20">
      <AnimatePresence>
        {loading && <LoadingSpinner overlay label="Analyzing biomarkers..." size="lg" />}
      </AnimatePresence>
      <AnimatePresence>
        {error && <ErrorToast message={error} onClose={() => setError("")} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl"
      >
        <button
          onClick={() => navigate("/")}
          className="mb-8 flex min-h-11 items-center gap-2 text-text-muted transition hover:text-brand-cyan"
        >
          <ChevronLeft size={20} />
          <span>Back to Home</span>
        </button>

        <div className="card-border rounded-3xl p-8 shadow-glow backdrop-blur-xl sm:p-12">
          <div className="mb-6 rounded-xl border border-[#1a2d4a] bg-bg-secondary px-4 py-3 font-mono-display text-xs uppercase tracking-[0.22em] text-text-muted">
            SMIMS Clinical Portal - Restricted Access
          </div>
          <h2 className="font-display mb-2 text-3xl font-bold tracking-tight text-text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            Patient Diagnosis Form
          </h2>
          <p className="mb-10 text-text-muted">Enter clinical biomarkers to predict surgery risk.</p>

          {error && (
            <div className="mb-8 rounded-xl bg-red-900/30 p-4 text-sm text-red-200 ring-1 ring-red-500/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Demographics */}
            <div className="grid gap-6 sm:grid-cols-3">
              {renderInput("Age", "age", 0, 120)}
              {renderInput("BMI", "bmi", 10, 60, 0.1)}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Sex</span>
                <select
                  name="sex"
                  value={form.sex}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-panelSoft px-4 py-3 text-text outline-none ring-1 ring-white/10 transition-all focus:ring-accent"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </label>
            </div>

            {/* Clinical & MRI */}
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Disc Level</span>
                <select
                  name="disc_level"
                  value={form.disc_level}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-panelSoft px-4 py-3 text-text outline-none ring-1 ring-white/10 transition-all focus:ring-accent"
                >
                  <option value="L3-L4">L3-L4</option>
                  <option value="L4-L5">L4-L5</option>
                  <option value="L5-S1">L5-S1</option>
                </select>
              </label>
              {renderSlider("Pfirrmann Grade (1-4)", "pfirrmann_grade", 1, 4)}
            </div>

            {/* Histological Scores */}
            <div className="grid gap-x-8 gap-y-6 py-4 sm:grid-cols-2 text-sm">
              {renderSlider("Proteoglycan Loss (0-3)", "proteoglycan_loss", 0, 3)}
              {renderSlider("Cell Cluster Score (0-3)", "cell_cluster", 0, 3)}
              {renderSlider("Tears/Fissure Score (0-3)", "tears_fissure", 0, 3)}
              {renderSlider("Blood Vessels Score (0-3)", "blood_vessels", 0, 3)}
              {renderSlider("Inflammatory Cells Score (0-3)", "inflammatory_cells", 0, 3)}
            </div>

            {/* Microscopic & Image Processing Metrics */}
            <div className="grid gap-6 border-t border-white/5 pt-8 sm:grid-cols-3">
              {renderInput("Mean OD", "mean_od", 0, 10, 0.01)}
              {renderInput("Fissure Major Axis (µm)", "fissure_major_axis", 0, 10000, 1)}
              {renderInput("Nuclei Count", "nuclei_count", 0, 50000)}
              {renderInput("Tissue Area Fraction", "tissue_area_fraction", 0, 1, 0.01)}
              {renderInput("HARM Entropy", "harm_entropy", 0, 20, 0.01)}
              {renderInput("HARM Contrast", "harm_contrast", 0, 500, 0.1)}
              {renderInput("Tissue Entropy", "tissue_entropy", 0, 20, 0.01)}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="btn-primary mt-8 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-bold text-black shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-black" size={24} />
                  <span>Processing...</span>
                </>
              ) : (
                "Analyze Patient Data"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
