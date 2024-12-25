import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const CheckoutButton = () => {
  const handleCheckout = async () => {
    const stripe = await stripePromise;

    // Call your backend to create the checkout session
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      console.error("Stripe checkout error:", error);
    }
  };

  return <button onClick={handleCheckout}>Checkout</button>;
};

export default CheckoutButton;
