"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
}

interface Debt {
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
  amount: number;
}

interface Props {
  groupId: string;
  members: Member[];
  debts: Debt[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SettleUpModal({ groupId, members, debts, onClose, onSuccess }: Props) {
  const [payerId, setPayerId] = useState(debts[0]?.fromUserId || members[0]?.id || "");
  const [receiverId, setReceiverId] = useState(debts[0]?.toUserId || members[1]?.id || "");
  const [amount, setAmount] = useState(debts[0]?.amount?.toString() || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectDebt = (debt: Debt) => {
    setPayerId(debt.fromUserId);
    setReceiverId(debt.toUserId);
    setAmount(debt.amount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId,
          receiverId,
          amount: parseFloat(amount),
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record payment");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Settle Up</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        {debts.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-slate-500 mb-2">Quick select:</p>
            <div className="space-y-1">
              {debts.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDebt(d)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100"
                >
                  {d.fromName} owes {d.toName} {formatCurrency(d.amount)}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Who paid?</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border rounded-lg"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Who received?</label>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border rounded-lg"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            required
            className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
          />

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
