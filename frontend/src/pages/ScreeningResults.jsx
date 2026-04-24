import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import {
  Download,
  RotateCcw,
  HeartPulse,
  AlertCircle,
  ShieldCheck,
  TriangleAlert,
  Phone,
  CircleHelp,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "praana_screening_result";
const APP_URL = "https://praana-lbp-maingoal.netlify.app";

function getTierFromScore(score) {
  if (score <= 20) return "minimal";
  if (score <= 40) return "moderate";
  if (score <= 80) return "severe";
  return "critical";
}

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

function getImmediateActions(score) {
  const tier = getTierFromScore(score);

  if (tier === "minimal") {
    return [
      "Do gentle stretching for 8-10 minutes twice daily (hamstrings, hip flexors, lower back).",
      "Take short walks every 2-3 hours to keep your back active and reduce stiffness.",
      "Use heat therapy for 10-15 minutes in the evening if you feel tightness.",
    ];
  }

  if (tier === "moderate") {
    return [
      "Start supervised physiotherapy to improve mobility, posture, and core control.",
      "Use paced activity: work in short blocks and take planned rest breaks before pain spikes.",
      "Avoid long sitting sessions; stand, stretch, and reset posture every 30-40 minutes.",
    ];
  }

  if (tier === "severe") {
    return [
      "Book a spine or pain clinic appointment soon for detailed clinical evaluation.",
      "Avoid heavy lifting, deep bending, twisting, and sudden strain until reviewed.",
      "For sleep, try side-lying with a pillow between knees or lying on back with a pillow under knees.",
    ];
  }

  return [
    "Seek urgent medical care now, especially if pain is escalating or mobility is very limited.",
    "Use emergency services immediately if you develop weakness, numbness, or bladder/bowel symptoms.",
    "Keep an emergency contact informed and avoid staying alone until assessed by a clinician.",
  ];
}

function getMostAffectedSections(result) {
  if (Array.isArray(result?.mostAffectedSections) && result.mostAffectedSections.length > 0) {
    return result.mostAffectedSections;
  }

  if (Array.isArray(result?.sectionScores) && result.sectionScores.length > 0) {
    return [...result.sectionScores]
      .filter((item) => Number(item.score) > 0)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 3);
  }

  return [];
}

function getTopSectionNames(result) {
  if (Array.isArray(result?.topSections) && result.topSections.length > 0) {
    return result.topSections;
  }

  return getMostAffectedSections(result).map((item) => item.name);
}

function formatSectionList(items) {
  if (!items.length) return "daily activities";

  const lowered = items.map((item) => item.toLowerCase());
  if (lowered.length === 1) return lowered[0];
  if (lowered.length === 2) return `${lowered[0]} and ${lowered[1]}`;
  return `${lowered.slice(0, -1).join(", ")}, and ${lowered[lowered.length - 1]}`;
}

function getMeaningSummary(result, topSections) {
  if (!topSections.length) {
    return "Your responses suggest low impact across most daily activities right now. Continue regular movement and monitor symptoms so you can act early if pain increases.";
  }

  return `Your highest scores are in ${formatSectionList(
    topSections
  )}. This means these areas are currently being affected the most by your back pain, so focusing recovery steps on these activities can give faster day-to-day relief.`;
}

function getVasLabel(score) {
  if (score <= 2) return "Minimal";
  if (score <= 4) return "Mild";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Severe";
  return "Critical";
}

function downloadPdfReport(result, affectedSections) {
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString();
  const oswestry = Number(result.oswestryPercent || 0);
  const vas = Number(result.vasScore || 0);

  doc.setFillColor(3, 8, 18);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(0, 229, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PRAANA Screening Report", 14, 14);

  doc.setTextColor(232, 240, 254);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("SMIT x SMIMS", 14, 22);

  let y = 42;
  doc.setTextColor(22, 30, 45);
  doc.setFontSize(11);
  doc.text(`Date generated: ${generatedAt}`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(`Oswestry score: ${oswestry.toFixed(1)}%`, 14, y);
  y += 7;
  doc.text(`Severity: ${result.label}`, 14, y);
  y += 7;
  doc.text(`VAS score: ${vas}/10 (${getVasLabel(vas)})`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Most affected sections:", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const affectedText =
    affectedSections.length > 0
      ? affectedSections.map((item) => `${item.name} (score ${item.score}/5)`).join(", ")
      : "No major section was strongly affected in this screening.";

  const affectedLines = doc.splitTextToSize(affectedText, 180);
  doc.text(affectedLines, 14, y);
  y += affectedLines.length * 6 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Recommendation:", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const recommendationLines = doc.splitTextToSize(result.recommendation || "", 180);
  doc.text(recommendationLines, 14, y);

  doc.setDrawColor(180, 190, 205);
  doc.line(14, 282, 196, 282);
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 120);
  doc.text(APP_URL, 105, 288, { align: "center" });

  doc.save("praana-screening-report.pdf");
}

export default function ScreeningResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showContactCard, setShowContactCard] = useState(false);

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

  const oswestryScore = Number(result.oswestryPercent || 0);
  const vasScore = Number(result.vasScore || 0);
  const topSections = getTopSectionNames(result);
  const mostAffectedSections = getMostAffectedSections(result);
  const meaningSummary = getMeaningSummary(result, topSections);
  const immediateActions = getImmediateActions(oswestryScore);

  const { color, bg, icon: Icon } = getSeverityVisual(result.label);
  const ringRadius = 88;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = Math.max(0, Math.min(100, oswestryScore));
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
                <span className="font-mono-display text-5xl font-bold">{oswestryScore.toFixed(1)}%</span>
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
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="font-mono-display text-4xl text-brand-cyan">{vasScore}/10</div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">{getVasLabel(vasScore)}</div>
          </div>
        </div>

        <div className="card-border rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">What this means for you</div>
          <p className="mt-3 text-base leading-relaxed text-text-primary">{meaningSummary}</p>

          {topSections.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {topSections.map((sectionName) => (
                <span
                  key={sectionName}
                  className="rounded-full border border-brand-cyan/45 bg-brand-cyan/10 px-3 py-1 text-xs font-semibold tracking-[0.1em] text-brand-cyan"
                >
                  {sectionName}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card-border rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">What to do right now</div>
          <div className="mt-3 space-y-3">
            {immediateActions.map((action, index) => (
              <div key={action} className="flex gap-3 rounded-xl border border-[#1a2d4a] bg-bg-secondary px-3 py-3">
                <div className="font-mono-display text-sm text-brand-cyan">0{index + 1}</div>
                <p className="text-sm leading-relaxed text-text-primary">{action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted">
            <CircleHelp size={14} />
            About this questionnaire
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-primary">
            The Oswestry Disability Index is a globally validated clinical questionnaire used by spine specialists to
            measure how back pain affects daily life. Your score helps clinicians make structured, evidence-based
            decisions and track recovery over time.
          </p>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={() => downloadPdfReport(result, mostAffectedSections)}
            className="btn-primary flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            <Download size={18} />
            Download PDF
          </button>

          <button
            onClick={() => setShowContactCard((prev) => !prev)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-3 font-semibold text-brand-cyan transition hover:bg-brand-cyan/15"
          >
            <Phone size={18} />
            Contact SMIMS
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              navigate("/screening", { replace: true });
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1a2d4a] bg-bg-secondary px-4 py-3 font-semibold text-text-primary transition hover:border-brand-cyan/60"
          >
            <RotateCcw size={18} />
            Retake Screening
          </button>
        </div>

        {showContactCard && (
          <div className="rounded-2xl border border-brand-cyan/40 bg-brand-cyan/10 p-4 text-sm text-text-primary">
            <div className="font-semibold text-brand-cyan">SMIMS Contact Options</div>
            <p className="mt-2 text-text-primary/90">
              For appointment support, use your official SMIMS contact number. You can open your phone dialer now and
              place the call directly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="tel:"
                className="rounded-lg border border-brand-cyan/45 bg-bg-primary px-3 py-2 font-semibold text-brand-cyan"
              >
                Open Dialer
              </a>
              <a href="tel:108" className="rounded-lg border border-brand-red/45 bg-bg-primary px-3 py-2 font-semibold text-brand-red">
                Emergency 108
              </a>
            </div>
          </div>
        )}

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
