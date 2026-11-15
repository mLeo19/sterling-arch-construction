import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import { IntroSequence } from "@/components/motion/IntroSequence";
import { PageTransition } from "@/components/PageTransition";
import { SiteNav } from "@/components/SiteNav";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/data/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
  description: site.tagline,
  openGraph: {
    title: site.name,
    description: site.tagline,
    url: site.url,
    siteName: site.name,
    images: [{ url: "/images/photo-1758846946188-12316e71c680.jpg" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.tagline,
    images: ["/images/photo-1758846946188-12316e71c680.jpg"],
  },
};

// Without this, iOS Safari dynamically tints its own status bar/toolbar to
// whatever color it samples at the edges of the page - with nothing pinned
// here, that chrome retints itself mid-transition (independently, on its
// own timing, not synced to this site's own animation) every time a dark
// section like the footer or a photo overlay passes near the top/bottom of
// the viewport. Pinning this to the site's actual resting background stops
// Safari's own UI from flickering on top of whatever the page itself is
// doing.
export const viewport: Viewport = {
  themeColor: "#f3f0ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SmoothScroll>
          <IntroSequence>
            <PageTransition>{children}</PageTransition>
            <Footer />
            <SiteNav />
          </IntroSequence>
        </SmoothScroll>
      </body>
    </html>
  );
}
