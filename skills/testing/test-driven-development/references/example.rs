#[derive(Debug, PartialEq)]
struct Order {
    total_cents: u32,
}

#[derive(Debug, PartialEq)]
enum CheckoutStatus {
    Confirmed,
    Rejected,
}

trait PaymentGateway {
    fn charge(&mut self, amount_cents: u32) -> bool;
}

struct CheckoutService;

impl CheckoutService {
    /// Returns `Confirmed` only when the gateway approves the order total.
    fn checkout<G: PaymentGateway>(order: &Order, payments: &mut G) -> CheckoutStatus {
        if payments.charge(order.total_cents) {
            CheckoutStatus::Confirmed
        } else {
            CheckoutStatus::Rejected
        }
    }
}

struct FakePaymentGateway {
    approved: bool,
    charged_amount_cents: Option<u32>,
}

impl PaymentGateway for FakePaymentGateway {
    fn charge(&mut self, amount_cents: u32) -> bool {
        self.charged_amount_cents = Some(amount_cents);
        self.approved
    }
}

#[cfg(test)]
mod tests {
    use super::{CheckoutService, CheckoutStatus, FakePaymentGateway, Order};

    #[test]
    fn approved_payment_confirms_checkout_and_uses_order_total() {
        let order = Order {
            total_cents: 2400,
        };
        let mut gateway = FakePaymentGateway {
            approved: true,
            charged_amount_cents: None,
        };

        let result = CheckoutService::checkout(&order, &mut gateway);

        assert_eq!(result, CheckoutStatus::Confirmed);
        assert_eq!(gateway.charged_amount_cents, Some(2400));
    }

    #[test]
    fn declined_payment_rejects_checkout() {
        let order = Order {
            total_cents: 1800,
        };
        let mut gateway = FakePaymentGateway {
            approved: false,
            charged_amount_cents: None,
        };

        let result = CheckoutService::checkout(&order, &mut gateway);

        assert_eq!(result, CheckoutStatus::Rejected);
    }
}
