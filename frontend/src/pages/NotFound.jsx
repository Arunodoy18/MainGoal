import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/", { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-6 text-center text-text-primary">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-border w-full max-w-md rounded-2xl p-8"
      >
        <h1 className="font-display text-3xl text-brand-cyan">Page Not Found</h1>
        <p className="mt-3 text-sm text-text-muted">
          Redirecting you to PRAANA home in a few seconds.
        </p>
      </motion.div>
    </div>
  );
}
