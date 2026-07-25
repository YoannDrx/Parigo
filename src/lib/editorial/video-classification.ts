import type { VideoType } from "./contracts";

export function classifyVideoTitle(title: string): VideoType {
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/making[\s-]?of|behind the scenes/.test(normalized)) return "making-of";
  if (/teaser|vinyl|coming soon|sortie/.test(normalized)) return "teaser";
  if (/award|nominee|nomination|winner|prix/.test(normalized)) return "award";
  if (/bonne annee|happy new year|new year/.test(normalized)) return "announcement";
  if (/\blive\b|concert|session/.test(normalized)) return "live";
  if (/dmc|championship|performance|scratch|showcase/.test(normalized)) return "performance";
  if (/official|clip|music video|video officielle?/.test(normalized)) return "official-video";
  if (/vegomatic|macha|surfin|montlery/.test(normalized)) return "archive";
  return "other";
}
