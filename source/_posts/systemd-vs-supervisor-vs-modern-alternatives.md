title: systemd vs Supervisor vs runit vs s6 vs Container Approaches
date: 2026-03-23 14:00:00
tags: [operations, systemd, supervisor, runit, s6, containers, docker]
---

# systemd vs Supervisor vs runit vs s6 vs Container Approaches

In a [previous post](/2026/02/05/supervisor-vs-systemd-monitoring-and-agents/) we covered systemd vs Supervisor in depth: when to pick each, command mappings, and how to wire monitoring on top. That comparison covers most production setups, but the process supervision landscape is wider than two options. This post expands the lineup to include runit, s6, and container-native approaches.

<!-- more -->

## Quick Recap

**systemd** is the default init system on most Linux distros -- it owns PID 1, cgroups, journald, and dependency ordering. **Supervisor** is a user-space Python daemon for managing processes without OS-level integration. systemd wins on bare metal; Supervisor wins inside containers or legacy stacks where you don't control init. See the [full comparison](/2026/02/05/supervisor-vs-systemd-monitoring-and-agents/) for config examples and command mappings.

## The Extended Lineup

Beyond systemd and Supervisor, three families of tools deserve attention:

- **runit** -- a daemontools-inspired init/supervision scheme. Tiny, fast, reliable. Used by Void Linux as its default init and packaged across Debian, Arch, Alpine, and Artix.
- **s6** -- the spiritual successor to daemontools with readiness notification, fine-grained dependency management, and a purpose-built container overlay (s6-overlay).
- **Container-native** -- Docker restart policies and Kubernetes liveness/readiness probes. The orchestrator *is* the process manager.

## Comparison Table

| Feature | systemd | Supervisor | runit | s6 | Docker | Kubernetes |
|---|---|---|---|---|---|---|
| Init system | Yes | No | Yes | Yes (via s6-linux-init) | No | No |
| User-space only | No | Yes | Possible | Possible | N/A | N/A |
| Dependency ordering | Yes | No | No | Yes (s6-rc) | depends_on (basic) | Init containers |
| Resource limits | cgroups | No | No | No | cgroups | cgroups via Pod spec |
| Logging | journald | Per-process files | svlogd | s6-log | docker logs | kubectl logs / fluentd |
| Config format | INI-like unit files | INI | Shell scripts | Shell scripts + execline | YAML (compose) | YAML manifests |
| Learning curve | Medium | Low | Low | Medium-High | Low | High |
| Container-friendly | Poor | Good | Good | Excellent (s6-overlay) | Native | Native |
| Community size | Huge | Large | Medium | Small | Huge | Huge |

## runit Deep Dive

runit models each service as a directory under `/etc/sv/`. Inside that directory, a `run` script is the entire config. The supervise daemon watches the process and restarts it on crash. That's it -- no config parser, no dependency graph, no cgroup integration. The simplicity is the feature.

runit's total footprint is around 20KB of compiled binaries. It boots fast because it starts all services in parallel by default. Void Linux chose runit as its init system specifically for this minimalism.

**runit service example:**

```bash
#!/bin/sh
# /etc/sv/myapp/run
exec chpst -u www-data /srv/myapp/bin/server 2>&1
```

Enable by symlinking into the active directory:

```bash
ln -s /etc/sv/myapp /var/service/myapp
```

Control with `sv`:

```bash
sv status myapp
sv restart myapp
sv stop myapp
```

Add logging by creating a `log/run` script:

```bash
#!/bin/sh
# /etc/sv/myapp/log/run
exec svlogd -tt /var/log/myapp/
```

## s6 Deep Dive

s6 is Laurent Bercot's take on what daemontools should have been. The key differentiator is **readiness notification**: a service can signal (via a file descriptor) that it has finished initializing, and dependent services won't start until that signal fires. This solves the "sleep 2 and hope" antipattern that plagues dependency ordering in simpler supervisors.

s6 uses execline (a tiny non-interactive scripting language) for service scripts, though plain shell works too. The s6-rc service manager adds proper dependency graphs on top of s6-supervise.

**s6 service example:**

```bash
#!/bin/execlineb -P
# /etc/s6/sv/myapp/run
s6-setuidgid www-data
/srv/myapp/bin/server
```

**s6-overlay for Docker** is where s6 really shines in modern infrastructure. The [s6-overlay project](https://github.com/just-containers/s6-overlay) packages s6 as a drop-in init system for containers. It handles:

- PID 1 / zombie reaping
- Ordered service startup with readiness
- Graceful shutdown propagation
- Running initialization scripts before services start

```dockerfile
FROM ubuntu:24.04
ADD https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2/s6-overlay-noarch.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz
ENTRYPOINT ["/init"]
```

Home Assistant, Nextcloud, and many self-hosted projects use s6-overlay as their in-container init.

## The Container Approach

When your workload runs in containers, the orchestrator often replaces the process supervisor entirely.

**Docker restart policies** handle the simple case:

```yaml
# docker-compose.yml
services:
  myapp:
    image: myapp:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
```

Options: `no`, `on-failure[:max-retries]`, `always`, `unless-stopped`. This covers crash recovery but nothing else -- no health checks, no dependency ordering, no readiness gating.

**Kubernetes** goes further with liveness, readiness, and startup probes:

```yaml
# k8s deployment (partial)
containers:
  - name: myapp
    image: myapp:latest
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      failureThreshold: 30
      periodSeconds: 2
```

Key best practices for K8s probes (2025-2026):
- Use separate endpoints for liveness and readiness. Liveness says "I'm not deadlocked." Readiness says "I can serve traffic."
- Use startup probes for slow-starting apps so liveness doesn't kill them during init.
- Keep probes lightweight -- a heavy probe under load causes cascading restarts.
- Set `failureThreshold` higher on liveness than readiness. You want to stop sending traffic quickly but only kill the pod after sustained failure.

## Decision Guide

**Bare metal / VM, you own the OS:** systemd. It's the default, it's integrated, and your team already knows it. Use runit if you want something smaller (Void Linux, Alpine, or embedded systems).

**Inside a container, multiple processes:** s6-overlay. It handles PID 1 correctly, supports readiness ordering, and has clean shutdown semantics. Supervisor works here too if your team already knows it.

**Single-process container in Docker Compose:** Docker restart policies. Keep it simple.

**Kubernetes:** Let the kubelet manage restarts via probes. Don't run a process supervisor inside the container unless you genuinely need multiple processes per pod (and even then, consider sidecars first).

**Legacy / embedded / no systemd:** runit or s6. Both are tiny, both handle the supervision loop well. runit is simpler to learn; s6 is more powerful if you need readiness notification or dependency ordering.

## Final Thoughts

Process supervision is a solved problem with multiple good solutions. The choice is less about which tool is "best" and more about where your process runs. systemd dominates on hosts. s6-overlay dominates inside multi-process containers. Kubernetes makes the question mostly irrelevant for orchestrated workloads. Pick the tool that matches your deployment model and move on to harder problems.
