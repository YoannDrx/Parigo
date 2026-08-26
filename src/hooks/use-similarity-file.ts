"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SIMILARITY_MAX_BYTES,
  DEFAULT_SIMILARITY_MAX_DURATION_SECONDS,
  readSimilarityAudioDuration,
  similarityFileErrorMessage,
  validateSimilarityAudioDuration,
  validateSimilarityFileBasics,
} from "@/lib/search/similarity-files";

interface SimilarityFileOptions {
  locale: "fr" | "en";
  maxBytes?: number;
  maxDurationSeconds?: number;
  initialFile?: File | null;
}

export function useSimilarityFile({
  locale,
  maxBytes = DEFAULT_SIMILARITY_MAX_BYTES,
  maxDurationSeconds = DEFAULT_SIMILARITY_MAX_DURATION_SECONDS,
  initialFile = null,
}: SimilarityFileOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "error">("idle");
  const [error, setError] = useState("");
  const validationSequence = useRef(0);
  const initialFileRef = useRef<File | null>(null);

  const clearFile = useCallback(() => {
    validationSequence.current += 1;
    setFile(null);
    setStatus("idle");
    setError("");
  }, []);

  const selectFiles = useCallback(async (files: readonly File[]): Promise<boolean> => {
    const sequence = ++validationSequence.current;
    const basics = validateSimilarityFileBasics(files, maxBytes);
    setFile(null);
    if (!basics.ok) {
      setStatus("error");
      setError(similarityFileErrorMessage(basics.code, locale));
      return false;
    }

    setStatus("checking");
    setError("");
    try {
      const duration = await readSimilarityAudioDuration(basics.file);
      if (sequence !== validationSequence.current) return false;
      const durationError = validateSimilarityAudioDuration(duration, maxDurationSeconds);
      if (durationError) {
        setStatus("error");
        setError(similarityFileErrorMessage(durationError, locale));
        return false;
      }
      setFile(basics.file);
      setStatus("valid");
      return true;
    } catch {
      if (sequence !== validationSequence.current) return false;
      setStatus("error");
      setError(similarityFileErrorMessage("FILE_UNREADABLE", locale));
      return false;
    }
  }, [locale, maxBytes, maxDurationSeconds]);

  useEffect(() => {
    if (!initialFile || initialFileRef.current === initialFile) return;
    initialFileRef.current = initialFile;
    void selectFiles([initialFile]);
  }, [initialFile, selectFiles]);

  return { file, status, error, selectFiles, clearFile };
}
