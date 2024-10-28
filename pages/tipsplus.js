// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export default function Tips() {
//   const router = useRouter();
//   const { session_id } = router.query;
//   const [isLoading, setIsLoading] = useState(true);
//   const [paymentStatus, setPaymentStatus] = useState(null);

//   useEffect(() => {
//     if (session_id) {
//       // Verify the payment status
//       const verifyPayment = async () => {
//         try {
//           const response = await fetch(
//             `/api/verify-payment?session_id=${session_id}`
//           );
//           const data = await response.json();
//           setPaymentStatus(data.paymentStatus);
//         } catch (error) {
//           console.error("Payment verification error:", error);
//         } finally {
//           setIsLoading(false);
//         }
//       };

//       verifyPayment();
//     }
//   }, [session_id]);

//   if (isLoading) return <p>Loading...</p>;

//   return (
//     <div>
//       {paymentStatus === "paid" ? (
//         <h1>Thank you for your tip!</h1>
//       ) : (
//         <h1>Payment could not be verified.</h1>
//       )}
//     </div>
//   );
// }
