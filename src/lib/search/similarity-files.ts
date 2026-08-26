export const DEFAULT_SIMILARITY_MAX_BYTES = 120 * 1024 * 1024;
export const DEFAULT_SIMILARITY_MAX_DURATION_SECONDS = 15 * 60;

export type SimilarityAudioContentType = "audio/mpeg" | "audio/wav";
export type SimilarityFileErrorCode =
  | "FILE_COUNT"
  | "FILE_TYPE"
  | "FILE_SIZE"
  | "FILE_UNREADABLE"
  | "FILE_DURATION";

export type SimilarityFileBasics =
  | { ok: true; file: File; contentType: SimilarityAudioContentType }
  | { ok: false; code: SimilarityFileErrorCode };

export function similarityAudioContentType(file: File): SimilarityAudioContentType | null {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en");
  if (extension === "mp3" && (!file.type || file.type === "audio/mpeg")) return "audio/mpeg";
  if (extension === "wav" && (!file.type || ["audio/wav", "audio/wave", "audio/x-wav"].includes(file.type))) return "audio/wav";
  return null;
}

export function validateSimilarityFileBasics(files: readonly File[], maxBytes = DEFAULT_SIMILARITY_MAX_BYTES): SimilarityFileBasics {
  if (files.length !== 1) return { ok: false, code: "FILE_COUNT" };
  const file = files[0];
  const contentType = similarityAudioContentType(file);
  if (!contentType) return { ok: false, code: "FILE_TYPE" };
  if (file.size > maxBytes) return { ok: false, code: "FILE_SIZE" };
  return { ok: true, file, contentType };
}

export function validateSimilarityAudioDuration(duration: number, maxDurationSeconds = DEFAULT_SIMILARITY_MAX_DURATION_SECONDS): SimilarityFileErrorCode | null {
  if (!Number.isFinite(duration) || duration <= 0) return "FILE_UNREADABLE";
  if (duration > maxDurationSeconds) return "FILE_DURATION";
  return null;
}

export async function readSimilarityAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("FILE_UNREADABLE"));
    };
    audio.src = objectUrl;
  });
}

export function similarityFileErrorMessage(code: SimilarityFileErrorCode, locale: "fr" | "en"): string {
  const messages: Record<SimilarityFileErrorCode, { fr: string; en: string }> = {
    FILE_COUNT: {
      fr: "Déposez un seul fichier MP3 ou WAV.",
      en: "Drop a single MP3 or WAV file.",
    },
    FILE_TYPE: {
      fr: "Ce format n’est pas accepté. Choisissez un fichier MP3 ou WAV valide.",
      en: "This format is not supported. Choose a valid MP3 or WAV file.",
    },
    FILE_SIZE: {
      fr: "Le fichier dépasse la limite de 120 Mo.",
      en: "The file exceeds the 120 MB limit.",
    },
    FILE_UNREADABLE: {
      fr: "Ce fichier audio est illisible ou corrompu.",
      en: "This audio file is unreadable or corrupted.",
    },
    FILE_DURATION: {
      fr: "Le fichier dépasse la durée maximale de 15 minutes.",
      en: "The file exceeds the 15-minute duration limit.",
    },
  };
  return messages[code][locale];
}
