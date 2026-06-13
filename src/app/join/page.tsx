import { Suspense } from "react";
import JoinPage from "./JoinClient";

export default function Join() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <JoinPage />
    </Suspense>
  );
}
