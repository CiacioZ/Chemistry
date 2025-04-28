import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Import Inter
import "./globals.css";
import { DiagramProvider } from '../components/flow-diagram/contexts/DiagramContext'; // Assicurati che l'import sia corretto

// Initialize the Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chemistry Editor",
  description: "Visual editor for Chemistry game engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply the font class name to the body */}
      <body className={inter.className}>
        {/* Wrap children with DiagramProvider */}
        <DiagramProvider>
          {children}
        </DiagramProvider>
      </body>
    </html>
  );
}
