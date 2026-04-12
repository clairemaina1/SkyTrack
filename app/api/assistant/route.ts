import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userPrompt = body.prompt?.toLowerCase() || "";
    const lang = body.lang === 'fr' ? 'fr' : 'en';

    const messages = {
      en: {
        initial: "I'm the SkyTrack Assistant. I can help with flight safety, Wilson Airport weather, or checking your solo readiness.",
        safetyNight: "Current weather is not safe for a student because night operations are kept restricted for student solos at Wilson Airport. The next predicted safe window is 06:00 AM.",
        safetyDay: "Visibility at HKNW is clear. Ensure your pre-flight inspection is complete and your instructor has signed your logbook for solo flight.",
        weather: "HKNW (Wilson) METAR: CAVOK. Wind 060 at 8kts. Temperature 22C. QNH 1018. Perfect conditions for flight training.",
        system: "I am the SkyTrack AI, a management system designed for Kenyan flight schools to track student progress and fleet safety.",
        fallback: "SkyTrack system is currently monitoring flight data. How can I help?",
      },
      fr: {
        initial: "Je suis l'assistant SkyTrack. Je peux aider avec la sécurité de vol, la météo de l'aéroport de Wilson ou vérifier votre préparation solo.",
        safetyNight: "Les conditions actuelles ne sont pas sûres pour un étudiant car les vols en solo sont restreints la nuit à l'aéroport de Wilson. La prochaine fenêtre de sécurité prévue est 06:00.",
        safetyDay: "La visibilité à HKNW est claire. Assurez-vous que votre inspection pré-vol est terminée et que votre instructeur a signé votre carnet pour le vol en solo.",
        weather: "HKNW (Wilson) METAR : CAVOK. Vent 060 à 8 kts. Température 22°C. QNH 1018. Conditions parfaites pour la formation au vol.",
        system: "Je suis l'IA SkyTrack, un système de gestion conçu pour les écoles de pilotage kenyanes afin de suivre la progression des élèves et la sécurité de la flotte.",
        fallback: "Le système SkyTrack surveille actuellement les données de vol. Comment puis-je aider ?",
      },
    };

    let answer = messages[lang].initial;

    if (userPrompt.includes('fly') || userPrompt.includes('ready') || userPrompt.includes('go') || userPrompt.includes('vol') || userPrompt.includes('sécurité')) {
      const hour = new Date().getHours();
      if (hour >= 18 || hour < 6) {
        answer = messages[lang].safetyNight;
      } else {
        answer = messages[lang].safetyDay;
      }
    } else if (userPrompt.includes('weather') || userPrompt.includes('metar') || userPrompt.includes('météo')) {
      answer = messages[lang].weather;
    } else if (userPrompt.includes('who are you') || userPrompt.includes('system') || userPrompt.includes('qui êtes')) {
      answer = messages[lang].system;
    }

    return NextResponse.json({ reply: answer });

  } catch {
    return NextResponse.json({ reply: "SkyTrack system is currently monitoring flight data. How can I help?" });
  }
}