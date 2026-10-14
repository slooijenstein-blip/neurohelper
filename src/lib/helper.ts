import type { AppLocale } from "../i18n/locales.ts";
import { ACTIVITIES, type Activity, type Skill } from "./activities-data.ts";
import { localizedActivity } from "./activity-locale.ts";
import { HELP_ITEMS, type HelpHub } from "./help-content.ts";
import { getCountry } from "./help/countries.ts";

export type HelperTopic = "meltdown" | "caregiver" | "speech" | "bedtime" | "sensory" | "play";

export type HelperGuide = {
  id: string;
  hub: HelpHub;
  title: string;
  tip: string;
};

export type HelperActivityCard = {
  id: string;
  title: string;
  description: string;
  skill: Skill;
  minAge: number;
  maxAge: number;
};

export type HelperAnswer = {
  crisis: boolean;
  matched: boolean;
  countryCode: string;
  countryName: string;
  emergencyNumber?: string;
  activities: HelperActivityCard[];
  guides: HelperGuide[];
};

const TOPIC_TERMS: Record<HelperTopic, string[]> = {
  meltdown: [
    "meltdown",
    "scream",
    "screaming",
    "overwhelm",
    "overwhelmed",
    "tantrum",
    "shout",
    "crying",
    "grito",
    "gritando",
    "berrinche",
    "rabieta",
    "pataleta",
    "abrumad",
    "desbord",
    "crisis",
  ],
  caregiver: [
    "as a parent",
    "i feel",
    "burnout",
    "respite",
    "caregiver",
    "como padre",
    "como madre",
    "me siento",
    "agotad",
    "cuidador",
    "abuelo",
    "abuela",
  ],
  speech: [
    "speech",
    "talking",
    "language",
    "communication",
    "words",
    "habla",
    "hablar",
    "palabra",
    "lenguaje",
    "comunicacion",
  ],
  bedtime: [
    "bedtime",
    "sleep",
    "night",
    "routine",
    "routines",
    "dormir",
    "noche",
    "rutina",
    "rutinas",
    "cama",
    "acostar",
    "sueno",
  ],
  sensory: ["sensory", "texture", "calm", "calming", "sensorial", "textura", "calma", "calmar"],
  play: [
    "activity",
    "activities",
    "play",
    "game",
    "today",
    "actividad",
    "actividades",
    "jugar",
    "juego",
    "hoy",
  ],
};

const GUIDE_TOPICS: Record<string, HelperTopic[]> = {
  "child-during-overwhelm-safety": ["meltdown"],
  "child-early-warning-signs": ["meltdown"],
  "child-sensory-overload": ["meltdown", "sensory"],
  "child-tantrum-vs-meltdown-overload": ["meltdown"],
  "child-shutdown-withdrawal": ["meltdown"],
  "child-after-the-storm": ["meltdown"],
  "child-big-emotions-dysregulation": ["meltdown"],
  "child-communication-under-stress": ["meltdown", "speech"],
  "caregiver-when-you-are-overwhelmed": ["caregiver"],
  "caregiver-asking-for-help-support-network": ["caregiver"],
  "caregiver-respite-and-burnout": ["caregiver"],
};

const GUIDE_ES: Record<string, string> = {
  "child-during-overwhelm-safety": "Durante el desborde: primero la seguridad",
  "child-early-warning-signs": "Señales tempranas de que se está desbordando",
  "child-sensory-overload": "Sobrecarga sensorial: bajar el ruido",
  "child-tantrum-vs-meltdown-overload": "Rabieta, desborde o sobrecarga",
  "child-shutdown-withdrawal": "Cuando se queda en silencio",
  "child-after-the-storm": "Después de la tormenta",
  "child-big-emotions-dysregulation": "Emociones grandes",
  "child-communication-under-stress": "Cuando las palabras cuestan",
  "caregiver-when-you-are-overwhelmed": "Cuando tú estás desbordado o desbordada",
  "caregiver-asking-for-help-support-network": "Pedir ayuda",
  "caregiver-respite-and-burnout": "Descanso y agotamiento de quien cuida",
};

const BEDTIME_IDS = new Set([
  "story-time-props",
  "hand-washing",
  "brushing-hair",
  "dressing-race",
  "yoga-poses",
]);

const CALM_IDS = new Set([
  "calming-glitter-bottle",
  "deep-pressure-sandwich",
  "sensory-bottle",
  "yoga-poses",
]);

const TODAY_IDS = ["calming-glitter-bottle", "sensory-rice-bin", "copycat-words", "animal-walks"];

const CRISIS_TERMS = [
  "suicid",
  "kill myself",
  "self harm",
  "self-harm",
  "hurt myself",
  "not breathing",
  "cant breathe",
  "can't breathe",
  "unconscious",
  "overdose",
  "call 911",
  "call 112",
  "call 999",
  "no respira",
  "autoles",
  "hacerse dano",
  "inconsciente",
  "emergencia",
  "matarme",
  "quiero morir",
  "in danger",
  "en peligro",
];

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function detectTopics(text: string): HelperTopic[] {
  const folded = fold(text);
  return (Object.keys(TOPIC_TERMS) as HelperTopic[]).filter((topic) =>
    TOPIC_TERMS[topic].some((term) => folded.includes(fold(term))),
  );
}

export function parseAskedAge(text: string): number | null {
  const folded = fold(text);
  const medio = folded.match(/(\d+)\s*(?:ano|anos|year|years).{0,16}medio/);
  if (medio?.[1]) return Number(medio[1]) + 0.5;
  const match = folded.match(/(\d+(?:[.,]\d+)?)\s*(?:year|years|yr|ano|anos)\b/);
  if (!match?.[1]) return null;
  const age = Number(match[1].replace(",", "."));
  return Number.isFinite(age) ? age : null;
}

export function isCrisisQuestion(text: string): boolean {
  const folded = fold(text);
  return CRISIS_TERMS.some((term) => folded.includes(fold(term)));
}

function activityTopics(activity: Activity): HelperTopic[] {
  const topics: HelperTopic[] = [];
  if (activity.skill === "Communication") topics.push("speech");
  if (activity.skill === "Sensory Play") topics.push("sensory");
  if (BEDTIME_IDS.has(activity.id)) topics.push("bedtime");
  if (CALM_IDS.has(activity.id)) topics.push("meltdown", "sensory");
  return topics;
}

function ageFit(activity: Activity, age: number | null): number {
  if (age == null) return 0;
  if (age >= activity.minAge && age <= activity.maxAge) return 8;
  const distance = age < activity.minAge ? activity.minAge - age : age - activity.maxAge;
  return distance <= 1 ? 2 : -4;
}

function scoreActivity(
  activity: Activity,
  topics: Set<HelperTopic>,
  age: number | null,
  text: string,
): number {
  let score = 0;
  for (const topic of activityTopics(activity)) {
    if (topics.has(topic)) score += 10;
  }
  if (topics.has("play") && topics.size === 1 && TODAY_IDS.includes(activity.id)) score += 12;
  if (topics.has("bedtime") && activity.id === "story-time-props") score += 4;
  if (topics.has("bedtime") && activity.id === "yoga-poses") score += 3;
  if (topics.has("bedtime") && activity.id === "hand-washing") score += 2;
  const folded = fold(`${activity.title} ${activity.description}`);
  for (const token of fold(text).split(/[^a-z0-9]+/)) {
    if (token.length >= 5 && folded.includes(token)) score += 4;
  }
  score += ageFit(activity, age);
  return score;
}

function scoreGuide(id: string, topics: Set<HelperTopic>, text: string): number {
  const item = HELP_ITEMS.find((entry) => entry.id === id);
  if (!item) return 0;
  let score = 0;
  for (const topic of GUIDE_TOPICS[id] ?? []) {
    if (topics.has(topic)) score += 10;
  }
  const folded = fold(`${item.title} ${item.mostImportant.join(" ")}`);
  for (const token of fold(text).split(/[^a-z0-9]+/)) {
    if (token.length >= 5 && folded.includes(token)) score += 3;
  }
  return score;
}

export function answerHelper(input: {
  text: string;
  topics?: HelperTopic[];
  locale: AppLocale;
  countryCode: string;
}): HelperAnswer {
  const text = input.text.trim();
  const topics = new Set(input.topics?.length ? input.topics : detectTopics(text));
  const age = parseAskedAge(text);
  const country = getCountry(input.countryCode);
  const countryName =
    input.locale === "es"
      ? (country?.nameEs ?? input.countryCode)
      : (country?.nameEn ?? input.countryCode);

  const activities = ACTIVITIES.map((activity) => ({
    activity,
    score: scoreActivity(activity, topics, age, text),
  }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score || a.activity.title.localeCompare(b.activity.title))
    .slice(0, 3)
    .map(({ activity }) => {
      const local = localizedActivity(activity, input.locale);
      return {
        id: local.id,
        title: local.title,
        description: local.description,
        skill: local.skill,
        minAge: local.minAge,
        maxAge: local.maxAge,
      };
    });

  const guides = HELP_ITEMS.map((item) => ({ item, score: scoreGuide(item.id, topics, text) }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score || a.item.order - b.item.order)
    .slice(0, 2)
    .map(({ item }) => ({
      id: item.id,
      hub: item.hub,
      title: input.locale === "es" ? (GUIDE_ES[item.id] ?? item.title) : item.title,
      tip: item.mostImportant[0] ?? item.title,
    }));

  const crisis = isCrisisQuestion(text);
  const matched = activities.length > 0 || guides.length > 0;
  return {
    crisis,
    matched,
    countryCode: input.countryCode,
    countryName,
    ...(crisis && country?.emergencyNumber ? { emergencyNumber: country.emergencyNumber } : {}),
    activities,
    guides,
  };
}
