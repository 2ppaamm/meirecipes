// Root layout. The real layout — with header, footer, fonts — is in [locale]/layout.tsx.
// This shell exists because Next.js requires a root layout above the dynamic segment.
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
