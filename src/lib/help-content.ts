export type HelpHub = "child_overwhelm" | "caregiver_overwhelm";

export type HelpSource = {
  label: string;
  url: string;
};

export type HelpItem = {
  id: string;
  hub: HelpHub;
  order: number;
  title: string;
  audience: string;
  mostImportant: string[];
  steps: string[];
  avoid: string[];
  urgentHelp: string;
  sources: HelpSource[];
  furtherReading?: HelpSource[];
  clinicianReviewRequired: boolean;
  clinicianReviewNotes?: string;
};

export type LocalSupportLink = {
  label: string;
  url: string;
};

export const HELP_BANNER =
  "This is general caregiver education, not medical advice.";

export const HELP_EMERGENCY_DISCLAIMER =
  "If anyone is in immediate danger, seriously hurt, or cannot be kept safe, call your local emergency number right away (e.g. 112 in the EU / Netherlands, 911 in the US, 999 in the UK). NeuroHelper does not provide emergency services or clinical care.";

export const HELP_CLINICIAN_CHIP = "Review with your child’s professionals.";

export const HELP_AUDIENCE_NOTE =
  "Caregivers of a neurodivergent child or related needs. These steps can also help with a neurotypical child who is overwhelmed. Words like “meltdown” or “shutdown” are caregiver-education language, not diagnoses.";

export const HELP_CLINICIAN_COPY =
  "These pages are caregiver education, not a diagnosis or therapy plan. Bring what is useful to your child’s professionals and follow their guidance for your family.";

export const HELP_HUBS: { id: HelpHub; title: string; subtitle: string }[] = [
  {
    id: "child_overwhelm",
    title: "When my child is overwhelmed",
    subtitle: "Safety, sensory load, communication, and recovery.",
  },
  {
    id: "caregiver_overwhelm",
    title: "When I am overwhelmed",
    subtitle: "Burnout, asking for help, and respite.",
  },
];

export const HELP_ITEMS: HelpItem[] = [
  {
    id: "child-during-overwhelm-safety",
    hub: "child_overwhelm",
    order: 1,
    title: "During overwhelm: safety first",
    audience:
      "Caregivers of a neurodivergent child or related needs in the middle of screaming, aggression, property damage, freezing, or loss of control.",
    mostImportant: [
      "Safety first: child, siblings, and you.",
      "Stay calm and reduce input; this is not teaching time.",
      "Get emergency help if anyone cannot be kept safe.",
    ],
    steps: [
      "Check safety first: move sharp objects, hot items, and hard edges out of reach; guide the child gently to a safer spot if needed.",
      "Move siblings and onlookers away if that is part of your plan, so the child has less audience and less pressure.",
      "Lower sensory load: dim lights, turn down noise/TV, reduce talking and crowded faces.",
      "Stay nearby and present. Do not leave an unsafe child alone.",
      "Use a calm, quiet presence. Short phrases only if needed (“You’re safe.” “I’m here.”).",
      "At peak intensity, wait it out while keeping everyone safe. Do not try to teach, reason, or problem-solve yet.",
      "Touch only if you already know it helps this child; otherwise keep a respectful distance.",
      "When intensity drops: offer rest, water, and comfort only if welcomed; reconnect slowly.",
    ],
    avoid: [
      "Do not punish, lecture, or threaten consequences in the moment.",
      "Do not force talking, eye contact, or hugs.",
      "Do not pile on questions or long explanations.",
      "Do not leave the child alone if they are unsafe.",
      "Do not use restraint or holds based on app advice.",
      "Do not shame the child (“You’re being dramatic,” “Stop acting out”).",
      "Do not treat this as the time to start new skills or “teach a lesson.”",
    ],
    urgentHelp:
      "Call emergency services if serious injury is happening or likely, self-harm is severe, or the crisis cannot be contained safely. If you feel unsafe, get help.",
    sources: [
      {
        label: "Child Mind Institute: How to De-Escalate an Autistic Meltdown",
        url: "https://childmind.org/article/how-to-de-escalate-an-autistic-meltdown/",
      },
      {
        label: "Autism Society of North Carolina: Toddler Tantrum or Meltdown?",
        url: "https://www.autismsociety-nc.org/tantrum-or-meltdown/",
      },
      {
        label: "Seattle Children’s: Autistic Meltdowns, Shutdowns and Burnout",
        url: "https://www.seattlechildrens.org/clinics/autism-center/the-autism-blog/autistic-meltdowns-shutdowns-burnout/",
      },
      {
        label: "CHADD: From Meltdowns to Calm",
        url: "https://chadd.org/attention-article/from-meltdowns-to-calm-helping-children-and-teens-with-emotional-regulation/",
      },
      {
        label: "Understood.org: Taming tantrums vs. managing meltdowns",
        url: "https://www.understood.org/en/articles/taming-tantrums-vs-managing-meltdowns",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Do not teach restraint in-app. No medication advice in product. “Meltdown” language originates in autism caregiver education; keep framing educational and applicable to other neurodivergent overwhelm.",
  },
  {
    id: "child-early-warning-signs",
    hub: "child_overwhelm",
    order: 2,
    title: "Early signs: when overwhelm is building",
    audience: "Caregivers who want to intervene before full overload for a neurodivergent child or related needs.",
    mostImportant: [
      "Notice early signs and act early while the child can still use supports.",
      "Stay calm, speak less, and give processing time.",
      "If escalation continues, switch to safety mode. Stop teaching.",
    ],
    steps: [
      "Watch for early signs (examples from caregiver education): pacing, rocking or becoming very still, repetitive questions, fidgeting, covering ears, trying to leave or hide, less cooperation, zoning out, talking less, or sudden irritability.",
      "Regulate yourself first: slow your breathing and lower your voice before you intervene.",
      "Speak less. Use short, concrete words, a gesture, a sign, or a visual choice card the child already knows.",
      "Try gentle prevention: remove or reduce the trigger, offer a known calming tool, move toward a quieter space, or pause a hard transition.",
      "Give processing time. Wait after one simple request or choice before adding more.",
      "Offer one clear option when possible (“Quiet corner or headphones?”) instead of many open questions.",
      "If escalation continues, shift to safety mode (see “During overwhelm: safety first”). Stop trying to teach once the child is past early agitation.",
    ],
    avoid: [
      "Do not ignore early signs and wait until a full crisis if you can help sooner.",
      "Do not talk fast or stack questions (“Why are you upset? What happened? Are you hungry?”).",
      "Do not force the child to “use their words” when language is already hard.",
      "Do not keep pushing the original demand once overload is clearly building.",
      "Do not shame early agitation (“You’re overreacting”).",
      "Do not invent new coping tools in the moment. Stick to what already works for this child.",
    ],
    urgentHelp:
      "If aggression or self-injury is starting and you cannot keep anyone safe: call emergency services. Consider planning ahead with local services if crises are frequent.",
    sources: [
      {
        label: "National Autistic Society: Meltdowns",
        url: "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences",
      },
      {
        label: "Child Mind Institute: How to De-Escalate an Autistic Meltdown",
        url: "https://childmind.org/article/how-to-de-escalate-an-autistic-meltdown/",
      },
      {
        label: "Understood.org: Taming tantrums vs. managing meltdowns",
        url: "https://www.understood.org/en/articles/taming-tantrums-vs-managing-meltdowns",
      },
      {
        label: "CHADD: From Meltdowns to Calm",
        url: "https://chadd.org/attention-article/from-meltdowns-to-calm-helping-children-and-teens-with-emotional-regulation/",
      },
      {
        label: "NDSS: Understanding Behavior",
        url: "https://ndss.org/resources/managing-behavior",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Early-sign lists are educational models, not universal clinical criteria. Coping menus should be individualized with the child’s professionals.",
  },
  {
    id: "child-sensory-overload",
    hub: "child_overwhelm",
    order: 3,
    title: "Sensory overload: lower the load",
    audience:
      "Caregivers of a neurodivergent child or related needs when noise, light, crowds, textures, smells, clothing, or busy places overwhelm the child.",
    mostImportant: [
      "Reduce sensory input as fast as you safely can.",
      "Allow safe self-soothing; do not rush recovery.",
      "Keep speech minimal and stay nearby.",
    ],
    steps: [
      "Turn off or remove what you can right away (TV/music off, bright lights down, leave the crowded aisle or noisy room).",
      "If you cannot remove the trigger, move to a quieter space or ask others to step back and give space.",
      "Reassure briefly that they are safe (“You’re safe. We can leave.”); then stop talking.",
      "Allow safe self-soothing or stimming; do not stop it unless the child is hurting themselves.",
      "Offer only known tools from their kit (headphones, fidget, preferred texture, dark corner) if those already help this child.",
      "Soften clothing or remove uncomfortable items only if the child accepts help with that.",
      "Give enough recovery time; do not rush back into demands, errands, or school tasks.",
      "After recovery, note what overloaded them so you can plan next time (noise, lights, crowds, smells, transitions).",
    ],
    avoid: [
      "Do not force the child to “tough it out” in a noisy or crowded place.",
      "Do not stop safe stimming or rocking to make them look “more normal.”",
      "Do not add more sensory input (loud pep talks, bright screens, crowded hugs).",
      "Do not buy or prescribe weighted products or “sensory diets” based on the app.",
      "Do not shame sensory needs (“It’s not that loud”).",
      "Do not rush them back into the same environment the moment they look a little calmer.",
    ],
    urgentHelp:
      "If panic or self-injury escalates beyond what you can keep safe: call emergency services. For ongoing severe sensory impact, discuss occupational therapy assessment with clinicians.",
    sources: [
      {
        label: "Understood.org: ADHD and sensory overload",
        url: "https://www.understood.org/en/articles/adhd-sensory-overload",
      },
      {
        label: "Understood.org: Understanding sensory processing challenges",
        url: "https://www.understood.org/en/articles/understanding-sensory-processing-challenges",
      },
      {
        label: "National Autistic Society: Sensory processing",
        url: "https://www.autism.org.uk/advice-and-guidance/about-autism/sensory-processing",
      },
      {
        label: "National Autistic Society: Meltdowns",
        url: "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences",
      },
      {
        label: "NDSS: PT, OT, Speech & Down Syndrome",
        url: "https://ndss.org/resources/pt-ot-down-syndrome",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "“Sensory overload” is caregiver language, not a formal clinical diagnosis by itself. Do not prescribe products (weighted items, etc.). Avoid strong efficacy claims for sensory diets. Understood notes sensory overload is often associated with autism but can also occur with ADHD and other profiles.",
  },
  {
    id: "child-tantrum-vs-meltdown-overload",
    hub: "child_overwhelm",
    order: 4,
    title: "Tantrum, meltdown, or overload? (educational)",
    audience: "Caregivers of a neurodivergent child or related needs when big upset looks similar either way.",
    mostImportant: [
      "You do not need a perfect label in the moment. Safety and calm presence come first.",
      "Do not punish intense overwhelm as “naughty” behavior while it is happening.",
      "Save teaching and problem-solving for after everyone is calm.",
    ],
    steps: [
      "Remember caregiver education often describes a tantrum as more goal-directed (some control; may stop if the child gets what they want or attention shifts). A meltdown or overload response is usually described as involuntary: temporary loss of control; reasoning may not work.",
      "Keep in mind: the words “meltdown” and “shutdown” come mainly from caregiver education. Similar overwhelm can happen for many children, including neurotypical children under extreme stress.",
      "If you are not sure which it is, that is OK. You can still respond the same way: be a calm, supportive presence.",
      "During intense overwhelm: prioritize safety, reduce demands and talking, and stay nearby.",
      "Do not treat the episode as willful misbehavior to punish in the moment.",
      "After everyone is calm, you can briefly notice what helped and what to try next time, without blame.",
      "Save teaching, problem-solving, and consequence talks for later, when the child can learn again.",
    ],
    avoid: [
      "Do not use this as a diagnostic tool or label the child as “manipulative.”",
      "Do not punish or shame during peak overwhelm.",
      "Do not argue about whether it “counts” as a tantrum while the child is still distressed.",
      "Do not force one label on every outburst. Focus on safety and support.",
      "Do not force a long talk about feelings while the child is still overloaded.",
      "Do not treat getting the label right as more important than keeping everyone safe.",
    ],
    urgentHelp:
      "If someone is hurt, at risk of serious injury, or you cannot keep anyone safe: call local emergency services.",
    sources: [
      {
        label: "Understood.org: Taming tantrums vs. managing meltdowns",
        url: "https://www.understood.org/en/articles/taming-tantrums-vs-managing-meltdowns",
      },
      {
        label: "Understood.org: The difference between tantrums and meltdowns",
        url: "https://www.understood.org/en/articles/the-difference-between-tantrums-and-meltdowns",
      },
      {
        label: "National Autistic Society: Meltdowns",
        url: "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences",
      },
      {
        label: "Child Mind Institute: How to De-Escalate an Autistic Meltdown",
        url: "https://childmind.org/article/how-to-de-escalate-an-autistic-meltdown/",
      },
      {
        label: "Autism Society of North Carolina: Toddler Tantrum or Meltdown?",
        url: "https://www.autismsociety-nc.org/tantrum-or-meltdown/",
      },
      {
        label: "CHADD: ADHD Meltdowns",
        url: "https://chadd.org/attention-article/adhd-meltdowns-the-childs-side-of-the-story-and-what-you-should-do/",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Meltdown vs tantrum framing is widely used in caregiver education but contested. Do not ship as a diagnostic tool. Avoid language that labels children as manipulative. Do not collapse all ADHD outbursts into “autistic meltdown.”",
  },
  {
    id: "child-shutdown-withdrawal",
    hub: "child_overwhelm",
    order: 5,
    title: "Shutdown or withdrawal: when they go quiet",
    audience:
      "Caregivers when a neurodivergent child or related needs goes quiet, withdraws, stops talking, freezes, or seems “checked out” after stress.",
    mostImportant: [
      "Quiet withdrawal can be protection, not rudeness. Give space and time.",
      "Stay nearby; keep demands low.",
      "Seek urgent help if safety, self-harm, or a medical issue is a concern.",
    ],
    steps: [
      "Reframe what you are seeing: withdrawal is not stubbornness or rudeness. It can be the body’s way of protecting itself when overloaded. “Shutdown” language comes from caregiver education; similar quiet withdrawal can happen for many children.",
      "Help move to a quieter, comfortable place with low light and less noise.",
      "Speak kindly nearby in short phrases; they may still understand even if not responding. Prefer visuals or gestures if speech is hard under stress.",
      "Stay patient and present. Give space and time without hovering or probing.",
      "After recovery, reduce stacked demands and protect quiet recharge time.",
      "Later, notice early cues such as talking less or pulling away, and offer calming tools earlier next time.",
      "Use prevention supports you already have: visuals, predictability, and known calming tools.",
    ],
    avoid: [
      "Do not call them rude, lazy, or “ignoring you on purpose.”",
      "Do not force conversation, eye contact, or “snap out of it.”",
      "Do not pile questions or demands while they are withdrawn.",
      "Do not leave them alone if they cannot stay safe.",
      "Do not shame the quiet period afterward.",
      "Do not assume it is “just attitude” if behavior changes suddenly. Consider a medical check-in with a clinician.",
    ],
    urgentHelp:
      "If withdrawal includes inability to stay safe, suspected medical issue, self-harm, or suicidal talk: seek emergency or urgent clinical help.",
    sources: [
      {
        label: "Seattle Children’s: Autistic Meltdowns, Shutdowns and Burnout",
        url: "https://www.seattlechildrens.org/clinics/autism-center/the-autism-blog/autistic-meltdowns-shutdowns-burnout/",
      },
      {
        label: "National Autistic Society: Meltdowns",
        url: "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences",
      },
      {
        label: "National Autistic Society: Urgent help",
        url: "https://www.autism.org.uk/contact-us/urgent-help",
      },
      {
        label: "Understood.org: Understanding sensory processing challenges",
        url: "https://www.understood.org/en/articles/understanding-sensory-processing-challenges",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Meltdown / shutdown / burnout are useful caregiver framing but not DSM diagnoses. Differentiate carefully from depression, seizure, illness, or hearing/medical issues: especially relevant for Down syndrome when behavior changes suddenly (see NDSS medical-rule-out guidance).",
  },
  {
    id: "child-after-the-storm",
    hub: "child_overwhelm",
    order: 6,
    title: "After the storm: recover, then reconnect",
    audience: "Caregivers of a neurodivergent child or related needs once the peak has passed.",
    mostImportant: [
      "Expect tiredness and keep demands low.",
      "Reconnect gently. No blame, no immediate re-issue of the hard demand.",
      "Debrief later, in the child’s communication style, when both of you are calm.",
    ],
    steps: [
      "Expect tiredness, confusion, or embarrassment. Allow rest and keep demands low.",
      "Offer water, a quiet spot, and comfort only if the child wants it.",
      "Co-regulate gently when safe (model slow breathing; offer touch only if wanted).",
      "Do not immediately re-issue the demand that coincided with the overwhelm.",
      "Later, when both are calm: have a brief, non-blaming talk about what happened and what might help next time. Match the child’s communication style (words, visuals, signs, AAC).",
      "Note patterns (sleep, hunger, transitions, sensory load, stacked demands, communication barriers).",
      "Check in with siblings who witnessed the episode; keep that talk simple and reassuring.",
      "Update your home plan with one small change that might help next time.",
    ],
    avoid: [
      "Do not launch into a long lecture or punishment as soon as the peak ends.",
      "Do not force an apology while the child is still exhausted or ashamed.",
      "Do not immediately restart the same hard demand.",
      "Do not blame the child for having been overwhelmed.",
      "Do not skip sibling check-ins if other children were scared or upset.",
      "Do not treat a calm moment as proof they “could have controlled it all along.”",
    ],
    urgentHelp:
      "If injuries need care, or if overwhelm episodes are frequent/worsening and home safety is shaky: contact the child’s clinician or crisis pathways. Emergencies → local emergency number.",
    sources: [
      {
        label: "Autism Society of North Carolina: Toddler Tantrum or Meltdown?",
        url: "https://www.autismsociety-nc.org/tantrum-or-meltdown/",
      },
      {
        label: "Understood.org: Taming tantrums vs. managing meltdowns",
        url: "https://www.understood.org/en/articles/taming-tantrums-vs-managing-meltdowns",
      },
      {
        label: "Child Mind Institute: How to De-Escalate an Autistic Meltdown",
        url: "https://childmind.org/article/how-to-de-escalate-an-autistic-meltdown/",
      },
      {
        label: "National Autistic Society: Meltdowns",
        url: "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences",
      },
      {
        label: "CHADD: From Meltdowns to Calm",
        url: "https://chadd.org/attention-article/from-meltdowns-to-calm-helping-children-and-teens-with-emotional-regulation/",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Debrief timing and style should match the child’s communication profile and therapy plan.",
  },
  {
    id: "child-big-emotions-dysregulation",
    hub: "child_overwhelm",
    order: 7,
    title: "Big emotions & emotional dysregulation",
    audience:
      "Caregivers of a neurodivergent child or related needs when frustration, screaming, or explosive moments hit.",
    mostImportant: [
      "Your calm matters. High adult arousal can raise the child’s arousal too.",
      "Prefer short instructions and proactive structure over shouting matches.",
      "Protect your own oxygen mask so you can keep everyone safer.",
    ],
    steps: [
      "Remember: big emotions and dysregulation are real challenges for many children, not simply “bad behavior.”",
      "Check your own arousal. If you feel out of control, step away briefly while keeping the child safe rather than escalating harm.",
      "Use short instructions and reduce decision load (“Shoes on.” “Sit here.”).",
      "Keep routines and predictable structure where possible; big feelings often spike when life is unpredictable.",
      "Prefer proactive supports (cooling-off space, advance warnings, parent-training strategies you already use) over reactive shouting matches.",
      "After calm: reconnect; problem-solve skills only when the child can learn again.",
      "Protect your own oxygen mask. Even 5 minutes of something restorative counts.",
      "If patterns are frequent or worsening, talk with the child’s clinician about supports that fit this child’s plan.",
    ],
    avoid: [
      "Do not match yelling with yelling or turn it into a power struggle.",
      "Do not pile long lectures while emotions are still high.",
      "Do not shame big feelings (“You’re too sensitive,” “Stop being dramatic”).",
      "Do not force one label on every outburst. Focus on safety and support.",
      "Do not self-diagnose yourself or your child via the app.",
      "Do not skip your own care until you are burned out and unsafe.",
      "Do not use medication advice from this app.",
    ],
    urgentHelp:
      "Danger to self or others → emergency services. Persistent exhaustion or depression → professional mental-health help.",
    sources: [
      {
        label: "CHADD: From Meltdowns to Calm",
        url: "https://chadd.org/attention-article/from-meltdowns-to-calm-helping-children-and-teens-with-emotional-regulation/",
      },
      {
        label: "CHADD: ADHD Meltdowns",
        url: "https://chadd.org/attention-article/adhd-meltdowns-the-childs-side-of-the-story-and-what-you-should-do/",
      },
      {
        label: "CHADD: First Put on Your Own Oxygen Mask…",
        url: "https://chadd.org/attention-article/first-put-on-your-own-oxygen-mask-be-a-better-parent-by-caring-for-yourself/",
      },
      {
        label: "CHADD: Parenting a Child with ADHD",
        url: "https://chadd.org/for-parents/overview/",
      },
      {
        label: "CHADD: ADHD & Stress",
        url: "https://chadd.org/for-parents/adhd-stress-information-for-parents/",
      },
      {
        label: "Understood.org: Taming tantrums vs. managing meltdowns",
        url: "https://www.understood.org/en/articles/taming-tantrums-vs-managing-meltdowns",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Do not equate all ADHD outbursts with “autistic meltdown.” Mechanisms and supports can differ. Parent ADHD screening suggestions must stay “talk to a professional,” not in-app diagnosis.",
  },
  {
    id: "child-communication-under-stress",
    hub: "child_overwhelm",
    order: 8,
    title: "When words are hard: communication under stress",
    audience: "Caregivers of a neurodivergent child or related needs.",
    mostImportant: [
      "Behavior under stress is often communication, not defiance.",
      "Slow down; use short language plus visuals or AAC the child already uses.",
      "Unexpected change and long talk are common overwhelm triggers. Plan transitions.",
    ],
    steps: [
      "Assume the child may understand more than they can say. Behavior under stress is often communication (need, pain, escape, sensory discomfort, confusion), not defiance.",
      "Slow down. Use short, concrete language. Pair speech with visuals, gestures, signs, pictures, or AAC the child already uses.",
      "For transitions: give advance warning, use first/then or a simple visual schedule, and allow processing time.",
      "Offer limited choices instead of open-ended questions when the child is stressed (“Blue shirt or red shirt?”).",
      "Reduce multi-step verbal instructions; do one step at a time.",
      "If behavior changes suddenly, consider medical causes (pain, hearing, sleep, illness) with a clinician.",
      "Keep supports consistent across home and school when possible; follow speech-language and occupational therapy plans you already have.",
    ],
    avoid: [
      "Do not force speech (“Use your words”) when the child is already overloaded.",
      "Do not treat AAC, signs, or pictures as “blocking speech.”",
      "Do not give long multi-step verbal instructions during stress.",
      "Do not spring big transitions with no warning when you can plan ahead.",
      "Do not shame communication struggles.",
      "Do not ignore sudden behavior change without considering medical check-in.",
      "Do not invent medication or therapy changes based on the app.",
    ],
    urgentHelp:
      "If communication breakdown coincides with serious injury risk, unexplained sudden behavior change, or you cannot keep anyone safe: seek emergency or urgent clinical help.",
    sources: [
      {
        label: "NDSS: Physical Therapy, Occupational Therapy, Speech, & Down Syndrome",
        url: "https://ndss.org/resources/pt-ot-down-syndrome",
      },
      {
        label: "NDSS: Early Intervention",
        url: "https://ndss.org/resources/early-intervention",
      },
      {
        label: "NDSS: Understanding Behavior",
        url: "https://ndss.org/resources/managing-behavior",
      },
      {
        label: "Adult Down Syndrome Center: Use of Visual Supports",
        url: "https://adultdownsyndrome.org/resources/use-of-visual-supports/",
      },
      {
        label: "Adult Down Syndrome Center: Navigating Transitions",
        url: "https://adultdownsyndrome.org/resources/navigating-transitions-article/",
      },
      {
        label: "Understood.org: Understanding sensory processing challenges",
        url: "https://www.understood.org/en/articles/understanding-sensory-processing-challenges",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "No medication advice. Do not present AAC/sign as “blocking speech.” Ground strategies in the child’s existing therapy plan. Adult Down Syndrome Center pages are practical on visuals/transitions; pair with pediatric NDSS speech/OT guidance.",
  },
  {
    id: "caregiver-when-you-are-overwhelmed",
    hub: "caregiver_overwhelm",
    order: 1,
    title: "When you are overwhelmed",
    audience:
      "Caregivers of a neurodivergent child or related needs who feel exhausted, isolated, irritable, or always “on.”",
    mostImportant: [
      "Caring for yourself is part of caring for your child, not a luxury.",
      "Notice burnout signs early and take small breaks when a full break is impossible.",
      "Get emergency or crisis help immediately if anyone’s safety is at risk.",
    ],
    steps: [
      "Remind yourself: caring for yourself is part of caring for your child (“oxygen mask”), not a luxury you earn later.",
      "Start with 5-10 minutes of real self-care when a full break is impossible (music, short walk, breathing, hobby slot with cover).",
      "Name stress early. Watch for burnout signs such as fatigue, irritability, isolation, sleep/appetite changes, or persistent sadness.",
      "Protect sleep and short outdoor time when possible.",
      "Tell your own doctor you are a caregiver and what the load feels like.",
      "If you suspect you also have a support need of your own, discuss with a clinician (do not self-diagnose via the app).",
      "Reach out to one trusted person today. Even a short check-in counts.",
    ],
    avoid: [
      "Do not wait until you collapse before asking for help.",
      "Do not shame yourself for needing rest or support.",
      "Do not self-diagnose any condition through the app.",
      "Do not use this app for medication advice for you or your child.",
      "Do not isolate completely if you can safely tell one person you are struggling.",
      "Do not ignore thoughts of harming yourself or your child. Get emergency help.",
    ],
    urgentHelp:
      "Thoughts of harming yourself or the child, inability to keep anyone safe, or acute mental-health crisis → emergency services / local crisis lines immediately.",
    sources: [
      {
        label: "Child Mind Institute: Self-Care Tips for Parents to Prevent Burnout",
        url: "https://childmind.org/article/fighting-caregiver-burnout-special-needs-kids/",
      },
      {
        label: "Mayo Clinic: Caregiver stress",
        url: "https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/caregiver-stress/art-20044784",
      },
      {
        label: "CHADD: First Put on Your Own Oxygen Mask…",
        url: "https://chadd.org/attention-article/first-put-on-your-own-oxygen-mask-be-a-better-parent-by-caring-for-yourself/",
      },
      {
        label: "CHADD: Irritable and Overwhelmed? Signs of Parental Burnout",
        url: "https://chadd.org/adhd-news/adhd-news-caregivers/irritable-and-overwhelmed-signs-of-parental-burnout/",
      },
      {
        label: "NDSS: Caregiving & Down Syndrome Resources",
        url: "https://ndss.org/resources/caregiving-down-syndrome-resources",
      },
    ],
    furtherReading: [
      {
        label: "Autism Speaks: Caring for the caregiver",
        url: "https://www.autismspeaks.org/tool-kit-excerpt/caring-caregiver",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Keep tone supportive, not shaming. Localize crisis links for NL/EU. Parent ADHD screening must stay “talk to a professional.”",
  },
  {
    id: "caregiver-asking-for-help-support-network",
    hub: "caregiver_overwhelm",
    order: 2,
    title: "Asking for help & building a support network",
    audience: "Caregivers of a neurodivergent child or related needs who need practical and emotional support.",
    mostImportant: [
      "Ask for specific help. Vague offers rarely turn into real support.",
      "Align key adults where you can; inconsistency raises everyone’s stress.",
      "Crisis feelings need real emergency or professional help, not only peer chat.",
    ],
    steps: [
      "Ask for specific help (pickups, a meal, sibling watch, one evening cover) rather than waiting for “let me know if you need anything.”",
      "Align co-parents and other adults on approaches where possible; inconsistency raises everyone’s stress.",
      "Build a small team: trusted family/friends, school contacts, therapists, and peer caregivers who “get it.”",
      "Join peer support. Condition-specific groups are fine as add-ons; many families also benefit from broad special-needs parent networks.",
      "Talk to someone who will listen without fixing everything.",
      "Consider a therapist or counselor if stress is constant, for you, not only for your child.",
      "Keep a short list of who to call for practical help vs. who to call in a crisis.",
    ],
    avoid: [
      "Do not assume asking for help means you have failed.",
      "Do not wait for people to guess what you need.",
      "Do not try to carry every role alone if safe help is available.",
      "Do not use only online forums when you need urgent safety support.",
      "Do not keep co-parent conflict high without seeking mediation or professional help when it harms the child.",
      "Do not treat peer tips as medical advice or medication guidance.",
    ],
    urgentHelp: "Crisis safety issues or suicidal/hopeless feelings → emergency or professional help now.",
    sources: [
      {
        label: "Child Mind Institute: Self-Care Tips for Parents to Prevent Burnout",
        url: "https://childmind.org/article/fighting-caregiver-burnout-special-needs-kids/",
      },
      {
        label: "Mayo Clinic: Caregiver stress",
        url: "https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/caregiver-stress/art-20044784",
      },
      {
        label: "CHADD: Parenting a Child with ADHD",
        url: "https://chadd.org/for-parents/overview/",
      },
      {
        label: "CHADD: ADHD & Stress",
        url: "https://chadd.org/for-parents/adhd-stress-information-for-parents/",
      },
      {
        label: "NDSS: Caregiving & Down Syndrome Resources",
        url: "https://ndss.org/resources/caregiving-down-syndrome-resources",
      },
    ],
    furtherReading: [
      {
        label: "National Autistic Society: Advice hub",
        url: "https://www.autism.org.uk/advice-and-guidance",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Prefer broad framing; list condition-specific orgs in sources only. Add NL/EU associations before production.",
  },
  {
    id: "caregiver-respite-and-burnout",
    hub: "caregiver_overwhelm",
    order: 3,
    title: "Respite & caregiver burnout",
    audience: "Caregivers of a neurodivergent child or related needs who need temporary relief before exhaustion becomes crisis.",
    mostImportant: [
      "Respite is legitimate support, not failure. Plan it before you are exhausted.",
      "Strong burnout signs mean getting help is urgent for you and your child.",
      "Acute safety or mental-health emergencies need local emergency services now.",
    ],
    steps: [
      "Treat respite as temporary relief for the caregiver so care can continue. It is legitimate support, not failure.",
      "Plan respite earlier than you think you need it. ARCH and similar networks advise using breaks before you are exhausted and isolated.",
      "Explore options: trusted family/friends, community programs, disability organizations, school-age care swaps, or formal respite services where available.",
      "Combine short regular breaks with longer planned relief when possible.",
      "Protect what you do with that time: rest, appointments, or something restorative for you.",
      "If burnout signs are already strong (constant irritability, emotional distance, collapse of daily functioning), treat getting help as urgent, for you and for your child.",
      "Ask clinicians, school, or local disability services about respite pathways in your area.",
    ],
    avoid: [
      "Do not wait until crisis to seek your first break.",
      "Do not treat needing respite as proof you are a bad caregiver.",
      "Do not fill every break with chores if you are already depleted. Rest counts.",
      "Do not ignore strong burnout signs (constant irritability, emotional numbness, collapsing function).",
      "Do not rely only on US locators if you are in NL/EU. Seek local services.",
      "Do not use the app for medication or clinical treatment decisions about burnout.",
    ],
    urgentHelp:
      "Acute safety risk or mental-health emergency → local emergency services. Ongoing depression or anxiety → healthcare professional. Use local crisis lines when available.",
    sources: [
      {
        label: "ARCH National Respite Network",
        url: "https://archrespite.org/",
      },
      {
        label: "ARCH: Planning for Respite",
        url: "https://archrespite.org/caregiver-resources/planning-for-respite/",
      },
      {
        label: "ARCH: Nine Steps to Respite Care for Family Caregivers of Children and Adults with I/DD",
        url: "https://archrespite.org/library/nine-steps-to-respite-care-for-persons-with-idd/",
      },
      {
        label: "ARCH: Find a Respite Provider (US locator)",
        url: "https://archrespite.org/caregiver-resources/respitelocator/",
      },
      {
        label: "Mayo Clinic: Caregiver stress",
        url: "https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/caregiver-stress/art-20044784",
      },
      {
        label: "Child Mind Institute: Self-Care Tips for Parents to Prevent Burnout",
        url: "https://childmind.org/article/fighting-caregiver-burnout-special-needs-kids/",
      },
    ],
    furtherReading: [
      {
        label: "ARCH: Respite for Individuals with Autism",
        url: "https://archrespite.org/library/respite-for-individuals-with-autism/",
      },
      {
        label: "NDSS: Caregiving & Down Syndrome Resources",
        url: "https://ndss.org/resources/caregiving-down-syndrome-resources",
      },
      {
        label: "CHADD: Irritable and Overwhelmed? Signs of Parental Burnout",
        url: "https://chadd.org/adhd-news/adhd-news-caregivers/irritable-and-overwhelmed-signs-of-parental-burnout/",
      },
    ],
    clinicianReviewRequired: true,
    clinicianReviewNotes:
      "Localize respite and crisis links for NL/EU (ARCH locator is US-oriented). Keep tone supportive. NDSS caregiving guidebook skews toward aging/adult caregiving: note that for pediatric DS families and add local DS associations.",
  },
];

export const LOCAL_SUPPORT_NL: LocalSupportLink[] = [
  { label: "NVA: Nederlandse Vereniging voor Autisme", url: "https://www.nva.nl/" },
  { label: "113 Zelfmoordpreventie", url: "https://www.113.nl/" },
  { label: "Stichting Downsyndroom", url: "https://www.downsyndroom.nl/" },
  { label: "Impuls & Woortblind (ADHD / ADD)", url: "https://impulswoortblind.nl/" },
];

export const LOCAL_SUPPORT_DEFAULT: LocalSupportLink[] = [
  { label: "National Autistic Society (UK)", url: "https://www.autism.org.uk/" },
  { label: "Child Mind Institute", url: "https://childmind.org/" },
  { label: "Understood.org", url: "https://www.understood.org/" },
  { label: "CHADD (ADHD)", url: "https://chadd.org/" },
  { label: "NDSS (Down syndrome)", url: "https://ndss.org/" },
];

export function itemsForHub(hub: HelpHub): HelpItem[] {
  return HELP_ITEMS.filter((item) => item.hub === hub).sort((a, b) => a.order - b.order);
}

export function getHelpItem(id: string): HelpItem | undefined {
  return HELP_ITEMS.find((item) => item.id === id);
}

export function emergencyNumberForLocale(locale = defaultLocale()): { number: string; label: string } {
  const lang = locale.toLowerCase();
  if (lang.startsWith("en-us") || lang.startsWith("en-ca")) {
    return { number: "911", label: "911" };
  }
  if (lang.startsWith("en-gb")) {
    return { number: "999", label: "999" };
  }
  return { number: "112", label: "112" };
}

export function supportLinksForLocale(locale = defaultLocale()): LocalSupportLink[] {
  const lang = locale.toLowerCase();
  if (lang.startsWith("nl") || lang.startsWith("be")) {
    return LOCAL_SUPPORT_NL;
  }
  if (lang.startsWith("en-gb") || lang.startsWith("en-us")) {
    return LOCAL_SUPPORT_DEFAULT;
  }
  return [...LOCAL_SUPPORT_NL, ...LOCAL_SUPPORT_DEFAULT];
}

function defaultLocale(): string {
  if (typeof navigator === "undefined") return "nl-NL";
  return navigator.language || "nl-NL";
}
