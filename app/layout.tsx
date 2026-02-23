import "./globals.css";

export const metadata = {
  title: "Quotly WhatsApp Generator",
  description: "Quotly WhatsApp style generator (canvas) + Vercel GET backend (SVG)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
