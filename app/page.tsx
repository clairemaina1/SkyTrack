'use client'
import { useState, useEffect } from 'react';
import { translations } from '../lib/translations';
import supabase from '@/lib/supabase-browser';
import { kcaaRequirements, kcaaModules } from '@/lib/kcaa-requirements';
import {
  Plus, Plane, Clock, GraduationCap, LayoutDashboard, FileCheck,
  CheckCircle2, Wind, Fuel, Zap, Target, AlertCircle, Calendar,
  MapPin, BarChart3, ChevronRight, Award, BookOpen, ShieldCheck,
  CloudSun, Thermometer, Navigation, Eye, UserCheck, XCircle,
  Sun, Moon, Users, User, Menu, X, Download, MessageSquare
} from 'lucide-react'

// =============================================================================
// UI ATOMS
// =============================================================================
const Button = ({ children, className, type = 'button', disabled, ...props }: any) => <button type={type} disabled={disabled} className={`relative z-50 pointer-events-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg transition-all font-black flex items-center gap-2 uppercase tracking-tighter ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'} ${className}`} {...props}>{children}</button>;
const Card = ({ children, className }: any) => <div className={`border border-white/10 rounded-2xl p-6 bg-slate-950/90 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden ${className}`}>{children}</div>;
const Badge = ({ children, color = "blue" }: any) => {
  const colors: any = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    red: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  };
  return <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase tracking-widest ${colors[color]}`}>{children}</span>;
};
const Progress = ({ val, max, color = "bg-blue-600" }: any) => (
  <div className="h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
    <div className={`h-full ${color} shadow-[0_0_12px_rgba(59,130,246,0.4)] transition-all duration-1000`} style={{ width: `${(val / max) * 100}%` }} />
  </div>
);

// =============================================================================
// DATA & LOGIC
// =============================================================================
const africanAirports = [
  { code: 'HKNW', name: 'Wilson', lang: 'en' },
  { code: 'HKJK', name: 'JKIA', lang: 'en' },
  { code: 'GOOY', name: 'Dakar', lang: 'fr' },
  { code: 'FKKD', name: 'Douala', lang: 'fr' },
  { code: 'HRYR', name: 'Kigali', lang: 'fr' },
];

const weatherPresets = [
  { condition: 'weatherConditionClearSkies', temp: 24, wind: '040/08KT', gusts: 10, visibility: '10km' },
  { condition: 'weatherConditionScatteredClouds', temp: 22, wind: '050/12KT', gusts: 14, visibility: '9km' },
  { condition: 'weatherConditionBrokenClouds', temp: 20, wind: '030/16KT', gusts: 18, visibility: '8km' },
  { condition: 'weatherConditionLightShowers', temp: 19, wind: '060/14KT', gusts: 16, visibility: '7km' },
  { condition: 'weatherConditionOvercast', temp: 18, wind: '020/10KT', gusts: 12, visibility: '6km' },
];

// Helper: Original Logic for Weather & Time
const getLiveWeather = (date: Date, t: any) => {
  const idx = Math.floor(date.getTime() / 15000) % weatherPresets.length;
  const base = weatherPresets[idx];
  const hour = date.getHours();
  const isDay = hour >= 6 && hour < 18;
  const windSpeed = 8 + (date.getSeconds() % 10);
  const isSafeForSolo = isDay && windSpeed <= 15;
  return { ...base, wind: `040/${windSpeed}KT`, isDay, isSafeForSolo, conditionLabel: t[base.condition] || base.condition };
};

export default function SkyTrackApex() {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const setLanguage = (value: 'en' | 'fr') => setLang(value);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(africanAirports[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [assistantInput, setAssistantInput] = useState('');
  const [dbRows, setDbRows] = useState<any[]>([]);

  const t = translations[lang];
  const isDark = theme === 'dark';

  // Logic: Sync Language with Airport
  useEffect(() => {
    const airport = africanAirports.find(a => a.code === selectedAirport.code);
    if (airport) setLanguage(airport.lang as 'en' | 'fr');
  }, [selectedAirport]);

  // Auth & Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weather = getLiveWeather(currentTime, t);
  const nextFlightTarget = new Date(currentTime);
  nextFlightTarget.setHours(currentTime.getHours() + 1, 0, 0);
  
  const formatCountdown = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60) % 60;
    const h = Math.floor(s / 3600);
    return `${h}h ${m}m ${s % 60}s`;
  };

  // CSV Export Logic (Restored)
  const downloadCSV = () => {
    const headers = "Date,Type,Registration,Instructor,Duration\n";
    const rows = dbRows.map(r => `${r.date},${r.type},${r.reg},${r.instructor},${r.dur}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logbook.csv';
    a.click();
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6 text-center">
      <Card className="max-w-md w-full">
        <Plane className="mx-auto text-blue-500 mb-6" size={50} />
        <h1 className="text-3xl font-black text-white uppercase mb-4">{t.signInTitle}</h1>
        <Button onClick={() => {}} className="w-full justify-center">{t.sendMagicLink}</Button>
      </Card>
    </div>
  );

  return (
    <div className={`relative min-h-screen ${isDark ? 'bg-[#020408] text-slate-200' : 'bg-slate-50 text-slate-900'} flex flex-col md:flex-row`}>
      {/* GLOBAL BACKGROUNDS */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-950/10 via-black to-black" />

      {/* MOBILE NAV (Z-INDEX FIX) */}
      <header className="md:hidden sticky top-0 z-[100] bg-black/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-2">
          <Plane className="text-blue-500" size={20} />
          <span className="font-black uppercase text-white">SkyTrack Apex</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`${isMobileMenuOpen ? 'fixed inset-0 flex' : 'hidden'} md:flex md:sticky md:top-0 w-full md:w-80 h-screen bg-black/95 md:bg-black/20 backdrop-blur-3xl border-r border-white/5 flex-col p-8 z-[110]`}>
        <div className="hidden md:flex items-center gap-4 mb-12">
          <div className="p-3 bg-blue-600 rounded-2xl"><Plane className="text-white" /></div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white">SkyTrack Apex</h2>
        </div>

        <nav className="space-y-3 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: t.dashboardLabel },
            { id: 'logbook', icon: BookOpen, label: t.certifiedLogbook },
            { id: 'matrix', icon: Target, label: t.groundMatrixLabel },
          ].map(btn => (
            <button key={btn.id} onClick={() => { setView(btn.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all ${view === btn.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
              <btn.icon size={18} /> {btn.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-black text-white">CM</div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate uppercase">{profile?.name || "Claire Maina"}</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase">BBIT / Student Pilot</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="w-full mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest">{t.signOut}</button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 relative z-10 p-4 md:p-12 overflow-y-auto">
        
        {/* COMMAND HEADER (VISIBILITY & SWITCHER FIX) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
          <div>
            <Badge color="blue">{selectedAirport.name} CONTROL</Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mt-4 leading-none">
              {view === 'dashboard' ? t.commandDeck : view === 'logbook' ? t.certifiedLogbook : t.groundMatrixLabel}
            </h1>
          </div>

          <div className="grid grid-cols-2 md:flex items-center gap-4 md:gap-12 bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl w-full lg:w-auto shadow-2xl">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white opacity-100 visible uppercase tracking-widest">Time (UTC+3)</p>
              <p className="text-2xl font-mono font-bold text-blue-400 tabular-nums">{currentTime.toLocaleTimeString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white opacity-100 visible uppercase tracking-widest">Airport Hub</p>
              <select 
                value={selectedAirport.code}
                onChange={(e) => {
                  const airport = africanAirports.find(a => a.code === e.target.value) || africanAirports[0];
                  setSelectedAirport(airport);
                  setLanguage(airport.lang as 'en' | 'fr');
                }}
                className="bg-transparent text-lg font-black text-emerald-400 outline-none cursor-pointer uppercase"
              >
                {africanAirports.map(a => <option key={a.code} value={a.code} className="bg-slate-900 text-white">{a.name} ({a.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="bg-gradient-to-br from-blue-600/20 via-transparent to-transparent border-blue-500/30">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{weather.isSafeForSolo ? t.goForFlight : t.stayGrounded}</h2>
                  <p className="text-slate-400 text-sm max-w-xl">{weather.isSafeForSolo ? t.weatherSafeStudentSoloConditions : t.weatherWindsGustsExceededWait}</p>
                </div>
                <Button className="w-full md:w-auto px-12 py-5 text-lg shadow-blue-500/40">
                  <Plus /> {t.newEntryLabel}
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Total Flight Hrs", val: "42.5", icon: Clock, color: "blue" },
                { label: "Current Wind", val: weather.wind, icon: Wind, color: "emerald" },
                { label: "Ground School", val: "88%", icon: GraduationCap, color: "amber" },
                { label: "Fuel Status", val: "Optimal", icon: Fuel, color: "purple" },
              ].map((s, i) => (
                <Card key={i} className="flex items-center gap-5 group hover:border-blue-500/50 transition-all">
                  <div className={`p-4 bg-${s.color}-500/20 rounded-2xl text-${s.color}-400 group-hover:scale-110 transition-transform`}><s.icon size={28} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                    <p className="text-3xl font-black text-white">{s.val}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Flight Log Operations</h3>
                <button onClick={downloadCSV} className="text-[10px] font-black uppercase text-slate-400 hover:text-white flex items-center gap-2"><Download size={14} /> Export CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/5">
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Type</th>
                      <th className="pb-4">Reg</th>
                      <th className="pb-4">Duration</th>
                      <th className="pb-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-white">
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-6">2026-04-10</td>
                      <td className="py-6">Cessna 172</td>
                      <td className="py-6">5Y-KQA</td>
                      <td className="py-6">1.5 HRS</td>
                      <td className="py-6 text-right"><Badge color="green">Verified</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: MATRIX */}
        {view === 'matrix' && (
          <div className="grid lg:grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
            {kcaaModules.slice(0, 2).map((cat, i) => (
              <Card key={i}>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-10 pb-4 border-b border-white/10">{i === 0 ? t.coreTheory : t.technicalKnowledge}</h3>
                <div className="space-y-10">
                  {kcaaModules.map((m, j) => (
                    <div key={j}>
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">{m.name}</span>
                        <Badge color={m.score >= 75 ? "green" : "blue"}>{m.score}%</Badge>
                      </div>
                      <Progress val={m.score} max={100} color={m.score >= 75 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-blue-600"} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* FLOATING AI ASSISTANT (RESTORED & VISIBLE) */}
        <div className="fixed bottom-8 right-8 z-[120] w-full max-w-[400px] px-6 md:px-0">
          <Card className="border-blue-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">SkyTrack AI (HUB {selectedAirport.code})</span>
              </div>
              <XCircle className="text-slate-600 cursor-pointer hover:text-white" size={16} />
            </div>
            
            <div className="h-56 overflow-y-auto mb-6 space-y-4 text-xs font-bold pr-2 scrollbar-thin scrollbar-thumb-white/10">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-slate-200">
                {lang === 'fr' ? 'Bonjour Claire. Je surveille le ciel au-dessus de ' : 'Hello Claire. Monitoring skies over '}{selectedAirport.name}. {t.assistantIntro}
              </div>
            </div>

            <div className="relative">
              <input 
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder={lang === 'fr' ? 'Poser une question...' : 'Ask about your flight...'}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-blue-500 transition-all font-bold text-white"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-white transition-colors">
                <Zap size={20} />
              </button>
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}