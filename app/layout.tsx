import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLICHER — Movies & Series",
  description: "Discover movies and series on FLICHER."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
