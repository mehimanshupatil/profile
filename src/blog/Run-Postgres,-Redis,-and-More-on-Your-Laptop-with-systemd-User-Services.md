---
title: "Run Postgres, Redis, and More on Your Laptop with systemd User Services"
pubDate: 2026-02-01
description: "Tired of Docker Desktop drains and flaky local services? Use systemd user services to run dev daemons reliably, with simple unit files and real trade-offs."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1515879218363-5974f0a8b3f3?auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "A developer laptop showing a terminal with system services running, placed on a desk"
  caption: "Image credit: Scott Graham / Unsplash"
  creditUrl: "https://unsplash.com/photos/Ke0nENtce3Q"
tags: ["systemd user services", "developer tools", "linux"]
---

A few months ago I hit a recurring morning ritual: start my laptop, wait for Docker Desktop to boot, pray my Postgres container comes up, and then spend 10–15 minutes wrestling with volume mounts, container names, or low disk space. On my corporate laptop, with limited CPU and background policy agents chewing cycles, Docker felt heavy and fickle.

I switched to running local dev daemons as systemd user services. It sounds nerdy, but the gains were immediate: predictable startup, tiny overhead, journald logs, and clean commands to start/stop without remembering container names. If you’re on Linux (or WSL2 with systemd enabled), this is a low-friction way to keep essential services like Postgres, Redis, or MinIO available without Docker Desktop’s memory tax.

Why systemd user services work for local development
- Per-user, not system-wide: No sudo needed to enable or start services. They live under your user account and respect your session lifecycle.
- Lightweight and fast: Running native processes uses less memory than full container engines.
- Native supervision: systemd restarts on failure, exposes status, and integrates with journalctl for logs.
- Simple API: systemctl --user start/stop/enable is easier than remembering docker-compose up -d and container names.

A realistic example: Postgres as a user service
Create a data directory in your home and a simple unit file:

- Data dir:
  mkdir -p ~/.local/var/postgres && chown -R $(whoami) ~/.local/var/postgres

- Unit file (~/.config/systemd/user/postgres.service):
  [Unit]
  Description=Local Postgres for dev
  After=network.target

  [Service]
  Type=simple
  ExecStart=/usr/lib/postgresql/15/bin/postgres -D %h/.local/var/postgres -p 5432
  Restart=on-failure
  RestartSec=5
  Environment=PGDATA=%h/.local/var/postgres
  WorkingDirectory=%h

  [Install]
  WantedBy=default.target

Then reload and enable:
  systemctl --user daemon-reload
  systemctl --user enable --now postgres

Check logs: journalctl --user -u postgres -f

Swap the ExecStart path for your distribution’s postgres binary (or use initdb first). The point is you now control start/stop with simple systemctl commands and get automatic restarts and logs without Docker.

Redis, MinIO, and other services
The same pattern works for any single-process daemon. For Redis, ExecStart=/usr/bin/redis-server --dir %h/.local/var/redis --port 6379. For a local MinIO binary, pass your key, secret, and path. Keep service ports consistent with your dev environment, or use environment files (~/.config/systemd/user/myapp.env) referenced by EnvironmentFile=.

Small conveniences that matter
- Auto-start on login: systemctl --user enable ensures your services come up when you log in.
- journalctl gives you a one-stop log: journalctl --user -u redis -n 200
- systemctl --user status makes it clear when something fails, and you can use systemctl --user restart postgres to bounce a service.

Tradeoffs and real constraints
This isn’t a silver bullet. Expect the following downsides:

- Less isolation than containers: Services run against your host user and filesystem. Misconfigured processes can clash with other apps or dev environment assumptions. Use separate data directories and non-default ports.
- Not cross-platform: Native systemd user services are for Linux. On macOS you’d use launchd, and on Windows you’ll lean on WSL2 (which now supports systemd in recent Windows 11 builds) or keep Docker.
- Startup and battery: Services enabled to start on login will keep running even on battery. I learned this the hard way—my evening laptop drain rose until I added a small systemd timer to auto-stop heavy services after 30 minutes of idle time.
- Dependency management: If your app expects multiple services in a network-isolated environment (e.g., a specific container network), systemd alone won’t provide that. For full parity with production, you might still use Docker or Podman.

When to prefer containers instead
If you need exact production-like isolation, custom OS packages, or reproducible images for onboarding, containers are still better. I use systemd user services for day-to-day, fast workflows, and containers when I need parity with CI/prod or when onboarding teammates.

Polish with small extras
- Keep ports consistent with docker-compose files to avoid changing app configs.
- Use systemd EnvironmentFile to separate secrets from unit files.
- Add a simple systemd timer to stop services after hours:
  [Unit]
  Description=Stop dev services after idle

  [Timer]
  OnBootSec=10min
  OnCalendar=*-*-* 23:30:00
  Unit=stop-dev.service

- Consider using Podman if you want OCI-level isolation without Docker Desktop; Podman integrates well with systemd too.

Final recommendation
If you work on a constrained laptop, hate Docker Desktop’s resource usage, and want predictable local services, try systemd user services for a week. Start small—Postgres or Redis—so you can measure the benefits (startup time, memory saved, fewer morning rituals). Keep containers in your toolbox for cases that need strict isolation. The trade-offs are real, but for day-to-day development, the predictability and integration with systemd’s tooling win more mornings than they lose.

It changed my mornings: one less thing to pray for and one more terminal command that actually does what it says. If you want, I can share my exact unit files for Postgres, Redis, and a MinIO setup I use—drop a note and I’ll paste them.