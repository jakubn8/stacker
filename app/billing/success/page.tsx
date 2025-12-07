import { Suspense } from "react";
import BillingSuccessContent from "./content";

/**
 * Billing Success Page
 * Wrapped in Suspense for useSearchParams
 */
export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}
