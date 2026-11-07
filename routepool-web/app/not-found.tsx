import Link from "next/link";
import { MapPin } from "lucide-react";
export default function NotFound() { return <div className="empty-state panel"><MapPin size={38}/><h1>This stop isn’t on the route.</h1><p>The page you’re looking for is not available.</p><Link href="/tracking" className="btn-primary">Back to tracking</Link></div>; }
