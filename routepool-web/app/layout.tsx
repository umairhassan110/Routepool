import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { RoutePoolProvider } from "@/components/routepool-provider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RoutePool PK — A safer everyday journey", template: "%s · RoutePool PK" },
  description: "Find monthly pick-and-drop routes in Islamabad and Rawalpindi. RoutePool PK connects drivers, commuters and parents with safer, clearer journeys.",
  icons: { icon: "/routepool.svg", apple: "/routepool.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><RoutePoolProvider><AppShell>{children}</AppShell></RoutePoolProvider></body></html>;
}
