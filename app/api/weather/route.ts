import { NextResponse } from "next/server";

const STATION_DEFAULT = "HKNW";
const STATION_MAP: Record<string, string> = {
  HKNW: "Wilson",
  HKJK: "JKIA",
  HKMO: "Moi",
  HKKI: "Kisumu",
  HKEL: "Eldoret",
};

const parseMetar = (text: string, station: string) => {
  const stationName = STATION_MAP[station] ?? station;
  const lines = text.trim().split("\n");
  const raw = lines[1] ?? lines[0] ?? "";
  const metar = raw.trim();

  const windMatch = metar.match(/\b(\d{3}\/\d{2,3}(G\d{2,3})?KT)\b/);
  const visibilityMatch = metar.match(/\b(\d{4}|\d{1,2}SM)\b/);
  const tempMatch = metar.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  const cloudMatch = metar.match(/\b(FEW|SCT|BKN|OVC)(\d{3})\b/);
  const precipitationMatch = metar.match(/\b(RA|SHRA|TS|SN|DZ|FG|BR)\b/);

  const condition = precipitationMatch
    ? precipitationMatch[1] === "TS"
      ? "Thunderstorms"
      : precipitationMatch[1] === "RA" || precipitationMatch[1] === "SHRA"
      ? "Rain Showers"
      : precipitationMatch[1] === "SN"
      ? "Snow"
      : precipitationMatch[1] === "FG"
      ? "Fog"
      : precipitationMatch[1] === "BR"
      ? "Mist"
      : "Hazardous"
    : cloudMatch
      ? cloudMatch[1] === "FEW"
        ? "Few Clouds"
        : cloudMatch[1] === "SCT"
          ? "Scattered Clouds"
          : cloudMatch[1] === "BKN"
            ? "Broken Clouds"
            : "Overcast"
      : "Clear Skies";

  const temp = tempMatch ? parseInt(tempMatch[1].replace("M", "-"), 10) : null;
  const wind = windMatch ? windMatch[1] : "000/00KT";
  const visibility = visibilityMatch ? visibilityMatch[1] : "10km";
  const gustMatch = wind.match(/G(\d{2,3})KT/);
  const windSpeedMatch = wind.match(/\/(\d{2,3})KT/);
  const gusts = gustMatch ? parseInt(gustMatch[1], 10) : windSpeedMatch ? parseInt(windSpeedMatch[1], 10) : 0;

  return {
    station,
    stationName,
    metar,
    condition,
    temp: temp ?? 0,
    wind,
    gusts,
    visibility,
    updatedAt: new Date().toISOString(),
  };
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const station = url.searchParams.get('station')?.toUpperCase() || STATION_DEFAULT;
    const stationName = STATION_MAP[station] ?? station;
    const metarUrl = `https://tgftp.nws.noaa.gov/data/observations/metar/stations/${station}.TXT`;
    const response = await fetch(metarUrl, { next: { revalidate: 30 } });
    if (!response.ok) {
      return NextResponse.json({ error: `Unable to fetch METAR data for ${station}.` }, { status: 502 });
    }

    const text = await response.text();
    const data = parseMetar(text, stationName);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Weather fetch failed', error);
    return NextResponse.json({ error: "Weather fetch failed." }, { status: 500 });
  }
}
