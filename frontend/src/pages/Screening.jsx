import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";

const STORAGE_KEY = "praana_screening_result";

const sections = [
  {
    key: "painIntensity",
    title: "Pain right now",
    subtitle: "Which sentence fits you best right now?",
    options: [
      { label: "I have no pain right now.", score: 0 },
      { label: "My pain is very mild right now.", score: 1 },
      { label: "My pain is moderate right now.", score: 2 },
      { label: "My pain is fairly severe right now.", score: 3 },
      { label: "My pain is very severe right now.", score: 4 },
      { label: "My pain is the worst I can imagine.", score: 5 },
    ],
  },
  {
    key: "lifting",
    title: "Lifting things",
    subtitle: "How does pain affect lifting and carrying?",
    options: [
      { label: "I can lift heavy things without extra pain.", score: 0 },
      { label: "I can lift heavy things, but pain increases.", score: 1 },
      { label: "I cannot lift heavy things from the floor.", score: 2 },
      { label: "I can only manage light to medium items.", score: 3 },
      { label: "I can only lift very light things.", score: 4 },
      { label: "I cannot lift or carry anything.", score: 5 },
    ],
  },
  {
    key: "walking",
    title: "Walking",
    subtitle: "How far can you comfortably walk?",
    options: [
      { label: "I can walk any distance.", score: 0 },
      { label: "Pain stops me after about 2 km.", score: 1 },
      { label: "Pain stops me after about 1 km.", score: 2 },
      { label: "Pain stops me after about 500 meters.", score: 3 },
      { label: "I need a stick or crutches to walk.", score: 4 },
      { label: "I stay in bed most of the time.", score: 5 },
    ],
  },
  {
    key: "sitting",
    title: "Sitting",
    subtitle: "How long can you sit before pain limits you?",
    options: [
      { label: "I can sit as long as I want.", score: 0 },
      { label: "I can sit long only in my favorite chair.", score: 1 },
      { label: "Pain limits me to about 1 hour.", score: 2 },
      { label: "Pain limits me to about 30 minutes.", score: 3 },
      { label: "Pain limits me to about 10 minutes.", score: 4 },
      { label: "I cannot sit because of pain.", score: 5 },
    ],
  },
  {
    key: "standing",
    title: "Standing",
    subtitle: "How long can you stand before pain limits you?",
    options: [
      { label: "I can stand as long as I want.", score: 0 },
      { label: "I can stand long but pain increases.", score: 1 },
      { label: "Pain limits me to about 1 hour.", score: 2 },
      { label: "Pain limits me to about 30 minutes.", score: 3 },
      { label: "Pain limits me to about 10 minutes.", score: 4 },
      { label: "I cannot stand because of pain.", score: 5 },
    ],
  },
  {
    key: "sleeping",
    title: "Sleeping",
    subtitle: "How much does pain affect your sleep?",
    options: [
      { label: "Pain never disturbs my sleep.", score: 0 },
      { label: "Pain occasionally disturbs my sleep.", score: 1 },
      { label: "I sleep less than 6 hours due to pain.", score: 2 },
      { label: "I sleep less than 4 hours due to pain.", score: 3 },
      { label: "I sleep less than 2 hours due to pain.", score: 4 },
      { label: "Pain stops me from sleeping.", score: 5 },
    ],
  },
  {
    key: "personalCare",
    title: "Daily self-care",
    subtitle: "How does pain affect dressing and washing?",
    options: [
      { label: "I can care for myself normally.", score: 0 },
      { label: "I can care for myself, but with more pain.", score: 1 },
      { label: "Self-care is painful and slower.", score: 2 },
      { label: "I need some help with self-care.", score: 3 },
      { label: "I need daily help in most self-care tasks.", score: 4 },
      { label: "I struggle with dressing/washing and stay in bed.", score: 5 },
    ],
  },
  {
    key: "socialLife",
    title: "Social life",
    subtitle: "How does pain affect your social activities?",
    options: [
      { label: "My social life is normal.", score: 0 },
      { label: "My social life is normal but pain increases.", score: 1 },
      { label: "Pain limits energetic activities only.", score: 2 },
      { label: "I go out less often due to pain.", score: 3 },
      { label: "My social life is mostly limited to home.", score: 4 },
      { label: "I have no social life because of pain.", score: 5 },
    ],
  },
  {
    key: "travelling",
    title: "Travel",
    subtitle: "How does pain affect journeys and travel time?",
    options: [
      { label: "I can travel anywhere without pain.", score: 0 },
      { label: "I can travel, but pain increases.", score: 1 },
      { label: "I can manage journeys over two hours.", score: 2 },
      { label: "I am limited to journeys under one hour.", score: 3 },
      { label: "I can only do short necessary journeys.", score: 4 },
      { label: "I travel only for treatment.", score: 5 },
    ],
  },
];

const vasFaces = ["😊", "🙂", "🙂", "😐", "😕", "😣", "😣", "😫", "😫", "😖", "😣"];

function getVasVisualMeta(value) {
  if (value <= 2) {
    return { color: "#00FF9D", label: "Minimal" };
  }
  if (value <= 4) {
    return { color: "#FFD700", label: "Mild" };
  }
  if (value <= 6) {
    return { color: "#FFA500", label: "Moderate" };
  }
  if (value <= 8) {
    return { color: "#FF4D6D", label: "Severe" };
  }
  return { color: "#CC0000", label: "Critical" };
}

function getSeverityMeta(score) {
  if (score <= 20) {
    return {
      label: "Minimal Disability",
      recommendation: "You are doing well. Keep moving gently and continue daily activity as comfortable.",
      supportMessage: "You are on a good track. Small daily movement helps.",
    };
  }
  if (score <= 40) {
    return {
      label: "Moderate Disability",
      recommendation: "Your pain is affecting parts of daily life. A physiotherapist can help you recover steadily.",
      supportMessage: "This is manageable with early care and steady routines.",
    };
  }
  if (score <= 60) {
    return {
      label: "Severe Disability",
      recommendation: "Your pain is strongly affecting everyday activities. Please plan a doctor visit soon.",
      supportMessage: "You are not alone. Getting support now can make recovery easier.",
    };
  }
  if (score <= 80) {
    return {
      label: "Crippling Back Pain",
      recommendation: "Please seek urgent medical review. A clinician can guide safe next steps quickly.",
      supportMessage: "Your comfort matters. Prompt care can reduce pain and stress.",
    };
  }
  return {
    label: "Bed-bound / Critical",
    recommendation: "Please seek emergency medical care right away for immediate support and safety.",
    supportMessage: "Help is available now. Please reach out immediately.",
  };
}

export default function Screening() {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  const [answers, setAnswers] = useState(
    sections.reduce((acc, section) => {
      acc[section.key] = null;
      return acc;
    }, {})
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [vasScore, setVasScore] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const vasVisualMeta = getVasVisualMeta(vasScore);

  const totalSteps = sections.length + 1;
  const isVasStep = currentStep === sections.length;
  const currentSection = !isVasStep ? sections[currentStep] : null;
  const currentLabel = isVasStep ? "Pain slider" : currentSection.title;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  const canContinue = isVasStep || answers[currentSection.key] !== null;

  const submitScreening = async () => {
    const sumScore = Object.values(answers).reduce((sum, value) => sum + Number(value || 0), 0);
    const oswestryPercent = (sumScore / 45) * 100;
    const severityMeta = getSeverityMeta(oswestryPercent);

    let saveWarning = "";
    if (apiBaseUrl) {
      try {
        await axios.post(`${apiBaseUrl}/api/screening-data`, {
          oswestry_score: Number(oswestryPercent.toFixed(2)),
          vas_score: vasScore,
          severity_label: severityMeta.label,
          timestamp: new Date().toISOString(),
        });
      } catch {
        saveWarning = "Could not save this response to the research database right now.";
      }
    } else {
      saveWarning = "API URL is not configured. This response was not saved online.";
    }

    const result = {
      sumScore,
      vasScore,
      oswestryPercent,
      emoji: vasFaces[vasScore],
      ...severityMeta,
      saveWarning,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    navigate("/screening/results", { state: { result } });
  };

  const handleNext = async () => {
    if (!canContinue) {
      setError("Please choose one option before moving on.");
      return;
    }

    setError("");
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    await submitScreening();
    setSubmitting(false);
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate("/");
      return;
    }
    setError("");
    setCurrentStep((prev) => prev - 1);
  };

  const sectionCounter = useMemo(
    () => (isVasStep ? "VAS" : `Section ${currentStep + 1} of ${sections.length}`),
    [currentStep, isVasStep]
  );

  return (
    <div className="min-h-screen bg-bg-primary px-3 py-5 text-text-primary">
      {submitting && <LoadingSpinner overlay label="Preparing your results..." size="lg" />}

      <div className="mx-auto w-full max-w-xl">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex min-h-11 items-center gap-2 text-sm text-text-muted transition hover:text-brand-cyan"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <div className="card-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
            <span>Progress</span>
            <span>{sectionCounter}</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-text-faint/40">
            <motion.div
              className="h-1.5 rounded-full bg-brand-cyan"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <p className="mt-3 text-sm text-text-muted">{isVasStep ? "Final step" : currentLabel}</p>
        </div>

        <AnimatePresence mode="wait">
          {!isVasStep ? (
            <motion.section
              key={currentSection.key}
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -22 }}
              transition={{ duration: 0.25 }}
              className="card-border mt-4 rounded-2xl p-4"
            >
              <h1 className="font-display text-2xl">{currentSection.title}</h1>
              <p className="mt-1 text-sm text-text-muted">{currentSection.subtitle}</p>

              <div className="mt-4 space-y-3">
                {currentSection.options.map((option) => {
                  const selected = answers[currentSection.key] === option.score;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, [currentSection.key]: option.score }));
                        setError("");
                      }}
                      className={`min-h-11 w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? "border-brand-cyan bg-brand-cyan/10 shadow-[0_0_18px_rgba(0,229,255,0.18)]"
                          : "border-[#1a2d4a] bg-bg-secondary hover:border-brand-cyan/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="vas"
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -22 }}
              transition={{ duration: 0.25 }}
              className="card-border mt-4 rounded-2xl p-4"
            >
              <h1 className="font-display text-2xl">Pain slider</h1>
              <p className="mt-1 text-sm text-text-muted">Move the slider to show your current pain level.</p>

              <div className="mt-5 rounded-xl bg-bg-secondary p-4">
                <div className="mb-3 flex justify-between text-xs uppercase tracking-[0.15em] text-text-muted">
                  <span>No pain</span>
                  <span>Worst pain</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={vasScore}
                  onChange={(event) => setVasScore(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-brand-cyan/50 to-brand-violet/60 accent-brand-cyan"
                />
                <div className="mt-4 rounded-xl border border-[#1a2d4a] bg-bg-primary px-4 py-5">
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className="font-mono-display text-5xl font-bold transition-colors duration-300"
                      style={{ color: vasVisualMeta.color }}
                    >
                      {vasScore}
                    </span>
                    <span
                      className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-300"
                      style={{ color: vasVisualMeta.color }}
                    >
                      {vasVisualMeta.label}
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 rounded-xl border border-brand-red/50 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#1a2d4a] bg-bg-secondary px-4 py-3 text-sm font-semibold transition hover:border-brand-cyan/50"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 py-3 text-sm font-semibold text-black"
          >
            {currentStep === totalSteps - 1 ? "See results" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
