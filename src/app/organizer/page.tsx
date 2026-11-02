"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Bank = { name: string; code: string };
type Payout = { businessName: string; email: string; subaccountCode: string; status: string };

export default function OrganizerPayoutPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "verifying" | "saving" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/organizers/payout").then((response) => response.json()), fetch("/api/organizers/banks").then((response) => response.json())]).then(([payoutResult, bankResult]) => { setPayout(payoutResult.payout ?? null); setBanks(bankResult.banks ?? []); setStatus("idle"); }).catch(() => { setStatus("error"); setMessage("Unable to load payout details."); });
  }, []);

  async function verifyAccount() {
    const form = document.querySelector<HTMLFormElement>(".payout-form"); const accountNumber = form?.accountNumber.value as string | undefined;
    if (!accountNumber || !bankCode) { setStatus("error"); setMessage("Choose a bank and enter an account number first."); return; }
    setStatus("verifying"); setMessage("");
    const response = await fetch(`/api/organizers/verify-account?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`); const result = await response.json() as { accountName?: string; error?: string };
    if (!response.ok || !result.accountName) { setStatus("error"); setMessage(result.error ?? "Account could not be verified."); return; }
    setAccountName(result.accountName); setStatus("idle"); setMessage("Account verified by Paystack.");
  }

  async function savePayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accountName) { setStatus("error"); setMessage("Verify the bank account before saving."); return; }
    setStatus("saving"); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/organizers/subaccount", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountName, accountNumber: form.get("accountNumber"), settlementBank: bankCode }) });
    const result = await response.json() as { error?: string; subaccountCode?: string; businessName?: string; email?: string };
    if (!response.ok || !result.subaccountCode) { setStatus("error"); setMessage(result.error ?? "Unable to save payout details."); return; }
    setPayout({ businessName: result.businessName ?? payout?.businessName ?? "Organizer", email: result.email ?? payout?.email ?? "", subaccountCode: result.subaccountCode, status: "connected" }); setEditing(false); setStatus("ready"); setMessage("Payout details saved.");
  }

  if (status === "loading") return <main className="organizer-page"><div className="dashboard-muted payout-loading">Loading payout details...</div></main>;

  return <main className="organizer-page"><header className="site-header organizer-header"><Link className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></Link><div className="payout-nav"><Link href="/organizer/dashboard">Dashboard</Link><Link href="/">Marketplace</Link></div></header><section className="organizer-onboarding"><div className="onboarding-intro"><p className="hero-kicker">Organizer payouts</p><h1>Sell tickets.<br /><span>Get paid directly.</span></h1><div className="split-preview"><div><small>Ticket sale</small><strong>KSh 1,000</strong></div><div><small>Organizer receives</small><strong>KSh 935</strong></div><div><small>Ticketia fee</small><strong>5%</strong></div></div></div>{payout && !editing ? <section className="payout-form payout-review"><p className="muted-label">Connected payout account</p><h2>Your payout details</h2><div className="payout-status"><span className="status-check">✓</span><div><strong>Connected through Paystack</strong><small>{payout.status}</small></div></div><div className="payout-detail"><span>Organizer</span><strong>{payout.businessName}</strong></div><div className="payout-detail"><span>Contact email</span><strong>{payout.email}</strong></div><div className="payout-detail"><span>Paystack subaccount</span><strong>{payout.subaccountCode}</strong></div><p className="form-note">Your bank account is managed securely by Paystack. Ticketia does not display or store the full account credentials.</p>{message && <p className="form-success" role="status">{message}</p>}<div className="payout-review-actions"><button className="action action-dark" onClick={() => setEditing(true)}>Edit payout details</button><Link className="action action-gold" href="/organizer/dashboard">Back to dashboard</Link></div></section> : <form className="payout-form" onSubmit={savePayout}><p className="muted-label">{payout ? "Edit payout account" : "Payout account"}</p><h2>{payout ? "Update your payout details" : "Where should we send your earnings?"}</h2><label htmlFor="settlementBank">Bank</label><select id="settlementBank" value={bankCode} onChange={(event) => { setBankCode(event.target.value); setAccountName(""); }} required><option value="">Select your bank</option>{banks.map((bank) => <option value={bank.code} key={`${bank.code}-${bank.name}`}>{bank.name}</option>)}</select><label htmlFor="accountNumber">Account number</label><div className="verify-row"><input id="accountNumber" name="accountNumber" inputMode="numeric" required placeholder="Your bank account number" /><button type="button" className="verify-button" onClick={verifyAccount} disabled={status === "verifying"}>{status === "verifying" ? "Checking..." : "Verify account"}</button></div>{accountName && <p className="verified-account">✓ Account name verified by Paystack: {accountName}</p>}{message && <p className={status === "error" ? "form-error" : "form-success"} role="status">{message}</p>}<div className="payout-review-actions"><button className="action action-gold" disabled={status === "saving"}>{status === "saving" ? "Saving securely..." : payout ? "Save payout details" : "Connect payout account"}</button>{payout && <button type="button" className="action action-dark" onClick={() => setEditing(false)}>Cancel</button>}</div></form>}</section></main>;
}
