"use client";

import { useEffect, useState } from "react";

type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

interface Member {
  id: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExpenseModal({ groupId, members, onClose, onSuccess }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(members[0]?.id || "");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const vals: Record<string, string> = {};
    members.forEach((m) => {
      if (splitType === "EQUAL") vals[m.id] = "";
      else if (splitType === "EXACT") vals[m.id] = "";
      else if (splitType === "PERCENTAGE")
        vals[m.id] = selectedMembers.includes(m.id)
          ? String(Math.round(100 / selectedMembers.length))
          : "0";
      else if (splitType === "SHARES") vals[m.id] = "1";
    });
    setSplitValues(vals);
  }, [splitType, members, selectedMembers.length]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter a valid amount");
      setLoading(false);
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Select at least one participant");
      setLoading(false);
      return;
    }

    const participants = selectedMembers.map((userId) => {
      const base = { userId };
      if (splitType === "EXACT") {
        return { ...base, amount: parseFloat(splitValues[userId] || "0") };
      }
      if (splitType === "PERCENTAGE") {
        return { ...base, percentage: parseFloat(splitValues[userId] || "0") };
      }
      if (splitType === "SHARES") {
        return { ...base, shares: parseInt(splitValues[userId] || "1", 10) };
      }
      return base;
    });

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: numAmount,
          paidById,
          splitType,
          participants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create expense");
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Expense</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            required
            className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
          />

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

          <div>
            <label className="text-sm font-medium text-slate-700">Paid by</label>
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border rounded-lg outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Split type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as SplitType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSplitType(t)}
                  className={`py-2 text-sm rounded-lg border transition ${
                    splitType === t
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {t === "EQUAL"
                    ? "Equally"
                    : t === "EXACT"
                    ? "Unequally"
                    : t === "PERCENTAGE"
                    ? "By %"
                    : "By Shares"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Split between</label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="rounded"
                  />
                  <span className="flex-1 text-sm">{m.name}</span>
                  {splitType !== "EQUAL" && selectedMembers.includes(m.id) && (
                    <input
                      type="number"
                      step={splitType === "SHARES" ? "1" : "0.01"}
                      value={splitValues[m.id] || ""}
                      onChange={(e) =>
                        setSplitValues((v) => ({ ...v, [m.id]: e.target.value }))
                      }
                      placeholder={
                        splitType === "EXACT"
                          ? "$"
                          : splitType === "PERCENTAGE"
                          ? "%"
                          : "shares"
                      }
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
