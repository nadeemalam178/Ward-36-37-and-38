# 🗳️ Electoral Data Intelligence Dashboard | AC 182-Bankipur (Patna)

A modern, high-performance web dashboard built with **React 18, Tailwind CSS, Chart.js, and a Python SQLite indexing engine** to search, filter, and analyze the **60,930+ citizen voter records** from **Assembly Constituency 182-Bankipur (Patna, Bihar)**.

---

## ✨ Features & Capabilities

- **⚡ High-Speed SQLite Indexed Engine**: Handles all `60,930` voter records with sub-millisecond search query response times (`< 5ms`), paginated directly by `server.py`.
- **🔍 Multi-Criteria Instant Search**: Search simultaneously across **EPIC Number (`AFS4214680`)**, **Voter Full Name (`धर्मंद् कुमार`)**, **Father / Husband Name (`कृति रमन`)**, and **House Number / Address**.
- **🎯 Advanced Filter Grid**:
  - Filter by **Polling Booth Number (`Booth No` 1 to 125+)**
  - Filter by **Municipal Ward (`Ward No 037`, etc.)**
  - Filter by **Gender (`पुरुष` Male, `महिला` Female, `तृतीय/अन्य` Other)**
  - Filter by **Age Range Slider** (18 to 100+ Years)
- **📊 Interactive Demographic Analytics**:
  - Generational & Age Group Bar Charts (`18-25 Gen Z`, `26-35 Young Adults`, `36-50 Middle Age`, `51-65 Senior`, `65+ Elderly`).
  - Gender Split Doughnut Chart.
  - Top 10 High-Density Polling Stations (`Polling_Station_Name`).
- **🪪 Digital Voter Profile ID Card Modal**: Click any voter row to pop up an official digital inspection slip displaying their exact `AC No`, `Anubhag Details`, `House No`, `Polling Station Name & Address`, `Post Office`, `Police Station`, `Tehsil`, `District (`Patna`)`, and `PIN Code (`800004`)`.
- **📥 Instant CSV/JSON Export & Spreadsheet Upload**: Export exact filtered results to a UTF-8 compatible `.CSV` file or drag-and-drop new `.XLSX` / `.CSV` datasets directly into the dashboard!

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
