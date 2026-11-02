import type { Food } from "./nutrition";
const normalize = (s: string) => s.normalize("NFKC").trim().toLowerCase();
export function searchFoods(
  foods: Food[],
  query: string,
  recentIds = new Set<string>(),
) {
  const q = normalize(query);
  return foods
    .filter((f) => !q || normalize(f.name).includes(q))
    .sort(
      (a, b) =>
        Number(normalize(b.name) === q) - Number(normalize(a.name) === q) ||
        Number(b.id.startsWith("review:")) -
          Number(a.id.startsWith("review:")) ||
        Number(recentIds.has(b.id)) - Number(recentIds.has(a.id)),
    )
    .slice(0, 60);
}
