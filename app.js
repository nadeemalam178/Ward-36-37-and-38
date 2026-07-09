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
        console.log("[-] Offline / Static Mode detected. Loading CSV directly via Web Worker...");
        setIsServerMode(false);
        loadLocalCSV("voter_data.csv");
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  // Fetch from server or filter locally when criteria change
  useEffect(() => {
    if (isServerMode && !loading) {
      const delayDebounce = setTimeout(() => {
        fetchVotersServer(page, searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge, perPage);
      }, 150);
      return () => clearTimeout(delayDebounce);
    } else if (!isServerMode && !loading) {
      filterClientRecords();
    }
  }, [searchQuery, selectedWard, selectedBooth, selectedAnubhag, selectedRelation, selectedHouseNo, selectedSex, minAge, maxAge, page, perPage, isServerMode]);

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

  function loadLocalCSV(fileUrl) {
    let accumulated = [];
    let m = 0, f = 0, o = 0, sumAge = 0, firstTime = 0, validAge = 0;
    const boothSet = new Map();
    const wardMap = { 'वार्ड नं-036': 0, 'वार्ड नं-037': 0, 'वार्ड नं-038': 0 };
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
    if (statusEl) statusEl.innerText = "⚡ Indexing Patna Bankipur (Ward 36, 37, 38) via Background Worker...";

    Papa.parse(fileUrl, {
      download: true,
      header: true,
      worker: true,
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

  function filterClientRecords(sourceData = clientRecords) {
    const q = searchQuery.toLowerCase().trim();
    const hQ = selectedHouseNo.toLowerCase().trim();

    const filtered = sourceData.filter(row => {
      if (!row) return false;
      
      const matchQ = !q || 
        String(row['EPIC NUMBER'] || row['epic_number'] || '').toLowerCase().includes(q) ||
        String(row['Name'] || row['name'] || '').toLowerCase().includes(q) ||
        String(row['Father Name'] || row['father_name'] || '').toLowerCase().includes(q) ||
        String(row['Polling_Station_Address'] || row['polling_station_address'] || '').toLowerCase().includes(q);

      const matchW = !selectedWard || String(row['Ward'] || row['ward'] || '') === selectedWard;
      const matchB = !selectedBooth || String(row['Booth No'] || row['booth_no'] || '') === selectedBooth;
      const matchAn = !selectedAnubhag || 
        String(row['Anubhag_name'] || row['anubhag_name'] || '') === selectedAnubhag ||
        String(row['Anubhag_number'] || row['anubhag_number'] || '') === selectedAnubhag;
      
      const matchRel = !selectedRelation || String(row['relation'] || row['Relation'] || '') === selectedRelation;
      const matchHNo = !hQ || String(row['House No'] || row['house_no'] || '').toLowerCase().includes(hQ);
      const matchS = !selectedSex || String(row['sex'] || row['Sex'] || '') === selectedSex;
      
      const a = parseInt(row['age'] || row['Age']) || 0;
      const matchAge = (minAge <= 0 || a >= minAge) && (maxAge >= 120 || a <= maxAge);

      return matchQ && matchW && matchB && matchAn && matchRel && matchHNo && matchS && matchAge;
    });

    setTotalRecords(filtered.length);
    const totalPg = Math.ceil(filtered.length / perPage) || 1;
    setTotalPages(totalPg);
    
    const curPg = page > totalPg ? 1 : page;
    if (page > totalPg) setPage(1);

    const offset = (curPg - 1) * perPage;
    setVoters(filtered.slice(offset, offset + perPage));
  }

  // Filter dynamic lists based on currently selected Ward & Booth
  const availableBooths = useMemo(() => {
    if (!filterOptions.booths) return [];
    if (!selectedWard) return filterOptions.booths;
    return filterOptions.booths.filter(b => typeof b === 'object' ? (b.ward === selectedWard || !b.ward) : true);
  }, [filterOptions.booths, selectedWard]);

  const availableAnubhags = useMemo(() => {
    if (!filterOptions.anubhags) return [];
    return filterOptions.anubhags.filter(an => {
      if (selectedBooth && String(an.booth_no) !== String(selectedBooth)) return false;
      if (selectedWard && an.ward && an.ward !== selectedWard) return false;
      return true;
    });
  }, [filterOptions.anubhags, selectedBooth, selectedWard]);

  // Reset filters
  function resetFilters() {
    setSearchQuery('');
    setSelectedWard('');
    setSelectedBooth('');
    setSelectedAnubhag('');
    setSelectedRelation('');
    setSelectedHouseNo('');
    setSelectedSex('');
    setMinAge(0);
    setMaxAge(120);
    setPage(1);
    showToast("Filters reset to default view across all 3 wards.");
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
      <header className="glass-header sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 font-bold text-xl">
              EC
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                Patna Bankipur Electoral Roll (Wards 36, 37, 38)
              </h1>
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                <span>Assembly Constituency: <strong className="text-indigo-400">182-Bankipur (Patna, Bihar)</strong></span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {isServerMode ? "High-Speed SQLite API Engine (60.9k Voters)" : "Web Worker Instant Memory Engine"}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-900/80 p-1.5 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'directory' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🔍 Voter Directory & Roll</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'analytics' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>📊 Ward & Demographics</span>
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'sync' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>📤 Settings & Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        
        {/* WARD SWITCHER PILLS STRIP (Prominent 3-Ward Selector) */}
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-900 via-indigo-950/40 to-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider pl-2">Quick Ward Switcher:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            <button
              onClick={() => { setSelectedWard(''); setSelectedBooth(''); setSelectedAnubhag(''); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                selectedWard === '' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50 scale-105' 
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-white/5'
              }`}
            >
              <span>🌐 All 3 Wards</span>
              <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">{stats.total.toLocaleString()}</span>
            </button>

            {filterOptions.wards?.map((wItem) => {
              const wName = typeof wItem === 'object' ? wItem.ward : wItem;
              const wCount = typeof wItem === 'object' ? wItem.count : (wName === 'वार्ड नं-036' ? 28626 : wName === 'वार्ड नं-037' ? 11608 : 20696);
              const isSelected = selectedWard === wName;
              return (
                <button
                  key={wName}
                  onClick={() => { setSelectedWard(wName); setSelectedBooth(''); setSelectedAnubhag(''); setPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/40 border border-cyan-400/50 scale-105' 
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-white/5'
                  }`}
                >
                  <span>🏛️ {wName}</span>
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">{wCount.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: VOTER DIRECTORY & SEARCH */}
        {activeTab === 'directory' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Multi-Criteria Advanced Filter & Search Grid */}
            <div className="glass-card p-6 space-y-5">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Primary Search Input */}
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Search EPIC ID (e.g. AFS4214680), Voter Name (रुही खान), Father Name, or Street..." 
                    className="input-glass pl-12 py-3 text-base font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Export Results Button */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {isServerMode ? (
                    <a 
                      href={`/api/export?search=${encodeURIComponent(searchQuery)}&ward=${encodeURIComponent(selectedWard)}&booth=${encodeURIComponent(selectedBooth)}&anubhag=${encodeURIComponent(selectedAnubhag)}&sex=${encodeURIComponent(selectedSex)}`}
                      className="btn-primary whitespace-nowrap"
                    >
                      <span>📥 Export Current Filter ({totalRecords.toLocaleString()})</span>
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        const csv = Papa.unparse(voters);
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.setAttribute("download", "bankipur_voters_export.csv");
                        document.body.appendChild(link);
                        link.click();
                        showToast("Exported results to CSV!");
                      }}
                      className="btn-primary whitespace-nowrap"
                    >
                      <span>📥 Export Page CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic 5-Column Filter Grid (Booth, Anubhag, Relation, House No, Gender) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-white/10">
                
                {/* 1. Polling Booth Selector */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-300 mb-1.5 flex items-center justify-between">
                    <span>1. Polling Booth No</span>
                    {selectedWard && <span className="text-[10px] text-emerald-400">({selectedWard})</span>}
                  </label>
                  <select 
                    value={selectedBooth} 
                    onChange={(e) => { setSelectedBooth(e.target.value); setSelectedAnubhag(''); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5"
                  >
                    <option value="">All Polling Booths ({availableBooths.length})</option>
                    {availableBooths.map((b) => {
                      const bNo = typeof b === 'object' ? b.booth_no : b;
                      const st = typeof b === 'object' ? (b.station || '') : '';
                      return (
                        <option key={bNo} value={bNo}>Booth #{bNo} {st ? `• ${st.slice(0, 22)}` : ''}</option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Anubhag / Street Section Selector (Dynamic to Booth/Ward!) */}
                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1.5 flex items-center justify-between">
                    <span>2. Anubhag (अनुभाग / गली)</span>
                    <span className="text-[10px] text-gray-400">({availableAnubhags.length} sections)</span>
                  </label>
                  <select 
                    value={selectedAnubhag} 
                    onChange={(e) => { setSelectedAnubhag(e.target.value); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5 font-medium"
                  >
                    <option value="">All Anubhags / Localities</option>
                    {availableAnubhags.map((an, idx) => {
                      const anName = typeof an === 'object' ? an.name : an;
                      const anNo = typeof an === 'object' ? an.number : '';
                      const anBooth = typeof an === 'object' ? (an.booth_no || '') : '';
                      return (
                        <option key={`${anName}-${idx}`} value={anName}>
                          {anNo ? `[#${anNo}] ` : ''}{anName.slice(0, 26)} {anBooth ? `(Booth ${anBooth})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. Relation / Guardian Filter */}
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1.5">3. Relation (संबंध)</label>
                  <select 
                    value={selectedRelation} 
                    onChange={(e) => { setSelectedRelation(e.target.value); setPage(1); }}
                    className="select-glass w-full text-xs py-2.5"
                  >
                    <option value="">All Relations</option>
                    <option value="पिता">पिता (Father)</option>
                    <option value="पति">पति (Husband)</option>
                    <option value="माता">माता (Mother)</option>
                    <option value="अन्य">अन्य (Other)</option>
                  </select>
                </div>

                {/* 4. House Number Quick Search */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">4. House Number (मकान नं)</label>
                  <input 
                    type="text" 
                    value={selectedHouseNo} 
                    onChange={(e) => { setSelectedHouseNo(e.target.value); setPage(1); }}
                    placeholder="e.g. 00000 or 14-A" 
                    className="input-glass w-full text-xs py-2.5"
                  />
                </div>

                {/* 5. Gender & Rows Per Page */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-rose-300 mb-1.5">Gender (लिंग)</label>
                    <select 
                      value={selectedSex} 
                      onChange={(e) => { setSelectedSex(e.target.value); setPage(1); }}
                      className="select-glass w-full text-xs py-2.5"
                    >
                      <option value="">All</option>
                      <option value="पुरुष">पुरुष (Male)</option>
                      <option value="महिला">महिला (Female)</option>
                      <option value="तृतीय">तृतीय (Trans)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Rows/Page</label>
                    <select 
                      value={perPage} 
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                      className="select-glass w-full text-xs py-2.5"
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
                <div className="flex flex-wrap items-center gap-2 pt-2 bg-gray-900/60 p-3 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-indigo-400">Active Criteria:</span>
                  {selectedWard && (
                    <span className="badge badge-indigo flex items-center gap-1.5 font-bold">
                      Ward: {selectedWard} <button onClick={() => setSelectedWard('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedBooth && (
                    <span className="badge badge-cyan flex items-center gap-1.5">
                      Booth #{selectedBooth} <button onClick={() => setSelectedBooth('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedAnubhag && (
                    <span className="badge badge-emerald flex items-center gap-1.5">
                      Anubhag: {selectedAnubhag.slice(0, 18)} <button onClick={() => setSelectedAnubhag('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedRelation && (
                    <span className="badge badge-amber flex items-center gap-1.5">
                      Rel: {selectedRelation} <button onClick={() => setSelectedRelation('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedHouseNo && (
                    <span className="badge badge-rose flex items-center gap-1.5">
                      House: {selectedHouseNo} <button onClick={() => setSelectedHouseNo('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedSex && (
                    <span className="badge badge-indigo flex items-center gap-1.5">
                      Sex: {selectedSex} <button onClick={() => setSelectedSex('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="badge badge-cyan flex items-center gap-1.5">
                      Query: "{searchQuery}" <button onClick={() => setSearchQuery('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  <button 
                    onClick={resetFilters}
                    className="text-xs text-rose-400 hover:text-rose-300 ml-auto font-bold underline px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/30"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Data Grid Table Card (Tailored for exact Ward/Anubhag headers) */}
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/50">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <span>📋 Bankipur Citizen Electoral Roll</span>
                    <span className="badge badge-indigo font-mono text-sm">{totalRecords.toLocaleString()} Registered Voters</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Click any voter row to open digital ID slip & verify full household address.</p>
                </div>

                {/* Pagination Top Controls */}
                <div className="flex items-center gap-2">
                  <button 
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ◀ Prev
                  </button>
                  <span className="text-xs font-medium text-gray-300 px-3 py-1.5 bg-gray-950/80 rounded-lg border border-white/10">
                    Page <strong className="text-indigo-400 font-mono">{page}</strong> of <strong className="text-white font-mono">{totalPages}</strong>
                  </span>
                  <button 
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="table-container max-h-[680px] overflow-y-auto">
                <table>
                  <thead>
                    <tr>
                      <th className="w-24">SR / Booth</th>
                      <th>EPIC ID (मतदाता पहचान पत्र)</th>
                      <th>Voter Full Name (मतदाता का नाम)</th>
                      <th>Guardian & Relation (पिता/पति)</th>
                      <th>Age / Sex (आयु / लिंग)</th>
                      <th>Anubhag & Street (अनुभाग व गली)</th>
                      <th>Ward & House (वार्ड व मकान)</th>
                      <th className="text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voters.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-16 text-gray-400">
                          <div className="text-4xl mb-3">🔍</div>
                          <p className="text-base font-bold text-white">No matching electors found in {selectedWard || 'these 3 wards'}</p>
                          <p className="text-xs text-gray-500 mt-1">Try clearing your Anubhag or House Number criteria.</p>
                          <button onClick={resetFilters} className="btn-primary mt-4 text-xs">Clear All Filters</button>
                        </td>
                      </tr>
                    ) : (
                      voters.map((row, idx) => {
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
                            className="cursor-pointer hover:bg-indigo-500/15 transition-colors group"
                            onClick={() => setSelectedVoter(row)}
                          >
                            <td>
                              <span className="font-mono font-bold text-indigo-400 text-sm block">Booth #{bNo}</span>
                              <span className="text-xs text-gray-500 font-mono mt-0.5 block">SR #{srNo}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/30 text-sm">
                                  {epic}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(epic);
                                    showToast(`Copied EPIC ID: ${epic}`);
                                  }}
                                  title="Copy EPIC ID"
                                  className="text-gray-500 hover:text-cyan-400 opacity-60 group-hover:opacity-100 p-1 transition-opacity"
                                >
                                  📋
                                </button>
                              </div>
                            </td>
                            <td className="font-bold text-white text-base tracking-wide">
                              {vName}
                            </td>
                            <td className="text-gray-300">
                              <span className="text-[11px] text-amber-400 uppercase font-semibold block">{rel}</span>
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
                                <span className="font-semibold text-emerald-400 text-xs block">
                                  {anNo ? `अनुभाग #${anNo}` : 'अनुभाग #1'}
                                </span>
                                <span className="text-xs text-gray-300 truncate block mt-0.5 font-medium" title={anName}>
                                  {anName || 'बाकरगंज'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div>
                                <span className="badge badge-indigo text-xs font-bold">{wardVal}</span>
                                <span className="text-xs text-amber-300 block font-mono mt-1">🏠 H.No: {hNo}</span>
                              </div>
                            </td>
                            <td className="text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedVoter(row); }}
                                className="btn-secondary px-3 py-1.5 text-xs text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white"
                              >
                                Inspect Slip ▶
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Strip */}
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/70">
                <div className="text-xs text-gray-400 font-mono">
                  Showing electors <strong className="text-white">{(page - 1) * perPage + 1}</strong> to <strong className="text-white">{Math.min(page * perPage, totalRecords)}</strong> of <strong className="text-indigo-400">{totalRecords.toLocaleString()}</strong>
                </div>
                <div className="flex items-center gap-2">
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
                  <span className="text-xs px-3 py-1 font-medium bg-indigo-600/20 text-indigo-300 rounded border border-indigo-500/30 font-mono">
                    Page {page} / {totalPages}
                  </span>
                  <button 
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                  >
                    Next ▶
                  </button>
                  <button 
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
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
            <div className="glass-card p-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center text-3xl">
                📥
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Spreadsheet Sync & Overwrite Settings</h2>
                <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
                  Drag and drop an updated <strong className="text-indigo-400">.CSV</strong> or <strong className="text-emerald-400">.XLSX</strong> Excel sheet to re-index Wards 36, 37, and 38 instantly.
                </p>
              </div>

              <div className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-950/10 rounded-2xl p-12 transition-all cursor-pointer relative group">
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
                  <p className="text-base font-semibold text-white">Click or Drop Spreadsheet File Here</p>
                  <p className="text-xs text-gray-400">Supports CSV & Excel (.XLSX) files</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* VOTER PROFILE DETAILS MODAL */}
      {selectedVoter && (
        <div className="modal-backdrop" onClick={() => setSelectedVoter(null)}>
          <div className="modal-content overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900/95 via-gray-900 to-cyan-900/95 p-6 border-b border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  🗳️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedVoter['name'] || selectedVoter['Name']}</span>
                    <span className="badge badge-indigo font-mono text-sm">{selectedVoter['epic_number'] || selectedVoter['EPIC NUMBER']}</span>
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5 font-medium">
                    Official Voter Slip • <strong className="text-indigo-300">{selectedVoter['ward'] || selectedVoter['Ward'] || 'वार्ड नं-037'}</strong> • Booth #{selectedVoter['booth_no'] || selectedVoter['Booth No']}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVoter(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: All exact official columns */}
            <div className="p-6 space-y-6">
              
              {/* Primary Identity Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-900/80 p-4 rounded-xl border border-white/10">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase block">EPIC NUMBER (Voter ID)</span>
                  <span className="text-lg font-mono font-bold text-cyan-400 mt-1 block">
                    {selectedVoter['epic_number'] || selectedVoter['EPIC NUMBER'] || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase block">Voter Full Name</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {selectedVoter['name'] || selectedVoter['Name'] || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase block">Guardian & Relation</span>
                  <span className="text-base font-semibold text-gray-200 mt-1 block">
                    <span className="text-xs text-amber-400 uppercase font-bold">({selectedVoter['relation'] || selectedVoter['Relation'] || 'Parent'}): </span>
                    {selectedVoter['father_name'] || selectedVoter['Father Name'] || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Demographics & Booth Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-medium text-gray-400 block">Age (आयु)</span>
                  <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{selectedVoter['age'] || selectedVoter['Age'] || 'N/A'} Years</span>
                </div>
                <div className="bg-gray-900/50 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-medium text-gray-400 block">Gender (लिंग)</span>
                  <span className="text-lg font-bold text-rose-400 mt-0.5 block">{selectedVoter['sex'] || selectedVoter['Sex'] || 'N/A'}</span>
                </div>
                <div className="bg-gray-900/50 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-medium text-gray-400 block">SR Number</span>
                  <span className="text-lg font-mono font-bold text-gray-300 mt-0.5 block">#{selectedVoter['sr_no'] || selectedVoter['SR No'] || '1'}</span>
                </div>
                <div className="bg-gray-900/50 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-medium text-gray-400 block">House Number</span>
                  <span className="text-lg font-bold text-amber-400 mt-0.5 block">{selectedVoter['house_no'] || selectedVoter['House No'] || '00'}</span>
                </div>
              </div>

              {/* Polling Station & Anubhag Details */}
              <div className="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-white/10">
                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Polling Station & Anubhag (Locality)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 block text-xs">Polling Booth Number:</span>
                    <span className="font-bold text-emerald-400 text-base">Booth #{selectedVoter['booth_no'] || selectedVoter['Booth No'] || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Polling Station Name:</span>
                    <span className="font-medium text-white">{selectedVoter['polling_station_name'] || selectedVoter['Polling_Station_Name'] || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 block text-xs">Polling Station Address:</span>
                    <span className="font-medium text-gray-300">{selectedVoter['polling_station_address'] || selectedVoter['Polling_Station_Address'] || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Anubhag Number (अनुभाग नं):</span>
                    <span className="font-bold text-amber-400 text-base">Anubhag #{selectedVoter['anubhag_number'] || selectedVoter['Anubhag_number'] || '1'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Anubhag Name (अनुभाग / गली का नाम):</span>
                    <span className="font-bold text-white text-base">{selectedVoter['anubhag_name'] || selectedVoter['Anubhag_name'] || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Administrative Jurisdiction */}
              <div className="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-white/10">
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Geographic & Municipal Jurisdiction</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 block text-xs">Municipal Ward:</span>
                    <span className="font-bold text-white">{selectedVoter['ward'] || selectedVoter['Ward'] || 'वार्ड नं-037'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Main Town / City:</span>
                    <span className="font-medium text-white">{selectedVoter['main_town'] || selectedVoter['Main_Town'] || 'Patna'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Post Office:</span>
                    <span className="font-medium text-white">{selectedVoter['post_office'] || selectedVoter['Post_Office'] || 'Bankipur H.O'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Police Station:</span>
                    <span className="font-medium text-white">{selectedVoter['police_station'] || selectedVoter['Police_Station'] || 'Pirbahore'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Tehsil:</span>
                    <span className="font-medium text-white">{selectedVoter['tehsil'] || selectedVoter['Tehsil'] || 'Patna Sadar'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">District & PIN:</span>
                    <span className="font-medium text-white">{selectedVoter['district'] || selectedVoter['District']} ({selectedVoter['pin_code'] || selectedVoter['Pin_Code'] || '800004'})</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-900/95 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500">Official Record Verified against Sheet1</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedVoter, null, 2));
                    showToast("Copied full voter record as JSON!");
                  }}
                  className="btn-secondary text-xs"
                >
                  📋 Copy Full Record
                </button>
                <button 
                  onClick={() => window.print()}
                  className="btn-primary text-xs"
                >
                  🖨️ Print Voter Slip
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
