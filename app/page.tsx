'use client'
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Plane, Clock, LayoutDashboard, BookOpen, ShieldCheck, Target,
  Activity, Zap, Download, Leaf, HardDrive, XCircle, MapPin, Globe,
  Fuel, Wind, CheckCircle2, Menu, Radio, Sun, Cpu, CloudLightning,
  Map, Lock, Smartphone, ShieldAlert, Database, RefreshCcw, Settings,
  Clipboard, Moon
} from 'lucide-react';

// =============================================================================
// PHASE 1: SYSTEM DICTIONARIES & OPERATIONS
// =============================================================================
const translations = {
  en: {
    dashboard: "Command Deck",
    logbook: "Tech Logbook",
    matrix: "Ground School",
    audit: "KCAA Audit Vault",
    fleet: "Fleet Ops",
    welcome: "Welcome back, Capt. Maina",
    goForFlight: "Go For Flight",
    safetyLimits: "Conditions within safe solo limits.",
    totalHours: "Total Flight Hrs",
    missionStart: "Start Mission Log",
    innovationHub: "Command Deck Innovations",
    slotEfficiency: "Slot Efficiency",
    noiseCompliance: "Noise Compliance",
    auditScore: "Audit Readiness",
    airlineRecovery: "Airline Recovery",
    autoSlotAllocation: "Auto Slot Allocation",
    greenOps: "Green Ops",
    operationalResilience: "Operational Resilience",
    airportSelector: "Select Airport",
    airportFlights: "Airport Flights",
    airportPlanes: "Active Fleet",
    airportAlerts: "Maintenance Alerts",
    airportRunways: "Runway Status",
    airportOpsData: "Operations Brief",
    commandDeckDetail: "Dynamic hub status and runway clearance summary for current airport operations.",
    vaultReady: "Audit vault synced and ready.",
    vaultExportSuccess: "Audit export completed. Download package generated.",
    vaultSyncSuccess: "Node sync completed. Ledger integrity verified.",
  },
  fr: {
    dashboard: "Pont de Commande",
    logbook: "Carnet de Vol",
    matrix: "École au Sol",
    audit: "Coffre d'Audit",
    fleet: "Gestion de Flotte",
    welcome: "Bon retour, Capt. Maina",
    goForFlight: "Prêt pour le Vol",
    safetyLimits: "Conditions de vol solo sécurisées.",
    totalHours: "Heures Totales",
    missionStart: "Démarrer le Journal",
    airportSelector: "Sélectionner l'Aéroport",
    airportFlights: "Vols de l'Aéroport",
    airportPlanes: "Flotte Active",
    airportAlerts: "Alertes de Maintenance",
    airportRunways: "Statut de la Piste",
    airportOpsData: "Bilan des Opérations",
    innovationHub: "Innovations du Poste de Commande",
    slotEfficiency: "Efficacité des Créneaux",
    noiseCompliance: "Conformité Sonore",
    auditScore: "Prêt pour Audit",
    airlineRecovery: "Récupération des Compagnies",
    autoSlotAllocation: "Attribution Automatique",
    greenOps: "Opérations Vertes",
    operationalResilience: "Résilience Opérationnelle",
    commandDeckDetail: "Statut dynamique du hub et résumé de la clairance de piste pour l'aéroport actuel.",
    vaultReady: "Coffre d'audit synchronisé et prêt.",
    vaultExportSuccess: "Exportation d'audit terminée. Package téléchargeable généré.",
    vaultSyncSuccess: "Synchronisation des nœuds terminée. Intégrité du registre vérifiée.",
  }
};

type Language = 'en' | 'fr';
type UserRole = 'student' | 'instructor' | 'airline' | 'kcaa';
type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';

type EquivalencyCategory = 'PIC' | 'Night' | 'Instrument';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface InputFieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  theme?: 'light' | 'dark';
}

interface FlightEntry {
  id: number;
  date: string;
  type: string;
  reg: string;
  duration: string;
  takeoff: string;
  land: string;
  airport: string;
  status: 'verified' | 'pending';
}

type FleetStatus = 'Operational' | 'AOG';

interface FleetAircraft {
  id: string;
  reg: string;
  type: string;
  status: FleetStatus;
  fuel: number;
  maintenance: string;
  hrs: number;
}

interface SlotEntry {
  id: string;
  flight: string;
  operator: string;
  status: string;
  target: string;
  delay: string;
}

interface AirlineIssue {
  title: string;
  detail: string;
  status: string;
}

type AuditFindingStatus = 'Open' | 'In Review' | 'Closed';

interface AuditFinding {
  id: string;
  category: string;
  description: string;
  status: AuditFindingStatus;
  recommendation: string;
  owner: string;
}

interface LicenseVerification {
  id: string;
  name: string;
  issued: string;
  expires: string;
  status: 'Valid' | 'Expired' | 'Pending';
}

interface IncidentReport {
  id: string;
  topic: string;
  date: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Resolved';
}

const sanitizeText = (value: string) => value.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();

// =============================================================================
// PHASE 2: ATOMIC UI COMPONENTS (DATA DENSE)
// =============================================================================
const airportBases = [
  { code: 'HKNW', label: 'Wilson', city: 'Nairobi', timezone: 'Africa/Nairobi', runways: '06/24' },
  { code: 'HKJK', label: 'JKIA', city: 'Nairobi', timezone: 'Africa/Nairobi', runways: '06/24, 01/19' },
];

const fuelDensityKgPerLiter: Record<'jet-a1' | 'avgas', number> = {
  'jet-a1': 0.8,
  avgas: 0.72,
};

const calculateCarbonEmissions = (liters: number, fuelType: 'jet-a1' | 'avgas' = 'jet-a1') => {
  const density = fuelDensityKgPerLiter[fuelType];
  const co2PerKg = 3.16;
  return Number((liters * density * co2PerKg).toFixed(1));
};

const convertHours = (kcaaHours: number, category: EquivalencyCategory) => {
  const standards = {
    FAA: { PIC: 50, Night: 10, Instrument: 40 },
    EASA: { PIC: 100, Night: 5, Instrument: 50 },
    KCAA: { PIC: 10, Night: 5, Instrument: 10 },
  } as const;

  return {
    faaStatus: kcaaHours >= standards.FAA[category] ? 'COMPLIANT' : `${standards.FAA[category] - kcaaHours}h REMAINING`,
    easaStatus: kcaaHours >= standards.EASA[category] ? 'COMPLIANT' : `${standards.EASA[category] - kcaaHours}h REMAINING`,
    kcaaBase: standards.KCAA[category],
  };
};

const badgeStyles: Record<BadgeColor, string> = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  red: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  slate: 'bg-slate-500/10 text-slate-400 border-white/10',
};

const Badge = ({ children, color = 'blue' }: BadgeProps) => (
  <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${badgeStyles[color]}`}>{children}</span>
);

const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-slate-950/70 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl transition-all duration-500 hover:border-blue-500/20 ${className}`}>
    {children}
  </div>
);

const InputField = ({ label, placeholder = '', type = 'text', value, onChange, theme = 'dark' }: InputFieldProps) => {
  const inputClasses = `rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-700' : 'bg-slate-100 border border-slate-300 text-slate-950 placeholder:text-slate-500'}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClasses}
      />
    </div>
  );
};

// =============================================================================
// MAIN APEX APPLICATION
// =============================================================================
export default function SkyTrackApex() {
  const [lang, setLang] = useState<Language>('en');
  const [role, setRole] = useState<UserRole>('student');
  const [hub, setHub] = useState({ name: 'Wilson (HKNW)', tz: 'Africa/Nairobi', code: 'HKNW' });
  const [selectedAirport, setSelectedAirport] = useState('HKNW');
  const [localTime, setLocalTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [view, setView] = useState<'dashboard' | 'logbook' | 'matrix' | 'fleet' | 'audit'>('dashboard');
  const [vaultStatus, setVaultStatus] = useState('');
  const [isAdmin] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [studentRoster, setStudentRoster] = useState([
    { id: 'S1', name: 'Wamuyu Claire', email: 'wamuyu.claire@skytrack.co.ke', program: 'PPL', status: 'Active' },
    { id: 'S2', name: 'Augustus E', email: 'augustus.e@skytrack.co.ke', program: 'Instrument', status: 'Active' },
  ]);
  const [instructorRoster, setInstructorRoster] = useState([
    { id: 'I1', name: 'Capt. Claire Maina', email: 'capt.claire.maina@skytrack.co.ke', rating: 'CPL/IR', status: 'Available' },
    { id: 'I2', name: 'F/O Grace Ndonga', email: 'grace.ndonga@skytrack.co.ke', rating: 'FI', status: 'On Duty' },
  ]);
  const canViewRoster = role === 'airline' || isAdmin;
  const [themeText, setThemeText] = useState<'text-white' | 'text-slate-950'>(theme === 'dark' ? 'text-white' : 'text-slate-950');
  const [themeSubText, setThemeSubText] = useState<'text-slate-400' | 'text-slate-500'>(theme === 'dark' ? 'text-slate-400' : 'text-slate-500');
  const [themeSelectClass, setThemeSelectClass] = useState(theme === 'dark' ? 'bg-black/60 border border-white/10 text-white' : 'bg-white border border-slate-300 text-slate-950');

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  useEffect(() => {
    setThemeText(theme === 'dark' ? 'text-white' : 'text-slate-950');
    setThemeSubText(theme === 'dark' ? 'text-slate-400' : 'text-slate-500');
    setThemeSelectClass(theme === 'dark' ? 'bg-black/60 border border-white/10 text-white' : 'bg-white border border-slate-300 text-slate-950');
    document.documentElement.style.setProperty('--background', theme === 'dark' ? '#010204' : '#f8fafc');
    document.documentElement.style.setProperty('--foreground', theme === 'dark' ? '#e2e8f0' : '#0f172a');
  }, [theme]);

  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([
    {
      id: 'A1',
      category: 'Maintenance Records',
      description: 'Fuel uplift log missing instructor sign-off for 5Y-KQA.',
      status: 'Open',
      recommendation: 'Attach certified paperwork and sign audit ledger.',
      owner: 'Ops',
    },
    {
      id: 'A2',
      category: 'Crew Currency',
      description: 'Two pilot recency checks are pending for line operations.',
      status: 'In Review',
      recommendation: 'Schedule simulator currency reviews by Friday.',
      owner: 'Training',
    },
    {
      id: 'A3',
      category: 'Safety Audit',
      description: 'Ground handling compliance gap in HKJK turnaround checklist.',
      status: 'Closed',
      recommendation: 'Implement reinforced briefing and handover logs.',
      owner: 'Ground Ops',
    },
  ]);
  const auditOpenCount = useMemo(() => auditFindings.filter((finding) => finding.status === 'Open').length, [auditFindings]);
  const auditReviewCount = useMemo(() => auditFindings.filter((finding) => finding.status === 'In Review').length, [auditFindings]);
  const auditClosedCount = useMemo(() => auditFindings.filter((finding) => finding.status === 'Closed').length, [auditFindings]);
  const auditReadiness = useMemo(() => Math.max(72, 100 - auditOpenCount * 7), [auditOpenCount]);
  const [equivHours, setEquivHours] = useState('18');
  const [equivCategory, setEquivCategory] = useState<EquivalencyCategory>('PIC');
  const equivalency = useMemo(() => convertHours(Number(equivHours), equivCategory), [equivHours, equivCategory]);
  const [licenseVerifications, setLicenseVerifications] = useState<LicenseVerification[]>([
    { id: 'L1', name: 'Captain Claire Maina', issued: '2024-07-12', expires: '2028-05-09', status: 'Valid' },
    { id: 'L2', name: 'First Officer Wamuyu', issued: '2023-05-02', expires: '2027-05-09', status: 'Valid' },
    { id: 'L3', name: 'Ground Instructor Augustus', issued: '2025-01-18', expires: '2029-01-12', status: 'Pending' },
  ]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([
    { id: 'I1', topic: 'Taxiway deviation', date: '2026-04-12', severity: 'Medium', status: 'Resolved' },
    { id: 'I2', topic: 'Unscheduled maintenance delay', date: '2026-04-11', severity: 'Low', status: 'Open' },
    { id: 'I3', topic: 'Regulatory briefing overdue', date: '2026-04-10', severity: 'High', status: 'Open' },
  ]);
  const [carbonLiters, setCarbonLiters] = useState('0');
  const [carbonFuelType, setCarbonFuelType] = useState<'jet-a1' | 'avgas'>('jet-a1');
  const [carbonResult, setCarbonResult] = useState<number | null>(null);
  const [slotQueue, setSlotQueue] = useState<SlotEntry[]>([
    { id: 'S1', flight: '5Y-KQA', operator: 'AirKenya', status: 'Cleared', target: 'HKNW', delay: '+0 min' },
    { id: 'S2', flight: '5Y-JKI', operator: 'Safarilink', status: 'Pending', target: 'HKJK', delay: '+12 min' },
    { id: 'S3', flight: '5Y-BBM', operator: 'Silverstone', status: 'Hold', target: 'HKNW', delay: '+25 min' },
  ]);
  const [airlineIssues, setAirlineIssues] = useState<AirlineIssue[]>([
    { title: 'Fuel uplift efficiency', detail: 'Auto-optimize uplift to minimize weight and delay.', status: 'Green' },
    { title: 'Slot recovery', detail: 'Fast lane queue for delayed arrivals and airline priority.', status: 'Yellow' },
    { title: 'Noise footprint', detail: 'Reduced noise profiles for night activity and urban corridors.', status: 'Green' },
  ]);

  useEffect(() => {
    const airport = airportBases.find((item) => item.code === selectedAirport);
    if (airport) {
      setHub({ name: `${airport.label} (${airport.code})`, tz: airport.timezone, code: airport.code });
    }
  }, [selectedAirport]);

  // --- STATE: DATA PERSISTENCE ---
  const [newEntry, setNewEntry] = useState({ date: '', type: '', reg: '', duration: '', takeoff: '', land: '' });
  const [flights, setFlights] = useState<FlightEntry[]>([
    { id: 1, date: '2026-04-14', type: 'C208 Caravan', reg: '5Y-KQA', duration: '2.4', takeoff: 'HKNW', land: 'HKJK', airport: 'HKNW', status: 'verified' },
    { id: 2, date: '2026-04-12', type: 'Cessna 172', reg: '5Y-BBM', duration: '1.2', takeoff: 'HKNW', land: 'HKNW', airport: 'HKNW', status: 'verified' },
    { id: 3, date: '2026-04-10', type: 'Cessna 172', reg: '5Y-FLY', duration: '0.8', takeoff: 'HKNW', land: 'HKNW', airport: 'HKNW', status: 'verified' },
    { id: 4, date: '2026-04-09', type: 'B737-800', reg: '5Y-JKI', duration: '1.5', takeoff: 'HKJK', land: 'HKJK', airport: 'HKJK', status: 'verified' },
  ]);

  const [fleet, setFleet] = useState<FleetAircraft[]>([
    { id: '1', reg: "5Y-KQA", type: "Cessna 208", status: "Operational", fuel: 85, maintenance: "50hr Check in 12hrs", hrs: 1240 },
    { id: '2', reg: "5Y-BBM", type: "Cessna 172", status: "Operational", fuel: 40, maintenance: "Annual Due June", hrs: 3120 },
    { id: '3', reg: "5Y-FLY", type: "Cessna 172", status: "AOG", fuel: 0, maintenance: "Brake System Repair", hrs: 890 },
    { id: '4', reg: "5Y-KCA", type: "Piper PA-28", status: "Operational", fuel: 100, maintenance: "Nominal", hrs: 4200 },
  ]);

  const t = translations[lang];

  useEffect(() => {
    setVaultStatus(t.vaultReady);
  }, [t]);

  // --- ENGINE: REAL-TIME TELEMETRY ---
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Intl.DateTimeFormat('en-GB', { 
        timeStyle: 'medium', 
        timeZone: hub.tz 
      }).format(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [hub]);

  // --- ENGINE: REACTIVE COMPUTATIONS ---
  const airportFlights = useMemo(() => {
    return flights.filter((f) => f.takeoff === selectedAirport || f.land === selectedAirport || f.airport === selectedAirport);
  }, [flights, selectedAirport]);

  const currentAirport = useMemo(() => airportBases.find((airport) => airport.code === selectedAirport) ?? airportBases[0], [selectedAirport]);

  const stats = useMemo(() => {
    const total = flights.reduce((a, b) => a + parseFloat(b.duration || '0'), 0);
    return {
      total: total.toFixed(1),
      pending: flights.filter(f => f.status === 'pending').length,
      aogCount: fleet.filter(p => p.status === 'AOG').length,
      safetyScore: 98.4,
      airportFlightCount: airportFlights.length,
      airportVerified: airportFlights.filter(f => f.status === 'verified').length,
      airportPending: airportFlights.filter(f => f.status === 'pending').length,
    };
  }, [flights, fleet, airportFlights]);

  const handleAddFlight = () => {
    if (!newEntry.reg || !newEntry.duration) return;
    const safeEntry: FlightEntry = {
      id: Date.now(),
      date: sanitizeText(newEntry.date),
      type: sanitizeText(newEntry.type),
      reg: sanitizeText(newEntry.reg),
      duration: sanitizeText(newEntry.duration),
      takeoff: sanitizeText(newEntry.takeoff) || selectedAirport,
      land: sanitizeText(newEntry.land) || selectedAirport,
      airport: selectedAirport,
      status: 'pending',
    };
    setFlights([safeEntry, ...flights]);
    setNewEntry({ date: '', type: '', reg: '', duration: '', takeoff: '', land: '' });
  };

  const handleCarbonCalculate = async () => {
    const liters = Number(carbonLiters.replace(',', '.'));
    if (!liters || liters < 0) {
      setCarbonResult(null);
      return;
    }

    try {
      const response = await fetch('/api/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liters, fuelType: carbonFuelType }),
      });
      const data = await response.json();
      if (typeof data.co2 === 'number') {
        setCarbonResult(data.co2);
        return;
      }
    } catch {
      // fallback local calculation
    }

    setCarbonResult(calculateCarbonEmissions(liters, carbonFuelType));
  };

  const handleVaultExport = () => {
    setVaultStatus(t.vaultExportSuccess);
  };

  const handleVaultSync = () => {
    setVaultStatus(t.vaultSyncSuccess);
  };

  const toggleLanguage = () => {
    setLang((current) => (current === 'en' ? 'fr' : 'en'));
  };

  const handleOptimizeQueue = () => {
    setSlotQueue((prev) =>
      prev.map((entry) => ({
        ...entry,
        status:
          entry.status === 'Hold'
            ? 'Pending'
            : entry.status === 'Pending'
            ? 'Cleared'
            : entry.status,
      }))
    );
  };

  const prioritizeAirlineRecovery = () => {
    setAirlineIssues((prev) =>
      prev.map((issue) => ({
        ...issue,
        status: issue.title === 'Slot recovery' ? 'Green' : issue.status,
      }))
    );
  };

  const resolveAuditFinding = (id: string) => {
    setAuditFindings((prev) =>
      prev.map((finding) =>
        finding.id === id ? { ...finding, status: 'Closed' } : finding
      )
    );
    setVaultStatus('KCAA finding closed and vault controls refreshed.');
  };

  const escalateAuditReview = () => {
    setAuditFindings((prev) =>
      prev.map((finding) =>
        finding.status === 'Open' ? { ...finding, status: 'In Review' } : finding
      )
    );
    setVaultStatus('Audit pipeline advanced for KCAA review.');
  };

  const refreshFleetHealth = () => {
    setFleet((prev) =>
      prev.map((aircraft) => ({
        ...aircraft,
        maintenance:
          aircraft.status === 'AOG'
            ? 'Ground team dispatched for rapid restore'
            : aircraft.maintenance,
      }))
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#010204] text-slate-200' : 'bg-slate-100 text-slate-950'} flex flex-col md:flex-row font-sans overflow-x-hidden selection:bg-blue-500/30`}>
      
      {/* MOBILE NAV STRIP (Responsive) */}
      <div className="md:hidden flex items-center justify-between p-5 bg-black border-b border-white/5 sticky top-0 z-[200] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Plane className="text-blue-500" size={20} />
          <h2 className="text-lg font-black uppercase italic tracking-tighter text-white">SkyTrack</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 bg-white/5 rounded-lg border border-white/10 active:scale-90 transition-transform">
            {theme === 'dark' ? <Sun size={18} className="text-amber-300" /> : <Moon size={18} className="text-slate-900" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/5 rounded-lg border border-white/10 active:scale-90 transition-transform">
            {mobileMenuOpen ? <XCircle size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MASTER SIDEBAR (Navigation drawer) */}
      <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static inset-0 w-full md:w-72 bg-black/95 md:bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col p-8 z-[150] transition-transform duration-500 ease-out`}>
        <div className="hidden md:flex items-center gap-4 mb-6 px-2">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40">
            <Plane className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">SkyTrack</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">Secure hub {selectedAirport}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-between mb-12 px-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.35em]">Lang: {lang.toUpperCase()}</span>
            <button onClick={toggleLanguage} className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-full bg-white/5 text-slate-200 hover:bg-white/10 transition">
              {lang === 'en' ? 'FR' : 'EN'}
            </button>
          </div>
          <button onClick={toggleTheme} className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-full bg-white/5 text-slate-200 hover:bg-white/10 transition flex items-center gap-2">
            {theme === 'dark' ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-slate-900" />} {theme === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
        </div>

<nav className="space-y-2 flex-1">
          {[
            { id: 'student', icon: BookOpen, label: 'Student Mode', count: airportFlights.length },
            { id: 'instructor', icon: ShieldCheck, label: 'Instructor Mode', count: slotQueue.filter((item) => item.status !== 'Cleared').length },
            { id: 'airline', icon: Activity, label: 'Airline/Ops Mode', count: fleet.filter((plane) => plane.status === 'AOG').length },
            { id: 'kcaa', icon: Lock, label: 'KCAA / Regulator', count: auditOpenCount },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => { setRole(btn.id as UserRole); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 ${role === btn.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-4">
                <btn.icon size={18} /> {btn.label}
              </div>
              {btn.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-[9px] flex items-center justify-center animate-pulse text-white font-black">{btn.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center font-black text-white text-xs border border-white/10">CM</div>
            <div>
              <p className="text-xs font-black text-white uppercase italic">Claire Maina</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">KCAA-PPL-2026</p>
            </div>
          </div>
        </div>
      </aside>

      {/* OPERATIONAL VIEWPORT (Scrollable) */}
      <main className="flex-1 p-5 md:p-12 overflow-y-auto relative z-10 scrollbar-hide">
        
        {/* VIEW: COMMAND DECK (DASHBOARD) */}
        {role === 'student' && (
          <div className="animate-in fade-in duration-700 space-y-8 pb-10">
            <div className="flex flex-col xl:flex-row justify-between items-start gap-8">
              <div>
                <h1 className={`text-5xl md:text-7xl font-black ${themeText} uppercase tracking-tighter italic leading-none mb-4`}>
                  {role === 'student' ? 'Student Mode' : role === 'instructor' ? 'Instructor Mode' : 'Airline/Ops Mode'}
                </h1>
                <p className={`text-sm ${themeSubText} uppercase tracking-[0.3em] max-w-2xl`}>
                  {role === 'student'
                    ? 'Logbook entries, ground school metrics, and tailored training alerts.'
                    : role === 'instructor'
                    ? 'Student oversight, flight schedules, and grading dashboards.'
                    : 'Fleet health, fuel management, and carbon emissions reporting.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    { id: 'student', label: 'Student Mode' },
                    { id: 'instructor', label: 'Instructor Mode' },
                    { id: 'airline', label: 'Airline/Ops Mode' },
                    { id: 'kcaa', label: 'KCAA / Regulator' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRole(option.id as UserRole)}
                      className={`rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition ${role === option.id ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Card className="flex items-center gap-8 py-4 px-8 border-blue-500/20 w-full md:w-auto">
                <div className="text-right border-r border-white/10 pr-8">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">LOCAL_OPS_TIME</p>
                  <p className="text-3xl font-mono font-bold text-blue-400">{localTime}</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col items-center"><Wind size={18} className="text-blue-400 mb-1" /><span className="text-xs font-bold font-mono">12KT</span></div>
                  <div className="flex flex-col items-center"><Sun size={18} className="text-amber-500 mb-1" /><span className="text-xs font-bold font-mono">24°C</span></div>
                </div>
              </Card>
            </div>

            {/* KPI MATRIX */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t.totalHours, val: stats.total, unit: "HRS", icon: Clock, color: "blue" },
                { label: "Matrix Pct", val: "88", unit: "%", icon: Target, color: "purple" },
                { label: "Avg Burn", val: "14.2", unit: "GPH", icon: Fuel, color: "amber" },
                { label: "Fleet Status", val: "94", unit: "%", icon: Activity, color: "emerald" },
              ].map((kpi, i) => (
                <Card key={i} className="flex flex-col items-center py-8 group hover:scale-105 active:scale-95">
                  <div className="p-3 bg-slate-900 rounded-xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <kpi.icon className={`text-${kpi.color}-400 group-hover:text-white`} size={22} />
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-[0.2em]">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-white">{kpi.val}</p>
                    <span className="text-[10px] font-black text-slate-600">{kpi.unit}</span>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-900/80 border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Compliance Status</p>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-3">Completed Requirements</h3>
                </div>
                <Badge color="green">Optimal Launch Window</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-3xl bg-black/40 border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Next launch window</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-black">Stable</span>
                  </div>
                  <p className="text-4xl font-black text-white">06:00 AM</p>
                  <p className="mt-2 text-sm text-slate-400">09h 32m 15s remaining until ideal departure conditions.</p>
                  <div className="mt-5 rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black mb-2">Student readiness</p>
                    <p className="text-sm font-black text-amber-300">Hold until conditions improve</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Training Schedule</p>
                      <p className="text-sm text-slate-400">Next scheduled slot and live countdown</p>
                    </div>
                    <Badge color="blue">Next slot</Badge>
                  </div>
                  <div className="space-y-4 text-slate-300">
                    <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                      <p className="text-sm font-black text-white">06:30 · Dual Instruction</p>
                      <p className="text-[10px] text-slate-500 mt-1">Arrives in: 10h 01m 49s</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Early Training</p>
                        <p className="text-sm font-black text-white">06:30 Dual Instruction</p>
                      </div>
                      <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Cross-Country</p>
                        <p className="text-sm font-black text-white">08:00 Navigation Prep</p>
                      </div>
                      <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Solo Pattern</p>
                        <p className="text-sm font-black text-white">10:30 Pattern Work</p>
                      </div>
                      <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Briefing</p>
                        <p className="text-sm font-black text-white">13:00 Weather & Nav</p>
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-3">Syllabus completion</p>
                    <p className="text-sm text-slate-300">KCAA Official Audit Status track audit readiness across training and certification.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/80 border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Global Equivalency Engine</p>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-3">KCAA Hours vs FAA / EASA</h3>
                </div>
                <Badge color="purple">Student Advantage</Badge>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">Use Kenyan logged hours to compare against international pilot license minimums and see where you are already ahead or what remains to qualify.</p>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 block">Category</label>
                      <select value={equivCategory} onChange={(e) => setEquivCategory(e.target.value as EquivalencyCategory)} className={`w-full rounded-2xl ${themeSelectClass} px-4 py-3 text-sm outline-none focus:border-blue-500 transition`}>
                        <option value="PIC">PIC / Cross-country</option>
                        <option value="Night">Night Flying</option>
                        <option value="Instrument">Instrument / Solo</option>
                      </select>
                    </div>
                    <InputField theme={theme} label="KCAA logged hours" placeholder="15" type="number" value={equivHours} onChange={(e) => setEquivHours(e.target.value)} />
                  </div>
                  <div className="rounded-3xl bg-black/40 border border-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">KCAA base requirement</p>
                    <p className="text-3xl font-black text-white">{equivalency.kcaaBase}h</p>
                    <p className="text-[10px] text-slate-500 mt-2">Baseline hours for Kenyan PPL/CPL equivalency.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">FAA Status</p>
                    <p className="text-2xl font-black text-white">{equivalency.faaStatus}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">EASA Status</p>
                    <p className="text-2xl font-black text-white">{equivalency.easaStatus}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-slate-900/80 border border-blue-500/10 p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">
                  <Settings size={16} /> {t.airportOpsData}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{t.commandDeckDetail}</p>
                <div className="mt-6 space-y-3 text-sm text-slate-300">
                  <div className="flex justify-between"><span>Selected hub</span><span className="font-black text-white">{currentAirport.label} ({currentAirport.code})</span></div>
                  <div className="flex justify-between"><span>Local city</span><span className="font-black text-white">{currentAirport.city}</span></div>
                  <div className="flex justify-between"><span>Runway plan</span><span className="font-black text-white">{currentAirport.runways}</span></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={handleOptimizeQueue} className="rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition">
                    Optimize Queue
                  </button>
                  <button onClick={prioritizeAirlineRecovery} className="rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-emerald-500 transition">
                    Prioritize Recovery
                  </button>
                </div>
              </Card>
              <Card className="bg-slate-900/80 border border-emerald-500/10 p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">
                  <MapPin size={16} /> {t.airportFlights}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                  <div className="space-y-2">
                    <p className="text-slate-400 uppercase tracking-[0.25em] text-[10px]">Log Entries</p>
                    <p className="text-3xl font-black text-white">{stats.airportFlightCount}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-400 uppercase tracking-[0.25em] text-[10px]">Verified</p>
                    <p className="text-3xl font-black text-white">{stats.airportVerified}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-400 uppercase tracking-[0.25em] text-[10px]">Pending</p>
                    <p className="text-3xl font-black text-white">{stats.airportPending}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-slate-900/80 border border-amber-500/10 p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">
                  <ShieldCheck size={16} /> {t.airportAlerts}
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-slate-300"><span>Runway availability</span><span className="font-black text-white">Open</span></div>
                  <div className="flex justify-between text-sm text-slate-300"><span>ATC channel</span><span className="font-black text-white">118.3</span></div>
                  <div className="flex justify-between text-sm text-slate-300"><span>Next slot</span><span className="font-black text-white">+18 min</span></div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 bg-slate-900/80 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">{t.innovationHub}</p>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight mt-3">Future-ready KCAA & Airline Ops</h3>
                  </div>
                  <Leaf size={28} className="text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: t.autoSlotAllocation, value: '92%', color: 'blue' },
                    { label: t.noiseCompliance, value: '86%', color: 'emerald' },
                    { label: t.auditScore, value: '100%', color: 'purple' },
                    { label: t.greenOps, value: '48% fuel savings', color: 'amber' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-3xl bg-white/5 p-5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black mb-3">{item.label}</p>
                      <p className={`text-3xl font-black ${item.color === 'blue' ? 'text-blue-400' : item.color === 'emerald' ? 'text-emerald-400' : item.color === 'purple' ? 'text-purple-400' : 'text-amber-400'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {airlineIssues.map((issue, index) => (
                    <div key={index} className="rounded-3xl bg-black/40 border border-white/5 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{issue.title}</p>
                        <Badge color={issue.status === 'Green' ? 'green' : issue.status === 'Yellow' ? 'amber' : 'red'}>{issue.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{issue.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="bg-slate-900/80 border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">
                  <HardDrive size={16} /> {t.slotEfficiency}
                </div>
                <div className="space-y-4">
                  {slotQueue.map((slot) => (
                    <div key={slot.id} className="rounded-3xl bg-black/40 border border-white/5 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-black text-white">{slot.flight}</p>
                        <Badge color={slot.status === 'Cleared' ? 'green' : slot.status === 'Pending' ? 'amber' : 'red'}>{slot.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.28em] mb-2">{slot.operator} · {slot.target}</p>
                      <div className="flex items-center justify-between text-sm text-slate-300"><span>Delay</span><span>{slot.delay}</span></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ACTION CENTER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="p-8 md:p-12 bg-gradient-to-br from-blue-600 to-indigo-950 border-none relative overflow-hidden group h-full shadow-[0_20px_50px_rgba(30,64,175,0.3)]">
                  <div className="relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic mb-4">{t.goForFlight}</h2>
                    <p className="text-lg text-blue-100/60 font-bold mb-8 max-w-md italic leading-relaxed">{t.safetyLimits}</p>
                    <button onClick={() => setRole('student')} className="bg-white text-blue-800 font-black px-10 py-4 rounded-xl flex items-center gap-3 hover:scale-110 active:scale-90 transition-all text-sm uppercase shadow-2xl">
                      <Plus size={20} strokeWidth={3} /> Continue Student Mode
                    </button>
                  </div>
                  {/* Decorative Plane with 2050 design aesthetics */}
                  <Plane className="absolute -right-16 -bottom-16 text-white/[0.05] rotate-12 group-hover:rotate-0 group-hover:text-white/[0.1] transition-all duration-[3000ms] ease-out" size={400} />
                </Card>
              </div>

              <Card className="border-blue-500/30 bg-blue-500/5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Clipboard size={18} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Mode Insights</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                </div>
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex-1 mb-6">
                  <p className="text-xs font-bold text-slate-200 italic leading-relaxed">Keep operations focused on the selected role. All tools and summaries update for the current mode.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  {role === 'student'
                    ? 'Study aids, mission planning, and logbook control for trainees.'
                    : role === 'instructor'
                    ? 'Student tracking, schedule management, and grading overviews.'
                    : 'Fleet readiness, fuel flow, and regulatory reporting for airline ops.'}
                </div>
              </Card>
            </div>
          </div>
        )}
        {role === 'instructor' && (
          <div className="animate-in fade-in duration-700 space-y-10 pb-20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h1 className={`text-5xl font-black ${themeText} uppercase italic tracking-tighter`}>Instructor Mode</h1>
                <p className={`mt-3 text-sm ${themeSubText} uppercase tracking-[0.3em] max-w-2xl`}>Student oversight, flight scheduling, and grading dashboards.</p>
              </div>
              <Badge color="blue">Mission Ready</Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Student Oversight</p>
                <div className="grid grid-cols-2 gap-4 text-slate-300">
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Active Students</p>
                    <p className="text-3xl font-black text-white">24</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Pending Flights</p>
                    <p className="text-3xl font-black text-white">{stats.pending}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800 col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Average Grade</p>
                    <p className="text-3xl font-black text-white">89.4%</p>
                  </div>
                </div>
              </Card>
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Flight Scheduling</p>
                <div className="space-y-4">
                  {slotQueue.map((slot) => (
                    <div key={slot.id} className="rounded-3xl bg-black/40 border border-white/5 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-black text-white">{slot.flight}</p>
                        <Badge color={slot.status === 'Cleared' ? 'green' : slot.status === 'Pending' ? 'amber' : 'red'}>{slot.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.28em] mb-2">{slot.operator} · {slot.target}</p>
                      <div className="flex items-center justify-between text-sm text-slate-300"><span>Delay</span><span>{slot.delay}</span></div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Grading Metrics</p>
                <div className="space-y-4">
                  {[
                    { label: 'Checkride readiness', value: '83%' },
                    { label: 'Tactical landings', value: '91%' },
                    { label: 'Emergency drills', value: '78%' },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">{metric.label}</p>
                      <p className="text-2xl font-black text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="border border-slate-700 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Instructor Notes</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {airlineIssues.map((issue) => (
                  <div key={issue.title} className="rounded-3xl bg-black/40 border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{issue.title}</p>
                      <Badge color={issue.status === 'Green' ? 'green' : issue.status === 'Yellow' ? 'amber' : 'red'}>{issue.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{issue.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {role === 'airline' && (
          <div className="animate-in fade-in duration-700 space-y-10 pb-20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h1 className={`text-5xl font-black ${themeText} uppercase italic tracking-tighter`}>Airline/Ops Mode</h1>
                <p className={`mt-3 text-sm ${themeSubText} uppercase tracking-[0.3em] max-w-2xl`}>Fleet health, fuel flow, and carbon emissions reporting for operations.</p>
              </div>
              <Badge color="green">Ops Active</Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Fleet Health</p>
                <div className="grid grid-cols-2 gap-4 text-slate-300">
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Total Aircraft</p>
                    <p className="text-3xl font-black text-white">{fleet.length}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">AOG Fleet</p>
                    <p className="text-3xl font-black text-white">{fleet.filter((plane) => plane.status === 'AOG').length}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800 col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Average Fuel</p>
                    <p className="text-3xl font-black text-white">{Math.round(fleet.reduce((sum, plane) => sum + plane.fuel, 0) / fleet.length)}%</p>
                  </div>
                </div>
              </Card>
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Fuel Management</p>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Calculated Fuel Burn</p>
                    <p className="text-3xl font-black text-white">{fleet.reduce((sum, plane) => sum + (100 - plane.fuel), 0)} L</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Operational Availability</p>
                    <p className="text-3xl font-black text-white">{Math.round((fleet.filter((plane) => plane.status === 'Operational').length / fleet.length) * 100)}%</p>
                  </div>
                </div>
              </Card>
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Carbon Emissions Calculator</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 block">Fuel Type</label>
                    <select value={carbonFuelType} onChange={(e) => setCarbonFuelType(e.target.value as 'jet-a1' | 'avgas')} className={`w-full rounded-2xl ${themeSelectClass} px-4 py-3 text-sm outline-none focus:border-blue-500 transition`}>
                      <option value="jet-a1">Jet A-1</option>
                      <option value="avgas">Avgas</option>
                    </select>
                  </div>
                  <div>
                    <InputField theme={theme} label="Liters consumed" placeholder="0" type="number" value={carbonLiters} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCarbonLiters(e.target.value)} />
                  </div>
                  <button onClick={handleCarbonCalculate} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-3xl uppercase tracking-[0.2em] text-[10px] transition active:scale-95">
                    Calculate CO2
                  </button>
                  <div className="rounded-3xl bg-slate-950/70 p-4 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">CO2 Emissions</p>
                    <p className="text-3xl font-black text-white">{carbonResult !== null ? `${carbonResult} kg CO2` : 'Awaiting input'}</p>
                    <p className="text-[10px] text-slate-500 mt-2">Jet A-1: 0.80 kg/L density, 3.16 kg CO2/kg.</p>
                  </div>
                </div>
              </Card>
            </div>

            {canViewRoster && (
              <Card className="border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Students & Instructors</p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-3">Roster summary</h3>
                  </div>
                  <Badge color="purple">Restricted</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-black/40 border border-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Student count</p>
                    <p className="text-4xl font-black text-white">{studentRoster.length}</p>
                    <div className="mt-4 space-y-3 text-slate-300">
                      {studentRoster.map((student) => (
                        <div key={student.id} className="rounded-3xl bg-slate-950/80 p-3 border border-white/10">
                          <p className="font-black text-white">{student.name}</p>
                          <p className="text-[10px] text-slate-500">{student.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-black/40 border border-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Instructor count</p>
                    <p className="text-4xl font-black text-white">{instructorRoster.length}</p>
                    <div className="mt-4 space-y-3 text-slate-300">
                      {instructorRoster.map((inst) => (
                        <div key={inst.id} className="rounded-3xl bg-slate-950/80 p-3 border border-white/10">
                          <p className="font-black text-white">{inst.name}</p>
                          <p className="text-[10px] text-slate-500">{inst.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border border-slate-700 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Fleet Details</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {fleet.map((plane) => (
                  <div key={plane.id} className="rounded-3xl bg-black/40 p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-black text-white uppercase tracking-[0.2em]">{plane.reg}</p>
                      <Badge color={plane.status === 'AOG' ? 'red' : 'green'}>{plane.status}</Badge>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">{plane.type}</p>
                    <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-400">
                      <div>
                        <p>Fuel</p>
                        <p className="text-white font-black">{plane.fuel}%</p>
                      </div>
                      <div>
                        <p>HRS</p>
                        <p className="text-white font-black">{plane.hrs}</p>
                      </div>
                      <div>
                        <p>Maint.</p>
                        <p className="text-white font-black">{plane.maintenance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {role === 'kcaa' && (
          <div className="animate-in fade-in duration-700 space-y-10 pb-20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h1 className={`text-5xl font-black ${themeText} uppercase italic tracking-tighter`}>KCAA / Regulator Mode</h1>
                <p className={`mt-3 text-sm ${themeSubText} uppercase tracking-[0.3em] max-w-2xl`}>Audit readiness, license verification, and incident reporting for Kenyan regulator oversight.</p>
              </div>
              <Badge color="blue">Regulator</Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Audit Readiness</p>
                <div className="space-y-4 text-slate-300">
                  <div className="rounded-3xl bg-black/40 p-5 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Current readiness score</p>
                    <p className="text-5xl font-black text-white">{auditReadiness}%</p>
                  </div>
                  <div className="rounded-3xl bg-black/40 p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Open findings</span>
                      <Badge color={auditOpenCount > 0 ? 'amber' : 'green'}>{auditOpenCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">In review</span>
                      <span className="font-black text-white">{auditReviewCount}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">License Verifications</p>
                <div className="space-y-3">
                  {licenseVerifications.map((license) => (
                    <div key={license.id} className="rounded-3xl bg-black/40 p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{license.name}</p>
                          <p className="text-[10px] text-slate-500">Issued: {license.issued}</p>
                        </div>
                        <Badge color={license.status === 'Valid' ? 'green' : license.status === 'Pending' ? 'amber' : 'red'}>{license.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500">Expires: {license.expires}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border border-slate-700 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-4">Incident Reports</p>
                <div className="space-y-3">
                  {incidentReports.map((incident) => (
                    <div key={incident.id} className="rounded-3xl bg-black/40 p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{incident.topic}</p>
                          <p className="text-[10px] text-slate-500">{incident.date}</p>
                        </div>
                        <Badge color={incident.status === 'Resolved' ? 'green' : 'amber'}>{incident.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500">Severity: {incident.severity}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/80 border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Audit Summary</p>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight mt-3">Track audit readiness across training and certification</h3>
                </div>
                <Badge color="purple">KCAA Official Audit Status</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'PPL Training Syllabus (Phase 1-4)', status: 'Ongoing', verified: 'Ongoing', progress: '65% Complete' },
                  { label: 'Night Flight Rating Requirement', status: 'Underway', verified: 'Ongoing', progress: '20% Complete' },
                  { label: 'Cross-Country Proficiency (150nm Solo)', status: 'Verified', verified: 'Verified', progress: '100% Complete' },
                  { label: 'Instrument Awareness Training', status: 'Ongoing', verified: 'Ongoing', progress: '56% Complete' },
                  { label: 'Radio Operations Certificate', status: 'Licensed', verified: 'Verified', progress: '100% Complete' },
                  { label: 'Class 2 Medical Certification', status: 'Valid until 2027', verified: 'Verified', progress: '100% Complete' },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-3xl bg-black/40 border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-white uppercase tracking-[0.18em]">{item.label}</p>
                      <Badge color={item.progress.includes('100') ? 'green' : item.status === 'Verified' || item.status === 'Licensed' ? 'blue' : 'amber'}>{item.progress}</Badge>
                    </div>
                    <div className="grid gap-2 text-[10px] text-slate-400">
                      <div className="flex justify-between"><span>Status</span><span className="font-black text-white">{item.status}</span></div>
                      <div className="flex justify-between"><span>Verification</span><span className="font-black text-white">{item.verified}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-slate-900/80 border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Regulator Control</p>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight mt-3">Compliance action center</h3>
                </div>
                <Badge color="blue">KCAA Ready</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={escalateAuditReview} className="rounded-full bg-blue-600 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition">
                  Advance Review Lane
                </button>
                <button onClick={handleVaultSync} className="rounded-full bg-white/5 border border-white/10 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 hover:bg-white/10 transition">
                  Sync Regulatory Ledger
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: TECH LOGBOOK (EXPANDED INPUTS & DATA) */}
        {view === 'logbook' && (
          <div className="animate-in slide-in-from-right-10 duration-700 space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className={`text-5xl font-black ${themeText} uppercase italic tracking-tighter`}>{t.logbook}</h1>
                <p className={`mt-2 text-sm ${themeSubText} uppercase tracking-[0.3em]`}>{currentAirport.label} ({currentAirport.code}) flight log</p>
              </div>
              <Badge color="green">KCAA Ledger Active</Badge>
            </div>
            
            <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
              <InputField theme={theme} label="Date" type="date" value={newEntry.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, date: e.target.value})} />
              <InputField theme={theme} label="Airframe Type" placeholder="e.g. C172" value={newEntry.type} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, type: e.target.value})} />
              <InputField theme={theme} label="Registration" placeholder="5Y-..." value={newEntry.reg} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, reg: e.target.value})} />
              <InputField theme={theme} label="Sector" placeholder="HKNW-HKJK" value={newEntry.takeoff} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, takeoff: e.target.value})} />
              <InputField theme={theme} label="Block Time" placeholder="0.0" type="number" value={newEntry.duration} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, duration: e.target.value})} />
              <button onClick={handleAddFlight} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-[10px] uppercase shadow-lg shadow-emerald-900/20 active:scale-95 group">
                <CheckCircle2 size={16} className="group-hover:rotate-12 transition-transform" /> Log Mission
              </button>
            </Card>

            <Card className="overflow-hidden p-0 border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-white/[0.02]">
                    <tr className="border-b border-white/5">
                      <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Date / Sector</th>
                      <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Aircraft Config</th>
                      <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Condition</th>
                      <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Block Hrs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {airportFlights.map((f) => (
                      <tr key={f.id} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm text-slate-300">{f.date}</span>
                            <span className="text-[10px] font-black text-blue-500 tracking-tighter uppercase">{f.takeoff} ➔ {f.land || 'HKNW'}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-blue-600/20 transition-colors">
                              <Plane size={16} className="text-slate-500 group-hover:text-blue-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-white text-sm uppercase italic">{f.type}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.reg}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <Badge color={f.status === 'verified' ? 'green' : 'amber'}>{f.status}</Badge>
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-2xl font-black text-white font-mono">{f.duration}</span>
                          <span className="ml-2 text-[9px] font-bold text-slate-700 uppercase">Hrs</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: GROUND SCHOOL MATRIX CORE */}
        {view === 'matrix' && (
          <div className="animate-in fade-in duration-700 space-y-10 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <h1 className={`text-5xl md:text-6xl font-black ${themeText} uppercase italic tracking-tighter`}>Matrix Core</h1>
              <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Overall Proficiency</p>
                  <p className="text-2xl font-black text-purple-400">88.4%</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin-slow" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Navigation & Plotting", progress: 92, icon: Map, color: "blue", tags: ["VOR", "DME", "ADF"], desc: "Mastery of Dead Reckoning & Radio Nav." },
                { title: "Meteorology", progress: 75, icon: CloudLightning, color: "amber", tags: ["METAR", "TAF", "Charts"], desc: "High-altitude weather pattern analysis." },
                { title: "Air Law (KCAA)", progress: 100, icon: ShieldCheck, color: "emerald", tags: ["Annex 2", "Part 141"], desc: "Regulatory compliance & ICAO standards." },
                { title: "Flight Principles", progress: 84, icon: Zap, color: "purple", tags: ["Lift/Drag", "Weight/Balance"], desc: "Aerodynamic stability & control logic." },
                { title: "Human Factors", progress: 62, icon: User, color: "rose", tags: ["CRM", "Hypoxia"], desc: "Aero-medical & cockpit resource mgmt." },
                { title: "Aircraft Systems", progress: 90, icon: Settings, color: "blue", tags: ["C208", "C172", "G1000"], desc: "Avionics & propulsion system telemetry." },
              ].map((sub, i) => (
                <Card key={i} className="group hover:border-white/10 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 bg-slate-900 rounded-xl group-hover:bg-${sub.color}-500 group-hover:text-white transition-all duration-500`}>
                      <sub.icon size={22} />
                    </div>
                    <span className="text-2xl font-black text-white italic">{sub.progress}%</span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase mb-2 italic tracking-tight">{sub.title}</h3>
                  <p className="text-xs text-slate-500 font-bold mb-6 italic">{sub.desc}</p>
                  <div className="w-full h-1.5 bg-white/5 rounded-full mb-6 overflow-hidden">
                    <div className={`h-full bg-${sub.color}-500 transition-all duration-1000 group-hover:brightness-125`} style={{ width: `${sub.progress}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sub.tags.map((tag, j) => <Badge key={j} color="slate">{tag}</Badge>)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: FLEET OPS DASHBOARD */}
        {view === 'fleet' && (
          <div className="animate-in slide-in-from-bottom-10 duration-700 space-y-10 pb-20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter">Fleet Hub</h1>
              <button onClick={refreshFleetHealth} className="self-start rounded-3xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition">
                Refresh Fleet Health
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {fleet.map((plane) => (
                <Card key={plane.id} className={`flex flex-col md:flex-row gap-8 border-l-4 group ${plane.status === 'AOG' ? 'border-rose-500 bg-rose-500/5' : 'border-emerald-500'}`}>
                  <div className="md:w-40 h-40 bg-slate-900 rounded-3xl flex items-center justify-center relative overflow-hidden flex-shrink-0 group-hover:scale-95 transition-transform">
                    <Plane size={60} className={`rotate-45 ${plane.status === 'AOG' ? 'text-rose-900' : 'text-slate-800 group-hover:text-blue-900'}`} />
                    <div className="absolute top-4 left-4 font-black text-[9px] uppercase text-slate-600">ID: {plane.id}</div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-3xl font-black text-white italic leading-none">{plane.reg}</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">{plane.type}</p>
                      </div>
                      <Badge color={plane.status === 'AOG' ? 'red' : 'green'}>{plane.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><p className="text-[8px] font-black text-slate-600 uppercase">Fuel</p><p className="text-sm font-black text-blue-400">{plane.fuel}%</p></div>
                      <div><p className="text-[8px] font-black text-slate-600 uppercase">Total Hrs</p><p className="text-sm font-black text-slate-300">{plane.hrs}</p></div>
                      <div><p className="text-[8px] font-black text-slate-600 uppercase">Oil PSI</p><p className="text-sm font-black text-emerald-400">82</p></div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 group-hover:border-blue-500/20 transition-colors">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <ShieldAlert size={12} className={plane.status === 'AOG' ? 'text-rose-500' : 'text-amber-500'}/> Maintenance Status
                      </p>
                      <p className="text-xs font-bold text-slate-300 italic">{plane.maintenance}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: KCAA AUDIT VAULT (RESTORATION) */}
        {view === 'audit' && (
          <div className="animate-in fade-in zoom-in-95 duration-700 space-y-10 pb-20">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[4rem] p-10 md:p-24 text-center relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="inline-flex p-8 bg-emerald-500/10 rounded-3xl mb-8 border border-emerald-500/20 shadow-xl">
                  <ShieldCheck className="text-emerald-400" size={70} />
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 italic leading-none">Regulatory Vault</h2>
                <p className="text-slate-400 max-w-2xl mx-auto mb-12 text-lg font-bold italic leading-relaxed">
                  Cryptographically secure flight logs compliant with 2026 KCAA PEL schedules. 
                  Every entry is indexed against the Kenya Civil Aviation Authority Part 141 standards.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <button onClick={handleVaultExport} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-10 rounded-2xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 uppercase text-xs tracking-[0.2em] shadow-lg">
                    <Download size={20} strokeWidth={3}/> Export Audit PDF
                  </button>
                  <button onClick={handleVaultSync} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black py-5 px-10 rounded-2xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 uppercase text-xs tracking-[0.2em] border border-white/10">
                    <Database size={20} strokeWidth={3}/> Sync Nodes
                  </button>
                </div>
                <p className="mt-6 text-sm text-slate-200 text-center">{vaultStatus}</p>
              </div>
              <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.03] animate-spin-slow pointer-events-none" size={700} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 border border-emerald-500/10 bg-slate-900/80 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">KCAA Audit Health</p>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight mt-3">Audit readiness & issue remediation</h3>
                  </div>
                  <Badge color={auditOpenCount > 0 ? 'amber' : 'green'}>{auditOpenCount > 0 ? 'Action Required' : 'Clear'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-slate-300">
                  <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">KCAA readiness</p>
                    <p className="text-4xl font-black text-white">{auditReadiness}%</p>
                  </div>
                  <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Open findings</p>
                    <p className="text-4xl font-black text-white">{auditOpenCount}</p>
                  </div>
                  <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">In review</p>
                    <p className="text-4xl font-black text-white">{auditReviewCount}</p>
                  </div>
                  <div className="rounded-3xl bg-black/40 p-4 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Closed findings</p>
                    <p className="text-4xl font-black text-white">{auditClosedCount}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {auditFindings.map((finding) => (
                    <div key={finding.id} className="rounded-3xl bg-black/40 p-4 border border-white/5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{finding.category}</p>
                          <p className="text-xs text-slate-500 mt-1">{finding.description}</p>
                        </div>
                        <Badge color={finding.status === 'Closed' ? 'green' : finding.status === 'In Review' ? 'amber' : 'red'}>{finding.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-3">Recommendation: {finding.recommendation}</p>
                      <div className="flex flex-wrap gap-3 items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Owner: {finding.owner}</span>
                        {finding.status !== 'Closed' && (
                          <button onClick={() => resolveAuditFinding(finding.id)} className="rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-emerald-500 transition">
                            Close Finding
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={escalateAuditReview} className="rounded-full bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition">
                    Advance Review Lane
                  </button>
                  <button onClick={handleVaultSync} className="rounded-full bg-white/5 border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 hover:bg-white/10 transition">
                    Refresh KCAA Ledger
                  </button>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Chain Status", val: "ACTIVE", icon: Lock, color: "emerald" },
                { label: "Last Audit", val: "14-APR-26", icon: RefreshCcw, color: "blue" },
                { label: "Regulatory Hub", val: "KCAA-HQ", icon: Radio, color: "amber" },
              ].map((v, i) => (
                <Card key={i} className="flex flex-col items-center py-10">
                  <v.icon size={30} className={`text-${v.color}-400 mb-6 animate-pulse`} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{v.label}</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter">{v.val}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

      </main>

      <div className="md:hidden fixed bottom-16 left-0 right-0 px-4 z-[110]">
        <div className="bg-slate-950/90 border border-white/10 rounded-3xl p-3 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'student', label: 'STU' },
              { id: 'instructor', label: 'INS' },
              { id: 'airline', label: 'OPS' },
              { id: 'kcaa', label: 'KCAA' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRole(tab.id as UserRole)}
                className={`rounded-2xl py-2 text-[10px] font-black uppercase tracking-[0.2em] transition ${role === tab.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE STATUS BAR (Phone Friendly) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-12 bg-black/90 backdrop-blur-md border-t border-white/5 z-[100] px-6 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">Hub: Wilson Alpha</span>
        </div>
        <div className="flex gap-4 items-center">
          <Smartphone size={14} className="text-slate-200" />
          <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">SkyTrack Mobile v4.0.2</span>
        </div>
      </div>

      {/* DESKTOP FOOTER STATUS */}
      <footer className="hidden md:flex fixed bottom-0 left-72 right-0 h-10 bg-black/80 backdrop-blur-xl border-t border-white/5 px-8 items-center justify-between z-50">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Telemetry Active: WILSON_HKNW_GATEWAY</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 border-l border-white/10 pl-8">
            <Cpu size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest italic tracking-[0.2em]">Ops System Load: 12.4%</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[9px] font-black uppercase text-slate-700 tracking-[0.4em]">Confidential / Claire Maina Ops / 2026</span>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500/20 shadow-inner" />
             <div className="w-2 h-2 rounded-full bg-emerald-500/20 shadow-inner" />
          </div>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// PHASE 5: LEGACY SVG HELPERS & ASSET MAPPING
// =============================================================================
function User(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}