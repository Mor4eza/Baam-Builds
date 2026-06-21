import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Trash2, 
  Download, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink, 
  QrCode, 
  Clipboard, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Plus, 
  Settings, 
  HelpCircle,
  Sparkles,
  Info,
  Apple
} from "lucide-react";
import { IOSBuild, APIResponse } from "./types";
import { parseBuildInfo, formatBuildDate } from "./utils";

export default function App() {
  // --- States ---
  const [builds, setBuilds] = useState<IOSBuild[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Local storage lists for customized view
  const [hiddenBuilds, setHiddenBuilds] = useState<string[]>([]);
  const [simulatedBuilds, setSimulatedBuilds] = useState<IOSBuild[]>([]);
  
  // UI interaction states
  const [selectedBuild, setSelectedBuild] = useState<IOSBuild | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showHelpAccordion, setShowHelpAccordion] = useState<boolean>(true);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Deletion with password protection states
  const [pendingDeleteBuild, setPendingDeleteBuild] = useState<IOSBuild | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Custom Form states for simulated builds
  const [newTitle, setNewTitle] = useState("");
  const [newVersion, setNewVersion] = useState("4.7.0");
  const [newBuild, setNewBuild] = useState("b1-develop");
  const [newPlist, setNewPlist] = useState("manifest_4.7.0_b1.plist");
  const [newDate, setNewDate] = useState("");

  // --- Fetch Data ---
  const fetchData = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/data/versions" + (force ? "?force=true" : ""));
      const json: APIResponse = await res.json();
      
      if (json.success && json.data) {
        setBuilds([...json.data].reverse());
        setIsFallback(json.isFallback || false);
        if (json.isFallback) {
          console.log("Fetched fallback data:", json.error);
        }
      } else {
        throw new Error(json.error || "Failed to parse API data");
      }
    } catch (err: any) {
      console.error("Failed to load versions from server:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Load local storage states
    try {
      const localHidden = localStorage.getItem("baam_hidden_builds");
      if (localHidden) setHiddenBuilds(JSON.parse(localHidden));

      const localSimulated = localStorage.getItem("baam_simulated_builds");
      if (localSimulated) {
        setSimulatedBuilds(JSON.parse(localSimulated));
      }
    } catch (e) {
      console.error("Local storage restoration failed:", e);
    }
  }, []);

  // --- Operations ---
  const handleHideBuild = (plistUrl: string, title: string) => {
    const updated = [...hiddenBuilds, plistUrl];
    setHiddenBuilds(updated);
    localStorage.setItem("baam_hidden_builds", JSON.stringify(updated));
  };

  const handleResetHidden = () => {
    setHiddenBuilds([]);
    localStorage.removeItem("baam_hidden_builds");
  };

  const handleAddSimulatedBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Format new date correctly matching "Tue 21 Oct 2025 16:14"
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = newDate || `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newBuildObj: IOSBuild = {
      title: `${newVersion} ${newTitle}`,
      desc: `Download HamrahBaam_${newVersion}_${newBuild}.ipa`,
      plistUrl: newPlist || `manifest_${newVersion}_${newBuild}.plist`,
      date: formattedDate
    };

    const updated = [newBuildObj, ...simulatedBuilds];
    setSimulatedBuilds(updated);
    localStorage.setItem("baam_simulated_builds", JSON.stringify(updated));

    // Reset fields
    setNewTitle("");
    setNewPlist("");
    setNewDate("");
    setShowAddModal(false);
  };

  const handleDeleteSimulatedBuild = (plistUrl: string) => {
    const updated = simulatedBuilds.filter(b => b.plistUrl !== plistUrl);
    setSimulatedBuilds(updated);
    localStorage.setItem("baam_simulated_builds", JSON.stringify(updated));
  };

  const handleClearAllSimulated = () => {
    setSimulatedBuilds([]);
    localStorage.removeItem("baam_simulated_builds");
  };

  const confirmDeletion = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (deletePassword === "iosbaam" || "iostester") {
      if (!pendingDeleteBuild) return;

      setDeleteLoading(true);
      setDeletePasswordError(null);

      try {
        // Use plistUrl as the unique tracker / build id for deletion
        const buildId = pendingDeleteBuild.id;
        const res = await fetch(`/api/version/${encodeURIComponent(buildId)}`, {
          method: "DELETE"
        });

        const data = await res.json();

        // Process actual deletion or hide in current view state
        const isSimulated = simulatedBuilds.some(b => b.plistUrl === pendingDeleteBuild.plistUrl);
        if (isSimulated) {
          handleDeleteSimulatedBuild(pendingDeleteBuild.plistUrl);
        } else {
          const parsed = parseBuildInfo(pendingDeleteBuild);
          handleHideBuild(pendingDeleteBuild.plistUrl, parsed.title);
        }
      
       // Show Success dialog
        setSuccessMessage(data.message || "Version Deleted Successfully");

        // Clean password and pending state values
      setPendingDeleteBuild(null);
      setDeletePassword("");
      setDeletePasswordError(null);
      } catch (err: any) {
        console.error("Deletion API failed:", err);
        setDeletePasswordError(err.message || "Something went wrong during deletion.");
      } finally {
        setDeleteLoading(false);
      }
    } else {
      setDeletePasswordError("Incorrect password. Please try again.");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // --- Filter and Merge Dataset ---
  const allBuilds = useMemo(() => {
    // Merge server fetched with locally simulated
    const combined = [...simulatedBuilds, ...builds];
    
    // Filter out hidden entries
    return combined.filter(build => !hiddenBuilds.includes(build.plistUrl));
  }, [builds, simulatedBuilds, hiddenBuilds]);

  const filteredBuilds = useMemo(() => {
    if (!searchQuery.trim()) return allBuilds;
    const q = searchQuery.toLowerCase();
    return allBuilds.filter(build => {
      const parsed = parseBuildInfo(build);
      return (
        parsed.title.toLowerCase().includes(q) ||
        parsed.version.toLowerCase().includes(q) ||
        parsed.buildNum.toLowerCase().includes(q) ||
        build.date.toLowerCase().includes(q)
      );
    });
  }, [allBuilds, searchQuery]);

  // Handle direct OTA trigger URL
  const triggerInstall = (build: IOSBuild) => {
    const installUrl = `itms-services://?action=download-manifest&url=${build.plistUrl}`;
    window.location.href = installUrl;
  };

  const getFullInstallUrl = (plistUrl: string) => {
    return `itms-services://?action=download-manifest&url=${plistUrl}`;
  };

  return (
    <div id="ios_portal_root" className="bg-[#070a13] min-h-screen text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 relative overflow-hidden font-sans select-none antialiased">
      
      {/* Premium top-left glowing orbital mesh */}
      <div className="absolute top-[-300px] left-[-300px] w-[700px] h-[700px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Premium subtle bottom-right cosmic mesh */}
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Header Container */}
      <header className="relative z-10 w-full max-w-2xl text-center mt-6 sm:mt-12 mb-8 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="bg-sky-500/10 p-2.5 rounded-2xl border border-sky-400/20">
            <Apple className="w-8 h-8 text-sky-400" />
          </div>
          {/* <span className="text-xs tracking-[0.3em] text-sky-400 font-bold uppercase font-mono bg-sky-950/40 px-3 py-1 rounded-full border border-sky-900/40">
            Internal Beta
          </span> */}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-none mb-4 font-sans select-text"
        >
          Baam iOS
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-400/90 font-medium max-w-md mb-8 leading-relaxed"
        >
          Access the latest beta builds for testing.
        </motion.p>

        {/* Global Toolbar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full bg-[#131d2e]/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 mb-6 shadow-2xl"
        >
          {/* Search section */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by version or build details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 focus:border-sky-500/60 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500/80 focus:ring-1 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-850/60 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              title="Refresh version data from server"
              className="p-2.5 bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-950 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-sky-400" : ""}`} />
            </button>

            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              title="Configure options / developer menu"
              className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 text-sm font-medium ${
                showConfigPanel 
                  ? "bg-sky-500/15 border-sky-400 text-sky-300" 
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-250"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">Options</span>
            </button>

            {/* <button
              onClick={() => setShowAddModal(true)}
              className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 rounded-xl border border-sky-500/30 font-medium text-sm flex items-center gap-1.5 hover:border-sky-400 transition-all active:scale-95"
            >
              <Plus className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">Mock Build</span>
            </button> */}
          </div>
        </motion.div>

        {/* Animated Developer Configuration Panel */}
        <AnimatePresence>
          {showConfigPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-[#111926]/90 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl text-left text-sm overflow-hidden"
            >
              <h3 className="font-semibold text-slate-250 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                Build Configuration Setup & Debug
              </h3>
              
              <div className="space-y-3.5 text-slate-400 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-800/50 gap-1.5">
                  <div>
                    <span className="text-slate-300 font-medium">Source Server URL</span>
                    <p className="text-slate-500 text-xs font-mono mt-0.5">https://iosbaam.ir/beta/versions.json</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isFallback ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></span>
                    <span className="font-semibold text-slate-350">{isFallback ? "Using Backup Cache" : "Live API Server Connect"}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-800/50 gap-2">
                  <div>
                    <span className="text-slate-300 font-medium">Clear / Reset Hidden Items</span>
                    <p className="text-slate-500 text-xs mt-0.5">Restore any builds that were hidden us ing the garbage icon ({hiddenBuilds.length} hidden)</p>
                  </div>
                  <button
                    onClick={handleResetHidden}
                    disabled={hiddenBuilds.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors self-start"
                  >
                    Reset List
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-800/50 gap-2">
                  <div>
                    <span className="text-slate-300 font-medium">Simulation Data</span>
                    <p className="text-slate-500 text-xs mt-0.5">Remove locally added Simulated Builds ({simulatedBuilds.length} simulated)</p>
                  </div>
                  <button
                    onClick={handleClearAllSimulated}
                    disabled={simulatedBuilds.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 hover:bg-red-950/50 disabled:opacity-40 transition-colors self-start"
                  >
                    Clear Custom Builds
                  </button>
                </div>

                <div className="pt-1 flex items-start gap-2 bg-sky-950/20 border border-sky-900/30 p-3 rounded-xl">
                  <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-sky-300/90 leading-relaxed">
                    <strong>OTA Installation Note:</strong> iOS direct installs trigger via standard Apple manifests (e.g. <code>itms-services://</code>). These only load successfully from safari browsers or camera scans on verified registers.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-2xl px-1 flex-1">
        
        {/* Loading Spinner */}
        {loading && builds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 select-none">
            <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-405">Retreiving beta catalog from server...</p>
          </div>
        )}

        {/* Error State Banner */}
        {error && builds.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6 mb-8 text-center"
          >
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <span className="font-semibold text-red-200 block text-lg mb-1">Server Connection Timeout</span>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => fetchData()}
                className="px-4 py-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-xs font-semibold hover:bg-red-900/30 transition-colors"
              >
                Retry
              </button>
              <button 
                onClick={() => {
                  setBuilds([
                    {
                      "date": "Tue 21 Oct 2025 16:14",
                      "title": "4.6.4 Regression",
                      "desc": "Download HamrahBaam_4.6.4_b1-develop.ipa",
                      "plistUrl": "manifest_4.6.4_b1-develop.plist"
                    },
                    {
                      "date": "Wed 22 Oct 2025 14:50",
                      "title": "Regression V4.6.4 B2",
                      "desc": "Download HamrahBaam_4.6.4_b2-develop.ipa",
                      "plistUrl": "manifest_4.6.4_b2-develop.plist"
                    }
                  ].reverse());
                  setError(null);
                  setIsFallback(true);
                }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-350 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Load Local Mock Data
              </button>
            </div>
          </motion.div>
        )}

        {/* List of Version Cards */}
        {(!loading || builds.length > 0) && (
          <div className="space-y-6">
            
            {/* Fallback data warning banner */}
            {isFallback && !loading && (
              <div className="bg-amber-950/20 border border-amber-500/15 rounded-2xl px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm text-amber-300 gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Showing cached version catalog (local offline mode)</span>
                </div>
                <button 
                  onClick={() => fetchData(true)}
                  className="px-2.5 py-1 bg-amber-950/50 border border-amber-500/30 text-amber-400 rounded-md font-semibold hover:bg-amber-900/40 text-xs transition-colors whitespace-nowrap"
                >
                  Sync Online
                </button>
              </div>
            )}

            {/* Zero results list state */}
            {filteredBuilds.length === 0 && (
              <div className="bg-[#111927]/40 border border-slate-800/80 rounded-2xl p-12 text-center">
                <Search className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <span className="font-semibold text-slate-300 block mb-1">No builds found</span>
                <p className="text-xs text-slate-550 max-w-sm mx-auto">
                  Try adjusting your keywords, or reset hidden items in the Options menu.
                </p>
                {hiddenBuilds.length > 0 && (
                  <button
                    onClick={handleResetHidden}
                    className="mt-4 px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-sky-400 text-xs rounded-lg hover:bg-slate-800 transition-colors font-medium inline-flex items-center gap-1.5"
                  >
                    Restore {hiddenBuilds.length} Hidden Items
                  </button>
                )}
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {filteredBuilds.map((build, index) => {
                const parsed = parseBuildInfo(build);
                const isSimulated = simulatedBuilds.some(b => b.plistUrl === build.plistUrl);
                
                return (
                  <motion.div
                    key={build.plistUrl}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
                    className="bg-[#15202f]/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-800/60 shadow-xl relative hover:border-slate-700/60 transition-all duration-300 group"
                  >
                    {/* Top Content Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-2xl font-bold text-[#00a2ff] tracking-tight group-hover:text-sky-350 transition-colors">
                            {parsed.title}
                          </h2>
                          
                          {isSimulated && (
                            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-850 px-2 py-0.5 rounded-md font-mono uppercase font-bold">
                              Local Mock
                            </span>
                          )}
                        </div>
                        
                        {/* Subtitle with dynamic parsing */}
                        <div className="flex items-center text-base sm:text-lg text-slate-400">
                          <span className="font-medium text-white">Version {build.version}</span>
                          <span className="text-slate-400/80 font-normal ml-1">B{build.build}</span>
                        </div>
                      </div>

                      {/* Right calendar & delete elements */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center text-sm text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl font-medium gap-1.5">
                          <Calendar className="w-4 h-4 text-sky-400/70" />
                          <span className="hidden xs:inline">{formatBuildDate(build.date)}</span>
                          <span className="inline xs:hidden text-xs">{build.date.split(" ")[1] || ""} {build.date.split(" ")[2] || ""}</span>
                        </div>

                        {/* Trash Can Delete Button - Matches the garbage icon in the screenshot */}
                        <button
                          onClick={() => {
                            setPendingDeleteBuild(build);
                            setDeletePassword("");
                            setDeletePasswordError(null);
                          }}
                          aria-label={`Delete build ${parsed.title}`}
                          className="p-2 justify-center bg-slate-900/60 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 hover:border-red-900/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-mono mb-6 pb-2 border-b border-slate-800/40 flex items-center gap-1">
                      {/* <span className="text-sky-400/70">{parsed.ipaFilename ? "IPA file: " : "Manifest URL: "}</span> */}
                      {/* <span className="text-slate-400">{parsed.ipaFilename || build.plistUrl}</span> */}
                    </p>

                    {/* Main Interaction - Install button matching screenshot fully */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => triggerInstall(build)}
                        className="flex-1 py-4 bg-[#00a3ff] hover:bg-[#1bb0ff] text-white rounded-xl font-bold tracking-wide shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 transition-all hover:shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-5 h-5 stroke-[2.5]" />
                        Install Version
                      </button>

                      <button
                        onClick={() => setSelectedBuild(build)}
                        className="py-4 px-6 bg-slate-900/80 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl border border-slate-805/80 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                        title="Show Installation Options"
                      >
                        <QrCode className="w-4.5 h-4.5" />
                        Options
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

          </div>
        )}

        {/* Expandable Help & Sideloading Guide Area */}
        <section id="help_guide" className="mt-8 mb-16 relative">
          <button 
            onClick={() => setShowHelpAccordion(!showHelpAccordion)}
            className="w-full bg-[#111927]/60 hover:bg-[#131d2e]/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-slate-300 font-medium transition-all"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-sky-400" />
              <span>iOS Beta Installing Help & Troubleshooting Guide</span>
            </div>
            {showHelpAccordion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <AnimatePresence>
            {showHelpAccordion && (
              <motion.div
                initial={{ opacity: 0, y: -5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -5, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#111927]/30 border-x border-b border-slate-800 rounded-b-2xl p-6 space-y-5 text-xs sm:text-sm text-slate-400 leading-relaxed text-left">
                  
                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center font-mono flex-shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-1">Open Link on safari</h4>
                      <p>
                        OTA (Over-the-Air) iOS distribution uses custom service schemas. Apple requires you to touch these buttons from native browsers (preferably <strong>Safari browser</strong>). Third party app frames or custom chrome sandboxes may block native installation prompts.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center font-mono flex-shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-1">Trust Provision Profile</h4>
                      <p>
                        To load any corporate enterprise beta profile, you must trust the developer. If you click Install, nothing visual may seem to happen in the background immediately, but iOS is downloading the file. After an icon appears on your home screen, go to:
                      </p>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 font-mono text-center text-slate-300 my-2 text-xs select-text">
                        Settings → General → VPN & Device Management → Select Developer Profiler & click "Trust"
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center font-mono flex-shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-1">Desktop Sideload Testing</h4>
                      <p>
                        Opening this on desktop? No worries! Tap <strong>Options</strong> on any build block to trigger custom QR Codes. Frame your iPhone camera to snap the QR and install instantly without typing lengthy URLs or syncing cable bridges.
                      </p>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-2xl text-center py-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-550 select-text">
        <p>© {new Date().getFullYear()} Baam iOS Group.</p>
        <div className="flex gap-4">
          <a href="https://iosbaam.ir/beta/versions.json" target="_blank" rel="noreferrer" className="hover:text-slate-300 flex items-center gap-1 transition-colors">
            Raw JSON API <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

      {/* --- MODAL 1: OPTION DETAILS (QR / sideload details) --- */}
      <AnimatePresence>
        {selectedBuild && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBuild(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog Body */}
            {(() => {
              const parsed = parseBuildInfo(selectedBuild);
              const installUrl = getFullInstallUrl(selectedBuild.plistUrl);
              const ipaDirectUrl = `${parsed.ipaFilename}`;
              const plistDirectUrl = `qr${selectedBuild.plistUrl}`;
              // Build standard QR api parameters (URL encoded)
              const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${getFullInstallUrl(selectedBuild.plistUrl)}`;

              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl p-6 sm:p-8"
                >
                  {/* Close header top */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-xs uppercase font-mono text-sky-400 font-bold bg-sky-950/60 px-2.5 py-0.5 rounded-md border border-sky-900/60 inline-block mb-1.5">
                        Installation Sideload Setup
                      </span>
                      <h3 className="text-xl font-bold text-white">{parsed.title} Options</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedBuild(null)}
                      className="p-1.5 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body information columns */}
                  <div className="space-y-6">
                    {/* QR Code Segment */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#131d2e]/40 p-5 rounded-2xl border border-slate-800">
                      <div className="bg-[#0c1424] p-3 rounded-xl border border-slate-800/80 flex-shrink-0 select-text">
                        <img 
                          src={qrApiUrl} 
                          alt="OTA Install QR Code"
                          className="w-40 h-40 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-2">
                        <h4 className="font-bold text-slate-200 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1.5">
                          <QrCode className="w-4.5 h-4.5 text-sky-400" />
                          Snap device camera
                        </h4>
                        <p className="text-xs text-slate-400/90 leading-relaxed">
                          Do not open side apps! Open the stock iOS camera on your iPhone/iPad, point at this QR code, and tap the notification slider to start installing immediately.
                        </p>
                      </div>
                    </div>

                    {/* Links list section */}
                    <div className="space-y-3.5">
                      <span className="text-xs text-slate-500 font-bold font-mono tracking-wider block uppercase">Copy Sideload details</span>
                      
                      {/* Copy OTA list Url */}
                      <div className="flex gap-2 items-center bg-slate-950/60 px-3 py-2.5 rounded-xl border border-slate-850 text-xs">
                        <span className="font-semibold text-sky-400/85 whitespace-nowrap">OTA Manifest:</span>
                        <span className="text-slate-455 truncate flex-1 font-mono">{installUrl}</span>
                        <button 
                          onClick={() => copyToClipboard(installUrl, "ota")}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all"
                          title="Copy OTA Manifest link to clipboard"
                        >
                          {copiedText === "ota" ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Direct PLIST details */}
                      <div className="flex gap-2 items-center bg-slate-950/60 px-3 py-2.5 rounded-xl border border-slate-850 text-xs">
                        <span className="font-semibold text-slate-350 whitespace-nowrap">Manifest PLIST:</span>
                        <span className="text-slate-455 truncate flex-1 font-mono">{plistDirectUrl}</span>
                        <button 
                          onClick={() => copyToClipboard(plistDirectUrl, "plist")}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all"
                          title="Copy manifest.plist URL"
                        >
                          {copiedText === "plist" ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Manual IPA link download */}
                      <div className="flex gap-2 items-center bg-slate-950/60 px-3 py-2.5 rounded-xl border border-slate-850 text-xs">
                        <span className="font-semibold text-slate-350 whitespace-nowrap">Raw IPA File:</span>
                        <span className="text-slate-455 truncate flex-1 font-mono">{ipaDirectUrl}</span>
                        <button 
                          onClick={() => copyToClipboard(ipaDirectUrl, "ipa")}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all"
                          title="Copy raw binary .ipa URL"
                        >
                          {copiedText === "ipa" ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => {
                          window.open(plistDirectUrl, "_blank");
                        }}
                        className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View PLIST
                      </button>
                      
                      <button 
                        onClick={() => {
                          window.open(ipaDirectUrl, "_blank");
                        }}
                        className="flex-1 py-3 bg-indigo-950/45 hover:bg-indigo-900/60 text-sky-450 rounded-xl border border-indigo-900/40 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:text-sky-350 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-sky-400" />
                        Download Raw IPA
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: MOCK ADD BUILD --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Dialog Form Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 sm:p-8"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-400/10">
                    <Plus className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Add Simulated Build</h3>
                    <p className="text-slate-500 text-xs">Simulate dynamic updates on this view</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSimulatedBuild} className="space-y-4 text-sm text-slate-200">
                
                {/* Clean Title app (e.g. Pol Pay, etc.) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">App Build Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Pay Portal, Develop on UAT, Fix login"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Setup version code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">iOS Version</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 4.6.8"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 focus:outline-none"
                    />
                  </div>

                  {/* Setup build tag */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">Build Tag / Details</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Build 5"
                      value={newBuild}
                      onChange={(e) => setNewBuild(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Setup manual Plist */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">Plist File Name</label>
                  <input
                    type="text"
                    placeholder="e.g., manifest_4.6.8_b5.plist (Auto)"
                    value={newPlist}
                    onChange={(e) => setNewPlist(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 focus:outline-none"
                  />
                </div>

                {/* Custom Optional date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">Custom date string (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Tue 21 Oct 2025 16:14"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-sky-500/50 focus:none font-mono text-xs"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-850 font-bold transition-all text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#00a3ff] hover:bg-[#1bb0ff] text-white rounded-xl font-bold transition-all text-xs uppercase shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20"
                  >
                    Add mock build
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

 {/* --- MODAL 3: PASSWORD PROMPT FOR DELETING A VERSION --- */}
      <AnimatePresence>
        {pendingDeleteBuild && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setPendingDeleteBuild(null);
                setDeletePassword("");
                setDeletePasswordError(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Dialog Form Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 sm:p-8"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/15">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Security Verification</h3>
                    <p className="text-slate-500 text-xs">Enter password to delete this build</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPendingDeleteBuild(null);
                    setDeletePassword("");
                    setDeletePasswordError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-slate-900/60 p-3.5 rounded-xl border border-slate-850">
                <p className="text-xs text-slate-400">Target Build:</p>
                <p className="text-sm font-semibold text-sky-400 mt-0.5">{parseBuildInfo(pendingDeleteBuild).title}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Version {parseBuildInfo(pendingDeleteBuild).version} ({parseBuildInfo(pendingDeleteBuild).buildNum})</p>
              </div>

              <form onSubmit={confirmDeletion} className="space-y-4 text-sm text-slate-200">
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono uppercase">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter security password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      if (deletePasswordError) setDeletePasswordError(null);
                    }}
                    autoFocus
                    className="w-full bg-slate-950/70 border border-slate-850 rounded-xl px-3.5 py-2.5 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all duration-200 text-white font-sans"
                  />
                  {deletePasswordError && (
                    <motion.p 
                       initial={{ opacity: 0, y: -5 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {deletePasswordError}
                    </motion.p>
                  )}
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    disabled={deleteLoading}
                    onClick={() => {
                      setPendingDeleteBuild(null);
                      setDeletePassword("");
                      setDeletePasswordError(null);
                    }}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-850 font-bold transition-all text-xs uppercase cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 py-3 text-white rounded-xl font-bold transition-all text-xs uppercase shadow-lg shadow-red-500/10 hover:shadow-red-500/20 bg-red-650 hover:bg-red-600 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                     {deleteLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Verify & Delete"
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: DELETION SUCCESS DIALOG --- */}
      <AnimatePresence>
        {successMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessMessage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Dialog Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl p-6 sm:p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Success</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">{successMessage}</p>

              <button
                onClick={() => setSuccessMessage(null)}
                className="w-full py-3 bg-[#00a3ff] hover:bg-[#1bb0ff] text-white rounded-xl font-bold transition-all text-xs uppercase shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
