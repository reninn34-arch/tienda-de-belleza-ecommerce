import { db } from "./db";

/**
 * Calculates the available stock for a bundle.
 * 
 * Logic:
 * 1. Fetch bundle components and their inventory levels.
 * 2. Filter branches based on `bundle.branchIds`. If empty, all branches are considered.
 * 3. If `contextBranchId` is provided, only consider that specific branch (even if allowed globally).
 * 4. For each considered branch, find how many full bundles can be made (Math.min of its components).
 * 5. Sum the capacities of all considered branches.
 * 6. Apply `customStockLimit` if defined.
 */
export async function computeBundleStock(bundleId: string, contextBranchId?: string) {
  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: {
      items: {
        include: {
          product: {
            include: { inventories: true },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.active) return 0;

  // Check if all component products are active
  const hasInactiveComponent = bundle.items.some(item => !item.product.active);
  if (hasInactiveComponent) return 0;

  // 1. Identify which branches to look at
  const availableBranches = new Set<string>();
  for (const item of bundle.items) {
    for (const inv of item.product.inventories) {
      availableBranches.add(inv.branchId);
    }
  }

  // Intersect available branches with bundle-allowed branches
  let targetBranches = Array.from(availableBranches);
  if (bundle.branchIds && bundle.branchIds.length > 0) {
    targetBranches = targetBranches.filter((b) => bundle.branchIds.includes(b));
  }

  // If a specific context is requested (e.g., Storefront or a specific Seller branch)
  if (contextBranchId) {
    targetBranches = targetBranches.filter((b) => b === contextBranchId);
  }

  // 2. Calculate capacity per branch and sum it up
  let totalCalculatedStock = 0;

  for (const branchId of targetBranches) {
    let branchMin = Infinity;
    for (const item of bundle.items) {
      const inv = item.product.inventories.find((i: { branchId: string; stock: number }) => i.branchId === branchId);
      const units = inv ? Math.floor(inv.stock / item.quantity) : 0;
      branchMin = Math.min(branchMin, units);
    }

    if (branchMin !== Infinity && branchMin > 0) {
      totalCalculatedStock += branchMin;
    }
  }

  // 3. Apply custom stock limit
  const finalStock = bundle.customStockLimit !== null && bundle.customStockLimit !== undefined
    ? Math.min(totalCalculatedStock, bundle.customStockLimit)
    : totalCalculatedStock;

  return Math.max(0, finalStock);
}
