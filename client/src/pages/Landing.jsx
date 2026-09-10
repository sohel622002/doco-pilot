import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";
import "./Landing.css";

const GITHUB_URL = "https://github.com/sohel622002/doco-pilot";

function DashboardShot() {
  return (
    <div className="browser-body">
      <img src="/doco-pilot-dashboard.png" alt="doco-pilot dashboard" />
    </div>
  );
}

// A visitor who's already logged in shouldn't be shown "log in" / "sign up" —
// checked quietly (skipAuthRedirect) so an anonymous visit never gets bounced.
function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/auth/me", { skipAuthRedirect: true })
      .then(() => {
        if (!cancelled) setLoggedIn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return loggedIn;
}

export default function Landing() {
  const loggedIn = useIsLoggedIn();

  return (
    <div className="landing-page">
      <nav>
        <div className="wrap">
          <div className="brand">
            <img src="/doco-pilot-logo.svg" alt="" />
            DocoPilot
          </div>
          <div className="navlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#security">Security</a>
            <a href="#pricing">Pricing</a>
            <a href="#compare">Compare</a>
          </div>
          <div className="navcta">
            {loggedIn ? (
              <Link className="btn btn-primary btn-sm" to="/dashboard">Go to Dashboard</Link>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" to="/login">Log in</Link>
                <Link className="btn btn-primary btn-sm" to="/register">Try it free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="hero-badge">
            <span className="pulse"></span>Agent dials out — no inbound port on your servers
          </div>
          <h1>
            Your Docker fleet,<br />watched and run<br />from <span className="accent">one console.</span>
          </h1>
          <p className="sub">
            doco-pilot is a control plane for the Docker hosts you already run. Drop a lightweight
            agent on each VPS, and get live containers, images, metrics, and alerts in one place —
            without ever opening the Docker socket to the internet.
          </p>
          <div className="hero-actions">
            {loggedIn ? (
              <Link className="btn btn-primary" to="/dashboard">Go to Dashboard</Link>
            ) : (
              <Link className="btn btn-primary" to="/register">Try it for free</Link>
            )}
            <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View on GitHub
            </a>
          </div>
          <div className="hero-meta">docker run doco-pilot/agent — one command, one host, zero exposed sockets</div>

          <div className="shot-wrap">
            <div className="browser-frame">
              <div className="browser-bar">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="url">https://doco-pilot.vercel.app/{"{serverId}"}</div>
              </div>
              <DashboardShot />
            </div>
          </div>

          <div className="flowcard">
            <div className="flow-step">
              <div className="k">YOUR BROWSER</div>
              <div className="v">console.doco-pilot</div>
            </div>
            <div className="flow-arrow">⇄<span className="noport">https / wss</span></div>
            <div className="flow-step">
              <div className="k">CONTROL PLANE</div>
              <div className="v">relay + metrics store</div>
            </div>
            <div className="flow-arrow">⇄<span className="noport">agent dials out</span></div>
            <div className="flow-step">
              <div className="k">YOUR VPS</div>
              <div className="v">agent → docker.sock</div>
            </div>
          </div>
        </div>
      </header>

      <section id="features">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">What's in the box</div>
            <h2>Everything you'd SSH in for — without the SSH.</h2>
            <p>Every feature below is live in the product today, not on a roadmap slide.</p>
          </div>

          <div className="feat-grid">
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
              <h3>Full container control</h3>
              <p>List, inspect, start, stop, pause, restart, remove, and create containers, with live streaming logs — from any host.</p>
            </div>
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg></div>
              <h3>Unlimited multi-server</h3>
              <p>Register every VPS you run. Each one gets its own generated agent install command and encrypted credentials.</p>
            </div>
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l3-4 3 3 5-7"/></svg></div>
              <h3>Live + historical metrics</h3>
              <p>Per-container CPU, memory, and network, plus host-level stats sampled continuously and kept as time-series history.</p>
            </div>
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg></div>
              <h3>Images, volumes &amp; networks</h3>
              <p>Pull, remove, and prune images with dangling cleanup. Inspect and manage volumes and networks alongside a full disk-usage breakdown.</p>
            </div>
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg></div>
              <h3>Live event feed</h3>
              <p>Watch the Docker event stream as it happens on every host, with full history persisted for when you need to look back.</p>
            </div>
            <div className="feat">
              <div className="icon"><svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z"/></svg></div>
              <h3>Threshold alerts</h3>
              <p>Get an outbound webhook the moment a container crashes or CPU spikes, with cooldowns and a full alert history per server.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" style={{ background: "var(--lp-surface)", borderTop: "1px solid var(--lp-border)", borderBottom: "1px solid var(--lp-border)" }}>
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Setup</div>
            <h2>Three steps, one direction of traffic.</h2>
            <p>The agent always calls home — your host never accepts an inbound connection, and your Docker socket never leaves the machine.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h3>Register a server</h3>
              <p>Add a host in the console. doco-pilot generates a unique agent key pair, hashed and encrypted at rest.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Run the agent</h3>
              <p>Paste the generated command on your VPS. It mounts the Docker socket locally and opens an outbound WebSocket only.</p>
              <code className="inline">{`docker run -d --name doco-agent \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e AGENT_KEY=... doco-pilot/agent`}</code>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>Manage from the browser</h3>
              <p>The server relays your actions to the agent and streams back state, logs, and metrics in real time.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="security">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Built for people who don't trust random panels with a socket</div>
            <h2>Security is the actual feature.</h2>
          </div>
          <div className="sec-strip">
            <div>
              <h2>Nothing about your Docker socket ever touches the public internet.</h2>
              <p>The agent is the only thing that talks to Docker, and it always initiates the connection outward. Your credentials are encrypted before they're stored, and every handshake is signed — so even the relay can't impersonate an agent.</p>
            </div>
            <ul className="sec-list">
              <li><span className="chk">✓</span>AES-256-GCM encrypted agent credentials, bcrypt-hashed keys</li>
              <li><span className="chk">✓</span>HMAC-signed agent handshake over TLS-verified WebSocket</li>
              <li><span className="chk">✓</span>JWT sessions bound to IP, with rotating refresh tokens</li>
              <li><span className="chk">✓</span>Zod-validated input on every request, locked-down CORS</li>
              <li><span className="chk">✓</span>Server-side audit trail of every action taken</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="compare">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Honest comparison</div>
            <h2>Where doco-pilot fits.</h2>
            <p>We're a fleet monitoring &amp; management console, the same job as Portainer — not a deploy platform like Coolify or Dokploy. We won't pretend to do their job.</p>
          </div>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr><th>Capability</th><th>doco-pilot</th><th>Portainer</th><th>Coolify / Dokploy</th></tr>
              </thead>
              <tbody>
                <tr><td className="feature-col">No inbound port on managed host</td><td className="us yes">✓ dial-out agent</td><td className="yes">✓ Edge tunnel</td><td className="no">SSH-based</td></tr>
                <tr><td className="feature-col">Container start/stop/logs/inspect</td><td className="us yes">✓</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr><td className="feature-col">Live + historical metrics</td><td className="us yes">✓</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr><td className="feature-col">Threshold alerting</td><td className="us yes">✓ webhook</td><td className="no">limited</td><td className="yes">✓ multi-channel</td></tr>
                <tr><td className="feature-col">Zero-install control plane</td><td className="us yes">✓ hosted for you</td><td className="no">self-run</td><td className="no">self-run</td></tr>
                <tr><td className="feature-col">Docker Compose / stack deploy</td><td className="us no">—</td><td className="yes">✓</td><td className="yes">✓ core job</td></tr>
                <tr><td className="feature-col">Git-based deploy / CI</td><td className="us no">—</td><td className="no">—</td><td className="yes">✓</td></tr>
                <tr className="note-row"><td colSpan={4}>doco-pilot doesn't build or deploy your apps — it manages and monitors what's already running. If you need Git-push deploys, Coolify or Dokploy is the right tool for that job.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Pricing</div>
            <h2>Free to start. Cheap to keep.</h2>
            <p>The Free plan is fully live today. Pro pricing is locked in at $5/mo, but billing hasn't launched yet — sign up free now and you'll be first in line when it does.</p>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <h3>Free</h3>
              <div className="amount"><span className="num">$0</span></div>
              <ul className="price-list">
                <li><span className="chk">✓</span>Up to 2 servers</li>
                <li><span className="chk">✓</span>Solo use (no team sharing)</li>
                <li><span className="chk">✓</span>7 days of metrics, events &amp; audit history</li>
                <li><span className="chk">✓</span>All core container/image/volume/network tools</li>
              </ul>
              <Link className="btn btn-ghost" to={loggedIn ? "/dashboard" : "/register"}>
                {loggedIn ? "Go to Dashboard" : "Start free"}
              </Link>
            </div>
            <div className="price-card featured">
              <span className="badge">Coming soon</span>
              <h3>Pro</h3>
              <div className="amount"><span className="num">$5</span><span className="per">/ month</span></div>
              <ul className="price-list">
                <li><span className="chk">✓</span>Unlimited servers</li>
                <li><span className="chk">✓</span>Unlimited team members with RBAC</li>
                <li><span className="chk">✓</span>30 days of metrics, events &amp; audit history</li>
                <li><span className="chk">✓</span>Everything in Free</li>
              </ul>
              <Link className="btn btn-ghost" to={loggedIn ? "/dashboard" : "/register"}>
                {loggedIn ? "Go to Dashboard" : "Sign up free — Pro billing isn't live yet"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="status-banner">
            <strong style={{ color: "var(--lp-accent)" }}>●</strong>
            <div>
              <strong>Early and honest.</strong>
              <p>doco-pilot is an active open-source project without a tagged stable release yet. Core flows — auth, servers, agents, containers, images, live stats — work today. A few chrome elements in the UI are still catching up, and Pro billing hasn't launched yet either — the Free plan is the only thing you can sign up for right now. We'd rather tell you that now than have you find out later.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="get-started">
        <div className="wrap">
          <div className="cta-block">
            <div className="eyebrow">Get started</div>
            <h2>Point it at your first server in under five minutes.</h2>
            <p>Free to run. Open source. No credit card, no Docker socket exposed to anyone but you.</p>
            <div className="cta-actions">
              {loggedIn ? (
                <Link className="btn btn-primary" to="/dashboard">Go to Dashboard</Link>
              ) : (
                <Link className="btn btn-primary" to="/register">Try it for free</Link>
              )}
              <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Star on GitHub</a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="fbrand">
            <img src="/doco-pilot-logo.svg" alt="" />
            DocoPilot
          </div>
          <div className="flinks">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#features">Features</a>
            <a href="#security">Security</a>
            <a href="#pricing">Pricing</a>
            <a href="#compare">Compare</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
