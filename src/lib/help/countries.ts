/**
 * Caregiver-facing emergency and support directory.
 * Phone numbers are included only when a government or major-organisation page states them.
 * If a number is not on that page, leave it out and set needsReview.
 */

export type CitedLink = {
  label: string;
  url: string;
};

export type EmergencyService = {
  number: string;
  labelEn: string;
  labelEs: string;
  source: string;
};

export type SupportResource = {
  name: string;
  descriptionEn: string;
  descriptionEs: string;
  phone?: string;
  url?: string;
  source: string;
};

export type CountryHelp = {
  code: string;
  nameEn: string;
  nameEs: string;
  /** Set only when one number reaches general emergency services. */
  emergencyNumber?: string;
  emergencyServices: EmergencyService[];
  crisisLines: SupportResource[];
  caregiverSupport: SupportResource[];
  disclaimerKey: "help.disclaimer";
  sources: CitedLink[];
  needsReview: boolean;
  reviewNoteEn?: string;
  reviewNoteEs?: string;
};

const EU_112 = "https://digital-strategy.ec.europa.eu/en/policies/112";

const EU_REVIEW_EN =
  "112 is the European emergency number, from the European Commission. Other national numbers and caregiver helplines are left out until each one has its own official source.";
const EU_REVIEW_ES =
  "El 112 es el número europeo de emergencias, según la Comisión Europea. No incluimos otros números nacionales ni líneas para cuidadores hasta tener una fuente oficial para cada uno.";

const EXTRA_REVIEW_EN =
  "The numbers below are from the cited pages. Condition-specific caregiver organisations are not listed yet.";
const EXTRA_REVIEW_ES =
  "Los números de abajo salen de las páginas citadas. Aún no listamos organizaciones de cuidadores por diagnóstico.";

function euCountry(code: string, nameEn: string, nameEs: string): CountryHelp {
  return {
    code,
    nameEn,
    nameEs,
    emergencyNumber: "112",
    emergencyServices: [
      {
        number: "112",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source: EU_112,
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [{ label: "European Commission — 112", url: EU_112 }],
    needsReview: true,
    reviewNoteEn: EU_REVIEW_EN,
    reviewNoteEs: EU_REVIEW_ES,
  };
}

const BAKOM = "https://www.bakom.admin.ch/de/weitere-nummern-kostenpflichtig-oder-gratis";
const AR_EMERGENCIES = "https://www.argentina.gob.ar/tema/emergencias";
const NL_112 = "https://www.rijksoverheid.nl/vraag-en-antwoord/alarmnummer-112/wanneer-112-bellen";

export const COUNTRIES: CountryHelp[] = [
  {
    code: "NL",
    nameEn: "Netherlands",
    nameEs: "Países Bajos",
    emergencyNumber: "112",
    emergencyServices: [
      {
        number: "112",
        labelEn: "Emergency services (police, fire, ambulance)",
        labelEs: "Servicios de emergencia (policía, bomberos, ambulancia)",
        source: NL_112,
      },
    ],
    crisisLines: [
      {
        name: "113 Zelfmoordpreventie",
        descriptionEn:
          "Suicide prevention for you or for someone you are worried about. 24/7. 113 is free. 0800-0113 still connects as well.",
        descriptionEs:
          "Prevención del suicidio, para ti o para alguien que te preocupa. 24 horas. El 113 es gratuito. El 0800-0113 también sigue funcionando.",
        phone: "113",
        url: "https://www.113.nl/",
        source: "https://www.113.nl/de-3-telefoonnummers-van-113",
      },
      {
        name: "Veilig Thuis",
        descriptionEn:
          "Advice and reports about domestic violence and child abuse. Free and anonymous, 24/7. If someone is in immediate danger, call 112.",
        descriptionEs:
          "Consejo y avisos sobre violencia en casa y maltrato infantil. Gratis y anónimo, 24 horas. Si hay peligro inmediato, llama al 112.",
        phone: "0800-2000",
        url: "https://www.veiligthuis.nl/contact",
        source: "https://www.rijksoverheid.nl/service/contact/contactgids/v/veilig-thuis",
      },
      {
        name: "De Luisterlijn",
        descriptionEn:
          "A confidential listening ear, day and night. You pay only the normal call rate.",
        descriptionEs:
          "Alguien que escucha, de día y de noche, con confidencialidad. Solo pagas la tarifa normal de la llamada.",
        phone: "088 0767 000",
        url: "https://www.deluisterlijn.nl/over-de-luisterlijn/contact.html",
        source: "https://www.deluisterlijn.nl/over-de-luisterlijn/contact.html",
      },
      {
        name: "De Kindertelefoon",
        descriptionEn:
          "For children and young people aged 8–18, not a caregiver crisis line. Free and anonymous, every day 11:00–21:00. The volunteer speaks with the child.",
        descriptionEs:
          "Para niños y jóvenes de 8 a 18 años, no es una línea de crisis para cuidadores. Gratis y anónima, todos los días de 11:00 a 21:00. La persona voluntaria habla con el niño o la niña.",
        phone: "0800-0432",
        url: "https://www.kindertelefoon.nl/veelgestelde-vragen",
        source: "https://www.kindertelefoon.nl/veelgestelde-vragen",
      },
    ],
    caregiverSupport: [
      {
        name: "MantelzorgNL — Mantelzorglijn",
        descriptionEn:
          "Questions and a listening ear for family caregivers. Check the contact page for current opening hours before you rely on them.",
        descriptionEs:
          "Preguntas y alguien que escucha, para quienes cuidan a un familiar. Mira la página de contacto para el horario actual antes de contar con él.",
        phone: "030 760 60 55",
        url: "https://www.mantelzorg.nl/contact",
        source: "https://www.mantelzorg.nl/contact",
      },
      {
        name: "MIND Hulplijn",
        descriptionEn:
          "Anonymous advice about mental health, for you or someone you are worried about. Weekdays 09:00–21:00. The listed number is 0900-1450; standard call charges can apply.",
        descriptionEs:
          "Consejo anónimo sobre salud mental, para ti o para alguien que te preocupa. Días laborables de 09:00 a 21:00. El número publicado es el 0900-1450; puede haber tarifa normal de llamada.",
        phone: "0900-1450",
        url: "https://mindhulplijn.nl/",
        source: "https://mindhulplijn.nl/",
      },
      {
        name: "Nederlandse Vereniging voor Autisme (NVA)",
        descriptionEn:
          "Dutch autism association. Information and a listening ear on weekdays 10:00–14:00 (option 3). Not an emergency service.",
        descriptionEs:
          "Asociación neerlandesa de autismo. Información y alguien que escucha, días laborables de 10:00 a 14:00 (opción 3). No es un servicio de emergencia.",
        phone: "030 229 9800",
        url: "https://www.autisme.nl/contact/",
        source: "https://www.autisme.nl/contact/",
      },
      {
        name: "Stichting Downsyndroom",
        descriptionEn:
          "Dutch Down syndrome foundation. Website only here — this page does not list a national helpline number.",
        descriptionEs:
          "Fundación neerlandesa del síndrome de Down. Solo la web — esta ficha no incluye un teléfono nacional.",
        url: "https://www.downsyndroom.nl/",
        source: "https://www.downsyndroom.nl/",
      },
      {
        name: "Impuls & Woortblind",
        descriptionEn:
          "Dutch association for ADHD and dyslexia. Website only here — this page does not list a helpline number.",
        descriptionEs:
          "Asociación neerlandesa de TDAH y dislexia. Solo la web — esta ficha no incluye un teléfono de ayuda.",
        url: "https://impulswoortblind.nl/",
        source: "https://impulswoortblind.nl/",
      },
    ],
    disclaimerKey: "help.disclaimer",
    sources: [
      { label: "Rijksoverheid — alarmnummer 112", url: NL_112 },
      {
        label: "113 Zelfmoordpreventie — telefoonnummers",
        url: "https://www.113.nl/de-3-telefoonnummers-van-113",
      },
      {
        label: "Rijksoverheid — Veilig Thuis",
        url: "https://www.rijksoverheid.nl/service/contact/contactgids/v/veilig-thuis",
      },
      {
        label: "De Luisterlijn — contact",
        url: "https://www.deluisterlijn.nl/over-de-luisterlijn/contact.html",
      },
      {
        label: "De Kindertelefoon — veelgestelde vragen",
        url: "https://www.kindertelefoon.nl/veelgestelde-vragen",
      },
      { label: "MantelzorgNL — contact", url: "https://www.mantelzorg.nl/contact" },
      { label: "MIND Hulplijn", url: "https://mindhulplijn.nl/" },
      { label: "NVA — contact", url: "https://www.autisme.nl/contact/" },
      { label: "Stichting Downsyndroom", url: "https://www.downsyndroom.nl/" },
      { label: "Impuls & Woortblind", url: "https://impulswoortblind.nl/" },
    ],
    needsReview: false,
  },
  euCountry("BE", "Belgium", "Bélgica"),
  euCountry("DE", "Germany", "Alemania"),
  euCountry("FR", "France", "Francia"),
  euCountry("ES", "Spain", "España"),
  euCountry("IT", "Italy", "Italia"),
  euCountry("PT", "Portugal", "Portugal"),
  euCountry("AT", "Austria", "Austria"),
  {
    code: "CH",
    nameEn: "Switzerland",
    nameEs: "Suiza",
    emergencyServices: [
      {
        number: "112",
        labelEn: "European emergency number",
        labelEs: "Número europeo de emergencias",
        source: BAKOM,
      },
      { number: "117", labelEn: "Police", labelEs: "Policía", source: BAKOM },
      { number: "118", labelEn: "Fire", labelEs: "Bomberos", source: BAKOM },
      { number: "144", labelEn: "Ambulance", labelEs: "Ambulancia", source: BAKOM },
      {
        number: "145",
        labelEn: "Poison emergency",
        labelEs: "Emergencias por intoxicación",
        source: BAKOM,
      },
    ],
    crisisLines: [
      {
        name: "143 — Telefonische Hilfe für Erwachsene",
        descriptionEn:
          "Telephone help for adults. BAKOM lists a cap of 20 centimes per call, or 70 centimes from a public phone. Not a free line.",
        descriptionEs:
          "Ayuda telefónica para adultos. BAKOM indica un máximo de 20 céntimos por llamada, o 70 desde un teléfono público. No es una línea gratuita.",
        phone: "143",
        url: BAKOM,
        source: BAKOM,
      },
      {
        name: "147 — Telefonhilfe für Kinder und Jugendliche",
        descriptionEn:
          "Telephone help for children and young people. BAKOM lists this short number as free.",
        descriptionEs:
          "Ayuda telefónica para niños y jóvenes. BAKOM indica que este número corto es gratuito.",
        phone: "147",
        url: BAKOM,
        source: BAKOM,
      },
    ],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [{ label: "BAKOM — Notrufnummern", url: BAKOM }],
    needsReview: true,
    reviewNoteEn: EXTRA_REVIEW_EN,
    reviewNoteEs: EXTRA_REVIEW_ES,
  },
  euCountry("SE", "Sweden", "Suecia"),
  {
    code: "NO",
    nameEn: "Norway",
    nameEs: "Noruega",
    emergencyServices: [
      {
        number: "112",
        labelEn: "Police",
        labelEs: "Policía",
        source: "https://www.politiet.no/english/contact-the-police",
      },
      {
        number: "110",
        labelEn: "Fire",
        labelEs: "Bomberos",
        source: "https://www.politiet.no/kontakt-politiet/nod-sms",
      },
      {
        number: "113",
        labelEn: "Ambulance",
        labelEs: "Ambulancia",
        source: "https://www.politiet.no/kontakt-politiet/nod-sms",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "Politiet — emergency number 112",
        url: "https://www.politiet.no/english/contact-the-police",
      },
      {
        label: "Politiet — nødnumre 112, 110, 113",
        url: "https://www.politiet.no/kontakt-politiet/nod-sms",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "Norway does not use one general emergency number. Police, fire, and ambulance are listed from Politiet. Other helplines are not listed yet.",
    reviewNoteEs:
      "Noruega no usa un solo número general de emergencias. Policía, bomberos y ambulancia salen de Politiet. Otras líneas aún no están listadas.",
  },
  euCountry("DK", "Denmark", "Dinamarca"),
  euCountry("FI", "Finland", "Finlandia"),
  euCountry("PL", "Poland", "Polonia"),
  {
    code: "IE",
    nameEn: "Ireland",
    nameEs: "Irlanda",
    emergencyNumber: "112",
    emergencyServices: [
      {
        number: "112",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source:
          "https://www.citizensinformation.ie/en/health/health_system/emergency_health_services_in_ireland.html",
      },
      {
        number: "999",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source:
          "https://www.citizensinformation.ie/en/health/health_system/emergency_health_services_in_ireland.html",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "Citizens Information — emergency ambulance services",
        url: "https://www.citizensinformation.ie/en/health/health_system/emergency_health_services_in_ireland.html",
      },
      { label: "European Commission — 112", url: EU_112 },
    ],
    needsReview: true,
    reviewNoteEn:
      "112 and 999 both reach emergency services, according to Citizens Information. Other helplines are not listed yet.",
    reviewNoteEs:
      "El 112 y el 999 llegan a emergencias, según Citizens Information. Otras líneas aún no están listadas.",
  },
  euCountry("LU", "Luxembourg", "Luxemburgo"),
  euCountry("CZ", "Czechia", "Chequia"),
  euCountry("SK", "Slovakia", "Eslovaquia"),
  euCountry("HU", "Hungary", "Hungría"),
  euCountry("RO", "Romania", "Rumanía"),
  euCountry("BG", "Bulgaria", "Bulgaria"),
  euCountry("GR", "Greece", "Grecia"),
  euCountry("HR", "Croatia", "Croacia"),
  euCountry("SI", "Slovenia", "Eslovenia"),
  euCountry("EE", "Estonia", "Estonia"),
  euCountry("LV", "Latvia", "Letonia"),
  euCountry("LT", "Lithuania", "Lituania"),
  euCountry("MT", "Malta", "Malta"),
  euCountry("CY", "Cyprus", "Chipre"),
  {
    code: "GB",
    nameEn: "United Kingdom",
    nameEs: "Reino Unido",
    emergencyNumber: "999",
    emergencyServices: [
      {
        number: "999",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source: "https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers",
      },
      {
        number: "112",
        labelEn: "Emergency services (also works in the UK)",
        labelEs: "Servicios de emergencia (también funciona en el Reino Unido)",
        source: "https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "GOV.UK — 999 and 112",
        url: "https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "999 and 112 are the UK emergency numbers on GOV.UK. Other helplines are not listed yet.",
    reviewNoteEs:
      "El 999 y el 112 son los números de emergencia del Reino Unido en GOV.UK. Otras líneas aún no están listadas.",
  },
  {
    code: "US",
    nameEn: "United States",
    nameEs: "Estados Unidos",
    emergencyNumber: "911",
    emergencyServices: [
      {
        number: "911",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source: "https://www.fcc.gov/general/9-1-1-and-e9-1-1-services",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      { label: "FCC — 911 and E911", url: "https://www.fcc.gov/general/9-1-1-and-e9-1-1-services" },
    ],
    needsReview: true,
    reviewNoteEn:
      "911 is the US emergency number, from the FCC. The FCC also notes that a local answering point may not exist in every locality. Other helplines are not listed yet.",
    reviewNoteEs:
      "El 911 es el número de emergencia de EE. UU., según la FCC. La FCC también indica que puede no haber un centro local en todas las zonas. Otras líneas aún no están listadas.",
  },
  {
    code: "CA",
    nameEn: "Canada",
    nameEs: "Canadá",
    emergencyNumber: "911",
    emergencyServices: [
      {
        number: "911",
        labelEn: "Emergency services",
        labelEs: "Servicios de emergencia",
        source: "https://crtc.gc.ca/eng/phone/911/can.htm",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [{ label: "CRTC — 9-1-1 services", url: "https://crtc.gc.ca/eng/phone/911/can.htm" }],
    needsReview: true,
    reviewNoteEn:
      "9-1-1 is the Canadian emergency number where the service exists, from the CRTC. The CRTC notes it is not available in Nunavut. Other helplines are not listed yet.",
    reviewNoteEs:
      "El 9-1-1 es el número de emergencia de Canadá donde existe el servicio, según el CRTC. El CRTC indica que no está disponible en Nunavut. Otras líneas aún no están listadas.",
  },
  {
    code: "AR",
    nameEn: "Argentina",
    nameEs: "Argentina",
    emergencyNumber: "911",
    emergencyServices: [
      {
        number: "911",
        labelEn: "National emergency centre (ambulance or police)",
        labelEs: "Central nacional de emergencias (ambulancia o policía)",
        source: AR_EMERGENCIES,
      },
    ],
    crisisLines: [
      {
        name: "135 — Línea de prevención del suicidio",
        descriptionEn:
          "Help if you or someone you know is in any kind of emotional crisis. Listed by the national government.",
        descriptionEs:
          "Ayuda si tú o alguien que conoces está en una crisis emocional. Figura en el sitio del gobierno nacional.",
        phone: "135",
        url: AR_EMERGENCIES,
        source: AR_EMERGENCIES,
      },
      {
        name: "144 — Atención a víctimas de violencia de género",
        descriptionEn:
          "Support and advice if you or someone you know is facing gender-based violence.",
        descriptionEs:
          "Contención y orientación si tú o alguien que conoces vive violencia de género.",
        phone: "144",
        url: AR_EMERGENCIES,
        source: AR_EMERGENCIES,
      },
    ],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [{ label: "Argentina.gob.ar — Emergencias", url: AR_EMERGENCIES }],
    needsReview: true,
    reviewNoteEn: EXTRA_REVIEW_EN,
    reviewNoteEs: EXTRA_REVIEW_ES,
  },
  {
    code: "CL",
    nameEn: "Chile",
    nameEs: "Chile",
    emergencyServices: [
      {
        number: "131",
        labelEn: "SAMU ambulance",
        labelEs: "Ambulancia SAMU",
        source: "https://ssmc.gob.cl/centros-de-salud/samu/",
      },
      {
        number: "133",
        labelEn: "Carabineros (police emergencies)",
        labelEs: "Carabineros (emergencias policiales)",
        source: "https://www.carabineros.cl/secciones/fonosEmergencia/",
      },
      {
        number: "132",
        labelEn: "Fire",
        labelEs: "Bomberos",
        source:
          "https://www.bomberos.cl/contenidos/home-noticias/cuenta-132-de-banco-estado-apoyo-al-trabajo-de-bomberos-en-los-incendios-forestales",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      { label: "SAMU Metropolitano — 131", url: "https://ssmc.gob.cl/centros-de-salud/samu/" },
      { label: "Carabineros — 133", url: "https://www.carabineros.cl/secciones/fonosEmergencia/" },
      {
        label: "Bomberos de Chile — 132",
        url: "https://www.bomberos.cl/contenidos/home-noticias/cuenta-132-de-banco-estado-apoyo-al-trabajo-de-bomberos-en-los-incendios-forestales",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "Chile does not publish one general emergency number on these pages. Ambulance, police, and fire are listed separately. Caregiver helplines are not listed yet.",
    reviewNoteEs:
      "En estas páginas Chile no publica un solo número general. Ambulancia, policía y bomberos van por separado. Las líneas para cuidadores aún no están listadas.",
  },
  {
    code: "CO",
    nameEn: "Colombia",
    nameEs: "Colombia",
    emergencyNumber: "123",
    emergencyServices: [
      {
        number: "123",
        labelEn: "National emergency line",
        labelEs: "Línea única de emergencias",
        source:
          "https://www1.funcionpublica.gov.co/preguntas-frecuentes/-/asset_publisher/sqxafjubsrEu/content/linea-unica-de-emergencias-nacional-123/28585938",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "Función Pública — Línea 123",
        url: "https://www1.funcionpublica.gov.co/preguntas-frecuentes/-/asset_publisher/sqxafjubsrEu/content/linea-unica-de-emergencias-nacional-123/28585938",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "123 is the national emergency line on Función Pública. Other helplines are not listed yet.",
    reviewNoteEs:
      "El 123 es la línea nacional de emergencias en Función Pública. Otras líneas aún no están listadas.",
  },
  {
    code: "BR",
    nameEn: "Brazil",
    nameEs: "Brasil",
    emergencyServices: [
      {
        number: "192",
        labelEn: "SAMU ambulance (medical emergency)",
        labelEs: "Ambulancia SAMU (emergencia médica)",
        source: "https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "Ministério da Saúde — SAMU 192",
        url: "https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "192 is the SAMU medical emergency number from the Ministry of Health. Police and fire numbers are not listed here because they were not checked against a source for this release.",
    reviewNoteEs:
      "El 192 es el número médico del SAMU, según el Ministerio de Salud. No listamos policía ni bomberos porque no los contrastamos con una fuente en esta versión.",
  },
  {
    code: "PE",
    nameEn: "Peru",
    nameEs: "Perú",
    emergencyServices: [
      {
        number: "106",
        labelEn: "SAMU ambulance (medical emergency)",
        labelEs: "Ambulancia SAMU (emergencia médica)",
        source: "https://www.gob.pe/1013-solicitar-atencionmedica-en-caso-de-emergenciasamu",
      },
    ],
    crisisLines: [],
    caregiverSupport: [],
    disclaimerKey: "help.disclaimer",
    sources: [
      {
        label: "gob.pe — SAMU 106",
        url: "https://www.gob.pe/1013-solicitar-atencionmedica-en-caso-de-emergenciasamu",
      },
    ],
    needsReview: true,
    reviewNoteEn:
      "106 is the SAMU medical emergency number on gob.pe. Police and fire numbers are not listed here because they were not checked against a source for this release.",
    reviewNoteEs:
      "El 106 es el número médico del SAMU en gob.pe. No listamos policía ni bomberos porque no los contrastamos con una fuente en esta versión.",
  },
];

export const REQUIRED_COUNTRY_CODES = [
  "NL",
  "BE",
  "DE",
  "FR",
  "ES",
  "IT",
  "PT",
  "AT",
  "CH",
  "SE",
  "NO",
  "DK",
  "FI",
  "PL",
  "IE",
  "LU",
  "CZ",
  "SK",
  "HU",
  "RO",
  "BG",
  "GR",
  "HR",
  "SI",
  "EE",
  "LV",
  "LT",
  "MT",
  "CY",
  "GB",
  "US",
  "CA",
  "AR",
  "CL",
  "CO",
  "BR",
  "PE",
] as const;

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function getCountry(code: string | null | undefined): CountryHelp | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase());
}

export function countryName(country: CountryHelp, locale: "en" | "es"): string {
  return locale === "es" ? country.nameEs : country.nameEn;
}

export function sortedCountries(locale: "en" | "es"): CountryHelp[] {
  const nl = getCountry("NL");
  const rest = COUNTRIES.filter((country) => country.code !== "NL").sort((a, b) =>
    countryName(a, locale).localeCompare(countryName(b, locale), locale === "es" ? "es" : "en"),
  );
  return nl ? [nl, ...rest] : rest;
}

export function reviewNote(country: CountryHelp, locale: "en" | "es"): string | undefined {
  return locale === "es" ? country.reviewNoteEs : country.reviewNoteEn;
}

export function resourceDescription(resource: SupportResource, locale: "en" | "es"): string {
  return locale === "es" ? resource.descriptionEs : resource.descriptionEn;
}

export function serviceLabel(service: EmergencyService, locale: "en" | "es"): string {
  return locale === "es" ? service.labelEs : service.labelEn;
}
