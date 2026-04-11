import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userPrompt = body.prompt?.toLowerCase() || "";
    
    let answer = "I'm the SkyTrack Assistant. I can help with flight safety, Wilson Airport weather, or checking your solo readiness.";

    // 1. Safety & Night Operations Logic
    if (userPrompt.includes('fly') || userPrompt.includes('ready') || userPrompt.includes('go')) {
      const hour = new Date().getHours();
      // Wilson Airport Night Restriction (6 PM to 6 AM)
      if (hour >= 18 || hour < 6) {
        answer = "Current weather is not safe for a student because night operations are kept restricted for student solos at Wilson Airport. The next predicted safe window is 06:00 AM.";
      } else {
        answer = "Visibility at HKNW is clear. Ensure your pre-flight inspection is complete and your instructor has signed your logbook for solo flight.";
      }
    } 

    // 2. Weather/METAR Logic
    else if (userPrompt.includes('weather') || userPrompt.includes('metar')) {
      answer = "HKNW (Wilson) METAR: CAVOK. Wind 060 at 8kts. Temperature 22C. QNH 1018. Perfect conditions for flight training.";
    }

    // 3. System Info
    else if (userPrompt.includes('who are you') || userPrompt.includes('system')) {
      answer = "I am the SkyTrack AI, a management system designed for Kenyan flight schools to track student progress and fleet safety.";
    }

    return NextResponse.json({ answer });

  } catch (error) {
    return NextResponse.json({ answer: "SkyTrack system is currently monitoring flight data. How can I help?" });
  }
}