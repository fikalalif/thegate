import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MobileNavProvider } from "@/lib/nav";

export const metadata: Metadata = {
  title: "TheGate — AI Operations Control Room & Intelligent Gateway",
  description:
    "Enterprise-grade, open-source AI Operations Control Room and intelligent ingress gateway for production LLM workloads.",
  icons: {
    icon: [
      { url: "/thegate-metaicon.png", sizes: "500x500", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: ["/thegate-metaicon.png"],
    apple: [
      { url: "/thegate-metaicon.png", sizes: "500x500", type: "image/png" },
    ],
  },
  openGraph: {
    title: "TheGate — AI Operations Control Room & Intelligent Gateway",
    description: "Enterprise-grade, open-source AI Operations Control Room and intelligent ingress gateway for production LLM workloads.",
    images: [
      {
        url: "/thegate-metaicon.png",
        width: 500,
        height: 500,
        alt: "TheGate Official Meta Icon",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/thegate-metaicon.png" type="image/png" sizes="500x500" />
        <link rel="apple-touch-icon" href="/thegate-metaicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Clean up legacy key if needed
                  var legacy = localStorage.getItem('thegate-theme');
                  var mode = localStorage.getItem('thegate-theme-mode');
                  if (!mode && legacy) {
                    // Reset legacy forced dark mode so OS preference takes effect
                    localStorage.removeItem('thegate-theme');
                  }
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = false;
                  if (mode === 'dark') {
                    isDark = true;
                  } else if (mode === 'light') {
                    isDark = false;
                  } else {
                    // Default is strictly system/OS preference
                    isDark = prefersDark;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen dark:bg-retro-night bg-[#F5EFE6] dark:text-retro-cream text-slate-900 antialiased selection:bg-retro-amber selection:text-black font-sans">
        <LanguageProvider>
          <AuthProvider>
            <AuthGuard>
              <MobileNavProvider>
                <Sidebar />
                <div className="pl-0 lg:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden">
                  <Header />
                  <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-x-hidden">
                    {children}
                  </main>
                </div>
              </MobileNavProvider>
            </AuthGuard>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
