export type Membership = "gold" | "standard";

export function shippingCost(_totalCents: number, _membership: Membership): number {
  return 500;
}
