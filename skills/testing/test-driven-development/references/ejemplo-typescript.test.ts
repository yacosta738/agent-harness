import assert from "node:assert/strict";
import { test } from "node:test";

type Order = Readonly<{ totalCents: number }>;
type PaymentResult = Readonly<{ approved: boolean }>;
type CheckoutStatus = "confirmed" | "rejected";

interface PaymentGateway {
  charge(amountCents: number): Promise<PaymentResult>;
}

class CheckoutService {
  private readonly payments: PaymentGateway;

  constructor(payments: PaymentGateway) {
    this.payments = payments;
  }

  /** Confirms checkout only when the payment gateway approves the order total. */
  async checkout(order: Order): Promise<CheckoutStatus> {
    const payment = await this.payments.charge(order.totalCents);
    return payment.approved ? "confirmed" : "rejected";
  }
}

class FakePaymentGateway implements PaymentGateway {
  chargedAmountCents: number | undefined;
  private readonly approved: boolean;

  constructor(approved: boolean) {
    this.approved = approved;
  }

  async charge(amountCents: number): Promise<PaymentResult> {
    this.chargedAmountCents = amountCents;
    return { approved: this.approved };
  }
}

test("confirma una compra cuando el pago se aprueba", async () => {
  const gateway = new FakePaymentGateway(true);
  const checkout = new CheckoutService(gateway);

  const result = await checkout.checkout({ totalCents: 2400 });

  assert.equal(result, "confirmed");
  assert.equal(gateway.chargedAmountCents, 2400);
});

test("rechaza una compra cuando el pago se deniega", async () => {
  const checkout = new CheckoutService(new FakePaymentGateway(false));

  const result = await checkout.checkout({ totalCents: 1800 });

  assert.equal(result, "rejected");
});
