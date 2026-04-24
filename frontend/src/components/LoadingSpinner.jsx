import { motion } from "framer-motion";

export default function LoadingSpinner({ label = "Loading...", overlay = false, size = "md" }) {
  const dimension = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-16 w-16" : "h-10 w-10";

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3 text-text-primary">
      <motion.div
        className={`${dimension} rounded-full border-2 border-brand-cyan/35 border-t-brand-cyan`}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      />
      <p className="text-sm font-medium text-text-muted">{label}</p>
    </div>
  );

  if (!overlay) {
    return spinner;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/85 backdrop-blur-sm">
      {spinner}
    </div>
  );
}
