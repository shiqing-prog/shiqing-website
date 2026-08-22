import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ShiQing 时倾",
    template: "%s | ShiQing 时倾",
  },
  description: "一个无人知晓的小站点：技术笔记、生活杂谈、资源共享。",
  openGraph: {
    title: "ShiQing 时倾",
    description: "一个无人知晓的小站点：技术笔记、生活杂谈、资源共享。",
    url: "https://shiqing.site",
    siteName: "ShiQing 时倾",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ShiQing 时倾",
    description: "一个无人知晓的小站点：技术笔记、生活杂谈、资源共享。",
  },
  metadataBase: new URL("https://shiqing.site"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);document.documentElement.classList.toggle("light",!dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f0f2f5] text-gray-900 dark:bg-[#171a21] dark:text-gray-100">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
