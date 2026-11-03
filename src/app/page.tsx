"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { createPaymentQuote } from "@/lib/payments";
import { eventCategories } from "@/lib/event-categories";
import { prefetchPublicEvent, type PublicEvent } from "@/lib/public-event-cache";

type EventItem = PublicEvent;

type TicketOption = {
  name: string;
  description: string;
  amount: number;
  price: string;
  remaining: number;
};

const events: EventItem[] = [
  { title: "Pineapple Party", date: "Sat, 10 October 2026", time: "7:00 pm - late", location: "Nairobi Street Kitchen", category: "Music", price: "KSh 1,500", amount: 1500, image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85" },
  { title: "Nairobi Tech Summit", date: "Friday, 9 October 2026", time: "9:00 am - 5:00 pm", location: "Kenyatta International Convention Centre", category: "Business", price: "KSh 1,000", amount: 1000, image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85" },
  { title: "The Laugh Factory", date: "Sunday, 18 October 2026", time: "6:00 pm - 10:00 pm", location: "Westlands, Nairobi", category: "Comedy", price: "KSh 800", amount: 800, image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1000&q=85" },
  { title: "Nairobi City Run", date: "Sunday, 25 October 2026", time: "6:30 am - 11:00 am", location: "Uhuru Park, Nairobi", category: "Sports", price: "KSh 500", amount: 500, image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=85" },
];

const ticketOptions: TicketOption[] = [
  { name: "Early Bird", description: "First release · limited quantity", amount: 1000, price: "KSh 1,000", remaining: 24 },
  { name: "Regular", description: "General admission", amount: 1500, price: "KSh 1,500", remaining: 86 },
  { name: "VIP", description: "Priority entry + lounge access", amount: 3500, price: "KSh 3,500", remaining: 12 },
];

function eventSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mergeEvents(currentEvents: EventItem[], nextEvents: EventItem[]) {
  const merged = new Map(currentEvents.map((event) => [eventSlug(event.title), event]));
  nextEvents.forEach((event) => merged.set(eventSlug(event.title), event));
  return Array.from(merged.values());
}

export default function Home() {
  const [eventCatalog, setEventCatalog] = useState(events);
  const [activeCategory, setActiveCategory] = useState("All events");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedTicket, setSelectedTicket] = useState(ticketOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "error">("idle");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroSearch, setHeroSearch] = useState("");
  const [heroTab, setHeroTab] = useState("Events");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [nextPage, setNextPage] = useState(2);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const categories = ["All events", ...eventCategories];
  const filteredEvents = eventCatalog.filter((event) => {
    const matchesCategory = activeCategory === "All events" || event.category === activeCategory;
    const matchesSearch = !normalizedSearch || [event.title, event.category, event.location, event.date].some((value) => value.toLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });
  const paymentQuote = createPaymentQuote(selectedTicket.amount * quantity);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("event");
    const event = events.find((item) => eventSlug(item.title) === slug);
    const selection = window.setTimeout(() => {
      if (event) setSelectedEvent(event);
    }, 0);
    const rotation = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % eventCatalog.length), 5000);
    return () => {
      window.clearTimeout(selection);
      window.clearInterval(rotation);
    };
  }, [eventCatalog.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: "1", limit: "12" });
      if (activeCategory !== "All events") params.set("category", activeCategory);
      if (normalizedSearch) params.set("search", normalizedSearch);
      setEventsLoading(true);
      fetch(`/api/public-events?${params.toString()}`, { cache: "no-store" }).then(async (response) => {
        const result = await response.json() as { events?: EventItem[]; pagination?: { hasNextPage?: boolean } };
        if (!response.ok) return;
        setEventCatalog((currentEvents) => mergeEvents(currentEvents, result.events ?? []));
        setHasNextPage(result.pagination?.hasNextPage ?? false);
        setNextPage(2);
        setFeaturedIndex(0);
      }).catch(() => undefined).finally(() => setEventsLoading(false));
    }, normalizedSearch ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [activeCategory, normalizedSearch]);

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLElement>("[data-event-slug]"));
    if (!("IntersectionObserver" in window)) {
      links.forEach((link) => prefetchPublicEvent(link.dataset.eventSlug ?? ""));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const slug = (entry.target as HTMLElement).dataset.eventSlug;
        if (slug) prefetchPublicEvent(slug);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "300px" });
    links.forEach((link) => observer.observe(link));
    return () => observer.disconnect();
  }, [eventCatalog]);

  function loadMoreEvents() {
    const params = new URLSearchParams({ page: String(nextPage), limit: "12" });
    if (activeCategory !== "All events") params.set("category", activeCategory);
    if (normalizedSearch) params.set("search", normalizedSearch);
    setEventsLoading(true);
    fetch(`/api/public-events?${params.toString()}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { events?: EventItem[]; pagination?: { hasNextPage?: boolean } };
      if (!response.ok) return;
      setEventCatalog((currentEvents) => mergeEvents(currentEvents, result.events ?? []));
      setHasNextPage(result.pagination?.hasNextPage ?? false);
      setNextPage((page) => page + 1);
    }).catch(() => undefined).finally(() => setEventsLoading(false));
  }

  const featuredEvent = eventCatalog[featuredIndex % eventCatalog.length] ?? events[0];

  function findEvents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(heroSearch);
    setActiveCategory("All events");
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
  }

  async function startPayment() {
    if (!selectedEvent) return;

    setPaymentState("pending");
    setPaymentError("");

    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, eventTitle: selectedEvent.title, eventSlug: eventSlug(selectedEvent.title), ticketName: selectedTicket.name, phone, quantity }),
      });
      const result = (await response.json()) as { authorizationUrl?: string; error?: string };

      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error ?? "Paystack could not start the payment.");
      }

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setPaymentState("error");
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
    }
  }

  function closeCheckout() {
    setSelectedEvent(null);
    setPaymentState("idle");
    setSelectedTicket(ticketOptions[0]);
    setQuantity(1);
    setPhone("");
    setEmail("");
    setPaymentError("");
  }

  return (
    <main className="ticketia-app">
      <header className="site-header marketplace-header">
        <a className="brand" href="#top" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></a>
        <nav className="marketplace-nav" aria-label="Main navigation"><a href="#discover">Events</a><a href="#discover">Flights</a><a href="#discover">Holidays</a><a href="#organizers">Blog</a></nav>
        <div className={searchOpen ? "header-actions search-active" : "header-actions"}><button className="search-button" onClick={() => { setSearchOpen((open) => !open); setSearchQuery(""); setActiveCategory("All events"); }} aria-label={searchOpen ? "Close event search" : "Search events"}>{searchOpen ? "×" : "⌕"}</button>{searchOpen && <label className="header-search"><span>Search events</span><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Try music, sports or Nairobi" /></label>}<a className="help-link" href="#help">Help</a><a className="login-button" href="/signin">Log in</a><a className="sell-event-button" href="/signup?role=organizer">Sell Your Event</a></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-content">
          <div className="hero-search-panel"><div className="hero-tabs">{["Events", "Flights", "Holidays"].map((tab) => <button key={tab} className={heroTab === tab ? "hero-tab active" : "hero-tab"} onClick={() => setHeroTab(tab)}>{tab}</button>)}</div><form onSubmit={findEvents}><label><span>Event name</span><input value={heroSearch} onChange={(event) => setHeroSearch(event.target.value)} placeholder={heroTab === "Events" ? "Search events" : `${heroTab} coming soon`} disabled={heroTab !== "Events"} /></label><label><span>City</span><input placeholder="Nairobi" disabled={heroTab !== "Events"} /></label><button className="hero-find-button" disabled={heroTab !== "Events"}>Find Your Event</button></form></div>
          <div className="hero-featured"><Link data-event-slug={eventSlug(featuredEvent.title)} className="hero-featured-poster" href={`/events/${eventSlug(featuredEvent.title)}`} onMouseEnter={() => prefetchPublicEvent(eventSlug(featuredEvent.title))} onFocus={() => prefetchPublicEvent(eventSlug(featuredEvent.title))} onTouchStart={() => prefetchPublicEvent(eventSlug(featuredEvent.title))} style={{ backgroundImage: `url(${featuredEvent.image})` }} aria-label={`View ${featuredEvent.title}`}><span className="category-pill">{featuredEvent.category}</span><strong>{featuredEvent.title}</strong></Link><Link data-event-slug={eventSlug(featuredEvent.title)} className="hero-featured-card" href={`/events/${eventSlug(featuredEvent.title)}`} onMouseEnter={() => prefetchPublicEvent(eventSlug(featuredEvent.title))} onFocus={() => prefetchPublicEvent(eventSlug(featuredEvent.title))} onTouchStart={() => prefetchPublicEvent(eventSlug(featuredEvent.title))}><strong>{featuredEvent.title}</strong><span>{featuredEvent.location}</span><b>{featuredEvent.price}</b><em>View ›</em></Link><div className="hero-dots">{eventCatalog.map((event, index) => <button key={event.title} className={index === featuredIndex ? "active" : ""} onClick={() => setFeaturedIndex(index)} aria-label={`Show ${event.title}`} />)}</div></div>
        </div>
      </section>

      <section className="quick-actions" aria-label="Ticketia actions">
        <a className="quick-action dark" href="/signup?role=organizer">List an event</a><a className="quick-action" href="#discover">Marketplace</a>
      </section>

      <section className="featured-event" aria-label="Featured event">
        <div className="featured-poster" style={{ backgroundImage: `url(${events[0].image})` }}><span className="category-pill">{events[0].category}</span><span className="poster-label">Pineapple<br /><em>Party</em></span></div>
        <div className="featured-details"><div><p className="muted-label">Featured event</p><h2>{events[0].title}</h2><p className="event-line">▣ &nbsp;{events[0].date}</p><p className="event-line">◷ &nbsp;{events[0].time}</p><p className="event-line">⌖ &nbsp;{events[0].location}</p></div><div className="featured-price"><p>Starting from</p><strong>{events[0].price}</strong></div><Link data-event-slug={eventSlug(events[0].title)} className="outline-button" href={`/events/${eventSlug(events[0].title)}`} onMouseEnter={() => prefetchPublicEvent(eventSlug(events[0].title))} onFocus={() => prefetchPublicEvent(eventSlug(events[0].title))} onTouchStart={() => prefetchPublicEvent(eventSlug(events[0].title))}>View event</Link></div>
      </section>

      <section className="events-section" id="discover">
        <div className="section-title"><p className="muted-label">Find your next reason to go out</p><h2>All Events</h2></div>
        <div className="category-tabs" role="tablist">{categories.map((category) => <button key={category} className={activeCategory === category ? "category-tab active" : "category-tab"} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category}>{category}</button>)}</div>
        <div className="event-list">{filteredEvents.map((event) => <article className="event-card" key={event.title}><Link data-event-slug={eventSlug(event.title)} className="event-poster" href={`/events/${eventSlug(event.title)}`} onMouseEnter={() => prefetchPublicEvent(eventSlug(event.title))} onFocus={() => prefetchPublicEvent(eventSlug(event.title))} onTouchStart={() => prefetchPublicEvent(eventSlug(event.title))} aria-label={`View ${event.title}`} style={{ backgroundImage: `url(${event.image})` }}><span className="category-pill">{event.category}</span></Link><div className="event-card-content"><div><h3>{event.title}</h3><p>{event.date}</p><p>{event.location}</p></div><strong>{event.price}</strong></div></article>)}</div>{eventsLoading && <p className="dashboard-muted">Loading events...</p>}{hasNextPage && !eventsLoading && <button className="action action-dark" onClick={loadMoreEvents}>Load more events</button>}{filteredEvents.length === 0 && !eventsLoading && <p className="empty-search">No events match “{searchQuery}”. Try another city, category or event name.</p>}
      </section>

      <section className="organizer-section" id="organizers"><div><p className="muted-label">For organizers</p><h2>Sell everywhere.<br /><span>One inventory.</span></h2></div><div><p>Create an event once, then share one live ticket link to WhatsApp, Instagram, your website, SMS or a QR poster.</p><a className="action action-gold" href="/signup?role=organizer">Start selling</a></div></section>

      <footer className="site-footer" id="create"><span className="brand"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></span><span>Discover what&apos;s happening in Kenya.</span><span>© 2026 Ticketia</span></footer>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <a href="#top"><span>⌂</span>Home</a>
        <a href="#discover"><span>⌕</span>Explore</a>
        <a href="#organizers"><span>＋</span>Sell</a>
        <a href="/signin"><span>◯</span>Account</a>
      </nav>

      {selectedEvent && <div className="modal-backdrop" role="presentation" onClick={closeCheckout}><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={closeCheckout} aria-label="Close checkout">×</button><p className="muted-label">Quick checkout · No account required</p><h2 id="checkout-title">{selectedEvent.title}</h2><p className="modal-meta">{selectedEvent.date} · {selectedEvent.location}</p><div className="ticket-options">{ticketOptions.map((ticket) => <button key={ticket.name} className={selectedTicket.name === ticket.name ? "ticket-option selected" : "ticket-option"} onClick={() => setSelectedTicket(ticket)}><span><strong>{ticket.name}</strong><small>{ticket.description}</small></span><span><b>{ticket.price}</b><small>{ticket.remaining} left</small></span></button>)}</div><div className="quantity-row"><span>Quantity</span><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><strong>{quantity}</strong><button onClick={() => setQuantity(Math.min(5, quantity + 1))} aria-label="Increase quantity">+</button></div></div><div className="fee-breakdown"><div><span>Tickets</span><strong>KSh {paymentQuote.ticketAmount.toLocaleString()}</strong></div><div><span>Ticketia fee · 5%</span><strong>KSh {paymentQuote.platformFee.toLocaleString()}</strong></div><div><span>Payment processing · estimate</span><strong>KSh {paymentQuote.processingFee.toLocaleString()}</strong></div></div><div className="checkout-total"><span>You pay</span><strong>KSh {paymentQuote.customerTotal.toLocaleString()}</strong></div><label htmlFor="phone">M-Pesa phone number</label><div className="phone-input"><span>+254</span><input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="7XX XXX XXX" /></div><label htmlFor="email">Receipt email</label><div className="phone-input"><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>{paymentError && <p className="payment-error" role="alert">{paymentError}</p>}<div className="checkout-action"><button className="action action-dark full-width" onClick={startPayment} disabled={paymentState === "pending"}>{paymentState === "pending" ? "Connecting to Paystack..." : "Confirm & pay with M-Pesa"}</button><p className="secure-note">No signup needed · Powered by Paystack · Ticket sent to your email</p></div></section></div>}
    </main>
  );
}
