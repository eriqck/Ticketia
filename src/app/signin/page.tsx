"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SigninPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const result = (await response.json()) as { error?: string; user?: { accountType?: string } };
    if (!response.ok) { setError(result.error ?? "Unable to sign in."); return; }
    setSubmitted(true);
    router.push("/organizer/dashboard");
  }

  return <main className="auth-page"><header className="site-header"><a className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></a><a className="auth-top-link" href="/signup">New here? <strong>Create organizer account</strong></a></header><section className="auth-layout signin-layout"><div className="auth-pitch"><p className="hero-kicker">Welcome back</p><h1>Your events<br /><span>await.</span></h1><p>Pick up where you left off. Your events, sales and payouts are right where you left them.</p></div><form className="auth-form" onSubmit={submit}><p className="muted-label">Organizer sign in</p><h2>Good to see you.</h2><label htmlFor="signin-email">Email address</label><input id="signin-email" name="email" type="email" required placeholder="you@example.com" /><label htmlFor="signin-password">Password</label><input id="signin-password" name="password" type="password" required placeholder="Your password" /><div className="form-row"><label className="checkbox-label"><input type="checkbox" /> <span>Remember me</span></label><a href="#forgot">Forgot password?</a></div>{error && <p className="form-error" role="alert">{error}</p>}{submitted && <p className="form-success" role="status">Signed in. Taking you to Ticketia...</p>}<button className="action action-gold full-width">Sign in</button><p className="auth-footnote">Attendees purchase tickets without an account</p></form></section></main>;
}
