export type TranslatorLanguage = "en" | "es";

export type TranslationDeps = {
  detect?: (text: string) => Promise<string | null>;
  canTranslate?: (source: string, target: string) => Promise<boolean>;
  translate?: (text: string, source: string, target: string) => Promise<string>;
};

export type TranslationResult =
  { kind: "already" } | { kind: "text"; text: string } | { kind: "link"; url: string };

const LINK_LIMIT = 1500;
const DETECT_LIMIT = 1000;
const TEXT_LIMIT = 4000;

/** The app language the reader wants the post in. */
export function translatorLanguage(locale: string): TranslatorLanguage {
  return locale.trim().toLowerCase().startsWith("es") ? "es" : "en";
}

export function languageCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toLowerCase().split("-")[0] ?? "";
  if (!/^[a-z]{2,3}$/.test(code)) return null;
  if (code === "und" || code === "mul" || code === "zxx") return null;
  return code;
}

export function sameLanguage(detected: string, target: TranslatorLanguage): boolean {
  return languageCode(detected) === target;
}

/** Opens Google Translate in the browser. Synlumae does not call a paid translation API. */
export function googleTranslateUrl(text: string, target: TranslatorLanguage): string {
  const params = new URLSearchParams({
    sl: "auto",
    tl: target,
    text: text.trim().slice(0, LINK_LIMIT),
    op: "translate",
  });
  return `https://translate.google.com/?${params.toString()}`;
}

type LanguageDetectorApi = {
  create: (options?: object) => Promise<{ detect: (text: string) => Promise<unknown> }>;
};

type TranslatorApi = {
  availability?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<{ translate: (text: string) => Promise<string> }>;
};

function topLanguage(results: unknown): string | null {
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  if (!first || typeof first !== "object") return null;
  const record = first as { detectedLanguage?: unknown; language?: unknown };
  const value = record.detectedLanguage ?? record.language;
  return typeof value === "string" ? languageCode(value) : null;
}

/** Chrome's on-device Language Detector and Translator, when this browser has them. */
export function browserTranslationDeps(): TranslationDeps {
  const root = globalThis as {
    LanguageDetector?: LanguageDetectorApi;
    Translator?: TranslatorApi;
  };
  const deps: TranslationDeps = {};
  if (root.LanguageDetector) {
    const detectorApi = root.LanguageDetector;
    deps.detect = async (text) => {
      const detector = await detectorApi.create();
      return topLanguage(await detector.detect(text));
    };
  }
  if (root.Translator) {
    const translatorApi = root.Translator;
    deps.canTranslate = async (source, target) => {
      if (!translatorApi.availability) return true;
      const state = await translatorApi.availability({
        sourceLanguage: source,
        targetLanguage: target,
      });
      return state === "available" || state === "downloadable" || state === "downloading";
    };
    deps.translate = async (text, source, target) => {
      const translator = await translatorApi.create({
        sourceLanguage: source,
        targetLanguage: target,
      });
      return translator.translate(text);
    };
  }
  return deps;
}

export async function translateCommunityText(
  text: string,
  target: TranslatorLanguage,
  deps: TranslationDeps = browserTranslationDeps(),
): Promise<TranslationResult> {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "already" };
  let detected: string | null = null;
  if (deps.detect) {
    try {
      detected = languageCode(await deps.detect(trimmed.slice(0, DETECT_LIMIT)));
    } catch {
      detected = null;
    }
  }
  if (detected && sameLanguage(detected, target)) return { kind: "already" };
  if (detected && deps.canTranslate && deps.translate) {
    try {
      const ok = await deps.canTranslate(detected, target);
      if (ok) {
        const translated = (
          await deps.translate(trimmed.slice(0, TEXT_LIMIT), detected, target)
        ).trim();
        if (translated) return { kind: "text", text: translated };
      }
    } catch {
      // The on-device model can be missing. The link below still works.
    }
  }
  return { kind: "link", url: googleTranslateUrl(trimmed, target) };
}
