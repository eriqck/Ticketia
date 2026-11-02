import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticketia | Discover what's happening",
  description: "Discover and book events across Kenya.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
