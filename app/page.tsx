'use client'
import { useState, useEffect } from 'react';
import { translations } from '../lib/translations';
import supabase from '@/lib/supabase-browser';
import { kcaaRequirements, kcaaModules } from '@/lib/kcaa-requirements';
import {
  Plus, Plane, Clock, GraduationCap, LayoutDashboard, FileCheck,
  CheckCircle2, Wind, Fuel, Zap, Target, AlertCircle, Calendar,
  MapPin, BarChart3, ChevronRight, Award, BookOpen, ShieldCheck,
  CloudSun, Thermometer, Navigation, Eye, UserCheck, XCircle
} from 'lucide-react'

// =============================================================================
// UI ATOMS
// =============================================================================
const Button = ({ children, className, ...props }: any) => <button className={`px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-black active:scale-95 flex items-center gap-2 uppercase tracking-tighter ${className}`} {...props}>{children}</button>;
const Card = ({ children, className }: any) => <div className={`border border-white/10 rounded-2xl p-6 bg-black/75 backdrop-blur-3xl shadow-2xl relative overflow-hidden ${className}`}>{children}</div>;
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

const AIRPORTS = [
  { code: 'HKNW', label: 'Wilson' },
  { code: 'HKJK', label: 'JKIA' },
  { code: 'HKMO', label: 'Moi' },
  { code: 'HKKI', label: 'Kisumu' },
  { code: 'HKEL', label: 'Eldoret' },
];

const weatherPresets = [
  { condition: 'Clear Skies', temp: 24, wind: '040/08KT', gusts: 10, visibility: '10km' },
  { condition: 'Scattered Clouds', temp: 22, wind: '050/12KT', gusts: 14, visibility: '9km' },
  { condition: 'Broken Clouds', temp: 20, wind: '030/16KT', gusts: 18, visibility: '8km' },
  { condition: 'Light Showers', temp: 19, wind: '060/14KT', gusts: 16, visibility: '7km' },
  { condition: 'Overcast', temp: 18, wind: '020/10KT', gusts: 12, visibility: '6km' },
];

const getLiveWeather = (date: Date) => {
  const idx = Math.floor(date.getTime() / 15000) % weatherPresets.length;
  const base = weatherPresets[idx];
  const hour = date.getHours();
  const isDay = hour >= 6 && hour < 18;
  const variation = Math.floor(date.getSeconds() / 15);
  const gusts = base.gusts + variation;
  const windSpeed = base.wind.match(/\/(\d+)KT/)?.[1] ? parseInt(base.wind.match(/\/(\d+)KT/)?.[1] ?? '0', 10) : 0;
  const windDir = (parseInt(base.wind.split('/')[0], 10) + (hour * 3)) % 360;
  const wind = `${String(windDir).padStart(3, '0')}/${String(windSpeed + (variation % 3)).padStart(2, '0')}KT`;
  const visibility = isDay ? base.visibility : '8km';
  const isSafeForSolo = isDay && windSpeed <= 15 && gusts <= 15 && !base.condition.toLowerCase().includes('storm');
  const reason = !isDay
    ? 'After-hours ops are limited for student solos.'
    : isSafeForSolo
      ? 'Conditions are within safe student solo limits.'
      : 'Winds or gusts exceed student solo limits; wait for a safer window.';

  return {
    ...base,
    wind,
    gusts,
    visibility,
    isSafeForSolo,
    reason,
    isDay,
  };
};

const getNextFlightCountdown = (date: Date) => {
  const target = new Date(date);
  const currentHour = date.getHours();
  if (currentHour < 6) {
    target.setHours(6, 0, 0, 0);
  } else if (currentHour >= 18) {
    target.setDate(target.getDate() + 1);
    target.setHours(6, 0, 0, 0);
  } else {
    const nextSlot = Math.ceil((date.getMinutes() + 1) / 15) * 15;
    if (nextSlot < 60) {
      target.setMinutes(nextSlot, 0, 0);
    } else {
      target.setHours(currentHour + 1, 0, 0, 0);
    }
  }
  return target;
};

const formatDigitalTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

const estimateClearTime = (weather: any, now: Date) => {
  if (weather.isSafeForSolo) {
    return now;
  }

  const next = new Date(now);
  const windSpeed = parseInt(weather.wind.match(/\/(\d{2,3})KT/)?.[1] ?? '0', 10);
  const gusts = weather.gusts ?? windSpeed;
  const condition = weather.condition.toLowerCase();
  let delayMinutes = 30;

  if (/storm|thunder|ts|tstm/.test(condition)) {
    delayMinutes = 120;
  } else if (/rain|shra|snow|snow|fog|mist/.test(condition)) {
    delayMinutes = 90;
  } else if (gusts > 25 || windSpeed > 25) {
    delayMinutes = 120;
  } else if (gusts > 18 || windSpeed > 18) {
    delayMinutes = 60;
  } else if (gusts > 15 || windSpeed > 15) {
    delayMinutes = 45;
  }

  if (!weather.isDay) {
    next.setHours(6, 0, 0, 0);
    next.setDate(next.getDate() + 1);
  } else {
    next.setMinutes(next.getMinutes() + delayMinutes);
  }

  if (next.getHours() >= 18) {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }

  return next;
};

const formatRelativeTime = (target: Date, now: Date) => {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Now';
  return formatCountdown(diff);
};

const generateFlightLogbookCsv = (profile: any, rows: any[]) => {
  const headers = ['Student', 'School', 'Instructor', 'Start Date', '', 'Requirement', 'Value', '', 'Flight Date', 'Type', 'Registration', 'Instructor', 'Duration'];
  const requirementRows = [
    ['Total hours required', `${kcaaRequirements.totalHours}`],
    ['Solo minimum', `${kcaaRequirements.soloHours}`],
    ['Night minimum', `${kcaaRequirements.nightHours}`],
    ['Cross-country minimum', `${kcaaRequirements.crossCountryHours}`],
    ['Dual instruction minimum', `${kcaaRequirements.dualInstructionHours}`],
  ];
  const rowsCsv = rows.map((row: any) => [
    '', '', '', '', '', '', '',
    row.date || '', row.type || '', row.reg || '', row.instructor || '', row.dur || '',
  ].join(','));
  const lines = [
    headers.join(','),
    [profile?.studentName ?? 'N/A', profile?.school ?? 'N/A', profile?.instructor_id ?? 'Unassigned', profile?.start_date ?? 'N/A', '', '', '', '', '', '', '', ''].join(','),
    '',
    ...requirementRows.map(([title, value]) => ['', '', '', '', '', title, value, '', '', '', '', '']),
    '',
    ...rowsCsv,
  ];
  return lines.join('\r\n');
};

const downloadLogbookCsv = (profile: any, rows: any[]) => {
  const csv = generateFlightLogbookCsv(profile, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'skytrack-logbook.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const generateAssistantReply = (input: string, now: Date, weather: any, nextFlight: any, safeWindow: Date) => {
  const normalized = input.trim().toLowerCase();
  const safetyMessage = weather.isSafeForSolo
    ? 'Conditions are within safe student solo limits right now.'
    : `Current weather is not safe for a student because ${weather.reason.toLowerCase()}`;
  const windowMessage = `The next predicted safe window is ${safeWindow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}, which is ${formatRelativeTime(safeWindow, now)}.`;

  if (normalized.includes('safe') || normalized.includes('student') || normalized.includes('fly')) {
    return `${safetyMessage} ${windowMessage}`;
  }

  if (normalized.includes('weather') || normalized.includes('metar') || normalized.includes('hknw')) {
    return `Current METAR-style weather: ${weather.condition}, ${weather.wind}, gusts ${weather.gusts}KT, visibility ${weather.visibility}, temperature ${weather.temp}°C.`;
  }

  if (normalized.includes('next') || normalized.includes('schedule') || normalized.includes('slot')) {
    return `Next scheduled slot is ${nextFlight.label} at ${nextFlight.time} for ${nextFlight.type}. ${windowMessage}`;
  }

  if (normalized.includes('why')) {
    return `Reason: ${weather.reason}. ${windowMessage}`;
  }

  return `SkyTrack recommends: ${safetyMessage} ${nextFlight.label} is the next training slot at ${nextFlight.time}.`;
};

// =============================================================================
// DATA & LOGIC
// =============================================================================
export default function SkyTrackApex() {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const t = translations[lang];
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    date: '',
    type: '',
    reg: '',
    instructor: '',
    dur: '',
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [flightMessage, setFlightMessage] = useState({ type: '', text: '' });
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'SkyTrack Assistant: Ask me about flight safety, the weather, or student readiness.' }
  ]);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInMessage, setSignInMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: 'student',
    school: '',
    instructor_id: '',
    phone: '',
    start_date: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date(0));

  useEffect(() => {
    const initializeAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);
  const [weather, setWeather] = useState(getLiveWeather(new Date(0)));
  const [weatherSource, setWeatherSource] = useState('SIMULATED');
  const [selectedAirport, setSelectedAirport] = useState('HKNW');
  const selectedAirportLabel = AIRPORTS.find((airport) => airport.code === selectedAirport)?.label ?? selectedAirport;
  const [lastSync, setLastSync] = useState('');
  const studentName = profile?.name ?? session?.user?.email ?? 'SkyTrack Pilot';
  const flightSchedule = [
    { label: 'Early Training', time: '06:30', type: 'Dual Instruction' },
    { label: 'Cross Country', time: '08:00', type: 'Navigation Prep' },
    { label: 'Solo Pattern', time: '10:30', type: 'Pattern Work' },
    { label: 'Briefing', time: '13:00', type: 'Weather & Nav' },
    { label: 'Night Ops', time: '16:30', type: 'Approach Practice' },
  ];

  const flightTableRows = dbRows.map((row) => ({
    date: row.date ?? row.flight_date ?? row.created_at ?? '-',
    type: row.type ?? row.aircraft ?? row.model ?? '-',
    reg: row.reg ?? row.registration ?? row.tail_number ?? '-',
    instructor: row.inst ?? row.instructor ?? row.pilot ?? '-',
    dur: row.dur ?? row.duration ?? row.hours ?? '-',
  }));

  const scheduleWithDates = flightSchedule.map((slot) => {
    const [hours, minutes] = slot.time.split(':').map(Number);
    const date = new Date(currentTime);
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() <= currentTime.getTime()) {
      date.setDate(date.getDate() + 1);
    }
    return { ...slot, date };
  });

  const nextFlight = scheduleWithDates.find((slot) => slot.date.getTime() > currentTime.getTime()) ?? scheduleWithDates[0];
  const nextFlightCountdown = formatCountdown(nextFlight.date.getTime() - currentTime.getTime());
  const safeWindow = estimateClearTime(weather, currentTime);
  const safeWindowLabel = weather.isSafeForSolo ? 'Now' : `${safeWindow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${formatRelativeTime(safeWindow, currentTime)})`;

  const getDispatchReady = (baseWeather: any, now: Date) => {
    const windSpeed = parseInt(baseWeather.wind.match(/\/(\d{2,3})KT/)?.[1] ?? '0', 10);
    const gusts = parseInt(baseWeather.wind.match(/G(\d{2,3})KT/)?.[1] ?? String(baseWeather.gusts ?? windSpeed), 10);
    const isDay = now.getHours() >= 6 && now.getHours() < 18;
    const isSafeForSolo = isDay && windSpeed <= 15 && gusts <= 15 && !/storm|thunder|tstm/i.test(baseWeather.condition);
    const reason = !isDay
      ? 'Night operations are kept restricted for student solos.'
      : isSafeForSolo
        ? 'Conditions are within safe student solo limits.'
        : 'Wind or gusts exceed student solo limits; wait for a safer window.';

    return {
      ...baseWeather,
      isDay,
      isSafeForSolo,
      reason,
    };
  };

  const handleAssistantSubmit = async () => {
    const prompt = assistantInput.trim();
    if (!prompt) return;

    setAssistantMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setAssistantInput('');
    setIsAssistantTyping(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          weather,
          nextFlight,
          safeWindow: safeWindow.toISOString(),
          currentTime: currentTime.toISOString(),
        }),
      });

      const payload = await response.json();
      const aiReply = payload.reply ?? generateAssistantReply(prompt, currentTime, weather, nextFlight, safeWindow);

      if (!response.ok) {
        setAssistantMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `AI assistant unavailable. ${payload.error || 'Using fallback response.'}\n\n${aiReply}`,
          },
        ]);
      } else {
        setAssistantMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
      }
    } catch (error: any) {
      const fallback = generateAssistantReply(prompt, currentTime, weather, nextFlight, safeWindow);
      setAssistantMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `AI request failed. Using fallback response.\n\n${fallback}` },
      ]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const fetchWeather = async () => {
    const now = new Date();
    try {
      const response = await fetch(`/api/weather?station=${selectedAirport}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Weather fetch failed.');
      }

      const data = payload.data;
      const enriched = getDispatchReady(data, now);
      setWeather(enriched);
      setWeatherSource(`${selectedAirport} METAR`);
      setWeatherMessage({ type: 'success', text: `Live METAR loaded for ${selectedAirport}.` });
    } catch (error) {
      console.error('Weather load failed', error);
      setWeather(getLiveWeather(now));
      setWeatherSource('SIMULATED');
      setWeatherMessage({ type: 'error', text: 'Live METAR unavailable; using fallback weather.' });
    }
  };

  const loadFlightRows = async () => {
    if (!session || !profile) return;

    try {
      const response = await fetch('/api/flights', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        console.error('Supabase API load failed', payload?.error);
        const missingTable = payload?.error?.includes('Could not find the table');
        const message = missingTable
          ? 'No Supabase flights table found. Run `npm run supabase:init` or create `public.flights` in the Supabase SQL editor.'
          : payload?.error || 'Unable to load Supabase flight records.';
        setFlightMessage({ type: 'error', text: message });
        return;
      }

      setDbRows(payload.data ?? []);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setFlightMessage({ type: 'success', text: 'Live flight data updated.' });
    } catch (error) {
      console.error('Flight load failed', error);
      setFlightMessage({ type: 'error', text: 'Unable to load flight records.' });
    }
  };

  const handleSignIn = async () => {
    if (!signInEmail.includes('@')) {
      setSignInMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }

    setSignInMessage({ type: 'info', text: 'Sending magic link...' });
    const { error } = await supabase.auth.signInWithOtp({
      email: signInEmail,
      options: { emailRedirectTo: `${window.location.origin}` },
    });

    if (error) {
      setSignInMessage({ type: 'error', text: error.message });
    } else {
      setSignInMessage({ type: 'success', text: 'Magic link sent to your email.' });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setDbRows([]);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name || !profileForm.school || !profileForm.start_date) {
      setFormMessage({ type: 'error', text: 'Name, school and start date are required.' });
      return;
    }

    setProfileLoading(true);
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Profile save failed.');
      }
      setProfile(payload.data);
      setFormMessage({ type: 'success', text: 'Profile saved successfully.' });
    } catch (error: any) {
      setFormMessage({ type: 'error', text: error.message });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    setProfileLoading(true);

    fetch('/api/profiles', {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    })
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.data) {
          setProfile(payload.data);
          setProfileForm((prev) => ({
            ...prev,
            name: payload.data.name ?? prev.name,
            role: payload.data.role ?? prev.role,
            school: payload.data.school ?? prev.school,
            instructor_id: payload.data.instructor_id ?? prev.instructor_id,
            phone: payload.data.phone ?? prev.phone,
            start_date: payload.data.start_date ?? prev.start_date,
          }));
        }
      })
      .catch((error) => {
        console.error('Profile load failed', error);
      })
      .finally(() => setProfileLoading(false));
  }, [session]);

  useEffect(() => {
    if (!profile) return;
    loadFlightRows();
    fetchWeather();

    const syncInterval = setInterval(() => {
      loadFlightRows();
      fetchWeather();
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [profile, selectedAirport]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextFlightTarget = getNextFlightCountdown(currentTime);
  const countdown = formatCountdown(nextFlightTarget.getTime() - currentTime.getTime());
  const weatherHeading = weather.isSafeForSolo ? 'Go For Flight' : 'Stay Grounded';

  const groundSchoolModules = kcaaModules;

  const flights = [
    { date: 'Apr 10, 2026', type: 'Cessna 172', reg: '5Y-KQA', inst: 'Capt. Sarah Mitchell', dur: 1.5, night: 0, instr: 0.5, xc: 0 },
    { date: 'Apr 08, 2026', type: 'Piper PA-28', reg: '5Y-BWE', inst: 'Capt. James Wilson', dur: 2.3, night: 1.0, instr: 0, xc: 2.3 },
    { date: 'Apr 05, 2026', type: 'Cessna 172', reg: '5Y-KQA', inst: 'Solo', dur: 1.2, night: 0, instr: 0, xc: 0 },
    { date: 'Apr 02, 2026', type: 'Cessna 172', reg: '5Y-CFK', inst: 'Capt. Sarah Mitchell', dur: 1.8, night: 0, instr: 1.2, xc: 0 },
  ];

  const totalHrs = flights.reduce((sum, f) => sum + f.dur, 0);

  if (!session) {
    return (
      <div className="relative min-h-screen bg-[#020408] text-slate-200 flex items-center justify-center p-6">
        <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/90 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">SkyTrack Login</h1>
            <p className="mt-3 text-sm text-slate-400">Secure student and instructor access for Kenyan flight schools.</p>
          </div>
          <div className="space-y-4">
            <label className="block text-slate-300 text-sm uppercase tracking-widest">School Email</label>
            <input
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              placeholder="pilot@flightacademy.co.ke"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/70"
            />
            <Button className="w-full justify-center" onClick={handleSignIn}>
              Send Magic Link
            </Button>
            {signInMessage.text && (
              <p className={`text-sm ${signInMessage.type === 'error' ? 'text-rose-400' : signInMessage.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>{signInMessage.text}</p>
            )}
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Use your school email to access the student or instructor dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (session && !profile && !profileLoading) {
    return (
      <div className="relative min-h-screen bg-[#020408] text-slate-200 flex items-center justify-center p-6">
        <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/90 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">SkyTrack Onboarding</h1>
            <p className="mt-3 text-sm text-slate-400">Complete your profile to unlock your student or instructor dashboard.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: 'Full name', key: 'name' },
              { label: 'School', key: 'school' },
              { label: 'Instructor ID', key: 'instructor_id', placeholder: 'Optional for instructors' },
              { label: 'Phone', key: 'phone', placeholder: 'WhatsApp number' },
              { label: 'Start date', key: 'start_date', type: 'date' },
            ].map((field) => (
              <label key={field.key} className="block text-[10px] uppercase tracking-widest text-slate-400">
                <span className="text-slate-300 font-black">{field.label}</span>
                <input
                  type={field.type || 'text'}
                  value={(profileForm as any)[field.key]}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder ?? field.label}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/70"
                />
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Button className="px-8 py-3" onClick={handleSaveProfile}>
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </Button>
            <button
              type="button"
              className="text-[10px] uppercase tracking-wider text-slate-300 font-black px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
          {formMessage.text && (
            <p className={`mt-4 text-sm ${formMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{formMessage.text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020408] text-slate-200">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-25 grayscale scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-tr from-black via-black/95 to-blue-950/20" />

      <div className="fixed top-6 right-8 z-[100]">
        <Button
          onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
          className="bg-blue-600/20 hover:bg-blue-600/40 backdrop-blur-md border border-blue-500/50 text-white px-4 py-2 rounded-xl shadow-lg transition-all"
        >
          {lang === 'en' ? '🇫🇷 Français' : '🇬🇧 English'}
        </Button>
      </div>        {/* SIDEBAR */}
      <aside className="w-72 bg-black/60 border-r border-white/5 flex flex-col h-screen sticky top-0 backdrop-blur-xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/40 -rotate-2"><Plane size={24} className="text-white" /></div>
            <span className="text-2xl font-black tracking-tighter text-white italic">SKYTRACK<span className="text-blue-500">.</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Command Deck', icon: LayoutDashboard },
            { id: 'hours', label: 'Tech Logbook', icon: Clock },
            { id: 'ground', label: 'Ground School', icon: BookOpen },
            { id: 'compliance', label: 'KCAA Audit', icon: ShieldCheck },
            ...(profile?.role === 'instructor' ? [
              { id: 'students', label: 'Student Roster', icon: GraduationCap },
              { id: 'instructor', label: 'Instructor Desk', icon: FileCheck },
            ] : []),
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={18} strokeWidth={3} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 bg-blue-600/5 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-xl">{studentName.slice(0, 2).toUpperCase()}</div>
            <div>
              <p className="text-sm font-black text-white">{studentName}</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">{profile?.role === 'instructor' ? 'Instructor' : 'PPL Candidate'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-12 overflow-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color="green">{selectedAirportLabel} Ops ({selectedAirport})</Badge>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">April 11, 2026 • 20:01 EAT</div>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">
              {view === 'dashboard' && (lang === 'en' ? "The Deck" : "Le Pont")}
              {view === 'hours' && (lang === 'en' ? "Certified Log" : "Registre Certifié")}
              {view === 'ground' && (lang === 'en' ? "Ground Matrix" : "Matrice de Sol")}
              {view === 'compliance' && (lang === 'en' ? "KCAA Audit Status" : "Statut d'Audit KCAA")}
            </h1>

            <div className="mt-3 text-slate-400 text-sm uppercase tracking-widest">              <div>Local time: {formatDigitalTime(currentTime)}</div>
              <div className="mt-1 text-[10px] text-slate-500">Next flight countdown: {countdown}</div>
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                <label className="text-[10px] uppercase tracking-widest text-slate-500">Airport</label>
                <select
                  value={selectedAirport}
                  onChange={(event) => setSelectedAirport(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none"
                >
                  {AIRPORTS.map((airport) => (
                    <option key={airport.code} value={airport.code}>{airport.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <Button className="px-10 py-4" onClick={() => {
            setShowNewEntryForm((open) => !open);
            setFormMessage({ type: '', text: '' });
          }}>
            <Plus size={20} /> {showNewEntryForm ? 'Close Form' : 'New Entry'}
          </Button>
        </header>

        {showNewEntryForm && (
          <Card className="mb-10 border border-blue-500/20 bg-slate-950/90">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Create New Flight Entry</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Saves a new row to the Supabase `flights` table.</p>
              </div>
              <Badge color="blue">Draft</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {[
                { label: 'Date', key: 'date', placeholder: 'Apr 12, 2026' },
                { label: 'Aircraft', key: 'type', placeholder: 'Cessna 172' },
                { label: 'Reg', key: 'reg', placeholder: '5Y-KQA' },
                { label: 'Instructor', key: 'instructor', placeholder: 'Capt. Name' },
                { label: 'Duration', key: 'dur', placeholder: '1.5' },
              ].map((field) => (
                <label key={field.key} className="block text-[10px] uppercase tracking-widest text-slate-400">
                  <span className="text-slate-300 font-black">{field.label}</span>
                  <input
                    value={(entryForm as any)[field.key]}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/70"
                  />
                </label>
              ))}
            </div>

            {formMessage.text && (
              <p className={`mt-4 text-sm ${formMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{formMessage.text}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 items-center">
              <Button
                className="px-8 py-3"
                onClick={async () => {
                  const requiredFields = ['date', 'type', 'reg', 'instructor', 'dur'];
                  const missing = requiredFields.filter((key) => !(entryForm as any)[key]);
                  if (missing.length) {
                    setFormMessage({ type: 'error', text: 'Please fill all fields before saving.' });
                    return;
                  }

                  const newRow = {
                    date: entryForm.date,
                    type: entryForm.type,
                    reg: entryForm.reg,
                    instructor: entryForm.instructor,
                    dur: entryForm.dur,
                  };

                  setIsSubmitting(true);
                  try {
                    const response = await fetch('/api/flights', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newRow),
                    });
                    const result = await response.json();

                    if (!response.ok) {
                      setFormMessage({ type: 'error', text: result?.error || 'Unable to save entry.' });
                      return;
                    }

                    setFormMessage({ type: 'success', text: 'New entry saved successfully.' });
                    setEntryForm({ date: '', type: '', reg: '', instructor: '', dur: '' });
                    await loadFlightRows();
                  } catch (error) {
                    console.error('Save failed', error);
                    setFormMessage({ type: 'error', text: 'Unable to save entry.' });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </Button>
              <button
                type="button"
                className="text-[10px] uppercase tracking-wider text-slate-300 font-black px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => {
                  setShowNewEntryForm(false);
                  setFormMessage({ type: '', text: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </Card>
        )}

        {/* VIEW: DASHBOARD (Includes Live Dispatch & Weather) */}
        {view === 'dashboard' && (
          <div className="space-y-8">
            {/* DISPATCH CENTER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className={`border-l-8 ${weather.isSafeForSolo ? 'border-emerald-500' : 'border-rose-500'} bg-black/80`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Smart Dispatch Logic</h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Wilson (HKNW) live readiness</p>
                  </div>
                  <Badge color={weather.isSafeForSolo ? 'green' : 'amber'}>{weather.isDay ? 'Day Ops' : 'Night Ops'}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${weather.isSafeForSolo ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {weather.isSafeForSolo ? <UserCheck size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white uppercase italic">{weather.isSafeForSolo ? "Go For Flight" : "Stay Grounded"}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{weather.reason}</p>
                    {!weather.isSafeForSolo && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest">Predicted safe window: {safeWindowLabel}</p>
                        <p className="text-[10px] text-rose-300 uppercase tracking-widest">Reason: {weather.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2 bg-slate-950/80 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Supabase Flights</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Live data from your connected database</p>
                    <p className="mt-1 text-[9px] text-slate-500">{dbRows.length > 0 ? `${dbRows.length} records synced` : 'No rows found yet. Add a new flight entry.'}</p>
                    <p className="mt-1 text-[9px] text-slate-500">Last sync: {lastSync || 'waiting...'}</p>
                    {flightMessage.text && (
                      <p className={`mt-1 text-[9px] ${flightMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{flightMessage.text}</p>
                    )}
                  </div>
                  <Badge color={dbRows.length > 0 ? 'green' : 'amber'}>{dbRows.length > 0 ? 'Connected' : 'No Data'}</Badge>
                </div>

                {dbRows.length > 0 ? (
                  <div className="overflow-auto rounded-3xl border border-white/5 bg-black/70">
                    <table className="min-w-full text-left text-[10px] text-slate-300">
                      <thead className="border-b border-white/10 bg-white/5 text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Aircraft</th>
                          <th className="px-4 py-3">Reg</th>
                          <th className="px-4 py-3">Instructor</th>
                          <th className="px-4 py-3">Dur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flightTableRows.map((row, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                            <td className="px-4 py-3">{row.date}</td>
                            <td className="px-4 py-3">{row.type}</td>
                            <td className="px-4 py-3">{row.reg}</td>
                            <td className="px-4 py-3">{row.instructor}</td>
                            <td className="px-4 py-3">{row.dur}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-9 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">No Supabase rows loaded yet (or table is empty).</p>
                  </div>
                )}
              </Card>

              <Card className="md:col-span-2 bg-slate-950/80 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Training Schedule</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Next scheduled slot and live countdown</p>
                    <p className="mt-1 text-[9px] text-slate-500">Next slot: {nextFlight.time} · {nextFlight.type}</p>
                    <p className="mt-1 text-[9px] text-slate-500">Arrives in: {nextFlightCountdown}</p>
                  </div>
                  <Badge color={nextFlightCountdown.startsWith('00h') ? 'green' : 'blue'}>{nextFlight.label}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {scheduleWithDates.slice(0, 4).map((slot) => (
                    <div key={slot.time} className="rounded-3xl bg-white/5 p-4 border border-white/10">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">{slot.label}</p>
                      <p className="mt-2 text-sm font-black text-white">{slot.time}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{slot.type}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="md:col-span-2 bg-blue-950/80 border border-blue-500/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">SkyTrack 2050 AI Ops</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Predictive aviation operations and risk mitigation</p>
                  </div>
                  <Badge color="purple">FUTURE READY</Badge>
                </div>
                <div className="space-y-3">
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Optimal launch window</p>
                    <p className="mt-2 text-sm font-black text-white">{safeWindowLabel}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Student readiness</p>
                    <p className="mt-2 text-sm font-black text-white">{weather.isSafeForSolo ? 'Ready for student solo ops' : 'Hold until conditions improve'}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Issue coverage</p>
                    <ul className="mt-2 list-disc list-inside text-[10px] text-slate-300">
                      <li>Weather automation</li>
                      <li>Next-slot planning</li>
                      <li>Live log sync</li>
                      <li>Compliance-ready status</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2 bg-slate-950/90 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">SkyTrack Assistant</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Smart aviation chatbot for safety, schedule, and weather questions</p>
                  </div>
                  <Badge color="blue">AI</Badge>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {assistantMessages.map((msg, index) => (
                    <div key={index} className={`rounded-3xl p-4 ${msg.role === 'assistant' ? 'bg-blue-500/10 border border-blue-500/10' : 'bg-white/5 border border-white/10'} ${msg.role === 'assistant' ? 'ml-0' : 'ml-6'}`}>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{msg.role === 'assistant' ? 'SkyTrack' : 'You'}</p>
                      <p className="text-sm text-slate-200">{msg.content}</p>
                    </div>
                  ))}
                  {isAssistantTyping && (
                    <div className="rounded-3xl p-4 bg-blue-500/10 border border-blue-500/10">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">SkyTrack</p>
                      <p className="text-sm text-slate-200">Thinking...</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleAssistantSubmit()}
                    placeholder="Ask about safety, weather or the next flight"
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/70"
                  />
                  <button
                    type="button"
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-[10px] uppercase tracking-widest font-black text-white hover:bg-blue-700"
                    onClick={handleAssistantSubmit}
                  >
                    Send
                  </button>
                </div>
              </Card>

              <Card className="md:col-span-2 grid grid-cols-4 gap-4">
                <div className="md:col-span-4 rounded-3xl border border-white/10 bg-white/5 p-4 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Weather source</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-white uppercase">{weatherSource}</span>
                    <span className={`text-[10px] ${weatherMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{weatherMessage.text || 'Updated every 15s'}</span>
                  </div>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Wind size={12} /> Winds</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.wind}</p>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Eye size={12} /> Visibility</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.visibility}</p>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><CloudSun size={12} /> Sky</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.condition}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Thermometer size={12} /> Temp</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.temp}°C</p>
                </div>
              </Card>
            </div>

            {/* TRAINING PROGRESS (Gauges) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {[
                { l: "Total Hours", v: 13.3, m: 40, r: "26.7 hrs rem." },
                { l: "Solo Hours", v: 4.7, m: 10, r: "5.3 hrs rem." },
                { l: "Night Flying", v: 1.0, m: 5, r: "4.0 hrs rem." },
                { l: "Instrument", v: 1.7, m: 3, r: "1.3 hrs rem." },
                { l: "Cross-Country", v: 5.8, m: 5, r: "Met", ok: true },
                { l: "Dual Inst.", v: 8.6, m: 20, r: "11.4 hrs rem." },
              ].map(g => (
                <div key={g.l} className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center group hover:border-blue-500/30 transition-all">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-3">{g.l}</p>
                  <div className="text-2xl font-black text-white italic">{g.v}<span className="text-[10px] text-slate-600 ml-1">/{g.m}</span></div>
                  <div className="mt-3 h-1 w-full bg-slate-900 rounded-full"><div className={`h-full ${g.ok ? 'bg-emerald-500' : 'bg-blue-600'} rounded-full`} style={{ width: `${(g.v / g.m) * 100}%` }} /></div>
                  <p className={`text-[8px] font-bold mt-3 uppercase ${g.ok ? 'text-emerald-500' : 'text-slate-500'}`}>{g.r}</p>
                </div>
              ))}
            </div>

            {/* ACTION REQUIRED & COMPLETED */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-t-4 border-t-rose-500">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter mb-6">{t.compliance}</h3>
                <div className="space-y-4">
                  {[
                    { l: "Solo Flight Time", n: "1.5 hrs needed", p: "8.5 / 10h" },
                    { l: "Night Flying", n: "4.0 hrs needed", p: "1.0 / 5h" },
                    { l: "Cross-Country (Solo)", n: "1.5 hrs needed", p: "3.5 / 5h" },
                    { l: "Instrument Training", n: "1.3 hrs needed", p: "1.7 / 3h" },
                  ].map(a => (
                    <div key={a.l} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                      <div><p className="text-sm font-black text-white uppercase italic">{a.l}</p><p className="text-[10px] text-rose-400 font-bold uppercase mt-1 italic">{a.n}</p></div>
                      <p className="font-black text-slate-500">{a.p}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-t-4 border-t-emerald-500">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter mb-6">Completed Requirements</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                    <div><p className="text-sm font-black text-white uppercase italic">{t.totalHours}</p><p className="text-[10px] text-emerald-500 font-black uppercase mt-1">45.0 / 40h</p></div>
                    <Badge color="green">Complete</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                    <div><p className="text-sm font-black text-white uppercase italic">Dual Instruction</p><p className="text-[10px] text-emerald-500 font-black uppercase mt-1">25.3 / 20h</p></div>
                    <Badge color="green">Complete</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* VIEW: COMPLIANCE (KCAA Audit) */}
        {view === 'compliance' && (
          <Card>
            <h3 className="text-2xl font-black text-white uppercase italic mb-8">KCAA Official Audit Status</h3>
            <div className="grid gap-6">
              {[
                { label: "PPL Training Syllabus (Phase 1-4)", progress: 65, status: "Ongoing" },
                { label: "Night Flight Rating Requirement", progress: 20, status: "Underway" },
                { label: "Cross-Country Proficiency (150nm Solo)", progress: 100, status: "Verified" },
                { label: "Instrument Awareness Training", progress: 56, status: "Ongoing" },
                { label: "Radio Operations Certificate", progress: 100, status: "Licensed" },
                { label: "Class 2 Medical Certification", progress: 100, status: "Valid until 2027" }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="w-2/3">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-black text-white uppercase italic tracking-tighter">{item.label}</p>
                      <Badge color={item.progress === 100 ? "green" : "blue"}>{item.status}</Badge>
                    </div>
                    <Progress val={item.progress} max={100} />
                  </div>
                  <div className="text-2xl font-black text-white italic">{item.progress}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* VIEW: GROUND SCHOOL MATRIX */}
        {view === 'ground' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="md:col-span-2">
              <h3 className="text-2xl font-black text-white uppercase italic mb-8">Syllabus Completion Matrix</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groundSchoolModules.map(m => (
                  <div key={m.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-blue-600/10 transition-all">
                    <p className="text-xs font-black text-slate-300 uppercase italic tracking-tighter">{m.name}</p>
                    <div className="text-right">
                      {m.score > 0 ? (
                        <span className="text-lg font-black text-emerald-400">{m.score}%</span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 uppercase italic">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: TECHNICAL LOGBOOK (WITH TOTAL) */}
        {view === 'hours' && (
          <Card>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <h3 className="text-2xl font-black text-white uppercase italic underline underline-offset-8 decoration-blue-500">Certified Technical Log</h3>
              <Button onClick={() => downloadLogbookCsv(profile, dbRows)} className="bg-emerald-500 hover:bg-emerald-600">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11zm4 2.5a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75V11h1.25a.75.75 0 010 1.5H8.5V8.5z" clipRule="evenodd" />
                </svg>
                Export Logbook CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                    <th className="pb-6">Date</th><th className="pb-6">Aircraft</th><th className="pb-6">Reg</th><th className="pb-6">Instructor</th><th className="pb-6">Night</th><th className="pb-6 text-right">Block Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-sm">
                  {flights.map((f, i) => (
                    <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-6 font-black text-white italic">{f.date}</td>
                      <td className="py-6 text-slate-400">{f.type}</td>
                      <td className="py-6"><Badge>{f.reg}</Badge></td>
                      <td className="py-6 text-slate-500 italic">{f.inst}</td>
                      <td className="py-6 text-indigo-400 font-bold">{f.night}h</td>
                      <td className="py-6 text-right font-black text-blue-500 text-lg italic">{f.dur}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-600/10 border-t-2 border-blue-500">
                    <td colSpan={5} className="py-8 pl-8 text-2xl font-black text-white uppercase italic tracking-tighter">Grand Total Flight Hours</td>
                    <td className="py-8 pr-8 text-right text-4xl font-black text-blue-500 italic underline decoration-white/20">{totalHrs.toFixed(1)}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}