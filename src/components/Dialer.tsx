"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { Inviter, UserAgent } from "sip.js";

type Reg = "connecting" | "connected" | "disconnected";
type Status = "initiated" | "ringing" | "answered" | "completed" | "failed" | "busy" | "no_answer";
interface Active { id: string; number: string; status: Status; answeredAt?: number }
interface Creds { wssUrl: string; domain: string; extension: string; password: string; iceServers: RTCIceServer[] }

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const ENDED: Status[] = ["completed", "failed", "busy", "no_answer"];
const fmt = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");

export function Dialer({ demo, t, countryPrefix }: { demo: boolean; t: Dict; countryPrefix: string }) {
  const [number, setNumber] = useState(countryPrefix);
  const [reg, setReg] = useState<Reg>(demo ? "connected" : "connecting");
  const [call, setCall] = useState<Active | null>(null);
  const [err, setErr] = useState("");
  const [muted, setMuted] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ua = useRef<UserAgent | null>(null);
  const creds = useRef<Creds | null>(null);
  const session = useRef<Inviter | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  // Real mode: register this user's own extension over WSS.
  useEffect(() => {
    if (demo) return;
    let stopped = false;
    (async () => {
      try {
        const r = await fetch("/api/sip/credentials", { method: "POST" });
        if (!r.ok) throw new Error();
        const c: Creds = await r.json();
        const { UserAgent, Registerer } = await import("sip.js");
        if (stopped) return;
        creds.current = c;
        const agent = new UserAgent({
          uri: UserAgent.makeURI(`sip:${c.extension}@${c.domain}`),
          transportOptions: { server: c.wssUrl },
          authorizationUsername: c.extension,
          authorizationPassword: c.password,
          sessionDescriptionHandlerFactoryOptions: { peerConnectionConfiguration: { iceServers: c.iceServers } },
          delegate: { onDisconnect: () => setReg("disconnected"), onConnect: () => setReg("connected") },
        });
        ua.current = agent;
        await agent.start();
        await new Registerer(agent).register();
        setReg("connected");
      } catch {
        setReg("disconnected");
      }
    })();
    return () => {
      stopped = true;
      ua.current?.stop();
    };
  }, [demo]);

  // Timer + demo polling.
  useEffect(() => {
    if (!call || ENDED.includes(call.status)) return;
    const i = setInterval(async () => {
      setNow(Date.now());
      if (!demo) return;
      const r = await fetch(`/api/calls/${call.id}`);
      if (!r.ok) return;
      const { call: c } = await r.json();
      setCall((p) => p && { ...p, status: c.status, answeredAt: p.answeredAt ?? (c.answered_at ? Date.now() : undefined) });
    }, 1000);
    return () => clearInterval(i);
  }, [call, demo]);

  const finish = useCallback(async (id: string) => {
    // Final status comes from the server (CDR), not from the browser.
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(`/api/calls/${id}`);
    const s: Status = r.ok ? (await r.json()).call.status : "completed";
    setCall((p) => p && p.id === id ? { ...p, status: ENDED.includes(s) ? s : "completed" } : p);
    setTimeout(() => setCall((p) => (p?.id === id ? null : p)), 2500);
  }, []);

  async function dial() {
    setErr("");
    const r = await fetch("/api/calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destination: number, callerIdentity: "private" }),
    });
    const d = await r.json();
    if (!r.ok) return setErr(d.error ?? "error");
    setMuted(false);
    setCall({ id: d.callId, number, status: "initiated" });
    if (demo) return;
    const c = creds.current;
    if (!ua.current || !c) return setErr("not_registered");
    const { Inviter, UserAgent, SessionState } = await import("sip.js");
    const inv = new Inviter(ua.current, UserAgent.makeURI(`sip:${d.dialTarget}@${c.domain}`)!, {
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
    });
    session.current = inv;
    inv.stateChange.addListener((s) => {
      if (s === SessionState.Established) {
        const pc = (inv.sessionDescriptionHandler as unknown as { peerConnection: RTCPeerConnection }).peerConnection;
        const stream = new MediaStream();
        pc.getReceivers().forEach((rc) => rc.track && stream.addTrack(rc.track));
        if (audio.current) {
          audio.current.srcObject = stream;
          audio.current.play().catch(() => {});
        }
        setCall((p) => p && { ...p, status: "answered", answeredAt: Date.now() });
      }
      if (s === SessionState.Terminated) finish(d.callId);
    });
    inv.invite({ requestDelegate: { onProgress: () => setCall((p) => p && { ...p, status: "ringing" }) } }).catch(() => finish(d.callId));
  }

  async function hangup() {
    if (!call) return;
    if (demo) {
      await fetch(`/api/calls/${call.id}`, { method: "DELETE" });
      return finish(call.id);
    }
    const s = session.current;
    if (!s) return finish(call.id);
    const { SessionState } = await import("sip.js");
    if (s.state === SessionState.Established) s.bye();
    else if (s.state === SessionState.Establishing || s.state === SessionState.Initial) s.cancel();
  }

  function toggleMute() {
    const pc = (session.current?.sessionDescriptionHandler as unknown as { peerConnection?: RTCPeerConnection })?.peerConnection;
    pc?.getSenders().forEach((s) => s.track && (s.track.enabled = muted));
    setMuted(!muted);
  }

  function press(k: string) {
    if (call) {
      (session.current?.sessionDescriptionHandler as unknown as { sendDtmf?: (t: string) => boolean })?.sendDtmf?.(k);
      return;
    }
    setNumber((n) => (n + k).slice(0, 20));
  }

  const pad = (
    <div className="grid grid-cols-3 gap-3" dir="ltr">
      {KEYS.map((k) => (
        <button key={k} onClick={() => press(k)} className="aspect-square rounded-full bg-slate-800 text-2xl hover:bg-slate-700 active:bg-slate-600">
          {k}
        </button>
      ))}
    </div>
  );

  const regLabel = demo ? t.connected : t[reg];
  const dot = reg === "connected" ? "text-emerald-400" : reg === "connecting" ? "text-amber-400" : "text-red-400";

  if (call) {
    const secs = call.answeredAt ? Math.max(0, Math.floor((now - call.answeredAt) / 1000)) : 0;
    return (
      <section className="flex flex-1 flex-col items-center gap-6 pt-10">
        <audio ref={audio} autoPlay />
        <p className="text-slate-400">🔒 {t.privateCall}{demo && " · DEMO"}</p>
        <p className="text-3xl font-semibold" dir="ltr">{call.number}</p>
        <p className="text-xl tabular-nums text-slate-300">{call.status === "answered" ? fmt(secs) : t[call.status]}</p>
        {showPad && <div className="w-64">{pad}</div>}
        <div className="mt-auto flex w-full justify-around pb-8">
          <button onClick={toggleMute} className="btn bg-slate-800">{muted ? t.unmute : t.mute}</button>
          <button onClick={() => setShowPad(!showPad)} className="btn bg-slate-800">{t.keypad}</button>
          <button onClick={hangup} disabled={ENDED.includes(call.status)} className="btn bg-red-600 hover:bg-red-500">{t.hangup}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      <audio ref={audio} autoPlay />
      <p className="text-sm">
        <span className={dot}>●</span> {regLabel}
      </p>
      {demo && <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-300">{t.demo}</p>}
      <div className="flex items-center gap-2" dir="ltr">
        <input
          className="input text-center text-2xl tracking-wider"
          inputMode="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d+*#]/g, "").slice(0, 20))}
        />
        <button className="btn bg-slate-800" onClick={() => setNumber((n) => n.slice(0, -1))} aria-label="delete">⌫</button>
      </div>
      <div className="mx-auto w-full max-w-xs">{pad}</div>
      <div className="card flex items-center justify-between">
        <span className="text-slate-400">{t.callerIdentity}</span>
        <span>🔒 {t.private}</span>
      </div>
      {err && <p className="text-center text-sm text-red-400">{err}</p>}
      <button onClick={dial} disabled={reg !== "connected" || number.replace(/\D/g, "").length < 3} className="btn bg-emerald-600 py-4 text-lg hover:bg-emerald-500">
        {t.call}
      </button>
    </section>
  );
}
