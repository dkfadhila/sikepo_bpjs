# SiKePo — Technical Handover Document for Codex

> **Sistem Investigasi Kelayakan Klaim & Pola Overbilling (SiKePo)**  
> AI-Powered Pre-Adjudication Audit & Fraud Detection System for BPJS Kesehatan  
> Target Track: Healthkathon / Enterprise HealthTech Solutions  
> Project Workspace: `D:/FamilyAgent/Nox/workspace/sikepo-app/`

---

## 1. Executive Summary & Purpose

**SiKePo** adalah platform audit otomatis pra-pencairan klaim jaminan kesehatan nasional (BPJS Kesehatan / JKN). Sistem bertindak sebagai *gatekeeper* pintar yang menginspeksi berkas klaim rumah sakit (FKRTL) sebelum dana dicairkan, guna mendeteksi anomali finansial, klinis, dan administratif:
1. **Upcoding:** Menaikkan derajat keparahan diagnosa ICD-10 / tarif grouping INA-CBGs secara tidak wajar.
2. **Phantom Billing:** Klaim tindakan medik, pemeriksaan penunjang, atau obat yang tidak pernah diberikan kepada pasien.
3. **Inflated Bills:** Pembengkakan biaya tagihan rumah sakit jauh melampaui plafon dan tarif standar.
4. **Cloning / Repeat Submissions:** Duplikasi berkas klaim dengan ID atau rincian identik dalam rentang waktu berdekatan.

---

## 2. System Architecture & Tech Stack

```
[ Frontend: SPA (Tailwind + shadcn-style CSS) ]
                   │
                   ▼ HTTP REST API (Port 7721)
[ Backend: FastAPI (Python 3.12, Uvicorn) ]
                   │
  ┌────────────────┴────────────────────────┐
  ▼                                         ▼
[ Engine A1: Rules Triage ]        [ Engine A2: ML IsolationForest ]
  (INA-CBG ratios, LOS, Fornas)      (7 Engineered Numerical Features)
  └────────────────┬────────────────────────┘
                   ▼ (Fused Risk Score 0-99)
[ Engine A3: LLM Adjudicator Agent ]
  (Final Verdict: APPROVE / HOLD / REJECT + Justification)
```

* **Backend:** FastAPI, Uvicorn, Scikit-learn (IsolationForest), Joblib, Pydantic, Secrets.
* **Frontend:** Vanilla JS SPA (no build step / no node_modules), Tailwind CSS (CDN), custom shadcn/ui design tokens, Motion.dev (smooth animations), Chart.js.
* **Storage:** JSON-based stateful stores (`data/claims_dataset.json`, `data/users.json`).
* **AI/LLM Gateway:** OpenAI-compatible endpoint (OpenCode Zen / Vercel AI Gateway) untuk role *Adjudicator*.

---

## 3. Directory & File Structure

```
sikepo-app/
├── backend/
│   └── main.py                     # Primary FastAPI application & API endpoints
├── engine/
│   ├── ai_engine.py                # 3-tier Agentic Audit Pipeline (A1 → A2 → A3)
│   ├── auth.py                     # RBAC session management & authentication
│   └── model_store/
│       ├── isolation_forest.joblib # Serialized Scikit-learn model
│       └── model_meta.json         # Anomaly threshold & training metadata
├── data/
│   ├── claims_dataset.json         # Source of truth for all claims records
│   └── users.json                  # System users & permission mapping
├── frontend/
│   ├── index.html                  # Public landing page (product showcase)
│   ├── app.html                    # Operational Cockpit Dashboard (SPA)
│   ├── css/
│   │   └── theme.css               # Design system, shadcn tokens, keyframes
│   ├── js/
│   │   ├── app.js                  # Dashboard controller, UI state, charts
│   │   ├── landing.js              # Landing page interactions & counters
│   │   └── shared.js               # Utility functions & formatting
│   ├── pages/                      # Deep-dive subpages (overview, pipeline, etc.)
│   └── img/                        # Branding assets (sikepo-logo.png, hero, etc.)
├── scripts/
│   └── generate_data.py            # Synthetic dataset generator (BPJS FKRTL schema)
├── run_sikepo.bat                  # One-click Windows runner
└── SIKEPO_LUNA.md                  # Legacy documentation
```

---

## 4. Multi-Agent Audit Pipeline (A1 → A2 → A3)

### Stage 1: [A1] Triage Agent (Deterministic Rules)
Melakukan sanity check terhadap regulasi BPJS dan pedoman klinis nasional:
* Rasio tarif pengajuan vs pagu INA-CBG (`biaya_diajukan / tarif_ina_cbg`).
* Length of Stay (LOS) delta vs standar norma diagnosa (`los - los_norm`).
* Deteksi obat restriksi e-Fornas (Meropenem, Albumin, Trastuzumab, Imunoglobulin, Vecuronium) tanpa indikasi kuat.
* *Output:* `preliminary_risk` (0–99).

### Stage 2: [A2] Investigator Agent (Machine Learning)
Mendeteksi anomali multidimensi yang lolos dari rule-based:
* **Model:** `IsolationForest(n_estimators=200, contamination=0.32)`.
* **7 Input Features:**
  1. `ratio_cbg` = `biaya_diajukan / tarif_ina_cbg`
  2. `selisih_ratio` = `selisih_biaya / biaya_diajukan`
  3. `los_delta` = `los - los_norm`
  4. `los_ratio` = `los / los_norm`
  5. `n_restricted` = total item obat restriksi
  6. `n_drugs` = total jumlah obat dalam resep
  7. `usia` = usia pasien
* **Fused Score:** `fused_risk = (0.45 * preliminary_risk) + (0.55 * ml_risk)`.

### Stage 3: [A3] Adjudicator Agent (LLM Integration)
Menganalisis berkas dan temuan investigasi untuk memberikan putusan formal:
* **Input Prompt:** Payload klaim lengkap, temuan pelanggaran A1, dan anomaly score A2.
* **Output Format:** Strict JSON:
  ```json
  {
    "status": "APPROVED | HOLD | REJECTED",
    "rekomendasi": "Catatan singkat audit",
    "alasan": ["Daftar alasan yuridis/klinis keputusan"]
  }
  ```
* **Fallback:** Jika LLM offline atau response parsing error, sistem otomatis fallback ke deterministic threshold table.

---

## 5. Core Data Model (Schema)

Setiap entri pada `data/claims_dataset.json` mengikuti struktur berikut:
```json
{
  "id": "SEP-FKRTL-002-202608-0001",
  "faskes": {
    "kode": "FKRTL-002",
    "nama": "RSUD Tarakan",
    "tipe": "B",
    "kota": "Jakarta Pusat"
  },
  "pasien": {
    "nama": "Pasien JKN #1001",
    "no_kartu": "00083197857",
    "gender": "L",
    "usia": 55
  },
  "diagnosa": {
    "icd10": "A01.0",
    "nama": "Demam Tifoid",
    "cbg": "I-4-10-I",
    "tarif_standar": 3800000,
    "los_norm": 4,
    "obat_lazim": ["Ceftriaxone", "Paracetamol", "RL Infus"]
  },
  "tgl_masuk": "2026-08-19",
  "tgl_keluar": "2026-08-22",
  "los": 3,
  "biaya_diajukan": 3889859,
  "tarif_ina_cbg": 3800000,
  "selisih_biaya": 89859,
  "obat": ["Ceftriaxone", "Paracetamol", "RL Infus"],
  "risk_score": 12,
  "fraud_type": "CLEAN",
  "status": "APPROVED",
  "audit_reasons": ["Seluruh item prosedur & farmasi sesuai e-Fornas."],
  "rekomendasi": "SIAP BAYAR (AUTO-APPROVED)"
}
```

---

## 6. Role-Based Access Control (RBAC)

Auth dikelola via `engine/auth.py` menggunakan bearer token pada header `X-Auth-Token`:
* `SA` (Super Admin): Full access, user management, retrain model, override verdict.
* `VK` (Verifikator KC): Audit klaim cabang faskes, submit approval/rejection.
* `ST` (Satgas Anti-Fraud): Investigasi anomali mendalam, analisis pola fraud.
* `AU` (Auditor / Juri): Read-only view, sandbox simulation test.

Akun Default:
* **Username:** `admin` | **Password:** `admin` (Role: Super Admin)

---

## 7. How to Run & Verify

1. **Jalankan Backend:**
   ```bash
   cd D:/FamilyAgent/Nox/workspace/sikepo-app/backend
   python main.py
   # Menjalankan Uvicorn di http://127.0.0.1:7721
   ```
2. **Akses Dashboard:**
   * Buka browser: `http://127.0.0.1:7721/app`
3. **Regenerate Dataset Sintetis:**
   ```bash
   cd D:/FamilyAgent/Nox/workspace/sikepo-app
   python scripts/generate_data.py
   ```
4. **Trigger Retrain Model ML:**
   ```bash
   curl -X POST http://127.0.0.1:7721/api/ml/train
   ```

---

## 8. High-Priority Tasks for Codex

Bagi Codex yang akan melanjutkan pengembangan proyek ini, fokuskan pada:
1. **Integrasi Data Sampel BPJS Riil:** Menulis modul ETL untuk ingest data resmi *Data Sampel General BPJS* (format STATA `.dta` atau `.csv`) ke skema JSON SiKePo.
2. **Persistence Layer:** Mengganti in-memory/JSON store dengan SQLite / PostgreSQL menggunakan SQLAlchemy / SQLModel.
3. **Security Hardening:** Implementasi password hashing (bcrypt/argon2) menggantikan plaintext pada `users.json`.
4. **Export Engine:** Fitur export laporan investigasi klaim ke format CSV dan PDF resmi.
