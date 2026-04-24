import { useMemo } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw, HeartPulse, AlertCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "praana_screening_result";

function getSeverityVisual(label) {
  if (label === "Minimal Disability") {
    return { color: "text-brand-green", bg: "bg-brand-green/15", icon: ShieldCheck };
  }
  if (label === "Moderate Disability") {
    return { color: "text-brand-gold", bg: "bg-brand-gold/15", icon: AlertCircle };
  }
  if (label === "Severe Disability") {
    return { color: "text-orange-300", bg: "bg-orange-400/15", icon: TriangleAlert };
  }
  return { color: "text-brand-red", bg: "bg-brand-red/15", icon: TriangleAlert };
}

function downloadReport(result) {
  const report = `PRAANA Screening Report\n\nBack impact score: ${result.oswestryPercent.toFixed(1)}%\nPain slider score: ${result.vasScore}/10\nSeverity: ${result.label}\n\nRecommendation:\n${result.recommendation}\n`;

  const blob = new Blob([report], { type: "text/plain" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "praana-screening-report.txt";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export default function ScreeningResults() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = useMemo(() => {
    if (location.state?.result) {
      return location.state.result;
    }

    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }, [location.state]);

  if (!result) {
    return <Navigate to="/screening" replace />;
  }

  const { color, bg, icon: Icon } = getSeverityVisual(result.label);
  const ringRadius = 88;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = Math.max(0, Math.min(100, result.oswestryPercent));
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-6 text-text-primary">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="card-border rounded-2xl p-5">
          <h1 className="font-display text-3xl text-text-primary">Your back pain summary</h1>
          <p className="mt-2 text-sm text-text-muted">{result.supportMessage}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-border rounded-2xl p-5"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-56 w-56">
              <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
                <circle cx="110" cy="110" r={ringRadius} stroke="rgba(42,63,95,0.8)" strokeWidth="16" fill="none" />
                <motion.circle
                  cx="110"
                  cy="110"
                  r={ringRadius}
                  stroke="#00E5FF"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-display text-5xl font-bold">{result.oswestryPercent.toFixed(1)}%</span>
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Back Impact</span>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${bg} ${color}`}>
              <Icon size={16} />
              {result.label}
            </div>
          </div>
        </motion.div>

        <div className="card-border rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Pain slider score</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-4xl">{result.emoji}</div>
            <div className="font-mono-display text-4xl text-brand-cyan">{result.vasScore}/10</div>
          </div>
        </div>

        <div className="card-border rounded-2xl border-l-4 border-l-brand-cyan p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Recommendation</div>
          <p className="mt-2 text-base leading-relaxed">{result.recommendation}</p>
        </div>

        {result.saveWarning && (
          <div className="rounded-2xl border border-brand-red/50 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {result.saveWarning}
          </div>
        )}

        {result.oswestryPercent > 40 && (
          <div className="rounded-2xl border border-brand-gold/50 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold">
            Consider sharing this report with a doctor at SMIMS.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => downloadReport(result)}
            className="btn-primary flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            <Download size={18} />
            Download Report
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              navigate("/screening");
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1a2d4a] bg-bg-secondary px-4 py-3 font-semibold text-text-primary transition hover:border-brand-cyan/60"
          >
            <RotateCcw size={18} />
            Start Again
          </button>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mx-auto mt-2 flex min-h-11 items-center justify-center gap-2 text-sm text-text-muted transition hover:text-brand-cyan"
        >
          <HeartPulse size={16} />
          Back to Home
        </button>
      </div>
    </div>
  );
}
