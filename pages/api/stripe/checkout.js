// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export default async function handler(req, res) {
//   if (req.method === "POST") {
//     try {
//       // Create a checkout session
//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         line_items: [
//           {
//             price_data: {
//               currency: "eur",
//               product_data: {
//                 name: "Tip Payment",
//               },
//               unit_amount: 1000, // Amount in cents (e.g., $10.00)
//             },
//             quantity: 1,
//           },
//         ],
//         mode: "payment",
//         success_url: `${req.headers.origin}/tipsplus?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${req.headers.origin}/cancel`,
//       });

//       // Return the session ID to the client
//       res.status(200).json({ sessionId: session.id });
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   } else {
//     res.setHeader("Allow", "POST");
//     res.status(405).end("Method Not Allowed");
//   }
// }
