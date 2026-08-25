import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoLens — Read research code with source evidence",
  description: "Map an unfamiliar repository, trace important claims to source, and build a practical reproduction plan.",
  openGraph: {
    title: "RepoLens — Understand an unfamiliar repository",
    description: "Find the files that matter, see how they connect, and trace the report back to source.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1280, height: 640, alt: "RepoLens repository reading workflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoLens",
    description: "Read unfamiliar repositories through traceable source evidence.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
