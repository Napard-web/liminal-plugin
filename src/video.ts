import { requestUrl } from "obsidian";

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

export function extraireVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1).split("?")[0];
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

const INNERTUBE_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240101.00.00",
    hl: "fr",
    gl: "FR",
  },
};

export async function recupererTranscription(url: string): Promise<string> {
  const videoId = extraireVideoId(url);
  if (!videoId) throw new Error(`URL invalide : ${url}`);

  // Appel InnerTube API — même endpoint que youtube-transcript-api Python
  const playerResp = await requestUrl({
    url: "https://www.youtube.com/youtubei/v1/player",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, context: INNERTUBE_CONTEXT }),
  });

  const playerData = playerResp.json;
  const tracks: CaptionTrack[] =
    (playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks as CaptionTrack[]) ?? [];

  if (!tracks.length) throw new Error("Aucun sous-titre disponible pour cette vidéo.");

  const track =
    tracks.find((t) => t.languageCode === "fr") ??
    tracks.find((t) => t.languageCode?.startsWith("fr")) ??
    tracks.find((t) => t.languageCode === "en") ??
    tracks[0];

  if (!track?.baseUrl) throw new Error("URL de transcription introuvable.");

  const transcriptResp = await requestUrl({ url: track.baseUrl });
  const xml = transcriptResp.text;

  const segments = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  if (!segments.length) throw new Error("Transcription vide.");

  return segments
    .map((m) =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, "")
        .trim()
    )
    .filter(Boolean)
    .join(" ");
}
