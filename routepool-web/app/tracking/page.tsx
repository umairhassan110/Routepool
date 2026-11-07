import type { Metadata } from "next";
import { TrackingScreen } from "@/components/tracking-screen";
export const metadata: Metadata = { title: "Live Tracking" };
export default function TrackingPage() { return <TrackingScreen/>; }
