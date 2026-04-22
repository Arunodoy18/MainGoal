import { motion } from "framer-motion";

const fields = [
  { key: "age", label: "Age", min: 18, max: 100, step: 1 },
  { key: "bmi", label: "BMI", min: 10, max: 60, step: 0.1 },
  { key: "pain_score", label: "Pain Score (0-10)", min: 0, max: 10, step: 1 },
  {
    key: "conservative_treatment_months",
    label: "Conservative Treatment Months",
    min: 0,
    max: 48,
    step: 1,
  },
];

function BinarySwitch({ name, label, value, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl bg-panelSoft px-4 py-3 text-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(name, value ? 0 : 1)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          value ? "bg-accent text-bg" : "bg-slate-700 text-slate-200"
        }`}
      >
        {value ? "Yes" : "No"}
      </button>
    </label>
  );
}

export default function PatientForm({ form, onChange, onSubmit, loading }) {
  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card-border rounded-2xl bg-panel/80 p-6 shadow-glow backdrop-blur"
    >
      <h2 className="mb-5 text-xl font-semibold text-white">Patient Inputs</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 text-sm">
            <span className="text-muted">{field.label}</span>
            <input
              required
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={form[field.key]}
              onChange={(event) => onChange(field.key, Number(event.target.value))}
              className="rounded-xl border border-accent/20 bg-bg px-3 py-2 text-text outline-none ring-accent transition focus:ring"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BinarySwitch
          name="disc_herniation"
          label="Disc Herniation"
          value={form.disc_herniation}
          onChange={onChange}
        />
        <BinarySwitch
          name="neurological_deficit"
          label="Neurological Deficit"
          value={form.neurological_deficit}
          onChange={onChange}
        />
        <BinarySwitch name="smoker" label="Smoker" value={form.smoker} onChange={onChange} />
      </div>

      <button
        disabled={loading}
        type="submit"
        className="mt-6 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Predicting..." : "Run Surgery Prediction"}
      </button>
    </motion.form>
  );
}