import type { Metadata } from "next";
import { RidesScreen } from "@/components/rides-screen";
export const metadata: Metadata = { title: "My Rides" };
export default function RidesPage() { return <RidesScreen/>; }
