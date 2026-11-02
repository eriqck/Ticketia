"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrganizerEvent = { id: string; name: string; event_date: string; venue: string; status: string; tickets_total: number; tickets_sold: number; revenue_kes: number; scans: number };
const money = (value: number) => `KSh ${value.toLocaleString()}`;

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [organizerName, setOrganizerName] = useState("organizer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    try {
      const response = await fetch("/api/events");
      const result = (await response.json()) as { events?: OrganizerEvent[]; organizerName?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load your events.");
      setEvents(result.events ?? []); setOrganizerName(result.organizerName?.split(" ")[0] ?? "organizer");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load your events."); } finally { setLoading(false); }
  }

  useEffect(() => { void loadEvents(); }, []);

  async function updateEvent(id: string, status: "published" | "draft") {
    await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await loadEvents();
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event and its ticket setup?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    await loadEvents();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  const ticketsSold = events.reduce((total, event) => total + Number(event.tickets_sold), 0);
  const inventory = events.reduce((total, event) => total + Number(event.tickets_total), 0);
  const revenue = events.reduce((total, event) => total + Number(event.revenue_kes), 0);
  const scans = events.reduce((total, event) => total + Number(event.scans), 0);

  return <main className="dashboard-page"><header className="site-header organizer-header"><Link className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></Link><div className="dashboard-nav"><span>Organizer dashboard</span><Link href="/organizer">Payouts</Link><Link className="dashboard-create" href="/organizer/events/new">+ Create event</Link><button className="dashboard-logout" onClick={() => void logout()}>Log out</button></div></header><section className="dashboard-shell"><div className="dashboard-heading"><div><p className="muted-label">Your business at a glance</p><h1>Hello {organizerName},<br /><span>keep things moving.</span></h1></div><Link className="action action-gold" href="/organizer/events/new">Create event <span>↗</span></Link></div><div className="stat-grid"><div className="stat-card"><small>Total revenue</small><strong>{money(revenue)}</strong><span>Across all events</span></div><div className="stat-card"><small>Tickets sold</small><strong>{ticketsSold} <em>/ {inventory}</em></strong><span>Live inventory</span></div><div className="stat-card"><small>Gate scans</small><strong>{scans}</strong><span>Attendance verified</span></div><div className="stat-card accent"><small>Sales conversion</small><strong>{inventory ? `${Math.round((ticketsSold / inventory) * 100)}%` : "0%"}</strong><span>Inventory movement</span></div></div><section className="dashboard-content"><div className="dashboard-events"><div className="dashboard-section-head"><div><p className="muted-label">Your events</p><h2>Keep things moving.</h2></div><Link href="/organizer/events/new">Create another ↗</Link></div>{loading && <p className="dashboard-muted">Loading your events...</p>}{error && <p className="form-error">{error}</p>}{!loading && !error && events.length === 0 && <div className="empty-dashboard"><strong>Your first event starts here.</strong><span>Create an event, add ticket types, and share your live link.</span><Link className="action action-gold" href="/organizer/events/new">Create your first event</Link></div>}{events.map((event) => <article className="dashboard-event" key={event.id}><div className="event-date-block"><strong>{new Date(event.event_date).toLocaleDateString("en-GB", { day: "2-digit" })}</strong><span>{new Date(event.event_date).toLocaleDateString("en-GB", { month: "short" })}</span></div><div className="dashboard-event-info"><h3>{event.name}</h3><p>{event.venue}</p><span className={`event-status ${event.status}`}>{event.status.replace("_", " ")}</span></div><div className="dashboard-event-metric"><strong>{event.tickets_sold}/{event.tickets_total}</strong><span>tickets sold</span></div><div className="dashboard-event-actions">{event.status === "draft" && <button className="event-action publish-action" onClick={() => void updateEvent(event.id, "published")}>Publish</button>}{event.status === "published" && <button className="event-action unpublish-action" onClick={() => void updateEvent(event.id, "draft")}>Unpublish</button>}{!(["expired", "sold_out"].includes(event.status)) && <Link className="event-action edit-action" href={`/organizer/events/new?edit=${event.id}`}>Edit</Link>}<button className="event-action delete-action" onClick={() => void deleteEvent(event.id)}>Delete</button></div></article>)}</div><aside className="dashboard-side"><div className="side-panel"><p className="muted-label">Sales channels</p><h3>Where your buyers come from.</h3><div className="channel-row"><span>Direct</span><strong>—</strong></div><div className="channel-row"><span>WhatsApp</span><strong>—</strong></div><div className="channel-row"><span>Instagram</span><strong>—</strong></div><div className="channel-row"><span>Referral</span><strong>—</strong></div></div><div className="side-panel dark-panel"><p className="muted-label">Payout account</p><h3>Keep your earnings<br />connected.</h3><Link href="/organizer">Review payout account ↗</Link></div></aside></section></section></main>;
}
