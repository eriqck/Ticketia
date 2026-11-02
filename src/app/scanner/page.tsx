"use client";

import { useEffect, useRef, useState } from "react";

type ScanResult = "idle" | "valid" | "already_used" | "refunded" | "invalid";
type OfflineSnapshot = { publicKey?: string; expiresAt: string; tickets: Array<{ signed_payload: string; status: string }> };

function pemToBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifyOfflinePayload(signedPayload: string, publicKeyPem: string) {
  const separator = signedPayload.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = signedPayload.slice(0, separator);
  const signature = signedPayload.slice(separator + 1);
  const key = await window.crypto.subtle.importKey("spki", pemToBytes(publicKeyPem), { name: "Ed25519" }, false, ["verify"]);
  return window.crypto.subtle.verify({ name: "Ed25519" }, key, base64UrlToBytes(signature), new TextEncoder().encode(payload));
}

export default function ScannerPage() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<ScanResult>("idle");
  const [message, setMessage] = useState("Ready to verify");
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const flushQueue = () => {
      const queue = JSON.parse(localStorage.getItem("ticketia_scan_queue") ?? "[]") as Array<{ signedPayload: string; deviceId: string }>;
      queue.forEach((item) => void submitPayload(item.signedPayload, false, item.deviceId));
    };
    window.addEventListener("online", flushQueue);
    return () => {
      window.removeEventListener("online", flushQueue);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function submitPayload(signedPayload: string, updateUi = true, deviceId = "browser-gate-1") {
    if (updateUi) {
      setScanning(true);
      setResult("idle");
      setMessage("Checking signed ticket...");
    }
    if (!navigator.onLine) {
      const snapshot = JSON.parse(localStorage.getItem("ticketia_scanner_snapshot") ?? "null") as OfflineSnapshot | null;
      if (snapshot && new Date(snapshot.expiresAt) > new Date() && snapshot.publicKey) {
        const ticket = snapshot.tickets.find((item) => item.signed_payload === signedPayload);
        if (ticket?.status === "used") {
          if (updateUi) { setResult("already_used"); setMessage("Ticket already scanned in offline mode."); }
          setScanning(false);
          return;
        }
        if (ticket && await verifyOfflinePayload(signedPayload, snapshot.publicKey)) {
          ticket.status = "used";
          localStorage.setItem("ticketia_scanner_snapshot", JSON.stringify(snapshot));
          const queue = JSON.parse(localStorage.getItem("ticketia_scan_queue") ?? "[]") as Array<{ signedPayload: string; deviceId: string }>;
          localStorage.setItem("ticketia_scan_queue", JSON.stringify([...queue, { signedPayload, deviceId }]));
          if (updateUi) { setResult("valid"); setMessage("Offline verified. Guest admitted; scan queued for sync."); }
          setScanning(false);
          return;
        }
      }
      const queue = JSON.parse(localStorage.getItem("ticketia_scan_queue") ?? "[]") as Array<{ signedPayload: string; deviceId: string }>;
      localStorage.setItem("ticketia_scan_queue", JSON.stringify([...queue, { signedPayload, deviceId }]));
      if (updateUi) setMessage("Offline. Scan queued for verification when connected.");
      setScanning(false);
      return;
    }
    try {
      const response = await fetch("/api/scanner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signedPayload, deviceId }) });
      const data = (await response.json()) as { result?: ScanResult; message?: string };
      if (updateUi) {
        setResult(data.result ?? "invalid");
        setMessage(data.message ?? "Scan complete");
      }
    } catch {
      const queue = JSON.parse(localStorage.getItem("ticketia_scan_queue") ?? "[]") as Array<{ signedPayload: string; deviceId: string }>;
      localStorage.setItem("ticketia_scan_queue", JSON.stringify([...queue, { signedPayload, deviceId }]));
      if (updateUi) {
        setResult("idle");
        setMessage("Connection lost. Scan queued for verification.");
      }
    } finally {
      if (updateUi) setScanning(false);
    }
  }

  async function startCamera() {
    const detectorConstructor = (window as typeof window & { BarcodeDetector?: new () => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!detectorConstructor) {
      setMessage("Camera QR scanning is not supported in this browser. Paste the signed payload below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      const detector = new detectorConstructor();
      const detect = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          setPayload(codes[0].rawValue);
          await submitPayload(codes[0].rawValue);
          stopCamera();
          return;
        }
        window.requestAnimationFrame(() => void detect());
      };
      window.requestAnimationFrame(() => void detect());
    } catch {
      setMessage("Camera permission was not granted. Paste the signed payload below.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function verifyTicket() {
    if (!payload.trim()) return;
    await submitPayload(payload);
  }

  async function downloadSnapshot() {
    const eventTitle = window.prompt("Event name to download");
    const scannerKey = window.prompt("Scanner access key");
    if (!eventTitle || !scannerKey) return;
    setSnapshotStatus("Downloading event snapshot...");
    try {
      const response = await fetch(`/api/scanner/snapshot?event=${encodeURIComponent(eventTitle)}`, { headers: { "x-scanner-key": scannerKey } });
      const snapshot = (await response.json()) as { error?: string; event?: string; expiresAt?: string; publicKey?: string; tickets?: unknown[] };
      if (!response.ok || !snapshot.event || !snapshot.expiresAt || !snapshot.publicKey || !snapshot.tickets) throw new Error(snapshot.error ?? "Unable to download snapshot.");
      localStorage.setItem("ticketia_scanner_snapshot", JSON.stringify(snapshot));
      setSnapshotStatus(`${snapshot.tickets.length} tickets ready until ${new Date(snapshot.expiresAt).toLocaleTimeString()}.`);
    } catch (error) {
      setSnapshotStatus(error instanceof Error ? error.message : "Unable to download snapshot.");
    }
  }

  const stateClass = result === "valid" ? "scan-success" : result === "idle" ? "scan-idle" : "scan-failure";

  return (
    <main className="scanner-page">
      <header className="site-header"><a className="brand" href="/" aria-label="Ticketia home"><img className="brand-logo" src="/ticketia-logo.png" alt="Ticketia" /></a><span className="scanner-label">Gate scanner · Nairobi Tech Summit</span></header>
      <section className="scanner-shell">
        <p className="muted-label">Entry control</p>
        <h1>Scan a ticket.</h1>
        <div className={`scan-status ${stateClass}`}><span className="scan-icon">{result === "valid" ? "✓" : result === "idle" ? "⌁" : "!"}</span><strong>{message}</strong><small>{result === "valid" ? "Valid ticket · admit guest" : result === "idle" ? "Point the camera at a Ticketia QR code" : "Do not admit guest"}</small></div>
        <div className="camera-frame">{cameraActive ? <video ref={videoRef} autoPlay playsInline muted /> : <span>Camera preview</span>}</div>
        <div className="scanner-actions"><button className="action action-dark" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? "Stop camera" : "Scan with camera"}</button><span>or use the signed payload</span></div>
        <button className="snapshot-button" onClick={downloadSnapshot}>Download event snapshot</button>{snapshotStatus && <p className="snapshot-status" role="status">{snapshotStatus}</p>}
        <label className="scanner-label-text" htmlFor="signedPayload">Scanner payload</label>
        <textarea id="signedPayload" value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="Paste the signed QR payload for this prototype" />
        <button className="action action-gold full-width" disabled={scanning || !payload.trim()} onClick={verifyTicket}>{scanning ? "Verifying..." : "Verify ticket"}</button>
        <p className="secure-note">Every scan is recorded. The first valid scan consumes the ticket.</p>
      </section>
    </main>
  );
}
