title: Supervisor vs systemd + Monitoring and AI Agent Auto-Fix Playbooks
date: 2026-02-05 10:00:00
tags: [operations, monitoring, systemd, supervisor, ai]
---

# Supervisor vs systemd + Monitoring and AI Agent Auto-Fix Playbooks

If you run Linux services long enough, you eventually pick a side: Supervisor or systemd. The right answer is usually: **systemd for the host**, Supervisor when you need a lightweight, app-level process manager inside a container or a legacy stack.

This post is a practical comparison and then a walk-through of monitoring strategies, including how we wire AI agents into monitoring to auto-fix common outages (like what we keep in `../netwrck/monitoring`).

<!-- more -->

## Supervisor vs systemd: what they are

**systemd** is the init system for most modern Linux distros. It owns the boot process and the service lifecycle. It gives you cgroups, sockets, timers, dependency ordering, and tight integration with `journald`.

**Supervisor** is a user-space process control system. It's usually installed as a Python package, runs as a daemon, and manages processes you configure. It's simple, portable, and works well inside containers or environments where you don't own PID 1.

If you control the host OS and want OS-native lifecycle management, systemd is almost always the better default. If you need to bundle process management with your app or you're stuck in a systemd-less environment, Supervisor still shines.

## Decision cheat sheet

Pick **systemd** when:
- You own the machine (or VM) and can define unit files.
- You want tight OS integration (cgroups, resource limits, `journald`).
- You want socket activation, timer units, or dependency ordering.
- You want system-wide standardized ops and security policy.

Pick **Supervisor** when:
- You're inside a container and PID 1 isn't systemd.
- You want a small, self-contained process manager bundled with your app.
- You need to manage multiple app processes for a single service in a portable way.
- You want a simple config format and don't need OS-native features.

## Practical differences that matter

**Logging**
- systemd pushes logs to `journald`, so you get centralized storage and metadata.
- Supervisor logs to files you define per program. It is easy to inspect, but less centralized.

**Restarts**
- systemd has `Restart=on-failure` and backoff behavior; it can also throttle restarts.
- Supervisor has `autorestart=true` and `startretries` but fewer guardrails.

**Resource isolation**
- systemd uses cgroups by default, so CPU/memory limits are clean and enforced.
- Supervisor does not isolate resources itself; you rely on the OS or container runtime.

**Security**
- systemd gives you `User=`, `NoNewPrivileges=`, `PrivateTmp=`, and more.
- Supervisor can drop privileges, but it's not a security model.

## Minimal configs you can copy

**systemd unit example**

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My App
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/myapp
ExecStart=/srv/myapp/bin/server
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
```

**Supervisor program example**

```ini
; /etc/supervisor/conf.d/myapp.conf
[program:myapp]
command=/srv/myapp/bin/server
directory=/srv/myapp
autostart=true
autorestart=true
startretries=3
stdout_logfile=/var/log/myapp/out.log
stderr_logfile=/var/log/myapp/err.log
```

## Monitoring strategy: from basics to real resilience

Monitoring isn't just a dashboard. It's a strategy that moves you from *detecting* issues to *fixing* them with high confidence.

Start with three tiers:

1. **Service health**: uptime checks (HTTP, TCP, or synthetic), basic status endpoints (`/health`, `/ready`), dependency checks for DB, cache, and queues.
2. **Behavioral signals**: request latency percentiles (p50, p95, p99), error rates by endpoint and method, saturation (CPU, memory, disk, queue depth).
3. **Business signals**: signups, payments, conversions, background job throughput, SLA / SLO compliance.

Then add high-signal alerts:
- Actionable thresholds (avoid alerting on noise)
- Burn-rate alerts for SLOs
- Slow or failing dependencies

The goal is: a human can immediately tell whether a blip is harmless, or if they need to jump in.

## AI agent monitoring: moving from detect → triage → fix

We keep a set of auto-fix playbooks in `../netwrck/monitoring`. The idea is: for common, low-risk incidents, an agent can do the first round of response safely.

A good AI agent monitoring loop should:

1. **Detect**: consume alerts with context (logs, metrics, traces), verify the alert isn't a false positive.
2. **Triage**: classify the failure (deploy issue, dependency outage, quota, etc.), gather evidence into a short report.
3. **Fix (only if safe)**: run predefined, reversible steps (restart, clear cache, scale up, roll back), validate success via health checks.
4. **Escalate**: if anything is ambiguous, stop and page a human, provide evidence and a recommendation for next steps.

## Guardrails for auto-fix agents

If you want automation that doesn't scare you, add guardrails:
- **Playbooks over freeform**: run known scripts, don't improvise.
- **Reversibility**: every action should have a rollback path.
- **Dry-run and canary**: test on a single host or staging first.
- **Scoped credentials**: minimal privileges for the agent.
- **Stop conditions**: if error rate doesn't improve, halt and page.

## Example: a simple auto-fix loop

Here is a typical flow we use for auto-fixing a web service:

1. Monitor detects 5xx error rate > 2% for 5 minutes.
2. Agent checks recent deploys and logs for crash loops.
3. If a crash loop is confirmed, agent restarts the service.
4. If errors persist, agent triggers rollback to the previous deploy.
5. If rollback fails, page human with a concise incident summary.

This works well because the agent only touches a narrow set of safe, scripted actions. You get fast recovery without the anxiety of open-ended automation.

## Final thoughts

Supervisor vs systemd isn't a battle of good vs bad. It's about who owns the machine and how much control you need. The bigger win is pairing your process manager with a monitoring system that doesn't just wake you up, but can also help fix obvious, safe failures automatically.

If you're building a monitoring system today, aim for this progression:

- **Detect** fast
- **Triage** with context
- **Fix** when safe
- **Escalate** when not

That's the difference between observing your systems and actually operating them.
