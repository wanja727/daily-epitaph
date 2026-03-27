export interface FlowerType {
  id: string;
  name: string;
  stages: [string, string, string]; // 새싹, 봉우리, 꽃
}

export const FLOWER_TYPES: FlowerType[] = [
  { id: "tulip", name: "튤립", stages: ["🌱", "🌿", "🌷"] },
  { id: "sunflower", name: "해바라기", stages: ["🌱", "🌿", "🌻"] },
  { id: "rose", name: "장미", stages: ["🌱", "🌿", "🌹"] },
  { id: "cherry", name: "벚꽃", stages: ["🌱", "🌿", "🌸"] },
  { id: "hibiscus", name: "무궁화", stages: ["🌱", "🌿", "🌺"] },
  { id: "daisy", name: "데이지", stages: ["🌱", "🌿", "🏵️"] },
];

export function getFlowerType(id: string): FlowerType {
  return FLOWER_TYPES.find((f) => f.id === id) ?? FLOWER_TYPES[0];
}

export function getFlowerEmoji(typeId: string, stage: number): string {
  const ft = getFlowerType(typeId);
  return ft.stages[Math.min(stage, 3) - 1];
}
