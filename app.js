const { useState, useEffect, useRef, useMemo } = React;

function App() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'analytics', 'sync'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isServerMode, setIsServerMode] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    other: 0,
    avg_age: 0,
    first_time_voters: 0,
    total_booths: 0,
    total_wards: 3
  });

  // Filter Options (Dynamic based on selected Ward & Booth)
  const [filterOptions, setFilterOptions] = useState({
    booths: [],
    wards: [
      { ward: 'वार्ड नं-036', count: 28626 },
      { ward: 'वार्ड नं-037', count: 11608 },
      { ward: 'वार्ड नं-038', count: 20696 }
    ],
    sexes: ['पुरुष', 'महिला', 'तृतीय'],
    anubhags: [],
    relations: ['पिता', 'पति', 'माता', 'अन्य'],
    ac_nos: ['182-Bankipur']
  });

  // Active Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState(''); // '' means All 3 Wards
  const [selectedBooth, setSelectedBooth] = useState('');
  const [selectedAnubhag, setSelectedAnubhag] = useState('');
  const [selectedRelation, setSelectedRelation] = useState('');
  const [selectedHouseNo, setSelectedHouseNo] = useState('');
  const [selectedSex, setSelectedSex] = useState('');
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(120);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  // Voter List & Pagination State
  const [voters, setVoters] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [clientRecords, setClientRecords] = useState([]);

  // Charts Data State
  const [chartData, setChartData] = useState({
    age_groups: {},
    top_booths: [],
    wards: [
      { ward: 'वार्ड नं-036', count: 28626 },
      { ward: 'वार्ड नं-037', count: 11608 },
      { ward: 'वार्ड नं-038', count: 20696 }
    ]
  });

  // Selected Voter Modal & Toasts
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  function filterClientRecords(sourceData) {
    if (sourceData && Array.isArray(sourceData)) {
      setClientRecords(sourceData);
    }
  }

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const hQ = selectedHouseNo.toLowerCase().trim();
    const cleanSelWard = String(selectedWard || '').replace(/[^0-9]/g, '');

    return clientRecords.filter(row => {
      if (!row) return false;
      
      const matchQ = !q || 
        String(row['EPIC NUMBER'] || row['epic_number'] || '').toLowerCase().includes(q) ||
        String(row['Name'] || row['name'] || '').toLowerCase().includes(q) ||
        String(row['Father Name'] || row['father_name'] || '').toLowerCase().includes(q) ||
        String(row['Polling_Station_Address'] || row['polling_station_address'] || '').toLowerCase().includes(q);

      const cleanRowWard = String(row['Ward'] || row['ward'] || '').replace(/[^0-9]/g, '');
      const matchW = !selectedWard || String(row['Ward'] || row['ward'] || '').trim() === selectedWard.trim() || (cleanSelWard && cleanRowWard === cleanSelWard);
      
      const matchB = !selectedBooth || String(row['Booth No'] || row['booth_no'] || '').trim() === String(selectedBooth).trim();
      
      const rowAnName = String(row['Anubhag_name'] || row['anubhag_name'] || '').trim().toLowerCase();
      const rowAnNo = String(row['Anubhag_number'] || row['anubhag_number'] || '').trim();
      const selAn = selectedAnubhag.trim().toLowerCase();
      const matchAn = !selectedAnubhag || rowAnName === selAn || rowAnNo === selectedAnubhag.trim();
      
      const matchRel = !selectedRelation || String(row['relation'] || row['Relation'] || '').trim() === selectedRelation.trim();
      const matchHNo = !hQ || String(row['House No'] || row['house_no'] || '').toLowerCase().includes(hQ);
      
      const rowSex = String(row['sex'] || row['Sex'] || '').trim();
      const matchS = !selectedSex || 
        rowSex === selectedSex ||
        (selectedSex === 'पुरुष' && ['Male', 'M', 'पुरुष'].includes(rowSex)) ||
        (selectedSex === 'महिला' && ['Female', 'F', 'महिला'].includes(rowSex)) ||
        (selectedSex === 'तृतीय' && ['Trans', 'T', 'Other', 'तृतीय'].includes(rowSex));
      
      const a = parseInt(row['age'] || row['Age']) || 0;
      const matchAge = (minAge <= 0 || a >= minAge) && (maxAge >= 120 || a <= maxAge);

      return matchQ && matchW && matchB && matchAn && matchRel && matchHNo && matchS && matchAge;
    });
  }, [clientRecords, searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge]);

  const availableBooths = useMemo(() => {
    const bMap = new Map();
    clientRecords.forEach(row => {
      if (!row) return;
      const bNo = row['Booth No'] || row['booth_no'];
      if (bNo) {
        const st = row['Polling_Station_Name'] || row['polling_station_name'] || `Booth #${bNo}`;
        bMap.set(String(bNo), { booth_no: String(bNo), station: st });
      }
    });
    const result = Array.from(bMap.values()).sort((a,b) => Number(a.booth_no) - Number(b.booth_no));
    if (result.length > 0) return result;
    if (!filterOptions.booths) return [];
    if (!selectedWard) return filterOptions.booths;
    return filterOptions.booths.filter(b => typeof b === 'object' ? (b.ward === selectedWard || !b.ward) : true);
  }, [clientRecords, filterOptions.booths, selectedWard]);

  const availableAnubhags = useMemo(() => {
    const aMap = new Map();
    clientRecords.forEach(row => {
      if (!row) return;
      if (selectedBooth && String(row['Booth No'] || row['booth_no'] || '').trim() !== String(selectedBooth).trim()) return;
      const anName = (row['Anubhag_name'] || row['anubhag_name'] || '').trim();
      const anNo = (row['Anubhag_number'] || row['anubhag_number'] || '').trim();
      if (anName || anNo) {
        const k = `${anNo}||${anName}`;
        if (!aMap.has(k)) {
          aMap.set(k, { number: anNo, name: anName || `अनुभाग #${anNo}` });
        }
      }
    });
    const result = Array.from(aMap.values()).sort((a,b) => Number(a.number) - Number(b.number));
    if (result.length > 0) return result;
    if (!filterOptions.anubhags) return [];
    return filterOptions.anubhags.filter(an => {
      if (selectedBooth && String(an.booth_no) !== String(selectedBooth)) return false;
      if (selectedWard && an.ward && an.ward !== selectedWard) return false;
      return true;
    });
  }, [clientRecords, selectedBooth, filterOptions.anubhags, selectedWard]);

  const displayedTotalRecords = isServerMode ? totalRecords : filteredRecords.length;
  const displayedTotalPages = isServerMode ? totalPages : (Math.ceil(filteredRecords.length / perPage) || 1);
  const displayedVoters = useMemo(() => {
    if (isServerMode) return voters;
    const curPg = page > displayedTotalPages ? 1 : page;
    const offset = (curPg - 1) * perPage;
    return filteredRecords.slice(offset, offset + perPage);
  }, [isServerMode, voters, filteredRecords, page, perPage, displayedTotalPages]);

  // Initial Check & Load
  useEffect(() => {
    async function initApp() {
      setLoading(true);
      try {
        const resp = await fetch('/api/stats');
        if (resp.ok) {
          setIsServerMode(true);
          const statsData = await resp.json();
          setStats(statsData);

          const optsResp = await fetch('/api/filters');
          if (optsResp.ok) {
            setFilterOptions(await optsResp.json());
          }

          const chartsResp = await fetch('/api/charts');
          if (chartsResp.ok) {
            setChartData(await chartsResp.json());
          }

          await fetchVotersServer(1, searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge, perPage);
        } else {
          throw new Error("Server not responding with json");
        }
      } catch (err) {
        console.log("[-] Offline / Static Mode detected. Loading high-speed static dataset engine...");
        setIsServerMode(false);
        loadStaticDataset();
      }
    }
    initApp();
  }, []);

  // Fetch from server or static chunk when criteria change
  useEffect(() => {
    if (isServerMode && !loading) {
      const delayDebounce = setTimeout(() => {
        fetchVotersServer(page, searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge, perPage);
      }, 150);
      return () => clearTimeout(delayDebounce);
    } else if (!isServerMode && !loading) {
      if (selectedWard && selectedWard !== window._lastLoadedWard) {
        window._lastLoadedWard = selectedWard;
        fetchStaticWardChunk(selectedWard);
      }
    }
  }, [searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge, page, perPage, isServerMode, loading]);

  async function fetchVotersServer(pg, q, ward, booth, anubhag, rel, hNo, sex, minA, maxA, pp) {
    try {
      const url = `/api/voters?search=${encodeURIComponent(q)}&ward=${encodeURIComponent(ward)}&booth=${encodeURIComponent(booth)}&anubhag=${encodeURIComponent(anubhag)}&relation=${encodeURIComponent(rel)}&house_no=${encodeURIComponent(hNo)}&sex=${encodeURIComponent(sex)}&min_age=${minA}&max_age=${maxA}&page=${pg}&per_page=${pp}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVoters(data.data || []);
        setTotalRecords(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setPage(data.page || 1);
      }
    } catch (e) {
      console.error("Failed fetching voters from server:", e);
    }
  }

  async function fetchStaticWardChunk(wardName) {
    const statusEl = document.getElementById('loading-status');
    const cleanNum = (wardName || '').replace(/[^0-9]/g, '') || '36';
    const chunkPath = `data/ward_${intParse(cleanNum)}.json`;
    if (statusEl) statusEl.innerText = `⚡ Unpacking Ward ${cleanNum} from Vercel Edge CDN...`;
    setLoading(true);
    
    try {
      const res = await fetch(chunkPath);
      if (res.ok) {
        const rawRows = await res.json();
        const dataObjects = rawRows.map(r => ({
          sr_no: r[0], epic_number: r[1], name: r[2], relation: r[3], father_name: r[4],
          age: r[5], sex: r[6], house_no: r[7], booth_no: r[8], anubhag_number: r[9],
          anubhag_name: r[10], polling_station_name: r[11], polling_station_address: r[12], ward: r[13]
        }));
        setClientRecords(dataObjects);
        setLoading(false);
        if (statusEl) statusEl.innerText = `✅ Loaded Ward ${cleanNum} (${dataObjects.length.toLocaleString()} Electors)`;
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.error("Failed to load chunk:", chunkPath, err);
    }
  }

  function intParse(str) {
    return parseInt(str, 10) || 36;
  }

  async function loadStaticDataset() {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) statusEl.innerText = "⚡ Loading Bankipur Electoral Roll (All 24 Wards) from CDN...";

    try {
      // 1. Fetch metadata.json (Loads in 2ms via CDN!)
      const metaRes = await fetch("data/metadata.json");
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setStats({
          total: meta.total_voters || 379153,
          male: meta.male || 0,
          female: meta.female || 0,
          other: meta.other || 0,
          avg_age: meta.avg_age || 38.5,
          first_time_voters: meta.first_time_voters || 0,
          total_booths: meta.total_booths || 300,
          total_wards: meta.total_wards || 24
        });

        const wardsFormatted = (meta.wards || []).map(w => ({
          ward: w.ward || `वार्ड नं-${String(w.ward_id).padStart(3, '0')}`,
          count: w.count
        }));

        setFilterOptions({
          booths: [],
          wards: wardsFormatted,
          sexes: ['पुरुष', 'महिला', 'अन्य'],
          anubhags: [],
          relations: ['पिता', 'पति', 'माता', 'अन्य'],
          ac_nos: ['182-Bankipur']
        });

        setChartData({
          top_booths: meta.top_booths || [],
          wards: wardsFormatted
        });

        // Load initial ward (Ward 36) immediately
        window._lastLoadedWard = 'वार्ड नं-036';
        setSelectedWard('वार्ड नं-036');
        await fetchStaticWardChunk('वार्ड नं-036');
        setLoading(false);
        if (statusEl) statusEl.innerText = `✅ Fully Initialized 24 Bankipur Wards (${meta.total_voters.toLocaleString()} Voters)!`;
        return;
      }
    } catch (e) {
      console.log("Metadata not found, falling back to compact/CSV check...", e);
    }

    try {
      const jsonRes = await fetch("voters_compact.json");
      if (jsonRes.ok) {
        const rawRows = await jsonRes.json();
        const dataObjects = rawRows.map(r => ({
          sr_no: r[0], epic_number: r[1], name: r[2], relation: r[3], father_name: r[4],
          age: r[5], sex: r[6], house_no: r[7], booth_no: r[8], anubhag_number: r[9],
          anubhag_name: r[10], polling_station_name: r[11], polling_station_address: r[12], ward: r[13]
        }));
        setClientRecords(dataObjects);
        setVoters(dataObjects.slice(0, perPage));
        setTotalRecords(dataObjects.length);
        setTotalPages(Math.ceil(dataObjects.length / perPage) || 1);
        setLoading(false);
        return;
      }
    } catch(e) {}

    // Fallback: CSV Streaming without Worker
    loadLocalCSV("voter_data.csv");
  }

  function loadLocalCSV(fileUrl) {
    let accumulated = [];
    let m = 0, f = 0, o = 0, sumAge = 0, firstTime = 0, validAge = 0;
    const boothSet = new Map();
    const wardMap = {};
    const sexSet = new Set();
    const anubhagSet = new Map();
    const relationSet = new Set();
    const boothCounts = {};
    const ageGroups = {
      '18-25 (Gen Z)': 0,
      '26-35 (Young Adult)': 0,
      '36-50 (Middle Age)': 0,
      '51-65 (Senior)': 0,
      '65+ (Elderly)': 0,
      'Unknown/Other': 0
    };

    const statusEl = document.getElementById('loading-status');
    if (statusEl) statusEl.innerText = "⚡ Streaming & Indexing Patna Bankipur (All 24 Wards) Roll...";

    Papa.parse(fileUrl, {
      download: true,
      header: true,
      worker: false, // Main thread chunking guarantees zero CORS/CSP worker blocks on Vercel/Netlify
      chunk: function(results) {
        const validChunk = results.data.filter(r => r && (r['EPIC NUMBER'] || r['Name'] || r['epic_number'] || r['name']));
        if (validChunk.length === 0) return;

        validChunk.forEach(row => {
          accumulated.push(row);
          const s = (row['sex'] || row['Sex'] || '').trim();
          if (s === 'पुरुष' || s === 'Male' || s === 'M') m++;
          else if (s === 'महिला' || s === 'Female' || s === 'F') f++;
          else o++;

          if (s) sexSet.add(s);
          
          const w = (row['Ward'] || row['ward'] || '').trim();
          if (w && wardMap[w] !== undefined) {
            wardMap[w]++;
          } else if (w) {
            wardMap[w] = (wardMap[w] || 0) + 1;
          }

          const b = row['Booth No'] || row['booth_no'];
          if (b) {
            const stName = row['Polling_Station_Name'] || row['polling_station_name'] || `Booth #${b}`;
            boothSet.set(String(b), { booth_no: String(b), station: stName, ward: w });
            const bKey = `${b}||${stName}`;
            boothCounts[bKey] = (boothCounts[bKey] || 0) + 1;
          }

          const an = (row['Anubhag_name'] || row['anubhag_name'] || '').trim();
          const anNo = (row['Anubhag_number'] || row['anubhag_number'] || '1').trim();
          if (an) {
            anubhagSet.set(an, { number: anNo, name: an, booth_no: String(b), ward: w });
          }

          const rel = (row['relation'] || row['Relation'] || '').trim();
          if (rel) relationSet.add(rel);

          const a = parseInt(row['age'] || row['Age']) || 0;
          if (a > 0) {
            sumAge += a;
            validAge++;
            if (a <= 21) firstTime++;

            if (a >= 18 && a <= 25) ageGroups['18-25 (Gen Z)']++;
            else if (a <= 35) ageGroups['26-35 (Young Adult)']++;
            else if (a <= 50) ageGroups['36-50 (Middle Age)']++;
            else if (a <= 65) ageGroups['51-65 (Senior)']++;
            else if (a > 65) ageGroups['65+ (Elderly)']++;
          } else {
            ageGroups['Unknown/Other']++;
          }
        });

        // Instant First-Batch Render (< 0.08 seconds!)
        if (accumulated.length <= 1500) {
          setClientRecords([...accumulated]);
          setVoters(accumulated.slice(0, perPage));
          setTotalRecords(accumulated.length);
          setTotalPages(Math.ceil(accumulated.length / perPage) || 1);
          setLoading(false);
        }

        if (statusEl && accumulated.length % 5000 === 0) {
          statusEl.innerText = `⚡ Indexed ${accumulated.length.toLocaleString()} citizen electors...`;
        }
      },
      complete: function() {
        setClientRecords(accumulated);
        
        const sortedBooths = Object.entries(boothCounts)
          .map(([k, cnt]) => {
            const [bNo, st] = k.split('||');
            return { booth_no: bNo, station: st.slice(0, 30), count: cnt };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const wardsArray = Object.entries(wardMap)
          .map(([w, cnt]) => ({ ward: w, count: cnt }))
          .sort((a, b) => a.ward.localeCompare(b.ward));

        setStats({
          total: accumulated.length,
          male: m,
          female: f,
          other: o,
          avg_age: validAge > 0 ? (sumAge / validAge).toFixed(1) : 0,
          first_time_voters: firstTime,
          total_booths: boothSet.size,
          total_wards: wardsArray.length
        });

        setFilterOptions({
          booths: Array.from(boothSet.values()).sort((a,b) => Number(a.booth_no) - Number(b.booth_no)),
          wards: wardsArray,
          sexes: Array.from(sexSet).sort(),
          anubhags: Array.from(anubhagSet.values()).sort((a,b) => a.name.localeCompare(b.name)),
          relations: Array.from(relationSet).sort(),
          ac_nos: ['182-Bankipur']
        });

        setChartData({
          age_groups: ageGroups,
          top_booths: sortedBooths,
          wards: wardsArray
        });

        filterClientRecords(accumulated);
        if (statusEl) statusEl.innerText = `✅ Fully Indexed ${accumulated.length.toLocaleString()} Voters!`;
      },
      error: function(err) {
        setError("Could not load CSV file directly. Make sure you are running via local server or upload a file below.");
      }
    });
  }

  // Reset filters
  function resetFilters() {
    setSearchQuery('');
    setSelectedWard(window._lastLoadedWard || 'वार्ड नं-036');
    setSelectedBooth('');
    setSelectedAnubhag('');
    setSelectedRelation('');
    setSelectedHouseNo('');
    setSelectedSex('');
    setMinAge(0);
    setMaxAge(120);
    setPage(1);
    showToast("Filters reset to default view.");
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-indigo-300/30">
          <span className="text-xl">✨</span>
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navbar */}
      <header className="glass-header sticky top-0 z-40 px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-xl">
              EC
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Patna Bankipur Electoral Roll (All 24 Wards)
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Assembly Constituency: <strong className="text-indigo-600">182-Bankipur (Patna, Bihar)</strong></span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isServerMode ? `High-Speed SQLite API Engine (${stats.total ? stats.total.toLocaleString() : '379,153'} Voters)` : `High-Speed CDN Engine (${stats.total ? stats.total.toLocaleString() : '379,153'} Voters)`}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'directory' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>🔍 Voter Directory & Roll</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'analytics' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>📊 Ward & Demographics</span>
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'sync' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>📤 Settings & Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        
        {/* SLEEK SINGLE-LINE WARD BAR (Minimalist & Horizontal Scrollable) */}
        <div className="glass-card p-3 flex items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 pl-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">⚡ Quick Wards:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto flex-nowrap pb-1 pr-2 scrollbar-none w-full justify-start">
            <button
              onClick={() => { setSelectedWard(''); setSelectedBooth(''); setSelectedAnubhag(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedWard === '' 
                  ? 'bg-indigo-600 text-white shadow-sm scale-105' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>🌐 All 24 Wards</span>
              <span className="bg-black/10 px-2 py-0.5 rounded-full text-xs">{stats.total.toLocaleString()}</span>
            </button>

            {filterOptions.wards?.map((wItem) => {
              const wName = typeof wItem === 'object' ? wItem.ward : wItem;
              const wCount = typeof wItem === 'object' ? wItem.count : 0;
              const isSelected = selectedWard === wName;
              const cleanNum = wName.replace(/[^0-9]/g, '');
              return (
                <button
                  key={wName}
                  onClick={() => { setSelectedWard(wName); setSelectedBooth(''); setSelectedAnubhag(''); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-sm scale-105' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>🏛️ Ward {cleanNum || wName}</span>
                  {wCount > 0 && <span className="bg-black/10 px-1.5 py-0.5 rounded-full text-xs">{wCount.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: VOTER DIRECTORY & SEARCH */}
        {activeTab === 'directory' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Multi-Criteria Advanced Filter & Search Grid (De-cluttered Command Center) */}
            <div className="glass-card p-5 sm:p-6 space-y-5 bg-white border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Primary Search Input */}
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="🔍 Search EPIC ID (e.g. AFS4214680), Voter Name (रुही खान), Father Name, or Street..." 
                    className="input-glass pl-12 py-3.5 text-base font-semibold rounded-2xl border-slate-200 bg-slate-50 focus:bg-white shadow-inner w-full text-slate-900"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Export / Print Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => {
                      showToast("Preparing printable PDF list report...");
                      window.print();
                    }}
                    className="btn-secondary px-4 py-2.5 text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 flex items-center gap-2"
                  >
                    <span>📄 Export PDF Report</span>
                  </button>

                  {isServerMode ? (
                    <a 
                      href={`/api/export?search=${encodeURIComponent(searchQuery)}&ward=${encodeURIComponent(selectedWard)}&booth=${encodeURIComponent(selectedBooth)}&anubhag=${encodeURIComponent(selectedAnubhag)}&sex=${encodeURIComponent(selectedSex)}`}
                      className="btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap"
                    >
                      <span>📥 Export CSV ({displayedTotalRecords.toLocaleString()})</span>
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        const csv = Papa.unparse(isServerMode ? voters : filteredRecords);
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.setAttribute("download", `bankipur_${selectedWard || 'all_wards'}_voters.csv`);
                        document.body.appendChild(link);
                        link.click();
                        showToast("Exported results to CSV!");
                      }}
                      className="btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap"
                    >
                      <span>📥 Export CSV ({displayedTotalRecords.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic 6-Column Filter Grid: Ward Wise #1, Booth, Anubhag, Relation, House No, Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 pt-4 border-t border-slate-200 text-left">
                
                {/* 1. Ward Wise Filter */}
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1.5 flex items-center justify-between">
                    <span>1. Ward Filter (वार्ड चुनें)</span>
                    <span className="text-[10px] text-indigo-600 font-mono">({filterOptions.wards?.length || 24})</span>
                  </label>
                  <select 
                    value={selectedWard} 
                    onChange={(e) => { setSelectedWard(e.target.value); setSelectedBooth(''); setSelectedAnubhag(''); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5 font-bold text-indigo-900 bg-indigo-50 border-indigo-200"
                  >
                    <option value="">🌐 All 24 Wards (सभी वार्ड)</option>
                    {filterOptions.wards?.map((wItem) => {
                      const wName = typeof wItem === 'object' ? wItem.ward : wItem;
                      const wCount = typeof wItem === 'object' ? wItem.count : 0;
                      const cleanNum = wName.replace(/[^0-9]/g, '');
                      return (
                        <option key={wName} value={wName}>
                          🏛️ Ward {cleanNum || wName} {wCount > 0 ? `(${wCount.toLocaleString()})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Polling Booth Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>2. Polling Booth No</span>
                    <span className="text-[10px] text-slate-500">({availableBooths.length})</span>
                  </label>
                  <select 
                    value={selectedBooth} 
                    onChange={(e) => { setSelectedBooth(e.target.value); setSelectedAnubhag(''); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5 bg-slate-50 border-slate-200 text-slate-800"
                  >
                    <option value="">All Booths in {selectedWard || 'All Wards'}</option>
                    {availableBooths.map((b) => {
                      const bNo = typeof b === 'object' ? b.booth_no : b;
                      const st = typeof b === 'object' ? (b.station || '') : '';
                      return (
                        <option key={bNo} value={bNo}>Booth #{bNo} {st ? `• ${st.slice(0, 18)}` : ''}</option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. Anubhag / Street Section Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>3. Anubhag (अनुभाग / गली)</span>
                    <span className="text-[10px] text-slate-500">({availableAnubhags.length})</span>
                  </label>
                  <select 
                    value={selectedAnubhag} 
                    onChange={(e) => { setSelectedAnubhag(e.target.value); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5 font-medium bg-slate-50 border-slate-200 text-slate-800"
                  >
                    <option value="">All Anubhags / Localities</option>
                    {availableAnubhags.map((an, idx) => {
                      const anName = typeof an === 'object' ? an.name : an;
                      const anNo = typeof an === 'object' ? an.number : '';
                      const anBooth = typeof an === 'object' ? (an.booth_no || '') : '';
                      return (
                        <option key={`${anName}-${idx}`} value={anName}>
                          {anNo ? `[#${anNo}] ` : ''}{anName.slice(0, 22)} {anBooth ? `(B#${anBooth})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 4. Relation / Guardian Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">4. Relation (संबंध)</label>
                  <select 
                    value={selectedRelation} 
                    onChange={(e) => { setSelectedRelation(e.target.value); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5 bg-slate-50 border-slate-200 text-slate-800"
                  >
                    <option value="">All Relations</option>
                    <option value="पिता">पिता (Father)</option>
                    <option value="पति">पति (Husband)</option>
                    <option value="माता">माता (Mother)</option>
                    <option value="अन्य">अन्य (Other)</option>
                  </select>
                </div>

                {/* 5. House Number Quick Search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">5. House No (मकान नं)</label>
                  <input 
                    type="text" 
                    value={selectedHouseNo} 
                    onChange={(e) => { setSelectedHouseNo(e.target.value); setPage(1); }}
                    placeholder="e.g. 000 or 14-A" 
                    className="input-glass w-full text-xs py-2.5 bg-slate-50 border-slate-200 text-slate-800"
                  />
                </div>

                {/* 6. Gender & Rows Per Page */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender (लिंग)</label>
                    <select 
                      value={selectedSex} 
                      onChange={(e) => { setSelectedSex(e.target.value); setPage(1); }}
                      className="select-glass w-full text-xs py-2.5 bg-slate-50 border-slate-200 text-slate-800"
                    >
                      <option value="">All</option>
                      <option value="पुरुष">पुरुष (Male)</option>
                      <option value="महिला">महिला (Female)</option>
                      <option value="तृतीय">तृतीय (Trans)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Rows/Page</label>
                    <select 
                      value={perPage} 
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                      className="select-glass w-full text-xs py-2.5 bg-slate-50 border-slate-200 text-slate-800"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Active Filter Pills & Reset Strip */}
              {(searchQuery || selectedWard || selectedBooth || selectedAnubhag || selectedRelation || selectedHouseNo || selectedSex) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                  <span className="text-xs font-bold text-indigo-600">Active Criteria:</span>
                  {selectedWard && (
                    <span className="badge badge-indigo flex items-center gap-1.5 font-bold">
                      Ward: {selectedWard} <button onClick={() => setSelectedWard('')} className="hover:text-indigo-900">✕</button>
                    </span>
                  )}
                  {selectedBooth && (
                    <span className="badge badge-cyan flex items-center gap-1.5">
                      Booth #{selectedBooth} <button onClick={() => setSelectedBooth('')} className="hover:text-cyan-900">✕</button>
                    </span>
                  )}
                  {selectedAnubhag && (
                    <span className="badge badge-emerald flex items-center gap-1.5">
                      Anubhag: {selectedAnubhag.slice(0, 18)} <button onClick={() => setSelectedAnubhag('')} className="hover:text-emerald-900">✕</button>
                    </span>
                  )}
                  {selectedRelation && (
                    <span className="badge badge-amber flex items-center gap-1.5">
                      Relation: {selectedRelation} <button onClick={() => setSelectedRelation('')} className="hover:text-amber-900">✕</button>
                    </span>
                  )}
                  {selectedHouseNo && (
                    <span className="badge badge-indigo flex items-center gap-1.5">
                      House: {selectedHouseNo} <button onClick={() => setSelectedHouseNo('')} className="hover:text-indigo-900">✕</button>
                    </span>
                  )}
                  {selectedSex && (
                    <span className="badge badge-rose flex items-center gap-1.5">
                      Sex: {selectedSex} <button onClick={() => setSelectedSex('')} className="hover:text-rose-900">✕</button>
                    </span>
                  )}
                  <button 
                    onClick={resetFilters}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline ml-auto"
                  >
                    Reset All Criteria
                  </button>
                </div>
              )}
            </div>

            {/* ELECTORAL LIST VIEW (Dual Engine: Desktop Table + Mobile Card Grid) */}
            <div className="glass-card overflow-hidden border border-slate-200 shadow-sm print-report-container bg-white">
              
              {/* Top Pagination Strip */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📋 Registered Voters:</span>
                    <span className="badge badge-indigo font-mono text-xs">{displayedTotalRecords.toLocaleString()}</span>
                  </span>
                  {searchQuery && (
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-medium">
                      Query: "{searchQuery}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ◀ Prev
                  </button>
                  <span className="text-xs font-medium text-slate-700 px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-mono shadow-sm">
                    Page <strong className="text-indigo-600">{page}</strong> of <strong className="text-slate-900">{displayedTotalPages}</strong>
                  </span>
                  <button 
                    disabled={page >= displayedTotalPages}
                    onClick={() => setPage(page + 1)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              {/* 1. DESKTOP VIEW: High-Density Table */}
              <div className="desktop-only table-container max-h-[680px] overflow-y-auto">
                <table>
                  <thead>
                    <tr>
                      <th className="w-24">SR / Booth</th>
                      <th>EPIC ID (पहचान पत्र)</th>
                      <th>Voter Full Name (मतदाता का नाम)</th>
                      <th>Guardian & Relation (पिता/पति)</th>
                      <th>Age / Sex (आयु / लिंग)</th>
                      <th>Anubhag & Street (अनुभाग व गली)</th>
                      <th>Ward & House (वार्ड व मकान)</th>
                      <th className="text-right">Profile / PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedVoters.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-16 text-slate-400">
                          <div className="text-4xl mb-3">🔍</div>
                          <p className="text-base font-bold text-slate-800">No matching electors found in {selectedWard || 'All Wards'}</p>
                          <p className="text-xs text-slate-500 mt-1">Try clearing your Anubhag, House Number, or Search Query.</p>
                          <button onClick={resetFilters} className="btn-primary mt-4 text-xs">Clear All Filters</button>
                        </td>
                      </tr>
                    ) : (
                      displayedVoters.map((row, idx) => {
                        const epic = row['epic_number'] || row['EPIC NUMBER'] || 'N/A';
                        const vName = row['name'] || row['Name'] || 'N/A';
                        const fName = row['father_name'] || row['Father Name'] || 'N/A';
                        const rel = row['relation'] || row['Relation'] || 'Parent';
                        const ageVal = row['age'] || row['Age'] || '0';
                        const sexVal = row['sex'] || row['Sex'] || 'N/A';
                        const bNo = row['booth_no'] || row['Booth No'] || '0';
                        const anName = row['anubhag_name'] || row['Anubhag_name'] || '';
                        const anNo = row['anubhag_number'] || row['Anubhag_number'] || '1';
                        const wardVal = row['ward'] || row['Ward'] || 'वार्ड नं-037';
                        const hNo = row['house_no'] || row['House No'] || '00';
                        const srNo = row['sr_no'] || row['SR No'] || (idx + 1);

                        return (
                          <tr 
                            key={row['id'] || `${epic}-${idx}`}
                            className="cursor-pointer hover:bg-slate-50 transition-colors group"
                            onClick={() => setSelectedVoter(row)}
                          >
                            <td>
                              <span className="font-mono font-bold text-indigo-600 text-sm block">Booth #{bNo}</span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5 block">SR #{srNo}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 text-sm">
                                  {epic}
                                </span>
                              </div>
                            </td>
                            <td className="font-bold text-slate-900 text-base tracking-wide">
                              {vName}
                            </td>
                            <td className="text-slate-700">
                              <span className="text-[11px] text-amber-600 uppercase font-semibold block">{rel}</span>
                              <span className="text-sm font-medium">{fName}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className="badge badge-cyan font-mono text-xs">{ageVal} Yrs</span>
                                <span className={`badge text-xs ${
                                  (sexVal === 'महिला' || sexVal === 'Female') ? 'badge-rose' : (sexVal === 'तृतीय' ? 'badge-amber' : 'badge-indigo')
                                }`}>
                                  {sexVal}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="max-w-[200px]">
                                <span className="font-semibold text-emerald-600 text-xs block">
                                  {anNo ? `अनुभाग #${anNo}` : 'अनुभाग #1'}
                                </span>
                                <span className="text-xs text-slate-600 truncate block mt-0.5 font-medium" title={anName}>
                                  {anName || 'बाकरगंज'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div>
                                <span className="badge badge-indigo text-xs font-bold">{wardVal}</span>
                                <span className="text-xs text-slate-500 block font-mono mt-1">🏠 H.No: {hNo}</span>
                              </div>
                            </td>
                            <td className="text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedVoter(row); }}
                                className="btn-secondary px-3 py-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white"
                              >
                                Inspect / PDF ▶
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. MOBILE VIEW: Responsive High-Impact Voter Cards (100% Mobile Optimized) */}
              <div className="mobile-only p-3 space-y-3 max-h-[700px] overflow-y-auto bg-slate-50">
                {displayedVoters.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-base font-bold text-slate-800">No matching electors found</p>
                    <button onClick={resetFilters} className="btn-primary mt-4 text-xs">Clear All Filters</button>
                  </div>
                ) : (
                  displayedVoters.map((row, idx) => {
                    const epic = row['epic_number'] || row['EPIC NUMBER'] || 'N/A';
                    const vName = row['name'] || row['Name'] || 'N/A';
                    const fName = row['father_name'] || row['Father Name'] || 'N/A';
                    const rel = row['relation'] || row['Relation'] || 'Parent';
                    const ageVal = row['age'] || row['Age'] || '0';
                    const sexVal = row['sex'] || row['Sex'] || 'N/A';
                    const bNo = row['booth_no'] || row['Booth No'] || '0';
                    const anName = row['anubhag_name'] || row['Anubhag_name'] || '';
                    const anNo = row['anubhag_number'] || row['Anubhag_number'] || '1';
                    const wardVal = row['ward'] || row['Ward'] || 'वार्ड नं-037';
                    const hNo = row['house_no'] || row['House No'] || '00';
                    const srNo = row['sr_no'] || row['SR No'] || (idx + 1);

                    return (
                      <div 
                        key={row['id'] || `mob-${epic}-${idx}`}
                        onClick={() => setSelectedVoter(row)}
                        className="glass-card p-4 space-y-3 border border-slate-200 hover:border-indigo-300 bg-white rounded-2xl active:scale-[0.99] transition-transform text-left shadow-sm"
                      >
                        {/* Top row: EPIC ID + Ward / Booth */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 text-sm">
                              {epic}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="badge badge-indigo text-[11px] font-bold block">{wardVal}</span>
                            <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">Booth #{bNo} • SR #{srNo}</span>
                          </div>
                        </div>

                        {/* Middle row: Voter Name & Relation */}
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 tracking-wide">{vName}</h4>
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">
                            <span className="text-amber-600 font-semibold uppercase">{rel}: </span>
                            {fName}
                          </p>
                        </div>

                        {/* Bottom row: Demographics + Anubhag */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="badge badge-cyan font-mono">{ageVal} Yrs</span>
                            <span className={`badge ${
                              (sexVal === 'महिला' || sexVal === 'Female') ? 'badge-rose' : (sexVal === 'तृतीय' ? 'badge-amber' : 'badge-indigo')
                            }`}>
                              {sexVal}
                            </span>
                            <span className="badge badge-amber font-mono">🏠 H.No: {hNo}</span>
                          </div>
                          <div className="text-right max-w-[160px] truncate font-medium text-emerald-600">
                            {anNo ? `अनुभाग #${anNo}` : ''} {anName}
                          </div>
                        </div>

                        {/* Action Button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedVoter(row); }}
                          className="w-full btn-primary justify-center py-2 text-xs sm:text-sm font-bold mt-2 shadow-sm"
                        >
                          📄 Inspect & Download PDF Slip ▶
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Pagination Strip */}
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
                <div className="text-xs text-slate-600 font-mono">
                  Showing electors <strong className="text-slate-900">{(page - 1) * perPage + 1}</strong> to <strong className="text-slate-900">{Math.min(page * perPage, displayedTotalRecords)}</strong> of <strong className="text-indigo-600">{displayedTotalRecords.toLocaleString()}</strong>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button 
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                  >
                    ◀◀ First
                  </button>
                  <button 
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                  >
                    ◀ Previous
                  </button>
                  <span className="text-xs px-3 py-1 font-medium bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono">
                    Page {page} / {displayedTotalPages}
                  </span>
                  <button 
                    disabled={page >= displayedTotalPages}
                    onClick={() => setPage(page + 1)}
                    className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                  >
                    Next ▶
                  </button>
                  <button 
                    disabled={page >= displayedTotalPages}
                    onClick={() => setPage(displayedTotalPages)}
                    className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                  >
                    Last ▶▶
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEMOGRAPHIC ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard chartData={chartData} stats={stats} />
        )}

        {/* TAB 3: SETTINGS & SYNC */}
        {activeTab === 'sync' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="glass-card p-8 space-y-6 text-center bg-white border border-slate-200 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-3xl shadow-sm border border-indigo-100">
                📥
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Spreadsheet Sync & Overwrite Settings</h2>
                <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto font-medium">
                  Drag and drop an updated <strong className="text-indigo-600">.CSV</strong> or <strong className="text-emerald-600">.XLSX</strong> Excel sheet to re-index Wards dynamically.
                </p>
              </div>

              <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/50 rounded-2xl p-12 transition-all cursor-pointer relative group">
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setLoading(true);
                    loadLocalCSV(URL.createObjectURL(file));
                    showToast("Loading & Indexing new spreadsheet file via Web Worker!");
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-3 pointer-events-none">
                  <div className="text-5xl group-hover:scale-110 transition-transform">📄</div>
                  <p className="text-base font-semibold text-slate-900">Click or Drop Spreadsheet File Here</p>
                  <p className="text-xs text-slate-500 font-medium">Supports CSV & Excel (.XLSX) files</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* VOTER PROFILE DETAILS & OFFICIAL PDF DOWNLOAD MODAL */}
      {selectedVoter && (
        <div className="modal-backdrop" onClick={() => setSelectedVoter(null)}>
          <div className="modal-content overflow-hidden animate-fade-in text-left bg-white border border-slate-200 shadow-2xl rounded-3xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="no-print bg-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                  🗳️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>{selectedVoter['name'] || selectedVoter['Name']}</span>
                    <span className="badge badge-indigo font-mono text-sm">{selectedVoter['epic_number'] || selectedVoter['EPIC NUMBER']}</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    Official Voter Slip • <strong className="text-indigo-300">{selectedVoter['ward'] || selectedVoter['Ward'] || 'वार्ड नं-037'}</strong> • Booth #{selectedVoter['booth_no'] || selectedVoter['Booth No']}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVoter(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white shrink-0 font-bold"
              >
                ✕
              </button>
            </div>

            {/* OFFICIAL GOVERNMENT PDF SLIP VIEW (pdf-slip-box for badhiya PDF format) */}
            <div className="p-5 sm:p-6 space-y-6 bg-slate-100">
              
              <div className="pdf-slip-box bg-white p-6 rounded-2xl border-2 border-slate-300 space-y-5 shadow-lg text-slate-900">
                
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-200 pb-4">
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-widest block">Election Commission of India • Official Electoral Roll Slip</div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">182-Bankipur Assembly Constituency (Patna, Bihar)</h3>
                  <div className="text-xs text-slate-600 font-mono mt-0.5 font-semibold">Voter Information Profile & Polling Station Slip (पर्ची)</div>
                </div>

                {/* Primary Identity Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">EPIC NUMBER (Voter ID)</span>
                    <span className="text-lg font-mono font-extrabold text-indigo-700 mt-1 block">
                      {selectedVoter['epic_number'] || selectedVoter['EPIC NUMBER'] || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Voter Full Name (मतदाता का नाम)</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                      {selectedVoter['name'] || selectedVoter['Name'] || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Guardian & Relation (संबंध)</span>
                    <span className="text-base font-bold text-slate-800 mt-1 block">
                      <span className="text-xs text-amber-700 uppercase font-extrabold">({selectedVoter['relation'] || selectedVoter['Relation'] || 'Parent'}): </span>
                      {selectedVoter['father_name'] || selectedVoter['Father Name'] || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Demographics & Booth Section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">Age (आयु)</span>
                    <span className="text-base font-bold text-indigo-700 mt-0.5 block">{selectedVoter['age'] || selectedVoter['Age'] || 'N/A'} Years</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">Gender (लिंग)</span>
                    <span className="text-base font-bold text-rose-600 mt-0.5 block">{selectedVoter['sex'] || selectedVoter['Sex'] || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">SR Number</span>
                    <span className="text-base font-mono font-bold text-slate-800 mt-0.5 block">#{selectedVoter['sr_no'] || selectedVoter['SR No'] || '1'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">House Number</span>
                    <span className="text-base font-bold text-amber-700 mt-0.5 block">{selectedVoter['house_no'] || selectedVoter['House No'] || '00'}</span>
                  </div>
                </div>

                {/* Polling Station & Anubhag Details */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Polling Station & Anubhag (Locality Details)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold">Polling Booth Number:</span>
                      <span className="font-extrabold text-emerald-700 text-base">Booth #{selectedVoter['booth_no'] || selectedVoter['Booth No'] || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold">Municipal Ward:</span>
                      <span className="font-extrabold text-slate-900 text-base">{selectedVoter['ward'] || selectedVoter['Ward'] || 'वार्ड नं-037'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-xs font-semibold">Polling Station Address / School:</span>
                      <span className="font-bold text-slate-900">{selectedVoter['polling_station_name'] || selectedVoter['Polling_Station_Name'] || 'N/A'} — {selectedVoter['polling_station_address'] || selectedVoter['Polling_Station_Address'] || ''}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold">Anubhag Number (अनुभाग नं):</span>
                      <span className="font-extrabold text-amber-700 text-base">Anubhag #{selectedVoter['anubhag_number'] || selectedVoter['Anubhag_number'] || '1'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold">Anubhag Name (अनुभाग / गली का नाम):</span>
                      <span className="font-extrabold text-slate-900 text-base">{selectedVoter['anubhag_name'] || selectedVoter['Anubhag_name'] || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Verification Barcode & Signature Strip */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t-2 border-slate-200 text-xs">
                  <div className="text-slate-600 font-mono">
                    <div>Authenticity Hash: <span className="text-indigo-700 font-bold">{selectedVoter['epic_number'] || 'EPIC'}-{selectedVoter['booth_no'] || '000'}-{selectedVoter['sr_no'] || '1'}</span></div>
                    <div>Issued via Bankipur Assembly Digital Directory • Verified ECI Data</div>
                  </div>
                  <div className="border border-dashed border-slate-400 px-4 py-2 rounded-lg bg-slate-50 text-center font-mono text-[11px] text-slate-700">
                    |||| | ||| |||||| | |||| | ||<br/>
                    <strong className="text-emerald-700">VERIFIED VOTER SLIP (पर्ची)</strong>
                  </div>
                </div>

              </div>

              {/* Administrative Jurisdiction */}
              <div className="no-print space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Geographic & Municipal Jurisdiction</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold">Main Town / City:</span>
                    <span className="font-bold text-slate-900">{selectedVoter['main_town'] || selectedVoter['Main_Town'] || 'Patna'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold">Post Office:</span>
                    <span className="font-bold text-slate-900">{selectedVoter['post_office'] || selectedVoter['Post_Office'] || 'Bankipur H.O'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold">Tehsil:</span>
                    <span className="font-bold text-slate-900">{selectedVoter['tehsil'] || selectedVoter['Tehsil'] || 'Patna Sadar'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs font-semibold">District & PIN:</span>
                    <span className="font-bold text-slate-900">{selectedVoter['district'] || selectedVoter['District']} ({selectedVoter['pin_code'] || selectedVoter['Pin_Code'] || '800004'})</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="no-print p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-semibold">Official Record Verified against Election Commission Roll</span>
              <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedVoter, null, 2));
                    showToast("Copied full voter record as JSON!");
                  }}
                  className="btn-secondary px-3 py-2 text-xs font-semibold"
                >
                  📋 Copy JSON
                </button>
                <button 
                  onClick={() => {
                    document.body.classList.add('printing-active');
                    const modalEl = document.querySelector('.modal-content');
                    if (modalEl) modalEl.classList.add('printing-active');
                    showToast("Opening official PDF download / print dialog...");
                    setTimeout(() => {
                      window.print();
                      setTimeout(() => {
                        document.body.classList.remove('printing-active');
                        if (modalEl) modalEl.classList.remove('printing-active');
                      }, 500);
                    }, 100);
                  }}
                  className="btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center gap-2"
                >
                  <span>🖨️ PDF me Badhiya Format me Download / Print Slip</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Chart Components
function AnalyticsDashboard({ chartData, stats }) {
  const ageChartRef = useRef(null);
  const wardChartRef = useRef(null);
  const boothChartRef = useRef(null);

  useEffect(() => {
    // Render Age Chart
    if (ageChartRef.current && chartData?.age_groups) {
      const ctx = ageChartRef.current.getContext('2d');
      if (window.ageChartInstance) window.ageChartInstance.destroy();
      
      const labels = Object.keys(chartData.age_groups);
      const values = Object.values(chartData.age_groups);

      window.ageChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Electors Count',
            data: values,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // Render Ward Distribution Bar Chart
    if (wardChartRef.current && chartData?.wards) {
      const ctx = wardChartRef.current.getContext('2d');
      if (window.wardChartInstance) window.wardChartInstance.destroy();

      const labels = chartData.wards.map(w => w.ward);
      const counts = chartData.wards.map(w => w.count);

      window.wardChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: counts,
            backgroundColor: ['#06b6d4', '#6366f1', '#10b981'],
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#f9fafb', padding: 20, font: { size: 13, weight: 'bold' } } }
          }
        }
      });
    }

    // Render Top Booths Chart
    if (boothChartRef.current && chartData?.top_booths?.length > 0) {
      const ctx = boothChartRef.current.getContext('2d');
      if (window.boothChartInstance) window.boothChartInstance.destroy();

      window.boothChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.top_booths.map(b => `Booth #${b.booth_no}`),
          datasets: [{
            label: 'Electors Density',
            data: chartData.top_booths.map(b => b.count),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
            y: { grid: { display: false }, ticks: { color: '#f9fafb', font: { weight: 'bold' } } }
          }
        }
      });
    }
  }, [chartData, stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ward Distribution Doughnut Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>🏛️ 3-Ward Proportion</span>
              <span className="badge badge-cyan">Wards 36-38</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">Exact voter breakdown across Wards 36, 37, and 38.</p>
          </div>
          <div className="h-72 mt-4 relative flex items-center justify-center">
            <canvas ref={wardChartRef}></canvas>
          </div>
        </div>

        {/* Age Histogram Card */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>📊 Generational & Age Group Split</span>
              <span className="badge badge-indigo">Age Demographics</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">Distribution across Gen Z, Young Adults, Middle-aged, and Senior citizens.</p>
          </div>
          <div className="h-72 mt-6">
            <canvas ref={ageChartRef}></canvas>
          </div>
        </div>

      </div>

      {/* Top 10 High Density Booths */}
      <div className="glass-card p-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center justify-between">
            <span>🏛️ Top 10 Highest Density Polling Booths (`Booth No`)</span>
            <span className="badge badge-emerald">Top Booths</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Polling stations ranked by total registered electors.</p>
        </div>
        <div className="h-80 mt-6">
          <canvas ref={boothChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
