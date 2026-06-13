"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setMessage("No invite code provided");
      return;
    }

    fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/login?redirect=/join?code=${code}`);
            return;
          }
          setStatus("error");
          setMessage(data.error);
          return;
        }
        setStatus("success");
        setMessage(`Joined ${data.groupName}!`);
        setTimeout(() => router.push(`/groups/${data.groupId}`), 1500);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Failed to join group");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl p-8 shadow-lg text-center max-w-sm">
        {status === "loading" && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Joining group...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="text-green-600 font-medium">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <p className="text-red-500">{message}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
