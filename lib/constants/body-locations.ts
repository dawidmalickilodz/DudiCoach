export interface BodyLocation {
  key: string;
  label_pl: string;
}

export const BODY_LOCATIONS: BodyLocation[] = [
  { key: "shoulder", label_pl: "Bark" },
  { key: "upper_arm", label_pl: "Ramię" },
  { key: "elbow", label_pl: "Łokieć" },
  { key: "wrist", label_pl: "Nadgarstek" },
  { key: "hand", label_pl: "Dłoń" },
  { key: "cervical_spine", label_pl: "Kręgosłup szyjny" },
  { key: "thoracic_spine", label_pl: "Kręgosłup piersiowy" },
  { key: "lumbar_spine", label_pl: "Kręgosłup lędźwiowy" },
  { key: "hip", label_pl: "Biodro" },
  { key: "knee", label_pl: "Kolano" },
  { key: "ankle", label_pl: "Kostka" },
  { key: "foot", label_pl: "Stopa" },
  { key: "quad", label_pl: "Udo (przód)" },
  { key: "hamstring", label_pl: "Udo (tył)" },
  { key: "calf", label_pl: "Łydka" },
  { key: "chest", label_pl: "Klatka piersiowa" },
  { key: "abdomen", label_pl: "Brzuch" },
  { key: "other", label_pl: "Inne" },
];

export const BODY_LOCATION_KEYS = BODY_LOCATIONS.map((location) => location.key);
