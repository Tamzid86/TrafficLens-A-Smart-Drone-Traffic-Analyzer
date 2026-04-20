'use client'
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── CSV parser — handles 2-section format (summary block + detection rows) ────
function parseCSVReport(text) {
  const lines = text.trim().split(/\r?\n/);
  const totalDetections = parseInt((lines[1] || "").split(",")[1]) || 0;
  const totalUnique     = parseInt((lines[2] || "").split(",")[1]) || 0;
  const dataLines       = lines.slice(5); // skip summary, blank, header
  const typeCounts      = {};
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const type = line.split(",")[3]?.trim();
    if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  return { totalDetections, totalUnique, typeCounts };
}

const TYPE_PALETTE = {
  car:        { color: "#38bdf8", icon: "🚗" },
  truck:      { color: "#fb923c", icon: "🚛" },
  bus:        { color: "#a78bfa", icon: "🚌" },
  motorcycle: { color: "#34d399", icon: "🏍️" },
  bicycle:    { color: "#f472b6", icon: "🚲" },
};
const typeStyle = (t) => TYPE_PALETTE[t] ?? { color: "#94a3b8", icon: "🚙" };

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, duration = 1.2 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 40;
    const inc   = target / steps;
    let cur     = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(id);
    }, (duration * 1000) / steps);
    return () => clearInterval(id);
  }, [target]);
  return <>{val.toLocaleString()}</>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: accent + "0d", border: `1px solid ${accent}28` }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{label}</span>
      <span className="text-3xl font-bold tabular-nums" style={{ color: accent }}>
        <Counter target={value} />
      </span>
    </motion.div>
  );
}

// ── Type bar ──────────────────────────────────────────────────────────────────
function TypeBar({ type, count, total }) {
  const { color, icon } = typeStyle(type);
  const pct = total ? (count / total) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 capitalize text-gray-300">
          <span>{icon}</span>{type}
        </span>
        <span className="font-semibold" style={{ color }}>
          {count.toLocaleString()}
          <span className="text-gray-600 font-normal ml-1">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [splash,     setSplash]     = useState(true);
  const [file,       setFile]       = useState(null);
  const [jobId,      setJobId]      = useState(null);
  const [status,     setStatus]     = useState("idle");
  const [progress,   setProgress]   = useState(0);
  const [videoUrl,   setVideoUrl]   = useState(null);
  const [csvUrl,     setCsvUrl]     = useState(null);
  const [report,     setReport]     = useState(null);
  const [error,      setError]      = useState(null);
  const [popupErr,   setPopupErr]   = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const pollRef = useRef(null);
  const API = "http://127.0.0.1:8000";

  // Splash auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Upload
  const uploadVideo = async () => {
    if (!file) {
      setPopupErr(true);
      setTimeout(() => setPopupErr(false), 3400);
      return;
    }
    setError(null); setStatus("uploading"); setProgress(10);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch(`${API}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setJobId(data.job_id); setStatus("processing"); setProgress(30);
    } catch { setError("Upload failed"); setStatus("error"); }
  };

  // Poll
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/jobs/${jobId}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "processing") setProgress((p) => Math.min(p + 5, 85));
        if (data.status === "completed") {
          setProgress(100);
          const cUrl = `${API}/reports/${data.report}`;
          setVideoUrl(`${API}/outputs/${data.video}`);
          setCsvUrl(cUrl);
          clearInterval(pollRef.current);
          try { setReport(parseCSVReport(await (await fetch(cUrl)).text())); }
          catch { /* silent */ }
        }
        if (data.status === "failed") {
          setError("Processing failed"); setStatus("error");
          clearInterval(pollRef.current);
        }
      } catch { setError("Server not responding"); clearInterval(pollRef.current); }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const reset = () => {
    setFile(null); setJobId(null); setVideoUrl(null); setCsvUrl(null);
    setProgress(0); setStatus("idle"); setReport(null);
  };

  const typeEntries = report
    ? Object.entries(report.typeCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 90% 55% at 50% -5%,#071a2e 0%,#060c14 55%,#030608 100%)",
        fontFamily: "'DM Mono','Fira Code',monospace",
      }}
    >
      {/* Ambient grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* ══════════ SPLASH SCREEN ══════════ */}
      <AnimatePresence>
        {splash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-8"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%,#071e38 0%,#030608 100%)" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
          >
            {/* Pulse rings */}
            {[320, 220, 140].map((size, i) => (
              <motion.div
                key={size}
                className="absolute rounded-full border border-sky-400/10"
                style={{ width: size, height: size }}
                animate={{ scale: [1, 1 + 0.1 * (i + 1), 1], opacity: [0.4, 0.08, 0.4] }}
                transition={{ repeat: Infinity, duration: 2.5 + i * 0.5, delay: i * 0.3, ease: "easeInOut" }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 180 }}
              className="text-7xl mb-6 relative z-10 select-none"
            >🚦</motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-3xl md:text-4xl font-bold text-white relative z-10"
              style={{ letterSpacing: "-0.025em" }}
            >
              Smart Drone Traffic Analyzer
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.55 }}
              className="text-base font-semibold mt-1.5 relative z-10"
              style={{ color: "#38bdf8", letterSpacing: "0.18em" }}
            >
              TrafficLens
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              className="mt-5 text-sm text-gray-400 max-w-sm leading-relaxed relative z-10"
            >
              AI-powered aerial video analysis that detects, tracks, and classifies every vehicle in real time.
              <br />
              Upload drone footage — get instant traffic intelligence.
            </motion.p>

            {/* Progress bar */}
            <motion.div
              className="mt-10 w-44 h-0.5 rounded-full overflow-hidden relative z-10 bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#0284c7,#38bdf8)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
              className="mt-2 text-[9px] text-gray-600 uppercase tracking-widest relative z-10"
            >Loading interface…</motion.p>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              onClick={() => setSplash(false)}
              className="mt-5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-4 relative z-10"
            >Skip</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ NO-FILE POPUP ══════════ */}
      <AnimatePresence>
        {popupErr && (
          <motion.div
            key="popup"
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{   opacity: 0, y: -14,  scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "#150808", border: "1px solid #ef444438", minWidth: 300 }}
          >
            <span className="text-xl mt-0.5 shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">No video selected</p>
              <p className="text-xs text-gray-500 mt-0.5">Please choose or drop a video file before starting analysis.</p>
            </div>
            {/* Drain bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] rounded-full"
              style={{ background: "#ef4444" }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.4, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ TOP BAR ══════════ */}
      <motion.header
        initial={{ y: -36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.55 }}
        className="flex items-center justify-between px-8 py-4 border-b border-white/[0.05] relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: "#38bdf815", border: "1px solid #38bdf828" }}>🚦</div>
          <span className="text-white font-semibold text-sm tracking-tight">TrafficLens</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-full">Drone AI</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              background: status === "processing" ? "#fbbf24"
                : status === "completed" ? "#34d399"
                : status === "error" ? "#f87171"
                : "#374151"
            }}
            animate={status === "processing" ? { opacity: [1, 0.25, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.1 }}
          />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{status}</span>
        </div>
      </motion.header>

      {/* ══════════ MAIN BODY ══════════ */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── LEFT PANEL ── */}
        <motion.div
          className="flex flex-col gap-5 p-8 overflow-y-auto"
          animate={{ flex: report ? "0 0 52%" : "1 1 100%" }}
          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          style={{ minWidth: 0 }}
        >
          {/* Drop zone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className="relative rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-default"
            style={{
              border: dragActive ? "1.5px solid #38bdf8" : "1.5px dashed #ffffff12",
              background: dragActive ? "#38bdf80a" : "#ffffff03",
              minHeight: 200,
            }}
          >
            <motion.div
              animate={{ y: dragActive ? -6 : 0 }}
              transition={{ type: "spring", stiffness: 260 }}
              className="text-4xl select-none"
            >🎬</motion.div>
            <div className="text-center">
              <p className="text-white/80 text-sm font-medium mb-1">Drop your drone footage here</p>
              <p className="text-gray-600 text-xs">MP4 · MOV · AVI</p>
            </div>
            <label className="cursor-pointer">
              <span className="text-xs px-4 py-2 rounded-xl font-medium"
                style={{ background: "#38bdf813", color: "#38bdf8", border: "1px solid #38bdf832" }}>
                Browse Files
              </span>
              <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files[0])} />
            </label>
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "#34d39916", color: "#34d399", border: "1px solid #34d39926" }}
                >
                  <span>✓</span> {file.name}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center items-center mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={uploadVideo}
              disabled={status === "processing" || status === "uploading"}
              className="px-5 py-3 rounded-xl text-sm font-bold w-100 transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#0284c7,#38bdf8)", color: "#000" }}
            >
              {status === "uploading" ? "Uploading…" : status === "processing" ? "Analyzing…" : "▶  Start Analysis"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={reset}
              className="px-5 py-3 rounded-xl text-sm text-gray-400"
              style={{ background: "#ffffff07", border: "1px solid #ffffff10" }}
            >Reset</motion.button>
          </div>

          {/* Progress */}
          <AnimatePresence>
            {status !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
                  <span>{status === "completed" ? "Analysis complete ✓" : "Processing frames…"}</span>
                  <span style={{ color: "#38bdf8" }}>{progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#0ea5e9,#38bdf8,#818cf8)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                  {status === "processing" && (
                    <motion.div
                      className="absolute inset-y-0 w-16 rounded-full"
                      style={{ background: "linear-gradient(90deg,transparent,#ffffff28,transparent)" }}
                      animate={{ x: ["-64px", "700px"] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Server error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="text-xs px-4 py-3 rounded-xl"
                style={{ background: "#ef444410", color: "#f87171", border: "1px solid #ef444425" }}
              >⚠ {error}</motion.div>
            )}
          </AnimatePresence>

          {/* Output video */}
          <AnimatePresence>
            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Output Preview</p>
                <video src={videoUrl} controls className="w-full rounded-xl"
                  style={{ border: "1px solid #ffffff0c" }} />
                {csvUrl && (
                  <motion.a
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    href={csvUrl} download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "#38bdf810", color: "#38bdf8", border: "1px solid #38bdf825" }}
                  >↓ Download CSV Report</motion.a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── RIGHT PANEL — DASHBOARD ── */}
        <AnimatePresence>
          {report && (
            <motion.aside
              key="dash"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-5 p-8 overflow-y-auto"
              style={{ flex: "0 0 48%", borderLeft: "1px solid #ffffff06", background: "#ffffff02" }}
            >
              <div>
                <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Detection Report</p>
                <h2 className="text-lg font-bold text-white">Traffic Summary</h2>
              </div>

              {/* 2 primary stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Detections"  value={report.totalDetections} accent="#38bdf8" icon="📡" delay={0}    />
                <StatCard label="Unique Vehicles"    value={report.totalUnique}     accent="#818cf8" icon="🚘" delay={0.09} />
              </div>

              {/* Vehicle types panel */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl p-5 space-y-4"
                style={{ background: "#ffffff04", border: "1px solid #ffffff08" }}
              >
                <p className="text-[9px] uppercase tracking-widest text-gray-500">Vehicle Types Detected</p>

                {/* Type badge row */}
                <div className="flex flex-wrap gap-2">
                  {typeEntries.map(([type, count]) => {
                    const { color, icon } = typeStyle(type);
                    return (
                      <motion.div
                        key={type}
                        initial={{ opacity: 0, scale: 0.82 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background: color + "14", border: `1px solid ${color}28`, color }}
                      >
                        <span>{icon}</span>
                        <span className="capitalize">{type}</span>
                        <span className="ml-0.5 opacity-75">× {count.toLocaleString()}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Proportion bars */}
                <div className="space-y-3 pt-1">
                  {typeEntries.map(([type, count]) => (
                    <TypeBar key={type} type={type} count={count} total={report.totalDetections} />
                  ))}
                </div>
              </motion.div>

              {/* Plain text quick-read */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.38 }}
                className="rounded-2xl p-4 text-xs leading-relaxed"
                style={{ background: "#ffffff03", border: "1px solid #ffffff07" }}
              >
                <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-2">Quick Read</p>
                <p className="text-gray-400">
                  {typeEntries.map(([type, count], i) => {
                    const { color } = typeStyle(type);
                    return (
                      <span key={type}>
                        <span style={{ color }} className="font-semibold capitalize">{type}</span>
                        {": "}<span>{count.toLocaleString()}</span>
                        {i < typeEntries.length - 1 ? "   " : ""}
                      </span>
                    );
                  })}
                </p>
              </motion.div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom ambient glow */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-48"
        style={{ background: "radial-gradient(ellipse 50% 70% at 50% 100%,#0ea5e918,transparent)" }} />
    </div>
  );
}