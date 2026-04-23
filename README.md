# PRAANA-LBP

PRAANA-LBP is a full-stack low back pain surgery prediction application. It utilizes machine learning (XGBoost) and Large Language Models (Groq's Llama-3) to analyze clinical patient biomarkers and predict whether surgery or conservative management is recommended.

## Features
- **Binary Classification**: Predicts binary outcome (Surgery vs. Conservative) using patient data.
- **Biomarker Importance**: Incorporates SHAP explainer logic to determine the most significant features leading to a prediction.
- **Clinical Explanations**: Generates patient-specific summaries, rationales, and next steps using Groq's LLM API.
- **Data Overview**: Displays animated statistics for available data on the homepage.
- **Patient Report Generation**: Allows the user to download clinical findings as a `.txt` file.
- **Modern Interface**: Designed with React, Tailwind CSS, Framer Motion, and Lucide icons.

## Clinical Definitions (Region Codes)
When entering the "Affected Spinal Region" (or evaluating the model), the following region abbreviations apply:
- **NP**: Nucleus Pulposus (the inner core of the vertebral disc).
- **IAF**: Inner Annulus Fibrosus (the inner layer of the tough circular exterior of the intervertebral disc).
- **OAF**: Outer Annulus Fibrosus (the outer layer of the intervertebral disc).

## Setup & Execution Sequence

### 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js (v18+)
- Python (v3.10+)
- Git

### 2. Configure Environment Options
1. Copy the `.env.example` file to create a local `.env`:
   ```bash
   cp .env.example .env
   ```
2. **Critical Step**: Open `.env` and fill out your `GROQ_API_KEY`. (Get one for free at [GroqCloud](https://console.groq.com)).
3. (Optional but recommended) Set the model variables used for clinician explanation:
   ```bash
   GROQ_MODEL=llama-3.1-8b-instant
   GROQ_MODEL_FALLBACKS=llama-3.3-70b-versatile,mixtral-8x7b-32768
   ```

### 3. Install Backend Dependencies & Train Model
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure your dataset (`Master_Table_FAST_MINIMAL.xlsx`) is placed inside `data/` at the root folder level. Then execute the training script located in the `backend` folder:
   ```bash
   python train.py
   ```
   This generates the required model artifact (`lbp_model.pkl`) and the expected features list (`feature_list.json`).

### 4. Start the Backend API (FastAPI)
From the `backend/` directory with your virtual environment still activated, spin up the server:
```bash
fastapi dev main.py
```
*(The backend should start on `http://localhost:8000`)*

### 5. Install Frontend Dependencies & Start UI
Open a **new terminal tab**, navigate to the `frontend/` directory, install packages, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend should start on `http://localhost:5173`)*

Visit `http://localhost:5173` in your browser. Click **Start Diagnosis** to input clinical biomarkers and view prediction results!