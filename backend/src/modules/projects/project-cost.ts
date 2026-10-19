import { Prisma, PriceUnit } from '@prisma/client';

export function allocationCost(
  qty: number,
  price: Prisma.Decimal.Value,
  unit: PriceUnit,
  days: number,
) {
  return new Prisma.Decimal(price)
    .mul(qty)
    .mul(unit === 'PER_HARI' ? days : 1)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
export function sellingPrice(
  cost: Prisma.Decimal.Value,
  markup: Prisma.Decimal.Value,
) {
  return new Prisma.Decimal(cost)
    .mul(new Prisma.Decimal(markup).div(100).plus(1))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
export function capacityTier(capacity: number): 100 | 200 | 300 | 400 | 500 {
  return Math.min(500, Math.max(100, Math.ceil(capacity / 100) * 100)) as
    100 | 200 | 300 | 400 | 500;
}
