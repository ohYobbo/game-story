import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./styles/dashboard.css";
import "./styles/modals.css";
import "./styles/responsive.css";

const title = "像素工坊 — 游戏公司经营物语";
const description = "从四人小作坊到百万销量工作室，制作属于你的像素游戏传奇。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png", sizes: "128x128" }],
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "像素工坊游戏工作室" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
