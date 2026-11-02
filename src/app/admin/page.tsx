"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminEvent = { id: string; name: string; event_date: string; status: string; organizer_name: string; tickets_sold: number; revenue_kes: number };
export default function AdminPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/admin/overview").then(async (response) => { const result = await response.json() as { events?: AdminEvent[]; error?: string }; if (!response.ok) throw new Error(result.error); setEvents(result.events ?? []); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load admin overview.")); }, []);
  const revenue = events.reduce((total, event) => total + Number(event.revenue_kes), 0);
  const tickets = events.reduce((total, event) => total + Number(event.tickets_sold), 0);
  return <main className="dashboard-page"><header className="site-header organizer-header"><Link className="brand" href="/"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></Link><span className="scanner-label">Admin performance overview</span></header><section className="dashboard-shell"><div className="dashboard-heading"><div><p className="muted-label">Platform performance</p><h1>See the whole<br /><span>picture.</span></h1></div></div><div className="stat-grid"><div className="stat-card"><small>Total platform revenue</small><strong>KSh {revenue.toLocaleString()}</strong><span>Paid orders</span></div><div className="stat-card"><small>Tickets sold</small><strong>{tickets}</strong><span>Across all events</span></div><div className="stat-card"><small>Events</small><strong>{events.length}</strong><span>Organizer inventory</span></div></div>{error && <p className="form-error">{error}</p>}<section className="dashboard-events"><div className="dashboard-section-head"><div><p className="muted-label">Event performance</p><h2>Sales and revenue.</h2></div></div>{events.map((event) => <article className="dashboard-event" key={event.id}><div className="event-date-block"><strong>{new Date(event.event_date).toLocaleDateString("en-GB", { day: "2-digit" })}</strong><span>{new Date(event.event_date).toLocaleDateString("en-GB", { month: "short" })}</span></div><div className="dashboard-event-info"><h3>{event.name}</h3><p>{event.organizer_name}</p><span className={`event-status ${event.status}`}>{event.status.replace("_", " ")}</span></div><div className="dashboard-event-metric"><strong>{event.tickets_sold}</strong><span>tickets sold</span></div><strong>{`KSh ${Number(event.revenue_kes).toLocaleString()}`}</strong></article>)}</section></section></main>;
}
