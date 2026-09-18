import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ACTIVITIES, type Activity, type Skill } from "./activities-data";

export type ScheduleItem = {
  id: string;
  activityId: string;
  title: string;
  description: string;
  time: string;
  minutes: number;
  done: boolean;
  fromTemplateId?: string;
};


export type Role =
  | "Parent"
  | "Legal Guardian"
  | "Teacher"
  | "Therapist"
  | "Creator"
  | "Grandparent"
  | "Family Member"
  | "Caregiver"
  | "Other";

export const ROLES: Role[] = [
  "Parent",
  "Legal Guardian",
  "Teacher",
  "Therapist",
  "Creator",
  "Grandparent",
  "Family Member",
  "Caregiver",
  "Other",
];

export const roleTone: Record<Role, string> = {
  Parent: "tag-role-parent",
  "Legal Guardian": "tag-role-guardian",
  Teacher: "tag-role-teacher",
  Therapist: "tag-role-therapist",
  Creator: "tag-role-creator",
  Grandparent: "tag-role-grandparent",
  "Family Member": "tag-role-family",
  Caregiver: "tag-role-caregiver",
  Other: "tag-role-other",
};

export type Socials = {
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  linkedin?: string;
};

export type Profile = {
  id: string;
  name: string;
  role: Role;
  location: string;
  bio: string;
  socials: Socials;
  color: string;
  favouriteActivityIds?: string[];
  /** Member IDs following this profile */
  followers?: string[];
  /** Clerk user id when this profile is tied to a real session */
  clerkUserId?: string;
};


export type Template = {
  id: string;
  ownerId: string;
  name: string;
  isPublic: boolean;
  items: ScheduleItem[];
  createdAt: string;
  /** Weekday numbers (0 = Sunday) this routine repeats on */
  repeatDays?: number[];
  likes?: number;
  liked?: boolean;
  ratings?: number[];
  myRating?: number;
  tries?: number;
};

/** A saved routine applied to one specific calendar day */
export type DayPlan = {
  id: string;
  date: string; // YYYY-MM-DD
  templateId: string;
  name: string;
};


export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  text: string;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
};


export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorLocation: string;
  kind: "Schedule Share" | "Story" | "Question" | "Promotion" | "Repost";
  body: string;
  likes: number;
  liked: boolean;
  reactions: Record<string, number>;
  myReactions: string[];
  comments: Comment[];
  reposts: { authorId: string; authorName: string; createdAt: string; note?: string }[];
  createdAt: string;
  templateId?: string;
  originalPostId?: string;
  repostNote?: string;
};


export type Article = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  readMinutes: number;
  likes: number;
  liked: boolean;
  reactions: Record<string, number>;
  myReactions: string[];
  comments: Comment[];
  createdAt: string;
};


export type Observation = {
  id: string;
  activityTitle: string;
  note: string;
  rating: number;
  date: string;
};

export type AppState = {
  childName: string;
  childAge: number;
  profile: Profile | null;
  loggedOut: boolean;
  schedule: ScheduleItem[];
  templates: Template[];
  posts: Post[];
  observations: Observation[];
  completedCount: number;
  favourites: string[];
  members: Profile[];
  activities: Activity[];
  articles: Article[];
  dayPlans: DayPlan[];
  following: string[];
};

const DEV_DEMO_KEY = "synlumae-dev-demo";

const STORAGE_KEY = "motor-skill-buddy-v1";

const MY_ID = "me";

const myProfile: Profile = {
  id: MY_ID,
  name: "Sam",
  role: "Parent",
  location: "Amsterdam",
  bio: "Parent of a curious 4-year-old. Always looking for motor skill ideas that fit into our day.",
  socials: {
    instagram: "https://instagram.com/sam.parent",
    website: "https://example.com",
  },
  color: "bg-primary",
  favouriteActivityIds: ["color-matching-hunt"],
  followers: ["maya", "jonas"],
};


export const uid = () => Math.random().toString(36).slice(2, 10);

const seedTemplates: Template[] = [
  {
    id: "tpl-morning",
    ownerId: MY_ID,
    name: "My Morning Routine",
    isPublic: true,
    createdAt: "2026-08-18",
    items: [
      {
        id: "s1",
        activityId: "sensory-rice-bin",
        title: "Sensory Rice Bin",
        description: "A calming sensory activity using colored rice to explore textures.",
        time: "09:00",
        minutes: 15,
        done: false,
      },
      {
        id: "s2",
        activityId: "mirror-emotions",
        title: "Mirror Emotions",
        description: "Learning to identify and mimic facial expressions.",
        time: "09:20",
        minutes: 5,
        done: false,
      },
      {
        id: "s3",
        activityId: "deep-pressure-sandwich",
        title: "Deep Pressure Sandwich",
        description: "Deep pressure therapy using pillows for regulation.",
        time: "09:30",
        minutes: 5,
        done: false,
      },
    ],
  },
  {
    id: "tpl-fine-motor",
    ownerId: "maya",
    name: "Fine Motor Morning",
    isPublic: true,
    createdAt: "2026-08-20",
    items: [
      {
        id: "f1",
        activityId: "tape-rescue",
        title: "Tape Rescue",
        description: "Fine motor activity peeling tape off toys.",
        time: "10:00",
        minutes: 10,
        done: false,
      },
      {
        id: "f2",
        activityId: "color-matching-hunt",
        title: "Color Matching Hunt",
        description: "A whole-house hunt for objects that match a colour card.",
        time: "10:15",
        minutes: 15,
        done: false,
      },
      {
        id: "f3",
        activityId: "calming-glitter-bottle",
        title: "Calming Glitter Bottle",
        description: "A self-regulation tool your child helps build.",
        time: "10:35",
        minutes: 15,
        done: false,
      },
    ],
  },
  {
    id: "tpl-energy",
    ownerId: "jonas",
    name: "Afternoon Energy",
    isPublic: true,
    createdAt: "2026-08-19",
    items: [
      {
        id: "e1",
        activityId: "obstacle-course",
        title: "Living Room Obstacle Course",
        description: "Gross motor planning with cushions and tunnels.",
        time: "15:00",
        minutes: 20,
        done: false,
      },
      {
        id: "e2",
        activityId: "interactive-bubble-chase",
        title: "Interactive Bubble Chase",
        description: "Joint attention and turn-taking fun.",
        time: "15:25",
        minutes: 15,
        done: false,
      },
      {
        id: "e3",
        activityId: "turn-taking-tower",
        title: "Turn-Taking Tower",
        description: "Building a block tower one turn each.",
        time: "15:45",
        minutes: 10,
        done: false,
      },
    ],
  },
  {
    id: "tpl-classroom",
    ownerId: "priya",
    name: "Classroom Warm-up",
    isPublic: true,
    createdAt: "2026-08-21",
    items: [
      {
        id: "c1",
        activityId: "mirror-emotions",
        title: "Mirror Emotions",
        description: "Learning to identify and mimic facial expressions.",
        time: "08:45",
        minutes: 5,
        done: false,
      },
      {
        id: "c2",
        activityId: "rhyming-match",
        title: "Rhyming Match",
        description: "Phonological awareness development.",
        time: "08:55",
        minutes: 15,
        done: false,
      },
      {
        id: "c3",
        activityId: "story-time-props",
        title: "Story Time with Props",
        description: "Using objects to bring a story to life.",
        time: "09:15",
        minutes: 20,
        done: false,
      },
    ],
  },
];

const memberProfiles: Profile[] = [
  {
    id: "maya",
    name: "Maya",
    role: "Therapist",
    location: "London",
    bio: "Paediatric occupational therapist. Sharing practical routines that build independence and confidence.",
    socials: { instagram: "https://instagram.com/maya.ot", linkedin: "https://linkedin.com/in/maya-ot" },
    color: "bg-teal-500",
    favouriteActivityIds: ["tape-rescue", "calming-glitter-bottle"],
    followers: ["jonas", "priya"],
  },

  {
    id: "jonas",
    name: "Jonas",
    role: "Parent",
    location: "Berlin",
    bio: "Dad of two. Testing schedules that burn energy without melting down.",
    socials: { tiktok: "https://tiktok.com/@jonas.dad", instagram: "https://instagram.com/jonas.dad" },
    color: "bg-orange-500",
    favouriteActivityIds: ["obstacle-course", "interactive-bubble-chase"],
    followers: ["maya", "tom"],
  },

  {
    id: "priya",
    name: "Priya",
    role: "Teacher",
    location: "Mumbai",
    bio: "Early years teacher. I love turning classroom activities into home routines.",
    socials: { website: "https://priyaece.com", instagram: "https://instagram.com/priya.teaches" },
    color: "bg-violet-500",
    favouriteActivityIds: ["story-time-props", "mirror-emotions"],
    followers: ["elena", "zara"],
  },

  {
    id: "elena",
    name: "Elena",
    role: "Creator",
    location: "Barcelona",
    bio: "Creating sensory play videos and printable activities for families.",
    socials: { tiktok: "https://tiktok.com/@elena.plays", instagram: "https://instagram.com/elena.plays" },
    color: "bg-pink-500",
    favouriteActivityIds: ["sensory-rice-bin", "playdough-letters"],
    followers: ["maya", "jonas", "tom"],
  },

  {
    id: "tom",
    name: "Tom",
    role: "Grandparent",
    location: "Sydney",
    bio: "Grandpa of three. Simple, low-prep activities are my favourite.",
    socials: { facebook: "https://facebook.com/tom.grandpa" },
    color: "bg-sky-500",
    favouriteActivityIds: ["obstacle-course", "turn-taking-tower"],
    followers: ["zara"],
  },

  {
    id: "zara",
    name: "Zara",
    role: "Caregiver",
    location: "Toronto",
    bio: "Support worker helping families build calm, predictable routines.",
    socials: { instagram: "https://instagram.com/zara.care" },
    color: "bg-rose-500",
    favouriteActivityIds: ["deep-pressure-sandwich", "mirror-emotions"],
    followers: ["priya"],
  },

];

function buildScheduleSharePost(template: Template): Post {
  const owner = memberProfiles.find((m) => m.id === template.ownerId) ?? myProfile;
  const items = template.items.map(
    (it, i) => `${i + 1}. ${it.title} (${it.minutes} mins)\n   - ${it.description}`,
  );
  return {
    id: `post-${template.id}`,
    authorId: template.ownerId,
    authorName: owner.name,
    authorRole: owner.role,
    authorLocation: owner.location,
    kind: "Schedule Share",
    body: `I just shared a new schedule: **${template.name}**\n\n${items.join("\n")}`,
    likes: template.ownerId === "maya" ? 12 : template.ownerId === "priya" ? 7 : 3,
    liked: false,
    reactions: {},
    myReactions: [],
    comments: [],
    reposts: [],
    createdAt: template.createdAt,
    templateId: template.id,
  };
}


const seedPosts: Post[] = [
  buildScheduleSharePost(seedTemplates.find((t) => t.id === "tpl-fine-motor")!),
  buildScheduleSharePost(seedTemplates.find((t) => t.id === "tpl-energy")!),
  buildScheduleSharePost(seedTemplates.find((t) => t.id === "tpl-classroom")!),
  {
    id: "p4",
    authorId: "maya",
    authorName: "Maya",
    authorRole: "Therapist",
    authorLocation: "London",
    kind: "Story",
    body: "Reminder: shorter is better. Three 5-minute blocks beat one 20-minute block for most toddlers in a regulation dip.",
    likes: 24,
    liked: false,
    reactions: { heart: 3, clap: 1 },
    myReactions: [],
    comments: [

      {
        id: uid(),
        authorId: "jonas",
        authorName: "Jonas",
        authorRole: "Parent",
        text: "This changed our whole afternoon routine.",
        createdAt: "2026-08-22",
      },
    ],
    reposts: [],
    createdAt: "2026-08-22",
  },

  {
    id: "p5",
    authorId: "jonas",
    authorName: "Jonas",
    authorRole: "Parent",
    authorLocation: "Berlin",
    kind: "Question",
    body: "Any tips for making Tape Rescue last longer than two minutes? Ours peels everything in a flash.",
    likes: 5,
    liked: false,
    reactions: { heart: 1, helpful: 2 },
    myReactions: [],
    comments: [

      {
        id: uid(),
        authorId: "me",
        authorName: "Sam",
        authorRole: "Parent",
        text: "Try taping around corners so it needs two hands.",
        createdAt: "2026-08-21",
      },
    ],
    reposts: [],
    createdAt: "2026-08-21",
  },

  {
    id: "p6",
    authorId: "elena",
    authorName: "Elena",
    authorRole: "Creator",
    authorLocation: "Barcelona",
    kind: "Promotion",
    body: "I just posted a new printable set of scissor skills strips on my site. Link in bio — grab it for free this week! Great for 3–5 year olds building fine motor control.",
    likes: 18,
    liked: false,
    reactions: { heart: 5, celebrate: 1 },
    myReactions: [],
    comments: [],
    reposts: [],
    createdAt: "2026-08-20",
  },

  {
    id: "p7",
    authorId: "tom",
    authorName: "Tom",
    authorRole: "Grandparent",
    authorLocation: "Sydney",
    kind: "Story",
    body: "We tried the living room obstacle course today. Used cushions and a blanket tunnel. The grandkids were exhausted and happy.",
    likes: 9,
    liked: false,
    reactions: { heart: 2, clap: 1 },
    myReactions: [],
    comments: [

      {
        id: uid(),
        authorId: "zara",
        authorName: "Zara",
        authorRole: "Caregiver",
        text: "Love this. So easy to set up anywhere.",
        createdAt: "2026-08-19",
      },
    ],
    reposts: [],
    createdAt: "2026-08-19",
  },
];



const seedArticles: Article[] = [
  {
    id: "a1",
    authorId: "elena",
    authorName: "Elena",
    authorRole: "Creator",
    title: "Sensory play is not a mess — it is a message",
    excerpt:
      "Why rice bins, water trays and playdough do far more than keep small hands busy, and how to read what your child is telling you through them.",
    body: `When people see a tray of coloured rice on the kitchen floor, they see a mess. I see a child telling me exactly what their nervous system needs today.

**Sensory seeking vs sensory avoiding**
Some children dive both hands into the rice and pour it over their arms. Others touch it with one fingertip and pull away. Neither is wrong. The first child is seeking input; the second is telling you the input is too much right now. Offer a spoon, a scoop, or a smaller tray, and let them set the pace.

**Start smaller than you think**
A shallow baking tray beats a giant bin. Less material means less overwhelm and a faster clean-up, which makes you more likely to do it again tomorrow. Consistency matters more than scale.

**Pair sensory play with language**
Narrate softly: "cold", "smooth", "pouring". You are not testing them. You are giving words to a feeling they already have, which is how vocabulary sticks for a lot of neurodiverse kids.

**Know when to stop**
Stop while it is still fun. Ending on a good moment is what makes a child ask for it again — and repetition is where the real development happens.`,
    tags: ["Sensory", "Play", "Regulation"],
    readMinutes: 4,
    likes: 24,
    liked: false,
    reactions: { heart: 8, clap: 3 },
    myReactions: [],
    comments: [],
    createdAt: "2026-08-28",
  },

  {
    id: "a2",
    authorId: "maya",
    authorName: "Maya",
    authorRole: "Therapist",
    title: "Building fine motor strength before handwriting",
    excerpt:
      "A paediatric OT's order of operations: shoulder, then hand, then pencil. Skipping steps is why so many kids fight the page.",
    body: `Parents often ask me how to help a child who hates writing. My first question is never about the pencil.

**1. Shoulder and core come first**
Writing is a whole-body skill. Wall push-ups, crawling through tunnels, and drawing on paper taped to a wall build the stability a hand needs to be precise.

**2. Then the hand itself**
Tape Rescue, tearing paper, tongs and pom-poms, squeezing playdough. Two to five minutes a day is plenty. You are building endurance, not producing artwork.

**3. Then the tool**
Short, broken crayons force a tripod grip naturally — far more effective than correcting a grip verbally.

**Watch for fatigue, not failure**
A child who writes beautifully for one line and falls apart on the second does not lack effort. They lack endurance, and endurance is trainable.

Give it six weeks of small daily doses before you judge progress.`,
    tags: ["Fine Motor", "Handwriting", "Therapy"],
    readMinutes: 5,
    likes: 41,
    liked: false,
    reactions: { heart: 12, helpful: 5 },
    myReactions: [],
    comments: [],
    createdAt: "2026-08-26",
  },

  {
    id: "a3",
    authorId: "priya",
    authorName: "Priya",
    authorRole: "Teacher",
    title: "Predictable routines beat perfect routines",
    excerpt:
      "What a classroom taught me about home schedules: children settle into rhythm, not into timetables.",
    body: `In my classroom the schedule never runs to the minute, and it does not need to. What children rely on is the order of things, not the clock.

**Same order, flexible timing**
Movement, then focus, then calm. If lunch runs late, the order still holds and the day still feels safe.

**Show it, do not just say it**
Three picture cards on the fridge do more than ten spoken reminders. Let your child move the finished card into a pocket — that small act of control reduces resistance enormously.

**Build transitions into the plan**
The hard part is rarely the activity; it is the gap between two activities. Name it out loud: "two more minutes, then we tidy, then snack."

**Let the child co-author it**
When a child picks the order of two activities, compliance stops being a battle. That is the whole idea behind sharing routines here — you take someone's structure and make it yours.`,
    tags: ["Routines", "Transitions", "Classroom"],
    readMinutes: 3,
    likes: 17,
    liked: false,
    reactions: { heart: 4, clap: 2 },
    myReactions: [],
    comments: [],
    createdAt: "2026-08-23",
  },
];


const demoObservations: Observation[] = [
  {
    id: "o1",
    activityTitle: "Tape Rescue",
    note: "Stayed with it for a full ten minutes. Asked for more.",
    rating: 3,
    date: "2026-08-24",
  },
  {
    id: "o2",
    activityTitle: "Color Matching Hunt",
    note: "Absolute favourite. Wanted to do it twice in a row.",
    rating: 5,
    date: "2026-08-23",
  },
];

const seed: AppState = {
  childName: "",
  childAge: 4,
  profile: null,
  loggedOut: true,
  schedule: seedTemplates[0]!.items.map((i) => ({ ...i, id: uid() })),
  templates: seedTemplates.map((t, i) => ({
    ...t,
    likes: [6, 14, 9, 4][i] ?? 0,
    liked: false,
    ratings: [[5, 4, 5], [5, 5, 4, 5], [4, 4, 5], [5, 3, 4]][i] ?? [],
    tries: [3, 11, 6, 2][i] ?? 0,
    repeatDays: i === 0 ? [1, 2, 3, 4, 5] : [],
  })),

  posts: seedPosts,
  observations: [],
  completedCount: 0,
  favourites: ["color-matching-hunt"],
  members: memberProfiles,
  activities: ACTIVITIES,
  articles: seedArticles,
  dayPlans: [],
  following: [],
};


type Ctx = {
  state: AppState;
  hydrated: boolean;
  devDemo: boolean;
  update: (fn: (prev: AppState) => AppState) => void;
  logout: () => void;
  login: (profile: Profile) => void;
  enterDevDemo: () => void;
  exitDevDemo: () => void;
  tryTemplate: (templateId: string) => void;
  toggleTemplateLike: (templateId: string) => void;
  rateTemplate: (templateId: string, stars: number) => void;
  setTemplateRepeat: (templateId: string, days: number[]) => void;
  addDayPlan: (date: string, templateId: string) => void;
  removeDayPlan: (id: string) => void;
  toggleFollow: (memberId: string) => void;
  isFollowing: (memberId: string) => boolean;
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const averageRating = (t: Template) =>
  t.ratings?.length ? t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length : 0;


const AppContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(seed);
  const [hydrated, setHydrated] = useState(false);
  const [devDemo, setDevDemo] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        setState((prev) => ({
          ...prev,
          ...parsed,
          // Always restore derived/reference collections if missing
          activities: prev.activities,
          members: prev.members,
          articles: parsed.articles?.length ? parsed.articles : prev.articles,
          dayPlans: parsed.dayPlans ?? prev.dayPlans,
          following: parsed.following ?? prev.following,
          profile: parsed.profile ?? prev.profile,
        }));
      }

      if (import.meta.env.DEV && window.sessionStorage.getItem(DEV_DEMO_KEY) === "1") {
        setDevDemo(true);
        setState((prev) => ({
          ...prev,
          profile: myProfile,
          loggedOut: false,
          childName: prev.childName || "Nora",
          childAge: prev.childAge || 4,
          observations: prev.observations.length ? prev.observations : demoObservations,
          completedCount: prev.completedCount || 4,
        }));
      }

      // Try to load a shared schedule from the URL
      const params = new URLSearchParams(window.location.search);
      const tryTemplateId = params.get("try");
      if (tryTemplateId) {
        const tpl = seed.templates.find((t) => t.id === tryTemplateId);
        if (tpl) {
          setState((prev) => ({
            ...prev,
            schedule: tpl.items.map((i) => ({ ...i, id: uid(), done: false })),
          }));
          // Remove the param so reloads don't reset the schedule
          const url = new URL(window.location.href);
          url.searchParams.delete("try");
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(DEV_DEMO_KEY);
    } catch {
      /* ignore */
    }
    setDevDemo(false);
    update((prev) => ({ ...prev, profile: null, loggedOut: true }));
  }, [update]);

  const login = useCallback(
    (profile: Profile) => {
      update((prev) => ({ ...prev, profile, loggedOut: false }));
    },
    [update],
  );

  const enterDevDemo = useCallback(() => {
    if (!import.meta.env.DEV) return;
    try {
      window.sessionStorage.setItem(DEV_DEMO_KEY, "1");
    } catch {
      /* ignore */
    }
    setDevDemo(true);
    update((prev) => ({
      ...prev,
      profile: myProfile,
      loggedOut: false,
      childName: prev.childName || "Nora",
      childAge: prev.childAge || 4,
      observations: prev.observations.length ? prev.observations : demoObservations,
      completedCount: prev.completedCount || 4,
    }));
  }, [update]);

  const exitDevDemo = useCallback(() => {
    try {
      window.sessionStorage.removeItem(DEV_DEMO_KEY);
    } catch {
      /* ignore */
    }
    setDevDemo(false);
  }, []);

  const tryTemplate = useCallback(
    (templateId: string) => {
      update((prev) => {
        const tpl = prev.templates.find((t) => t.id === templateId) ?? seed.templates.find((t) => t.id === templateId);
        if (!tpl) return prev;
        return {
          ...prev,
          schedule: tpl.items.map((i) => ({ ...i, id: uid(), done: false, fromTemplateId: tpl.id })),
          templates: prev.templates.map((t) =>
            t.id === templateId ? { ...t, tries: (t.tries ?? 0) + 1 } : t,
          ),
        };
      });
    },
    [update],
  );

  const toggleTemplateLike = useCallback(
    (templateId: string) => {
      update((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id === templateId
            ? { ...t, liked: !t.liked, likes: (t.likes ?? 0) + (t.liked ? -1 : 1) }
            : t,
        ),
      }));
    },
    [update],
  );

  const rateTemplate = useCallback(
    (templateId: string, stars: number) => {
      update((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => {
          if (t.id !== templateId) return t;
          const base = [...(t.ratings ?? [])];
          if (t.myRating) {
            const idx = base.indexOf(t.myRating);
            if (idx >= 0) base.splice(idx, 1);
          }
          return { ...t, ratings: [...base, stars], myRating: stars };
        }),
      }));
    },
    [update],
  );

  const setTemplateRepeat = useCallback(
    (templateId: string, days: number[]) => {
      update((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => (t.id === templateId ? { ...t, repeatDays: days } : t)),
      }));
    },
    [update],
  );

  const addDayPlan = useCallback(
    (date: string, templateId: string) => {
      update((prev) => {
        const tpl = prev.templates.find((t) => t.id === templateId);
        if (!tpl) return prev;
        return {
          ...prev,
          dayPlans: [...prev.dayPlans, { id: uid(), date, templateId, name: tpl.name }],
        };
      });
    },
    [update],
  );

  const removeDayPlan = useCallback(
    (id: string) => {
      update((prev) => ({ ...prev, dayPlans: prev.dayPlans.filter((p) => p.id !== id) }));
    },
    [update],
  );

  const toggleFollow = useCallback(
    (memberId: string) => {
      update((prev) => {
        const list = prev.following ?? [];
        return {
          ...prev,
          following: list.includes(memberId)
            ? list.filter((f) => f !== memberId)
            : [...list, memberId],
        };
      });
    },
    [update],
  );

  const isFollowing = useCallback(
    (memberId: string) => (state.following ?? []).includes(memberId),
    [state.following],
  );

  const value = useMemo(
    () => ({
      state,
      hydrated,
      devDemo,
      update,
      logout,
      login,
      enterDevDemo,
      exitDevDemo,
      tryTemplate,
      toggleTemplateLike,
      rateTemplate,
      setTemplateRepeat,
      addDayPlan,
      removeDayPlan,
      toggleFollow,
      isFollowing,
    }),
    [
      state,
      hydrated,
      devDemo,
      update,
      logout,
      login,
      enterDevDemo,
      exitDevDemo,
      tryTemplate,
      toggleTemplateLike,
      rateTemplate,
      setTemplateRepeat,
      addDayPlan,
      removeDayPlan,
      toggleFollow,
      isFollowing,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}


