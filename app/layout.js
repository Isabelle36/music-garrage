import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/MyComps/Navbar";
import Piano from "@/MyComps/Piano";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MusicBass",
  description: "An app that helps you learn music theory"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} bg-zinc-900 ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <Piano/>
       
        {children}
      </body>
    </html>
  );
}
