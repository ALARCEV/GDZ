import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/tokens.css";
import "@/app/globals.css";

import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: appConfig.name,
  description:
    "Mobile-first MVP scaffold for a school assistant with guest entry, value-first capture, history, and admin control."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
