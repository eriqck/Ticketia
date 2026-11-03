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
  const fallbackEvent = eventDetails[params.slug] ?? {
    title: params.slug.replace(/-/g, " "),
    category: "Event",
    date: "Loading event details...",
    time: "",
    venue: "Loading venue...",
    description: "Loading event details...",
    hero: "",
    photos: [],
    organizer: "Ticketia organizer",
    tickets: [{ name: "Loading tickets", amount: 0, description: "Please wait while ticket options load." }],
  };
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

  useEffect(() => {
    const cacheKey = `ticketia:event:${params.slug}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const result = JSON.parse(cached) as { event?: EventDetail & { imageUrl?: string } | null };
        if (result.event) {
          const nextEvent = { ...result.event, hero: result.event.hero || result.event.imageUrl || fallbackEvent.hero, photos: result.event.photos ?? [] };
          window.setTimeout(() => {
            setEventData(nextEvent);
            setSelectedTicket(nextEvent.tickets[0]);
            setUploadedHero(result.event?.imageUrl ?? "");
          }, 0);
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
    const controller = new AbortController();
    fetch(`/api/public-events/${params.slug}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json() as { event?: EventDetail & { imageUrl?: string } | null };
      if (!response.ok || !result.event) throw new Error("Event unavailable.");
      const nextEvent = { ...result.event, hero: result.event.hero || result.event.imageUrl || fallbackEvent.hero, photos: result.event.photos ?? [] };
      setEventData(nextEvent);
      setSelectedTicket(nextEvent.tickets[0]);
      setUploadedHero(result.event.imageUrl ?? "");
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    }).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
    });
    return () => controller.abort();
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

  return <main className="event-page"><header className="site-header"><Link className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></Link><Link className="event-back" href="/">Back to events</Link></header><section className="event-shell"><div className="event-summary-card"><div className={`event-poster-frame${event.hero || uploadedHero ? "" : " event-poster-loading"}`}>{(uploadedHero || event.hero) && <img className="event-hero-image" src={uploadedHero || event.hero} alt={`${event.title} banner`} />}</div><div className="event-summary"><span className="event-category">{event.category}</span><h1>{event.title}</h1><div className="event-meta-grid"><div><small>Date</small><strong>{event.date}</strong></div><div><small>Venue</small><strong>{event.venue}</strong></div></div><div className="event-organizer"><span>Organized by</span><strong>{event.organizer}</strong></div><div className="event-share-row"><span>Share</span><button type="button">WhatsApp</button><button type="button">Copy link</button></div></div></div><aside className="event-ticket-panel" id="tickets"><div className="ticket-panel-heading"><h2>Get Tickets</h2><span>Secure checkout</span></div>{event.tickets.map((ticket) => <div className="landing-ticket" key={ticket.name}><div><strong>{ticket.name}</strong><small>{money(ticket.amount)}</small></div><div className="ticket-purchase-row"><div className="quantity-control"><button onClick={() => selectedTicket.name === ticket.name && setQuantity(Math.max(1, quantity - 1))} aria-label={`Decrease ${ticket.name}`}>−</button><strong>{selectedTicket.name === ticket.name ? quantity : 1}</strong><button onClick={() => selectedTicket.name === ticket.name && setQuantity(Math.min(5, quantity + 1))} aria-label={`Increase ${ticket.name}`}>+</button></div><button className="ticket-add-button" onClick={() => { setSelectedTicket(ticket); document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}>+ Add</button></div></div>)}<div className="ticket-selected-note">Selected: <strong>{selectedTicket.name}</strong> · {money(total)}</div><div id="checkout-form" className="event-checkout-form"><label className="landing-label" htmlFor="event-phone">M-Pesa phone number</label><div className="phone-input"><span>+254</span><input id="event-phone" type="tel" value={phone} onChange={(input) => setPhone(input.target.value)} placeholder="7XX XXX XXX" /></div><label className="landing-label" htmlFor="event-email">Receipt email</label><div className="phone-input"><input id="event-email" type="email" value={email} onChange={(input) => setEmail(input.target.value)} placeholder="you@example.com" /></div><div className="landing-total"><span>Total</span><strong>{money(total)}</strong></div>{error && <p className="payment-error" role="alert">{error}</p>}<button className="action action-gold full-width" onClick={checkout} disabled={status === "pending"}>{status === "pending" ? "Connecting to Paystack..." : `Pay ${money(total)}`}</button><p className="secure-note">No signup needed · Powered by Paystack</p></div></aside><article className="event-detail-main"><p className="muted-label">About this event</p><h2>Make room<br /><span>for this.</span></h2><p className="event-description">{event.description}</p><div className="event-gallery">{event.photos.map((photo) => <div className="gallery-image" key={photo} style={{ backgroundImage: `url(${photo})` }} />)}</div><div className="event-faq"><p className="muted-label">Good to know</p><h3>FAQs</h3><details open><summary>Do I need an account to buy a ticket?</summary><p>No. Choose your ticket below, enter your M-Pesa number and email, then complete checkout.</p></details><details><summary>How will I receive my ticket?</summary><p>Your signed QR ticket will be sent to the email used at checkout.</p></details><details><summary>Can I get a refund?</summary><p>Refund eligibility follows the organizer&apos;s event policy and is handled through Ticketia.</p></details></div></article></section></main>;
}
