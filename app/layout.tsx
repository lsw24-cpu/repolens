import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoLens — Evidence-grounded research code intelligence",
  description: "Understand open-source research code, trace claims to source evidence, and build a reproducibility plan.",
  openGraph: {
    title: "RepoLens — From research repositories to reproducible work",
    description: "Turn a public GitHub repository into source evidence, a mechanism map, a research path, and a reproducibility plan.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "RepoLens evidence-grounded research workflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoLens",
    description: "Evidence-grounded intelligence for reproducible research.",
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
