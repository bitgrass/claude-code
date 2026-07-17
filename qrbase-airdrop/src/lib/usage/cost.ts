// Prisma Accelerate pricing as provided: the first 60,000 operations each
// billing period are free, then $0.0180 per 1,000 operations.
export const FREE_ACCELERATE_OPERATIONS = 60000;
export const COST_PER_1000_OPERATIONS = 0.018;

export function billableOperations(totalOperations: number): number {
  return Math.max(totalOperations - FREE_ACCELERATE_OPERATIONS, 0);
}

export function estimatedCost(totalOperations: number): number {
  return (billableOperations(totalOperations) / 1000) * COST_PER_1000_OPERATIONS;
}
