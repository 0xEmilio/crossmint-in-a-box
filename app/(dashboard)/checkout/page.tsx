import { Suspense } from "react";
import { CheckoutPlayground } from "./CheckoutPlayground";

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPlayground />
    </Suspense>
  );
}
