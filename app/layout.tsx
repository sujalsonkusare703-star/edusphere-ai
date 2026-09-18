import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "EduSphere AI | Shape Your Future. AI Guides You Forward.",
  description: "AI-powered student academic and career guidance platform. Discover colleges, internships, placement opportunities, and personalized recommendations.",
  icons: {
    icon: [
      { url: "/brand/logo-icon.png?v=edusphere", type: "image/png", sizes: "256x256" },
      { url: "/brand/favicon-32.png?v=edusphere", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16.png?v=edusphere", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico?v=edusphere", sizes: "any" },
    ],
    shortcut: "/brand/logo-icon.png?v=edusphere",
    apple: [
      { url: "/brand/apple-touch-icon.png?v=edusphere", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
