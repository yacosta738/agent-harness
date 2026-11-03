final class Example {

  public static void main(String[] args) {
    FakePaymentGateway gateway = new FakePaymentGateway(true);
    CheckoutService checkout = new CheckoutService(gateway);

    CheckoutStatus result = checkout.checkout(new Order(2400));

    require(result == CheckoutStatus.CONFIRMED, "approved payment confirms checkout");
    require(gateway.chargedAmountCents == 2400, "gateway receives the expected amount");
    System.out.println("Tests passed");
  }

  private static void require(boolean condition, String message) {
    if (!condition) {
      throw new AssertionError(message);
    }
  }

  enum CheckoutStatus {
    CONFIRMED,
    REJECTED
  }

  interface PaymentGateway {

    boolean charge(int amountCents);
  }

  static final class Order {

    final int totalCents;

    Order(int totalCents) {
      this.totalCents = totalCents;
    }
  }

  static final class CheckoutService {

    private final PaymentGateway payments;

    CheckoutService(PaymentGateway payments) {
      this.payments = payments;
    }

    /**
     * Returns CONFIRMED only when the gateway approves the order total.
     */
    CheckoutStatus checkout(Order order) {
      return payments.charge(order.totalCents)
          ? CheckoutStatus.CONFIRMED
          : CheckoutStatus.REJECTED;
    }
  }

  static final class FakePaymentGateway implements PaymentGateway {

    private final boolean approved;
    Integer chargedAmountCents;

    FakePaymentGateway(boolean approved) {
      this.approved = approved;
    }

    @Override
    public boolean charge(int amountCents) {
      chargedAmountCents = amountCents;
      return approved;
    }
  }
}
