import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Paniyal",
  description: "Tracking the footprins of service — Paniyal paves the path!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      <Toaster />
      </body>
    </html>
  );
}
