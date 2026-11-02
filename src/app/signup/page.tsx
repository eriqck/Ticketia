"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: form.get("name"), email: form.get("email"), password: form.get("password") }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) { setError(result.error ?? "Unable to create account."); return; }
    setSubmitted(true);
    router.push("/organizer/dashboard");
  }

  return <main className="auth-page"><header className="site-header"><a className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></a><a className="auth-top-link" href="/signin">Already have an account? <strong>Sign in</strong></a></header><section className="auth-layout"><div className="auth-pitch"><p className="hero-kicker">Your next chapter starts here</p><h1>Make it<br /><span>happen.</span></h1><p>Create, sell and grow your event with Ticketia. Attendees can buy tickets without creating accounts.</p><div className="auth-note"><span>✦</span> Built for people making Kenya move.</div></div><form className="auth-form" onSubmit={submit}><p className="muted-label">Organizer account</p><h2>Let&apos;s get started.</h2><label htmlFor="name">Full name</label><input id="name" name="name" required placeholder="Your name" /><label htmlFor="signup-email">Email address</label><input id="signup-email" name="email" type="email" required placeholder="you@example.com" /><label htmlFor="signup-password">Create password</label><input id="signup-password" name="password" type="password" minLength={8} required placeholder="At least 8 characters" /><label className="checkbox-label"><input type="checkbox" required /> <span>I agree to Ticketia&apos;s terms and privacy policy.</span></label>{error && <p className="form-error" role="alert">{error}</p>}{submitted && <p className="form-success" role="status">Account created. Taking you to event setup...</p>}<button className="action action-gold full-width">Create organizer account</button><p className="auth-footnote">Free to join · Attendees purchase as guests</p></form></section></main>;
}
