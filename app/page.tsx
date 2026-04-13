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
  Sun, Moon, Users, User
} from 'lucide-react'

// =============================================================================
// UI ATOMS
// =============================================================================
const Button = ({ children, className, type = 'button', disabled, ...props }: any) => <button type={type} disabled={disabled} className={`relative z-50 pointer-events-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-black flex items-center gap-2 uppercase tracking-tighter ${disabled ? 'opacity-40 cursor-not-allowed bg-blue-500' : 'hover:bg-blue-700 active:scale-95'} ${className}`} {...props}>{children}</button>;
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

const airports = [
  { code: 'HKNW', name: 'Wilson', lang: 'en' },
  { code: 'GOOY', name: 'Dakar', lang: 'fr' },
  { code: 'FKKD', name: 'Douala', lang: 'fr' },
  { code: 'HUEN', name: 'Entebbe', lang: 'en' },
  { code: 'HRYR', name: 'Kigali', lang: 'fr' },
];

const weatherPresets = [
  { condition: 'weatherConditionClearSkies', temp: 24, wind: '040/08KT', gusts: 10, visibility: '10km' },
  { condition: 'weatherConditionScatteredClouds', temp: 22, wind: '050/12KT', gusts: 14, visibility: '9km' },
  { condition: 'weatherConditionBrokenClouds', temp: 20, wind: '030/16KT', gusts: 18, visibility: '8km' },
  { condition: 'weatherConditionLightShowers', temp: 19, wind: '060/14KT', gusts: 16, visibility: '7km' },
  { condition: 'weatherConditionOvercast', temp: 18, wind: '020/10KT', gusts: 12, visibility: '6km' },
];

const getLiveWeather = (date: Date, t: any = translations.en) => {
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
  const conditionKey = base.condition;
  const conditionLabel = t[conditionKey] ?? base.condition;
  const isSafeForSolo = isDay && windSpeed <= 15 && gusts <= 15 && !conditionKey.toLowerCase().includes('storm');
  const reason = !isDay
    ? t.weatherAfterHoursOpsLimited
    : isSafeForSolo
      ? t.weatherSafeStudentSoloConditions
      : t.weatherWindsGustsExceededWait;

  return {
    ...base,
    condition: conditionKey,
    conditionLabel,
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

const translateWeatherCondition = (condition: string, t: any) => {
  const map: Record<string, string> = {
    'Clear Skies': 'weatherConditionClearSkies',
    'Few Clouds': 'weatherConditionFewClouds',
    'Scattered Clouds': 'weatherConditionScatteredClouds',
    'Broken Clouds': 'weatherConditionBrokenClouds',
    Overcast: 'weatherConditionOvercast',
    'Light Showers': 'weatherConditionLightShowers',
    'Rain Showers': 'weatherConditionRainShowers',
    Thunderstorms: 'weatherConditionThunderstorms',
    Snow: 'weatherConditionSnow',
    Fog: 'weatherConditionFog',
    Mist: 'weatherConditionMist',
    Hazardous: 'weatherConditionHazardous',
  };
  const key = map[condition] ?? '';
  return key ? t[key] ?? condition : condition;
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

const formatRelativeTime = (target: Date, now: Date, t: any = translations.en) => {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return t.nowLabel;
  return formatCountdown(diff);
};

const generateFlightLogbookCsv = (profile: any, rows: any[], t: any = translations.en) => {
  const headers = [
    t.studentLabel,
    t.schoolLabel,
    t.instructorLabel,
    t.startDateLabel,
    '',
    t.requirementLabel,
    t.valueLabel,
    '',
    t.flightDateLabel,
    t.typeLabel,
    t.registrationLabel,
    t.instructorLabel,
    t.durationLabel,
  ];
  const requirementRows = [
    [t.totalHoursRequired, `${kcaaRequirements.totalHours}`],
    [t.soloMinimum, `${kcaaRequirements.soloHours}`],
    [t.nightMinimum, `${kcaaRequirements.nightHours}`],
    [t.crossCountryMinimum, `${kcaaRequirements.crossCountryHours}`],
    [t.dualInstructionMinimum, `${kcaaRequirements.dualInstructionHours}`],
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

const downloadLogbookCsv = (profile: any, rows: any[], t: any) => {
  const csv = generateFlightLogbookCsv(profile, rows, t);
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

const generateAssistantReply = (input: string, now: Date, weather: any, nextFlight: any, safeWindow: Date, lang: 'en' | 'fr' = 'en', t: any = translations.en) => {
  const normalized = input.trim().toLowerCase();
  const safetyMessage = weather.isSafeForSolo
    ? t.safeForSolo
    : `${t.notSafeForSolo} ${weather.reason.toLowerCase()}`;
  const windowMessage = `${t.nextSafeWindow} ${safeWindow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}, ${t.whichIs} ${formatRelativeTime(safeWindow, now, t)}.`;

  if (normalized.includes('safe') || normalized.includes('student') || normalized.includes('fly') || normalized.includes('sécurité') || normalized.includes('étudiant') || normalized.includes('voler')) {
    return `${safetyMessage} ${windowMessage}`;
  }

  if (normalized.includes('weather') || normalized.includes('metar') || normalized.includes('hknw') || normalized.includes('météo')) {
    const conditionLabel = weather.conditionLabel ?? translateWeatherCondition(weather.condition, t) ?? weather.condition;
    return `${t.currentMETAR} ${conditionLabel}, ${weather.wind}, gusts ${weather.gusts}KT, ${t.visibilityWord} ${weather.visibility}, ${t.temperatureWord} ${weather.temp}°C.`;
  }

  if (normalized.includes('next') || normalized.includes('schedule') || normalized.includes('slot') || normalized.includes('prochain') || normalized.includes('horaire')) {
    return `${t.nextScheduledSlot} ${nextFlight.label} ${t.atWord} ${nextFlight.time} ${t.forWord} ${nextFlight.type}. ${windowMessage}`;
  }

  if (normalized.includes('why') || normalized.includes('pourquoi')) {
    return `${t.reasonLabel}: ${weather.reason}. ${windowMessage}`;
  }

  return `${t.skytrackRecommends} ${safetyMessage} ${nextFlight.label} ${t.isNextTrainingSlotAt} ${nextFlight.time}.`;
};

// =============================================================================
// DATA & LOGIC
// =============================================================================
export default function SkyTrackApex() {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const isDark = theme === 'dark';
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
    { role: 'assistant', content: translations[lang].assistantIntro }
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

  const [weather, setWeather] = useState(getLiveWeather(new Date(0), translations.en));
  const [weatherSource, setWeatherSource] = useState('SIMULATED');

  const assistantMessagesForDisplay = assistantMessages.length === 1 && assistantMessages[0].role === 'assistant'
    ? [{ ...assistantMessages[0], content: translations[lang].assistantIntro }]
    : assistantMessages;

  useEffect(() => {
    setWeather((prev) => {
      const conditionLabel = t[prev.condition] ?? prev.conditionLabel ?? prev.condition;
      const reason = !prev.isDay
        ? t.weatherAfterHoursOpsLimited
        : prev.isSafeForSolo
          ? t.weatherSafeStudentSoloConditions
          : t.weatherWindsGustsExceededWait;
      return { ...prev, conditionLabel, reason };
    });
  }, [lang]);

  const [selectedAirport, setSelectedAirport] = useState('HKNW');
  const selectedAirportData = airports.find((airport) => airport.code === selectedAirport);
  const selectedAirportName = selectedAirportData?.name ?? selectedAirport;
  const currentDateLabel = currentTime.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'long', day: 'numeric', year: 'numeric' });
  const currentTimeLabel = currentTime.toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
  const [lastSync, setLastSync] = useState('');
  const studentName = profile?.name ?? session?.user?.email ?? t.defaultPilotName;
  const flightSchedule = [
    { label: t.earlyTraining, time: '06:30', type: t.dualInstructionType },
    { label: t.crossCountry, time: '08:00', type: t.navigationPrep },
    { label: t.soloPattern, time: '10:30', type: t.patternWork },
    { label: t.briefing, time: '13:00', type: t.weatherNav },
    { label: t.nightOps, time: '16:30', type: t.approachPractice },
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
  const safeWindowLabel = weather.isSafeForSolo ? t.nowLabel : `${safeWindow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${formatRelativeTime(safeWindow, currentTime, t)})`;

  const getDispatchReady = (baseWeather: any, now: Date, t: any = translations.en) => {
    const windSpeed = parseInt(baseWeather.wind.match(/\/(\d{2,3})KT/)?.[1] ?? '0', 10);
    const gusts = parseInt(baseWeather.wind.match(/G(\d{2,3})KT/)?.[1] ?? String(baseWeather.gusts ?? windSpeed), 10);
    const isDay = now.getHours() >= 6 && now.getHours() < 18;
    const isSafeForSolo = isDay && windSpeed <= 15 && gusts <= 15 && !/storm|thunder|tstm/i.test(baseWeather.condition);
    const reason = !isDay
      ? t.weatherNightOperationsRestricted
      : isSafeForSolo
        ? t.weatherSafeStudentSoloConditions
        : t.weatherWindsGustsExceededWait;

    return {
      ...baseWeather,
      isDay,
      isSafeForSolo,
      reason,
      conditionLabel: translateWeatherCondition(baseWeather.condition, t),
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
          lang,
        }),
      });

      const payload = await response.json();
      const aiReply = payload.reply ?? payload.answer ?? generateAssistantReply(prompt, currentTime, weather, nextFlight, safeWindow, lang, t);

      if (!response.ok) {
        setAssistantMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `${t.aiUnavailable} ${payload.error || t.usingSideEffects}\n\n${aiReply}`,
          },
        ]);
      } else {
        setAssistantMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
      }
    } catch (error: any) {
      const fallback = generateAssistantReply(prompt, currentTime, weather, nextFlight, safeWindow, lang, t);
      setAssistantMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${t.requestFailed}\n\n${fallback}` },
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
      const enriched = getDispatchReady(data, now, t);
      setWeather(enriched);
      setWeatherSource(`${selectedAirport} METAR`);
      setWeatherMessage({ type: 'success', text: t.liveMetarLoaded.replace('{station}', selectedAirport) });
    } catch (error) {
      console.error('Weather load failed', error);
      setWeather(getLiveWeather(now, t));
      setWeatherSource('SIMULATED');
      setWeatherMessage({ type: 'error', text: t.liveMetarFallback });
    }
  };

  const loadFlightRows = async () => {
    //if (!session || !profile) return;

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
    fetchWeather();
    if (profile) {
      loadFlightRows();
    }

    const syncInterval = setInterval(() => {
      if (profile) {
        loadFlightRows();
      }
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
  const weatherHeading = weather.isSafeForSolo ? t.goForFlight : t.stayGrounded;

  const groundSchoolModuleLabels: Record<string, string> = {
    'Air Law / Aviation Regulations': t.airLawAviationRegulations,
    'Aircraft General Knowledge': t.aircraftGeneralKnowledge,
    Meteorology: t.meteorology,
    'General Navigation': t.generalNavigation,
    'Operational Procedures': t.operationalProcedures,
    'Human Performance and Limitations': t.humanPerformanceLimitations,
    'Flight Planning and Monitoring': t.flightPlanningMonitoring,
    'Principles of Flight': t.principlesOfFlight,
  };

  const groundSchoolModules = kcaaModules.map((module) => {
    const moduleName = groundSchoolModuleLabels[module.name] ?? module.name;
    const score = module.score ?? 0;
    const status = score >= 100 ? t.statusCompleted : score >= 75 ? t.statusExamReady : t.statusInProgress;
    const badgeColor = score >= 100 ? 'green' : score >= 75 ? 'blue' : 'amber';
    const coreTheoryModules = [
      'Air Law / Aviation Regulations', 'Meteorology', 'General Navigation',
      'Human Performance and Limitations', 'Principles of Flight'
    ];
    const category = coreTheoryModules.includes(module.name) ? 'coreTheory' : 'technicalKnowledge';

    return {
      ...module,
      name: moduleName,
      score,
      status,
      badgeColor,
      category,
    };
  });

  const groundSchoolCategories = [
    {
      title: t.coreTheory,
      modules: groundSchoolModules.filter((m) => m.category === 'coreTheory'),
    },
    {
      title: t.technicalKnowledge,
      modules: groundSchoolModules.filter((m) => m.category === 'technicalKnowledge'),
    },
  ];

  const flights = [
    { date: '2026-04-10', type: 'Cessna 172', reg: '5Y-KQA', inst: 'Capt. Sarah Mitchell', dur: 1.5, night: 0, instr: 0.5, xc: 0 },
    { date: '2026-04-08', type: 'Piper PA-28', reg: '5Y-BWE', inst: 'Capt. James Wilson', dur: 2.3, night: 1.0, instr: 0, xc: 2.3 },
    { date: '2026-04-05', type: 'Cessna 172', reg: '5Y-KQA', inst: 'Solo', dur: 1.2, night: 0, instr: 0, xc: 0 },
    { date: '2026-04-02', type: 'Cessna 172', reg: '5Y-CFK', inst: 'Capt. Sarah Mitchell', dur: 1.8, night: 0, instr: 1.2, xc: 0 },
  ];

  const totalHrs = flights.reduce((sum, f) => sum + f.dur, 0);
  const formatFlightDate = (flightDate: string) => new Date(flightDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!session) {
    return (
      <div className="relative min-h-screen bg-[#020408] text-slate-200 flex items-center justify-center p-6">
        <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/90 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{t.signInTitle}</h1>
            <p className="mt-3 text-sm text-slate-400">{t.signInDescription}</p>
          </div>
          <div className="space-y-4">
            <label className="block text-slate-300 text-sm uppercase tracking-widest">{t.schoolEmailLabel}</label>
            <input
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/70"
            />
            <Button className="w-full justify-center" onClick={handleSignIn}>
              {t.sendMagicLink}
            </Button>
            {signInMessage.text && (
              <p className={`text-sm ${signInMessage.type === 'error' ? 'text-rose-400' : signInMessage.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>{signInMessage.text}</p>
            )}
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t.signInInstruction}</p>
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
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{t.onboardingTitle}</h1>
            <p className="mt-3 text-sm text-slate-400">{t.onboardingDescription}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: t.fullNameLabel, key: 'name' },
              { label: t.schoolLabel, key: 'school' },
              { label: t.instructorIdLabel, key: 'instructor_id', placeholder: t.optionalForInstructors },
              { label: t.phoneLabel, key: 'phone', placeholder: t.whatsappPlaceholder },
              { label: t.startDateLabel, key: 'start_date', type: 'date' },
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
              {profileLoading ? t.saving : t.saveProfile}
            </Button>
            <button
              type="button"
              className="text-[10px] uppercase tracking-wider text-slate-300 font-black px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={handleSignOut}
            >
              {t.signOut}
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
    <div className={`relative min-h-screen ${isDark ? 'bg-[#020408] text-slate-200' : 'bg-slate-100 text-slate-950'} flex`}>
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-25 grayscale scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')" }} />
      <div className={`fixed inset-0 z-0 bg-gradient-to-tr ${isDark ? 'from-black via-black/95 to-blue-950/20' : 'from-white via-slate-100/80 to-slate-200/60'}`} />

      <div className="fixed top-6 right-8 z-[100] flex items-center gap-3 flex items-center gap-3">
        <Button
          onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
          className="bg-blue-600/20 hover:bg-blue-600/40 backdrop-blur-md border border-blue-500/50 text-white px-4 py-2 rounded-xl shadow-lg transition-all"
        >
          {lang === 'en' ? '🇫🇷 Français' : '🇬🇧 English'}
        </Button>
        <Button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`backdrop-blur-md border rounded-xl shadow-lg transition-all px-4 py-2 ${isDark ? 'bg-slate-700/20 border-white/20 text-white hover:bg-slate-700/40' : 'bg-slate-100/90 border-slate-300/40 text-slate-950 hover:bg-slate-200/80'}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Light' : 'Dark'}
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
            { id: 'dashboard', label: t.commandDeck, icon: LayoutDashboard },
            { id: 'hours', label: t.techLogbook, icon: Clock },
            { id: 'ground', label: t.groundSchool, icon: BookOpen },
            { id: 'compliance', label: t.kcaaAudit, icon: ShieldCheck },
            ...(profile?.role === 'instructor' ? [
              { id: 'students', label: t.studentRoster, icon: GraduationCap },
              { id: 'instructor', label: t.instructorDesk, icon: FileCheck },
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
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">{profile?.role === 'instructor' ? t.instructor : t.pplCandidate}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="flex flex-col gap-6 md:flex-row justify-between items-end px-12 pt-6 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color="green">{selectedAirportName} {t.airportOps} ({selectedAirport})</Badge>
              <div className="text-[10px] font-black text-white uppercase tracking-widest">{currentDateLabel} • {currentTimeLabel} EAT</div>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">
              {view === 'dashboard' && t.commandDeck}
              {view === 'hours' && t.certifiedLog}
              {view === 'ground' && t.groundMatrix}
              {view === 'compliance' && t.kcaaAuditStatus}
            </h1>

            <div className="mt-3 text-white text-sm font-medium uppercase tracking-widest">
              <div>{t.localTime}: {formatDigitalTime(currentTime)}</div>
              <div className="mt-1 text-[10px] text-white font-medium">{t.nextFlightCountdown}: {countdown}</div>
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                <label className="text-[10px] uppercase tracking-widest text-white font-medium">{t.airportLabel}</label>
                <select
                  value={selectedAirport}
                  onChange={(event) => {
                    const selectedCode = event.target.value;
                    const airport = airports.find((airport) => airport.code === selectedCode);
                    setSelectedAirport(selectedCode);
                    if (airport) {
                      setLang(airport.lang as 'en' | 'fr');
                    }
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none"
                >
                  {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>{airport.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <Button
            className="relative z-50 pointer-events-auto px-10 py-4"
            onClick={() => {
              if (!session && !showNewEntryForm) {
                setFormMessage({ type: 'error', text: t.signInToAddEntry });
                return;
              }
              setShowNewEntryForm((open) => !open);
              setFormMessage({ type: '', text: '' });
            }}
          >
            <Plus size={20} /> {showNewEntryForm ? t.closeForm : t.newEntry}
          </Button>
        </header>

        {showNewEntryForm && (
          <Card className="mb-10 py-6 border border-slate-700/60 bg-slate-950/90 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t.createNewFlightEntryTitle}</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{t.createNewFlightEntryDetail}</p>
              </div>
              <Badge color="blue">{t.draft}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: t.flightDateLabel, key: 'date', type: 'date', placeholder: '2026-04-11' },
                { label: t.aircraftLabel, key: 'type', placeholder: 'Cessna 172' },
                { label: t.registrationLabel, key: 'reg', placeholder: '5Y-KQA' },
                { label: t.instructor, key: 'instructor', placeholder: 'Capt. Name' },
                { label: t.durationLabel, key: 'dur', placeholder: '1.5' },
              ].map((field) => (
                <label key={field.key} className="block text-[10px] uppercase tracking-widest text-slate-400">
                  <span className="text-slate-300 font-black">{field.label}</span>
                  <input
                    type={field.type || 'text'}
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
                disabled={!session || isSubmitting}
                onClick={async () => {
                  if (!session?.access_token) {
                    setFormMessage({ type: 'error', text: t.signInToAddEntry });
                    return;
                  }

                  const requiredFields = ['date', 'type', 'reg', 'instructor', 'dur'];
                  const missing = requiredFields.filter((key) => !(entryForm as any)[key]);
                  if (missing.length) {
                    setFormMessage({ type: 'error', text: t.pleaseFillAllFields });
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
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token}`,
                      },
                      body: JSON.stringify(newRow),
                    });
                    const result = await response.json();

                    if (!response.ok) {
                      setFormMessage({ type: 'error', text: result?.error || t.unableToSaveEntry });
                      return;
                    }

                    setFormMessage({ type: 'success', text: t.newEntrySaved });
                    setEntryForm({ date: '', type: '', reg: '', instructor: '', dur: '' });
                    await loadFlightRows();
                  } catch (error) {
                    console.error('Save failed', error);
                    setFormMessage({ type: 'error', text: t.unableToSaveEntry });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? t.saving : t.saveEntry}
              </Button>
              <button
                type="button"
                className="text-[10px] uppercase tracking-wider text-slate-300 font-black px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => {
                  setShowNewEntryForm(false);
                  setFormMessage({ type: '', text: '' });
                }}
              >
                {t.cancel}
              </button>
            </div>
          </Card>
        )}

        {/* VIEW: DASHBOARD (Includes Live Dispatch & Weather) */}
        {view === 'dashboard' && (
          <div className="space-y-8 px-12 pb-12 relative z-20">
            {/* DISPATCH CENTER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className={`border-l-8 ${weather.isSafeForSolo ? 'border-emerald-500' : 'border-rose-500'} bg-black/80`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.smartDispatchLogic}</h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">{t.liveReadiness}</p>
                  </div>
                  <Badge color={weather.isSafeForSolo ? 'green' : 'amber'}>{weather.isDay ? t.dayOps : t.nightOps}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${weather.isSafeForSolo ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {weather.isSafeForSolo ? <UserCheck size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white uppercase italic">{weather.isSafeForSolo ? t.goForFlight : t.stayGrounded}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{weather.reason}</p>
                    {!weather.isSafeForSolo && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest">{t.predictedSafeWindow}: {safeWindowLabel}</p>
                        <p className="text-[10px] text-rose-300 uppercase tracking-widest">{t.reasonLabel}: {weather.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2 bg-slate-950/80 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.supabaseFlights}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{t.liveFlightData}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{dbRows.length > 0 ? `${dbRows.length} ${t.recordsSynced}` : t.noRowsFoundYet}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{t.lastSync}: {lastSync || t.waiting}</p>
                    {flightMessage.text && (
                      <p className={`mt-1 text-[9px] ${flightMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{flightMessage.text}</p>
                    )}
                  </div>
                  <Badge color={dbRows.length > 0 ? 'green' : 'amber'}>{dbRows.length > 0 ? t.connected : t.noData}</Badge>
                </div>

                {dbRows.length > 0 ? (
                  <div className="overflow-auto rounded-3xl border border-white/5 bg-black/70">
                    <table className="min-w-full text-left text-[10px] text-slate-300">
                      <thead className="border-b border-white/10 bg-white/5 text-slate-500 uppercase tracking-widest">
                        <tr>
                              <th className="px-4 py-3">{t.flightDateLabel}</th>
                          <th className="px-4 py-3">{t.aircraftLabel}</th>
                          <th className="px-4 py-3">{t.registrationLabel}</th>
                          <th className="px-4 py-3">{t.instructor}</th>
                          <th className="px-4 py-3">{t.durationLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flightTableRows.map((row, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                            <td className="px-4 py-3">{formatFlightDate(row.date)}</td>
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
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t.noSupabaseFlights}</p>
                  </div>
                )}
              </Card>

              <Card className="md:col-span-2 bg-slate-950/80 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.trainingSchedule}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{t.nextScheduledSlotInfo}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{t.nextSlot}: {nextFlight.time} · {nextFlight.type}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{t.arrivesIn}: {nextFlightCountdown}</p>
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
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.aiOpsTitle}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{t.aiOpsDescription}</p>
                  </div>
                  <Badge color="purple">{t.futureReady}</Badge>
                </div>
                <div className="space-y-3">
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">{t.optimalLaunchWindow}</p>
                    <p className="mt-2 text-sm font-black text-white">{safeWindowLabel}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">{t.studentReadiness}</p>
                    <p className="mt-2 text-sm font-black text-white">{weather.isSafeForSolo ? t.readyForSoloOps : t.holdUntilConditions}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">{t.issueCoverage}</p>
                    <ul className="mt-2 list-disc list-inside text-[10px] text-slate-300">
                      <li>{t.weatherAutomation}</li>
                      <li>{t.nextSlotPlanning}</li>
                      <li>{t.liveLogSync}</li>
                      <li>{t.complianceReadyStatus}</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2 bg-slate-950/90 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.assistantName}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{t.assistantDescription}</p>
                  </div>
                  <Badge color="blue">AI</Badge>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {assistantMessagesForDisplay.map((msg, index) => (
                    <div key={index} className={`rounded-3xl p-4 ${msg.role === 'assistant' ? 'bg-blue-500/10 border border-blue-500/10' : 'bg-white/5 border border-white/10'} ${msg.role === 'assistant' ? 'ml-0' : 'ml-6'}`}>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{msg.role === 'assistant' ? t.assistantName : t.youLabel}</p>
                      <p className="text-sm text-slate-200">{msg.content}</p>
                    </div>
                  ))}
                  {isAssistantTyping && (
                    <div className="rounded-3xl p-4 bg-blue-500/10 border border-blue-500/10">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t.assistantName}</p>
                      <p className="text-sm text-slate-200">{t.assistantThinking}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleAssistantSubmit()}
                    placeholder={t.assistantPlaceholder}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/70"
                  />
                  <button
                    type="button"
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-[10px] uppercase tracking-widest font-black text-white hover:bg-blue-700"
                    onClick={handleAssistantSubmit}
                  >
                    {t.sendButton}
                  </button>
                </div>
              </Card>

              <Card className="md:col-span-2 grid grid-cols-4 gap-4">
                <div className="md:col-span-4 rounded-3xl border border-white/10 bg-white/5 p-4 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">{t.weatherSource}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-white uppercase">{weatherSource}</span>
                    <span className={`text-[10px] ${weatherMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{weatherMessage.text || t.updatedEvery15s}</span>
                  </div>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Wind size={12} /> {t.winds}</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.wind}</p>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Eye size={12} /> {t.visibilityLabel}</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.visibility}</p>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><CloudSun size={12} /> {t.skyCondition}</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.conditionLabel ?? t[weather.condition] ?? weather.condition}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><Thermometer size={12} /> {t.temperature}</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">{weather.temp}°C</p>
                </div>
              </Card>
            </div>

            {/* TRAINING PROGRESS (Gauges) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {[
                { l: t.totalHours, v: 13.3, m: 40, r: `${t.hoursRemainingPrefix} 26.7 ${t.hoursAbbreviation}` },
                { l: t.soloHours, v: 4.7, m: 10, r: `${t.hoursRemainingPrefix} 5.3 ${t.hoursAbbreviation}` },
                { l: t.nightFlying, v: 1.0, m: 5, r: `${t.hoursRemainingPrefix} 4.0 ${t.hoursAbbreviation}` },
                { l: t.instrument, v: 1.7, m: 3, r: `${t.hoursRemainingPrefix} 1.3 ${t.hoursAbbreviation}` },
                { l: t.crossCountry, v: 5.8, m: 5, r: t.metStatus, ok: true },
                { l: t.dualInstruction, v: 8.6, m: 20, r: `${t.hoursRemainingPrefix} 11.4 ${t.hoursAbbreviation}` },
              ].map(g => (
                <div key={g.l} className="bg-slate-950/95 p-5 rounded-3xl border border-slate-800 text-center group hover:border-blue-400/70 transition-all">
                  <p className="text-[10px] font-black text-white uppercase mb-3">{g.l}</p>
                  <div className="text-2xl font-black text-white italic">{g.v}<span className="text-[10px] text-slate-100 ml-1">/{g.m}</span></div>
                  <div className="mt-3 h-1 w-full bg-slate-700 rounded-full"><div className={`h-full ${g.ok ? 'bg-emerald-400' : 'bg-blue-500'} rounded-full`} style={{ width: `${(g.v / g.m) * 100}%` }} /></div>
                  <p className={`text-[9px] font-bold mt-3 uppercase ${g.ok ? 'text-emerald-300' : 'text-slate-100'}`}>{g.r}</p>
                </div>
              ))}
            </div>

            {/* ACTION REQUIRED & COMPLETED */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-t-4 border-t-rose-500">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter mb-6">{t.compliance}</h3>
                <div className="space-y-4">
                  {[
                    { l: t.soloFlightTime, n: `${t.hoursNeededPrefix} 1.5 ${t.hoursAbbreviation}`, p: "8.5 / 10h" },
                    { l: t.nightFlying, n: `${t.hoursNeededPrefix} 4.0 ${t.hoursAbbreviation}`, p: "1.0 / 5h" },
                    { l: t.crossCountrySolo, n: `${t.hoursNeededPrefix} 1.5 ${t.hoursAbbreviation}`, p: "3.5 / 5h" },
                    { l: t.instrumentTraining, n: `${t.hoursNeededPrefix} 1.3 ${t.hoursAbbreviation}`, p: "1.7 / 3h" },
                  ].map(a => (
                    <div key={a.l} className="flex justify-between items-center bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                      <div><p className="text-sm font-black text-white uppercase italic">{a.l}</p><p className="text-[10px] text-rose-400 font-bold uppercase mt-1 italic">{a.n}</p></div>
                      <p className="font-black text-slate-200">{a.p}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-t-4 border-t-emerald-500">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter mb-6">{t.completedRequirements}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                    <div><p className="text-sm font-black text-white uppercase italic">{t.totalHours}</p><p className="text-[10px] text-emerald-400 font-black uppercase mt-1">45.0 / 40h</p></div>
                    <Badge color="green">{t.complete}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                    <div><p className="text-sm font-black text-white uppercase italic">{t.dualInstruction}</p><p className="text-[10px] text-emerald-400 font-black uppercase mt-1">25.3 / 20h</p></div>
                    <Badge color="green">{t.complete}</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* VIEW: COMPLIANCE (KCAA Audit) */}
        {view === 'compliance' && (
          <div className="px-12 pb-10">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic">{t.complianceAuditStatus}</h3>
                  <p className="mt-2 text-sm text-slate-400 uppercase tracking-widest">{t.auditReadyOverview}</p>
                </div>
                <Badge color="blue">{t.auditSummary}</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: t.pplTrainingSyllabus, progress: 65, status: t.statusOngoing },
                  { label: t.nightFlightRatingRequirement, progress: 20, status: t.statusUnderway },
                  { label: t.crossCountryProficiency, progress: 100, status: t.statusVerified },
                  { label: t.instrumentAwarenessTraining, progress: 56, status: t.statusOngoing },
                  { label: t.radioOperationsCertificate, progress: 100, status: t.statusLicensed },
                  { label: t.class2MedicalCertification, progress: 100, status: t.statusValidUntil.replace('{year}', '2027') }
                ].map(item => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">{item.label}</p>
                        <p className="mt-3 text-lg font-black text-white uppercase">{item.status}</p>
                      </div>
                      <Badge color={item.progress === 100 ? 'green' : item.progress >= 70 ? 'blue' : 'amber'}>{item.progress === 100 ? t.statusVerified : item.progress >= 70 ? t.statusLicensed : t.statusOngoing}</Badge>
                    </div>
                    <div className="mt-5 h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-400">{item.progress}% {t.complete}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: GROUND SCHOOL MATRIX */}
        {view === 'ground' && (
          <div className="grid grid-cols-1 gap-6 px-12 pb-10">
            <Card className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic">{t.syllabusCompletionMatrix}</h3>
                  <p className="mt-2 text-sm text-slate-400 uppercase tracking-widest">{t.groundMatrixOverview}</p>
                </div>
                <Badge color="green">{t.trainingReady}</Badge>
              </div>
              <div className="space-y-6">
                {groundSchoolCategories.map((category) => (
                  <div key={category.title} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">{category.title}</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {category.modules.map((m) => (
                        <div key={m.name} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-inner shadow-slate-950/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-white">{m.name}</p>
                              <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">{m.status}</p>
                            </div>
                            <Badge color={m.badgeColor}>{m.status}</Badge>
                          </div>
                          <div className="mt-4 h-3 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" style={{ width: `${m.score}%` }} />
                          </div>
                          <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-400">{m.score}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* VIEW: TECHNICAL LOGBOOK (WITH TOTAL) */}
        {view === 'hours' && (
          <div className="px-12 pb-10">
            <Card>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-black text-white uppercase italic underline underline-offset-8 decoration-blue-500">{t.certifiedTechnicalLog}</h3>
                <Button onClick={() => downloadLogbookCsv(profile, dbRows, t)} className="bg-emerald-500 hover:bg-emerald-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11zm4 2.5a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75V11h1.25a.75.75 0 010 1.5H8.5V8.5z" clipRule="evenodd" />
                  </svg>
                  {t.exportLogbookCsv}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                      <th className="pb-5">{t.flightDateLabel}</th>
                      <th className="pb-5">{t.aircraftLabel}</th>
                      <th className="pb-5">{t.registrationLabel}</th>
                      <th className="pb-5">{t.instructorLabel}</th>
                      <th className="pb-5">{t.dayNightLabel}</th>
                      <th className="pb-5">{t.dualSoloLabel}</th>
                      <th className="pb-5 text-right">{t.blockTimeLabel}</th>
                      <th className="pb-5">{t.verificationStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {flights.map((f, i) => (
                      <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-5 font-black text-white italic">{f.date}</td>
                        <td className="py-5 text-slate-300">{f.type}</td>
                        <td className="py-5"><Badge>{f.reg}</Badge></td>
                        <td className="py-5 text-slate-400 italic">{f.inst}</td>
                        <td className="py-5 text-slate-100">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-100">
                            {f.night ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                            {f.night ? t.nightFlight : t.dayFlight}
                          </span>
                        </td>
                        <td className="py-5 text-slate-100">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-100">
                            {f.instr ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            {f.instr ? t.dualFlight : t.soloFlight}
                          </span>
                        </td>
                        <td className="py-5 text-right font-black text-blue-400 text-lg italic">{f.dur}h</td>
                        <td className="py-5 text-center text-emerald-400"><CheckCircle2 className="w-5 h-5" /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-600/10 border-t-2 border-blue-500">
                      <td colSpan={7} className="py-6 pl-8 text-2xl font-black text-white uppercase italic tracking-tighter">{t.grandTotalFlightHours}</td>
                      <td className="py-6 pr-8 text-right text-4xl font-black font-mono text-blue-500 italic underline decoration-white/20">{totalHrs.toFixed(1)}h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}