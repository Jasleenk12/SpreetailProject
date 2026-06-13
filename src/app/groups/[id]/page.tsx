"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  MessageCircle,
  Plus,
  Trash2,
  UserPlus,
  DollarSign,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettleUpModal } from "@/components/SettleUpModal";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  splitType: string;
  expenseDate: string;
  paidBy: { id: string; name: string };
  splits: { userId: string; amount: number; user: { name: string } }[];
  _count: { messages: number };
}

interface GroupData {
  group: {
    id: string;
    name: string;
    description: string | null;
    inviteCode: string;
    members: Member[];
    expenses: Expense[];
    settlements: {
      id: string;
      amount: number;
      note: string | null;
      settledAt: string;
      payer: { id: string; name: string };
      receiver: { id: string; name: string };
    }[];
  };
  balances: { userId: string; name: string; balance: number }[];
  simplifiedDebts: {
    fromUserId: string;
    toUserId: string;
    fromName: string;
    toName: string;
    amount: number;
  }[];
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expenses" | "balances" | "members">("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [importReport, setImportReport] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) {
      router.push("/dashboard");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const copyInvite = () => {
    if (!data) return;
    const url = `${window.location.origin}/join?code=${data.group.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setShowAddMember(false);
    setMemberEmail("");
    loadGroup();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    await fetch(`/api/groups/${id}/members?userId=${userId}`, { method: "DELETE" });
    loadGroup();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    loadGroup();
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/groups/${id}/import`, { method: "POST", body: formData });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportReport(data.report);
      loadGroup();
    } else {
      setImportReport(`Import failed: ${data.error}`);
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const { group, balances, simplifiedDebts } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900">{group.name}</h1>
              <p className="text-sm text-slate-500">{group.members.length} members</p>
            </div>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50"
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Invite"}
            </button>
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["expenses", "balances", "members"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition ${
                  tab === t ? "bg-white shadow text-slate-900" : "text-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "expenses" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-900">Expenses</h2>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-white cursor-pointer">
                  <Upload size={14} />
                  {importing ? "Importing..." : "Import CSV"}
                  <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={importing} />
                </label>
                <button
                  onClick={() => setShowSettleUp(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-white"
                >
                  <DollarSign size={14} />
                  Settle Up
                </button>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  <Plus size={14} />
                  Add Expense
                </button>
              </div>
            </div>

            {group.expenses.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                No expenses yet. Add one to start tracking!
              </div>
            ) : (
              <div className="space-y-3">
                {group.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{expense.description}</h3>
                        {expense._count.messages > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MessageCircle size={12} />
                            {expense._count.messages}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {expense.paidBy.name} paid · {formatDate(expense.expenseDate)} ·{" "}
                        {expense.splitType.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </span>
                      <Link
                        href={`/groups/${id}/expenses/${expense.id}`}
                        className="text-sm text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {importReport && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-900 mb-2">Import Report</h3>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                  {importReport}
                </pre>
              </div>
            )}

            {group.settlements.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-slate-900 mb-3">Settlements</h3>
                <div className="space-y-2">
                  {group.settlements.map((s) => (
                    <div
                      key={s.id}
                      className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{s.payer.name}</span> paid{" "}
                      <span className="font-medium">{s.receiver.name}</span>{" "}
                      <span className="font-semibold text-green-700">
                        {formatCurrency(s.amount)}
                      </span>
                      {s.note && <span className="text-slate-500"> — {s.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "balances" && (
          <>
            <h2 className="font-semibold text-slate-900 mb-4">Group Balances</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y mb-6">
              {balances.map((b) => (
                <div key={b.userId} className="px-4 py-3 flex justify-between">
                  <span className="font-medium">{b.name}</span>
                  {b.balance === 0 ? (
                    <span className="text-slate-400 text-sm">settled up</span>
                  ) : b.balance > 0 ? (
                    <span className="text-green-600 text-sm">
                      gets back {formatCurrency(b.balance)}
                    </span>
                  ) : (
                    <span className="text-red-500 text-sm">
                      owes {formatCurrency(Math.abs(b.balance))}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {simplifiedDebts.length > 0 && (
              <>
                <h3 className="font-semibold text-slate-900 mb-3">Simplified Debts</h3>
                <div className="space-y-2">
                  {simplifiedDebts.map((d, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{d.fromName}</span> owes{" "}
                      <span className="font-medium">{d.toName}</span>{" "}
                      <span className="font-semibold">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "members" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-900">Members</h2>
              <button
                onClick={() => { setShowAddMember(true); setError(""); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg"
              >
                <UserPlus size={14} />
                Add Member
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y">
              {group.members.map((m) => (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium">
                      {getInitials(m.user.name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{m.user.name}</p>
                      <p className="text-sm text-slate-500">{m.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "admin" && (
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">admin</span>
                    )}
                    <button
                      onClick={() => handleRemoveMember(m.user.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {showAddExpense && (
        <AddExpenseModal
          groupId={id}
          members={group.members.map((m) => m.user)}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => { setShowAddExpense(false); loadGroup(); }}
        />
      )}

      {showSettleUp && (
        <SettleUpModal
          groupId={id}
          members={group.members.map((m) => m.user)}
          debts={simplifiedDebts}
          onClose={() => setShowSettleUp(false)}
          onSuccess={() => { setShowSettleUp(false); loadGroup(); }}
        />
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Member by Email</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="friend@example.com"
                required
                className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-500">User must already have an account.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 py-2.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
