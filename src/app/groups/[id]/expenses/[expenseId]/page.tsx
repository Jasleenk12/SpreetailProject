"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface ExpenseDetail {
  id: string;
  description: string;
  amount: number;
  splitType: string;
  expenseDate: string;
  paidBy: { id: string; name: string };
  splits: { userId: string; amount: number; user: { name: string } }[];
  group: { id: string; name: string };
}

export default function ExpenseDetailPage() {
  const { id: groupId, expenseId } = useParams<{ id: string; expenseId: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<string | null>(null);

  const loadExpense = useCallback(async () => {
    const res = await fetch(`/api/expenses/${expenseId}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setExpense(data.expense);
    setLoading(false);
  }, [expenseId, router]);

  const loadMessages = useCallback(async (since?: string) => {
    const url = since
      ? `/api/expenses/${expenseId}/messages?since=${since}`
      : `/api/expenses/${expenseId}/messages`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (since && data.messages.length > 0) {
      setMessages((prev) => [...prev, ...data.messages]);
    } else if (!since) {
      setMessages(data.messages);
    }
    if (data.messages.length > 0) {
      lastMessageTime.current = data.messages[data.messages.length - 1].createdAt;
    }
  }, [expenseId]);

  useEffect(() => {
    loadExpense();
    loadMessages();
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => d.user && setCurrentUserId(d.user.id))
      .catch(() => {});
  }, [loadExpense, loadMessages]);

  // Real-time polling every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageTime.current) {
        loadMessages(lastMessageTime.current);
      } else {
        loadMessages();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage("");

    const res = await fetch(`/api/expenses/${expenseId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      lastMessageTime.current = data.message.createdAt;
    }
  };

  if (loading || !expense) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/groups/${groupId}`}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold text-slate-900">{expense.description}</h1>
              <p className="text-sm text-slate-500">
                {expense.group.name} · {formatDate(expense.expenseDate)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-sm text-slate-500">
                Paid by {expense.paidBy.name} · Split {expense.splitType.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            {expense.splits.map((s) => (
              <div key={s.userId} className="flex justify-between text-sm">
                <span>{s.user.name}</span>
                <span className="font-medium">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[400px]">
          <div className="px-4 py-3 border-b font-medium text-slate-900">
            Expense Chat
            <span className="ml-2 text-xs text-green-500 font-normal">● live</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.user.id === currentUserId ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      msg.user.id === currentUserId
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">
                    {msg.user.name} · {formatRelativeTime(msg.createdAt)}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
