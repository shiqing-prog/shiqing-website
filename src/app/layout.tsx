import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";

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
            __html: `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);var s=localStorage.getItem("style")||"indigo";var el=document.documentElement;el.classList.toggle("dark",dark);el.classList.toggle("light",!dark);["indigo","geek","paper","warm","neon"].forEach(function(x){el.classList.toggle("style-"+x,x===s)});}catch(e){}})();`,
          }}
        />
      </head>
      {/* 背景渐变由 globals.css 控制，这里不设背景色 */}
      <body className="min-h-full flex flex-col text-gray-900 dark:text-gray-100">
        <Navbar />
        {/* 底部预留移动端 Tab 栏空间 */}
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <div className="pb-16 lg:pb-0">
          <Footer />
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
