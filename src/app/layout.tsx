import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitEase - Split Expenses with Friends",
  description: "A Splitwise-inspired app to split bills and settle debts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
