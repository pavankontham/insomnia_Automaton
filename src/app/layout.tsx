import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display-loaded",
  subsets: ["latin"],
});

const body = DM_Sans({
  variable: "--font-body-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "insomnia_Automaton",
  description:
    "Zero-cost 10-day autonomous micro-business experiment — owner approves ideas; AI negotiates; deals close on payment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body
        className={`${display.variable} ${body.variable} min-h-full flex flex-col`}
        style={
          {
            ["--font-display" as string]:
              "var(--font-display-loaded), Georgia, serif",
            ["--font-body" as string]: "var(--font-body-loaded), sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
