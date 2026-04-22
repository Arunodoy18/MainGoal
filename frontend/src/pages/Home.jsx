import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, Users, FileText, Database } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

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
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/dataset-stats`);
        setStats(response.data);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030812]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00E5FF10_1px,transparent_1px),linear-gradient(to_bottom,#00E5FF10_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#030812] opacity-80 backdrop-blur-[1px]"></div>
      
      <motion.div 
        className="relative z-10 flex w-full max-w-4xl flex-col items-center space-y-8 px-4 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/10 text-accent shadow-[0_0_40px_rgba(0,229,255,0.2)] ring-1 ring-accent/30"
        >
          <Activity size={48} strokeWidth={1.5} />
        </motion.div>
        
        <h1 className="text-6xl font-black tracking-tight text-white sm:text-8xl drop-shadow-[0_0_25px_rgba(0,229,255,0.4)]">
          PRAANA LBP
        </h1>
        
        <h2 className="text-2xl font-medium tracking-wide text-accent sm:text-3xl">
          AI-Powered Surgery Prediction for Low Back Pain
        </h2>
        
        <p className="max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Built on real SMIMS clinical data — Northeast India's first disc degeneration AI.
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 45px rgba(0,229,255,0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/form")}
          className="mt-8 rounded-full bg-accent px-12 py-5 text-xl font-bold tracking-wide text-[#030812] shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-all hover:bg-cyan-300"
        >
          Start Diagnosis
        </motion.button>
        
        {stats && stats.total_patients > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <AnimatedCounter value={stats.total_patients} label="Total Cases" icon={Database} />
            <AnimatedCounter value={stats.pre_op_count} label="Pre-Op Labels" icon={Users} />
            <AnimatedCounter value={stats.cadaver_count} label="Cadaver Labels" icon={FileText} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
