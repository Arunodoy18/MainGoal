import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ResultPanel({ result, summary }) {
  if (!result) {
    return (
      <div className="card-border rounded-2xl bg-panel/80 p-6 text-muted">
        Prediction output will appear here after you submit patient data.
      </div>
    );
  }

  const probabilityPct = Math.round((result.surgery_probability || 0) * 100);
  const highRisk = probabilityPct >= 50;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="card-border rounded-2xl bg-panel/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Prediction Result</h2>
          <span className="rounded-full bg-secondary/30 px-3 py-1 text-xs text-secondary">
            {result.model_source}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 text-lg font-medium">
          {highRisk ? (
            <AlertTriangle className="text-amber-300" size={20} />
          ) : (
            <CheckCircle2 className="text-emerald-300" size={20} />
          )}
          <span>{result.recommendation}</span>
        </div>

        <p className="text-muted">Estimated Surgery Probability: {probabilityPct}%</p>
      </div>

      <div className="card-border rounded-2xl bg-panel/80 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Key Drivers</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.contributions?.slice(0, 6) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2945" />
              <XAxis dataKey="feature" stroke="#8CA0C8" interval={0} angle={-10} dy={10} height={58} />
              <YAxis stroke="#8CA0C8" />
              <Tooltip cursor={{ fill: "rgba(123, 94, 248, 0.08)" }} />
              <Bar dataKey="impact" fill="#00E5FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-border rounded-2xl bg-panel/80 p-6">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Sparkles size={18} className="text-accent" />
          <h3 className="text-lg font-semibold">Clinician Summary</h3>
        </div>
        <p className="whitespace-pre-line text-sm leading-6 text-muted">
          {summary || "Generate a prediction first to receive an AI-generated summary."}
        </p>
      </div>
    </motion.section>
  );
}