"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  user: { id: string; name: string; email: string };
  summary: { totalOwed: number; totalOwing: number; netBalance: number };
  groups: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    myBalance: number;
    inviteCode: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    const res = await fetch("/api/dashboard");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setShowCreate(false);
    setGroupName("");
    router.push(`/groups/${json.group.id}`);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setShowJoin(false);
    setInviteCode("");
    router.push(`/groups/${json.groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
              S
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">SplitEase</h1>
              <p className="text-xs text-slate-500">Hi, {data.user.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-sm text-slate-500">You are owed</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalOwed)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-sm text-slate-500">You owe</p>
            <p className="text-2xl font-bold text-red-500">
              {formatCurrency(data.summary.totalOwing)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-sm text-slate-500">Net balance</p>
            <p
              className={`text-2xl font-bold ${
                data.summary.netBalance >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {formatCurrency(Math.abs(data.summary.netBalance))}
              {data.summary.netBalance < 0 ? " owed" : data.summary.netBalance > 0 ? " owed to you" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Your Groups</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); setError(""); }}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Join Group
            </button>
            <button
              onClick={() => { setShowCreate(true); setError(""); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Plus size={16} />
              New Group
            </button>
          </div>
        </div>

        {data.groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 mb-4">No groups yet. Create one to start splitting expenses!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-sm transition flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  <p className="text-sm text-slate-500">
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  {group.myBalance === 0 ? (
                    <span className="text-sm text-slate-400">settled up</span>
                  ) : group.myBalance > 0 ? (
                    <span className="text-sm font-medium text-green-600">
                      you are owed {formatCurrency(group.myBalance)}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-500">
                      you owe {formatCurrency(Math.abs(group.myBalance))}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <Modal title="Create Group" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. Apartment, Trip to Goa)"
              required
              className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-2.5 bg-brand-600 text-white rounded-lg">
              Create Group
            </button>
          </form>
        </Modal>
      )}

      {showJoin && (
        <Modal title="Join Group" onClose={() => setShowJoin(false)}>
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Paste invite code"
              required
              className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-2.5 bg-brand-600 text-white rounded-lg">
              Join Group
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
