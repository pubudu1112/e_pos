export type CostComponent = {
  id: string;
  name: string;
  cost: number;
  productId?: number | null;
  productName?: string | null;
  quantity?: number;
};

export function parseServiceDescription(raw: string | null): {
  notes: string;
  costComponents: CostComponent[];
} {
  if (!raw) return { notes: "", costComponents: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        notes:
          typeof parsed.notes === "string"
            ? parsed.notes
            : typeof parsed.description === "string"
              ? parsed.description
              : "",
        costComponents: Array.isArray(parsed.costComponents)
          ? parsed.costComponents.map((c: Record<string, unknown>) => ({
              id: String(c.id || Math.random()),
              name: String(c.name || "").trim(),
              cost: Number(c.cost) || 0,
              productId: c.productId ? Number(c.productId) : null,
              productName: c.productName ? String(c.productName) : null,
              quantity: Number(c.quantity) > 0 ? Number(c.quantity) : 1,
            }))
          : [],
      };
    }
  } catch {
    // raw was plain text description
  }
  return { notes: raw, costComponents: [] };
}

export function serializeServiceDescription(
  notes: string,
  costComponents: CostComponent[]
): string | null {
  const cleanNotes = (notes || "").trim();
  const cleanComponents = Array.isArray(costComponents)
    ? costComponents
        .filter((c) => c && (c.name?.trim() || Number(c.cost) > 0))
        .map((c) => ({
          id: c.id || String(Date.now() + Math.random()),
          name: String(c.name || "").trim(),
          cost: Math.max(0, Number(c.cost) || 0),
          productId: c.productId ? Number(c.productId) : null,
          productName: c.productName ? String(c.productName).trim() : null,
          quantity: Number(c.quantity) > 0 ? Number(c.quantity) : 1,
        }))
    : [];

  if (!cleanNotes && cleanComponents.length === 0) return null;
  return JSON.stringify({
    notes: cleanNotes,
    costComponents: cleanComponents,
  });
}
