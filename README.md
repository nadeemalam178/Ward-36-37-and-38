# 🗳️ Electoral Roll & Voter Directory Dashboard | AC 182-Bankipur (Patna)

A modern, professional web dashboard built with **React 18, Tailwind CSS, Chart.js, and Python** to search, filter, and analyze the citizen voter records from **Assembly Constituency 182-Bankipur (Patna, Bihar)** across all 24 wards.

---

## ✨ Features & Capabilities

- **⚡ Electoral Roll Search Engine**: Fast search across the entire assembly roll or specific wards.
- **🔍 Search Across All Wards**: Search across **EPIC Number (`AFS4214680`)**, **Voter Full Name (`रुही खान`)**, **Father / Husband Name**, and **Street / Address**.
- **🎯 Filter Grid**:
  - Filter by **Ward (`वार्ड नं-036`, `037`, etc. or All 24 Wards)**
  - Filter by **Polling Booth (`Booth No`)**
  - Filter by **Anubhag (`अनुभाग / गली`)**
  - Filter by **Gender (`पुरुष` Male, `महिला` Female, `अन्य` Other)**
  - Filter by **Age Range Slider** (18 to 120 Years)
- **📊 Demographics Analytics & Charts**:
  - Gender Demographics (`Male vs Female vs Other`) Doughnut Chart.
  - Ward Distribution & Proportion Chart across Wards.
  - Generational & Age Group Bar Charts (`18-25 Gen Z`, `26-35 Young Adults`, `36-50 Middle Age`, `51-65 Senior`, `65+ Elderly`).
  - Top 10 Polling Stations (`Polling_Station_Name`).
- **🪪 Digital Voter Inspection Card**: Click any citizen row to view their official inspection details including `AC No`, `Anubhag`, `House No`, `Polling Station Name & Address`, `District (`Patna`)`, and `PIN Code`.
- **📥 CSV/PDF Report Generation**: Export filtered records directly to clean CSV spreadsheets or printable PDF summary reports.

---

## 🚀 How to Run right now (Zero Node/npm Setup Required!)

Because your dataset is large (`60,930 rows / 41.9 MB`), we created a built-in Python API backend (`server.py`) that uses Python's standard `sqlite3` and `http.server` libraries.

### Option 1: Double-Click Launcher (Windows)
Simply double-click the file inside the `Dashboard` directory:
```bat
start_dashboard.bat
```
This will automatically launch the server and open **http://localhost:8000** in your default web browser!

### Option 2: Run via Command Line / Terminal
Open a command prompt in the `Dashboard` folder and type:
```powershell
python server.py
```
Then open your web browser to: **http://localhost:8000**

---

## 🛠️ Option 3: Full React + Vite Development Mode (If Node.js is installed)

If you have Node.js (`npm`) installed and wish to run Vite's hot-module dev server:
```bash
npm install
npm run dev
```
*(Vite will run on `http://localhost:3000` and automatically proxy `/api/*` queries to your `python server.py` instance on port 8000!)*

---

## 📁 Project Structure

```text
Dashboard/
├── start_dashboard.bat    # 1-Click Windows Launcher script
├── server.py              # High-Speed Python API & SQLite indexer
├── index.html             # React 18 + Tailwind + Chart.js application shell
├── app.js                 # Complete interactive multi-tab React dashboard
├── styles.css             # Glassmorphism & responsive dark theme design tokens
├── voter_data.csv         # Full Patna Bankipur dataset (60,930 voter records)
├── voter_data.db          # Auto-generated indexed SQLite database
├── package.json           # Vite + React package configuration
├── vite.config.js         # Vite configuration with API proxying
└── tailwind.config.js     # Tailwind CSS theme extension
```
