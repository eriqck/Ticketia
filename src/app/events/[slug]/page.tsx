"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type EventDetail = { title: string; category: string; date: string; time: string; venue: string; description: string; hero: string; photos: string[]; organizer: string; tickets: Array<{ name: string; amount: number; description: string }> };

const eventDetails: Record<string, EventDetail> = {
  "pineapple-party": { title: "Pineapple Party", category: "Music", date: "Saturday, 10 October 2026", time: "7:00 pm - late", venue: "Nairobi Street Kitchen", description: "A bright, late-night gathering of good music, city people and the kind of energy Nairobi does best.", hero: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=90", photos: ["https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85"], organizer: "Pineapple House", tickets: [{ name: "Early Bird", amount: 1000, description: "First release · limited quantity" }, { name: "Regular", amount: 1500, description: "General admission" }, { name: "VIP", amount: 3500, description: "Priority entry + lounge access" }] },
  "nairobi-tech-summit": { title: "Nairobi Tech Summit", category: "Business", date: "Friday, 9 October 2026", time: "9:00 am - 5:00 pm", venue: "Kenyatta International Convention Centre", description: "The room where Kenya's builders, founders and curious minds meet to shape what comes next.", hero: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=90", photos: ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=85"], organizer: "Nairobi Tech Community", tickets: [{ name: "Early Bird", amount: 1000, description: "First release · limited quantity" }, { name: "Regular", amount: 1500, description: "General admission" }, { name: "VIP", amount: 3500, description: "Priority entry + lounge access" }] },
  "the-laugh-factory": { title: "The Laugh Factory", category: "Comedy", date: "Sunday, 18 October 2026", time: "6:00 pm - 10:00 pm", venue: "Westlands, Nairobi", description: "An evening of sharp stories, big laughs and a room full of people who needed to get out.", hero: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1800&q=90", photos: ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"], organizer: "Laugh Factory Kenya", tickets: [{ name: "Regular", amount: 800, description: "General admission" }, { name: "VIP", amount: 2000, description: "Priority entry" }] },
  "nairobi-city-run": { title: "Nairobi City Run", category: "Sports", date: "Sunday, 25 October 2026", time: "6:30 am - 11:00 am", venue: "Uhuru Park, Nairobi", description: "Start the morning with Nairobi runners, a city route, fresh air and a finish line worth showing up for.", hero: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1800&q=90", photos: ["https://images.unsplash.com/photo-1530137073522-4e0c2a1a4f0a?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=85"], organizer: "Nairobi Runners Club", tickets: [{ name: "5K Entry", amount: 500, description: "Race entry + finishers medal" }, { name: "10K Entry", amount: 800, description: "Timed race + race kit" }] },
};

const money = (amount: number) => `KSh ${amount.toLocaleString()}`;

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const fallbackEvent = eventDetails[params.slug] ?? eventDetails["pineapple-party"];
  const [eventData, setEventData] = useState<EventDetail | null>(null);
  const event = eventData ?? fallbackEvent;
  const [uploadedHero, setUploadedHero] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(fallbackEvent.tickets[0]);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState("");
  const total = selectedTicket.amount * quantity;
  const platformFee = Math.round(total * 0.05);
  const processingFee = Math.round(total * 0.015);
  const organizerReceives = total - platformFee - processingFee;

  useEffect(() => {
    fetch(`/api/public-events/${params.slug}`).then(async (response) => {
      const result = await response.json() as { event?: EventDetail & { imageUrl?: string } | null };
      if (!response.ok || !result.event) throw new Error("Event unavailable.");
      const nextEvent = { ...result.event, hero: result.event.hero || result.event.imageUrl || fallbackEvent.hero, photos: result.event.photos ?? [] };
      setEventData(nextEvent);
      setSelectedTicket(nextEvent.tickets[0]);
      setUploadedHero(result.event.imageUrl ?? "");
    }).catch(() => undefined);
  }, [params.slug, fallbackEvent.hero]);

  async function checkout() {
    setStatus("pending"); setError("");
    try {
      const response = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, eventSlug: params.slug, ticketName: selectedTicket.name, phone, quantity }) });
      const result = (await response.json()) as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error ?? "Paystack could not start payment.");
      window.location.assign(result.authorizationUrl);
    } catch (checkoutError) { setStatus("error"); setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start payment."); }
  }

  return <main className="event-page"><header className="site-header"><Link className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></Link><Link className="event-back" href="/">Back to events</Link></header><section className="event-hero" style={{ backgroundImage: `url(${uploadedHero || event.hero})` }}><div className="event-hero-overlay"><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.date} · {event.time}</p></div></section><section className="event-detail-layout"><article className="event-detail-main"><p className="muted-label">About this event</p><h2>Make room<br /><span>for this.</span></h2><p className="event-description">{event.description}</p><div className="event-facts"><div><small>When</small><strong>{event.date}<br />{event.time}</strong></div><div><small>Where</small><strong>{event.venue}</strong><a href="#map">View map ↗</a></div><div><small>Hosted by</small><strong>{event.organizer}</strong><span className="verified-account">✓ Verified organizer</span></div></div><div className="event-gallery">{event.photos.map((photo) => <div className="gallery-image" key={photo} style={{ backgroundImage: `url(${photo})` }} />)}</div><div className="event-faq"><p className="muted-label">Good to know</p><h3>FAQs</h3><details open><summary>Do I need an account to buy a ticket?</summary><p>No. Choose your ticket below, enter your M-Pesa number and email, then complete checkout.</p></details><details><summary>How will I receive my ticket?</summary><p>Your signed QR ticket will be sent to the email used at checkout.</p></details><details><summary>Can I get a refund?</summary><p>Refund eligibility follows the organizer&apos;s event policy and is handled through Ticketia.</p></details></div></article><aside className="event-ticket-panel" id="tickets"><p className="muted-label">Tickets</p><h3>Choose your way in.</h3>{event.tickets.map((ticket) => <button key={ticket.name} className={selectedTicket.name === ticket.name ? "landing-ticket selected" : "landing-ticket"} onClick={() => setSelectedTicket(ticket)}><span><strong>{ticket.name}</strong><small>{ticket.description}</small></span><b>{money(ticket.amount)}</b></button>)}<div className="landing-quantity"><span>Quantity</span><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><strong>{quantity}</strong><button onClick={() => setQuantity(Math.min(5, quantity + 1))} aria-label="Increase quantity">+</button></div></div><div className="landing-fees"><div><span>Ticket price</span><strong>{money(total)}</strong></div><div><span>Ticketia fee · organizer pays</span><strong>-{money(platformFee)}</strong></div><div><span>Paystack processing · organizer pays</span><strong>-{money(processingFee)}</strong></div><div className="organizer-settlement"><span>Organizer receives</span><strong>{money(organizerReceives)}</strong></div></div><div className="landing-total"><span>You pay</span><strong>{money(total)}</strong></div><label className="landing-label" htmlFor="event-phone">M-Pesa phone number</label><div className="phone-input"><span>+254</span><input id="event-phone" type="tel" value={phone} onChange={(input) => setPhone(input.target.value)} placeholder="7XX XXX XXX" /></div><label className="landing-label" htmlFor="event-email">Receipt email</label><div className="phone-input"><input id="event-email" type="email" value={email} onChange={(input) => setEmail(input.target.value)} placeholder="you@example.com" /></div>{error && <p className="payment-error" role="alert">{error}</p>}<button className="action action-gold full-width" onClick={checkout} disabled={status === "pending"}>{status === "pending" ? "Connecting to Paystack..." : "Confirm & pay with M-Pesa"}</button><p className="secure-note">No signup needed · Powered by Paystack</p></aside></section></main>;
}
