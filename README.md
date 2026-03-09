# 🛡️ Scheme Guard — Government Scheme Leakage Detection System

Scheme Guard is a comprehensive AI-powered platform designed to detect and prevent leakages, fraud, and anomalies in government scheme beneficiary distributions. It combines a robust rule-based engine with machine learning to identify suspicious patterns like duplicate Aadhaar entries, shared bank accounts, and income mismatches.

## 🚀 Features

-   **Intelligent Risk Scoring**: Multi-phase scoring involving immediate rule-based checks and advanced ML analysis.
-   **ML-Powered Detection**: Ensemble models (Isolation Forest + Logistic Regression) to detect complex fraud patterns.
-   **Explainable AI (XAI)**: SHAP-based visualizations to help officers understand *why* a case was flagged.
-   **Secure Data Handling**: AES-256-CBC encryption for sensitive data like Aadhaar numbers.
-   **Real-time Dashboard**: Interactive visualizations of fraud trends, district heatmaps, and KPI metrics.
-   **Audit Trails**: Immutable logs of all administrative and officer actions.

## 📁 Project Structure

```text
├── frontend/ (scheme-guard/)  # React + Vite + Tailwind + Framer Motion
├── backend/                  # Node.js + Express + MongoDB
├── ml_service/ (ml_service.py)# Python FastAPI + Scikit-learn
├── data/ (cases.json)        # Mock data storage
└── docs/ (DOCUMENTATION.md)  # Technical documentation
```

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Axios, Zustand.
-   **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Helmet, bcryptjs.
-   **ML/Service**: Python, FastAPI, Scikit-learn, Joblib, SHAP.

## 🔧 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Local or Atlas)

### 2. Backend Setup
```bash
# Navigate to the root directory
npm install
node backend-server.js
```

### 3. ML Service Setup
```bash
# Install Python dependencies
pip install -r requirements.txt
# Run the FastAPI server
python ml_service.py
```

### 4. Frontend Setup
```bash
cd scheme-guard
npm install
npm run dev
```

## 🔐 Security

- **Encryption**: Aadhaar numbers are encrypted at rest using AES-256.
- **JWT**: Secure role-based authentication.
- **Rate Limiting**: Protection against brute-force and DoS attacks.
- **Sanitization**: Input validation and XSS protection.

## 📊 ML Performance

| Metric    | Value |
| --------- | ----- |
| Precision | 91.4% |
| Recall    | 87.2% |
| F1-Score  | 89.2% |
| AUC-ROC   | 0.944 |

---
*Developed for the Ministry of Rural Development — Scheme Guard v2.4*
