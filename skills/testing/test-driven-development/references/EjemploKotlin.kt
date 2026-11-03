data class Order(val totalCents: Int)

enum class CheckoutStatus {
    CONFIRMED,
    REJECTED,
}

fun interface PaymentGateway {
    fun charge(amountCents: Int): Boolean
}

class CheckoutService(private val payments: PaymentGateway) {
    /** Returns [CheckoutStatus.CONFIRMED] only when the gateway approves the order total. */
    fun checkout(order: Order): CheckoutStatus =
        if (payments.charge(order.totalCents)) CheckoutStatus.CONFIRMED
        else CheckoutStatus.REJECTED
}

class FakePaymentGateway(private val approved: Boolean) : PaymentGateway {
    var chargedAmountCents: Int? = null
        private set

    override fun charge(amountCents: Int): Boolean {
        chargedAmountCents = amountCents
        return approved
    }
}

fun main() {
    val gateway = FakePaymentGateway(approved = true)
    val result = CheckoutService(gateway).checkout(Order(2400))

    check(result == CheckoutStatus.CONFIRMED)
    check(gateway.chargedAmountCents == 2400)
    println("Tests passed")
}
