import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, Users, GaugeCircle, HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";

function AnimatedCounter({ value, label, icon: Icon }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) return;
    if (start === end) {
      setCount(end);
      return;
    }
    const totalDuration = 1500;
    const stepTime = Math.abs(Math.floor(totalDuration / end));
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-panelSoft/80 p-4 ring-1 ring-white/10 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon size={20} />
      </div>
      <div className="text-3xl font-bold tracking-tight text-white">{count}</div>
      <div className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      if (!apiBaseUrl) {
        setLoadError("API URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/api/screening-stats`);
        setStats(response.data || {});
      } catch (err) {
        setLoadError(err.response?.data?.detail || "Unable to load live stats right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [apiBaseUrl]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 py-8">
      <div className="pointer-events-none fixed -left-16 top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.22),transparent_70%)]" />
      <div className="pointer-events-none fixed -right-20 bottom-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(123,94,248,0.2),transparent_70%)]" />
      
      <motion.div 
        className="relative z-10 flex w-full max-w-3xl flex-col items-center space-y-6 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-violet/15 text-brand-cyan sm:h-24 sm:w-24"
        >
          <span className="absolute inset-0 animate-ping rounded-full border border-brand-cyan/40" />
          <Activity size={40} strokeWidth={1.5} />
        </motion.div>
        
        <h1 className="font-display text-5xl font-black tracking-tight sm:text-7xl">
          <span className="bg-gradient-to-r from-brand-cyan to-brand-violet bg-clip-text text-transparent">
            PRAANA
          </span>
        </h1>
        
        <h2 className="text-lg font-medium tracking-wide text-text-primary sm:text-2xl">
          Your first step for understanding back pain
        </h2>
        
        <p className="max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
          Answer a few simple questions and get a calm, clear summary you can share with your doctor.
        </p>
        
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: "0 0 45px rgba(0,229,255,0.45)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/screening")}
          className="btn-primary mt-4 min-h-11 w-full max-w-md rounded-xl px-8 py-4 text-lg font-bold tracking-wide text-black"
        >
          Check My Back Pain
        </motion.button>
        
        {loading && <LoadingSpinner label="Loading live screening stats..." size="sm" />}

        {!loading && !loadError && stats && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <AnimatedCounter value={stats.total_responses || 0} label="Patients Screened" icon={Users} />
            <AnimatedCounter value={Math.round(stats.average_oswestry_score || 0)} label="Avg Back Impact" icon={GaugeCircle} />
            <AnimatedCounter value={Math.round(stats.average_vas_score || 0)} label="Avg Pain Score" icon={HeartPulse} />
          </motion.div>
        )}

        {!loading && loadError && (
          <div className="mt-6 rounded-xl border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {loadError}
          </div>
        )}
      </motion.div>

      <button
        onClick={() => navigate("/doctor")}
        className="absolute bottom-6 text-sm text-text-muted transition hover:text-brand-cyan"
      >
        Clinical Portal -&gt;
      </button>
    </div>
  );
}
