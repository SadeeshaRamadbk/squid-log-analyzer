# Squid Proxy Log Analyzer (`nipponbpo.local`)

A high-performance Next.js log analytics and auditing system built for the `nipponbpo.local` internal network Squid proxy.

---

## Features (Phase 1)

1. **SSH Live Log Ingestion Service**:
   - Connects to the Squid proxy server via SSH (`ssh2`).
   - Tails `/var/log/squid/access.log` using persistent chunk streaming (`tail -F`).
   - High-throughput line parsing for timestamps, internal client IPs, HTTP methods, URLs, domain names, result codes, and transfer bytes.
   - Micro-batched inserts wrapped in atomic SQLite transactions.
2. **Selective URL Privacy & Auditing**:
   - Stores the **full URL exclusively for blocked requests** (e.g., `TCP_DENIED/*`, HTTP 403).
   - Strips full URLs for allowed requests, storing only the normalized domain to minimize database footprint and safeguard user privacy.
3. **Optimized SQLite with WAL Mode**:
   - Uses `better-sqlite3` with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and `synchronous = NORMAL` for concurrent ingestion and query performance.
   - Dual-write daily summary table (`daily_summaries`) with atomic upserts for instant dashboard aggregation.
   - B-tree indexes on `timestamp`, `client_ip`, and `domain`.
4. **60-Day Automated Retention Pruner**:
   - Deletes raw log records older than 60 days on startup and via scheduled daily runs.
   - Preserves high-level daily summary aggregations indefinitely.
   - Interactive manual prune trigger available in the dashboard UI.
5. **IP User Attribution & Department Tagging**:
   - Assign friendly names (e.g. "Kenji Sato"), departments (e.g. "Finance & Billing"), and workstation notes to each `nipponbpo.local` internal IP address.
   - User names are displayed across Top Client IPs, Blocked Requests logs, and the Client IP search filter.
   - Built-in management interface with search, quick edit, and inline tagging.
6. **Database Backup & Easy Machine Migration**:
   - One-click online SQLite backup snapshot (`db.backup`) with WAL frame consolidation directly downloadable in the browser or via CLI (`npm run backup`).
   - One-click restore: upload a backup file in the UI or CLI (`npm run restore <file>`) to restore and migrate to another machine seamlessly with integrity validation.
7. **pfSense `softflowd` 1.2.6_4 Flow Telemetry (Layer 3 / Layer 4)**:
   - Dedicated NetFlow v5 UDP collector daemon listening on port `2055`.
   - Ingests Layer 3/4 flows directly from pfSense router/firewall interfaces.
   - Decodes protocol types (TCP, UDP, ICMP), service port mapping (HTTPS, DNS, SSH, RDP, SMB, SIP, etc.), packet counts, byte volumes, and TCP control flags (`SYN,ACK,FIN`).
   - High-throughput batched ingestion into SQLite with WAL mode and dual-write daily aggregates (`netflow_daily_summaries`).
   - Integrated with existing `ip_mappings` for full employee attribution and department tagging on internal IP talkers.
8. **Interactive Dashboards (Squid Proxy & pfSense Flow Analyzer)**:
   - **Squid Proxy Dashboard (`/`)**:
     - **Overview KPI Cards**: Total requests, **Total Bandwidth**, **Download (Inbound ⬇️)**, **Upload (Outbound ⬆️)**, blocked events, unique domains, active client IPs.
     - **Requests Over Time**: Interactive time-series area chart tracking overall and blocked traffic trends.
     - **Top Domains**: Volume, bandwidth, blocked incidents, and percentage share.
     - **Top Client IPs & Assigned Users**: Internal workstations on `nipponbpo.local` with separate **Download ⬇️**, **Upload ⬆️**, Total volume, user labels, and one-click filtering.
     - **Live HTTP/S Proxy Stream (`LiveRequestsTable`)**: Real-time paginated table displaying timestamp, client IP, user name, HTTP method badge, destination domain, result code, and separated in/out byte transfers.
     - **Blocked Requests Audit Log**: Real-time table displaying timestamp, client IP, user name, method, result code, and full blocked URL with copy button and pagination.
     - **Squid Ingestion Setup Modal**: Step-by-step guidance for SSH log tailing, rsyslog forwarding, and pfSense Squid configuration.
   - **pfSense softflowd Dashboard (`/softflowd`)**:
     - **Overview KPI Cards**: Total flow sessions, **Total Bandwidth**, **Download (Inbound ⬇️)**, **Upload (Outbound ⬆️)**, total packets, unique talkers, unique destinations, and primary protocol.
     - **Bandwidth & Throughput Over Time**: Multi-series area chart visualizing MB transfer volumes and packet throughput trends.
     - **Top Talkers (Internal Sources)**: Top bandwidth consumers with separated Download ⬇️, Upload ⬆️, and Total bandwidth linked with employee names and department badges.
     - **Top Destinations (Remote IPs)**: Most accessed endpoints with byte and packet volume breakdown.
     - **Top Network Services**: Traffic distribution across Layer 4 services (HTTPS 443, DNS 53, SMB 445, SSH 22, etc.).
     - **Live Flow Telemetry Stream**: Real-time paginated table showing flow start times, source IP/port, destination IP/port, protocol, service badge, TCP flags, duration, and data transfer volumes.
     - **pfSense Setup Guide Modal**: Embedded step-by-step instructions for configuring the softflowd 1.2.6_4 package directly in pfSense WebGUI and Windows firewall.
   - **Global Filtering & Real-Time Live Mode (Both Dashboards)**:
     - **Time Windows**: Quick presets for **Last 30 Min**, **Last 1 Hour**, Today, Last 7 Days, Last 30 Days, All Recorded, and Custom Date Pickers.
     - **Animated Real-Time Toggle**: Pulsing live radar button (`REAL TIME (3s)`) beside the Refresh button that automatically streams and refreshes incoming network logs every 3 seconds.
     - **Client IP / Source IP Selector**: Search and filter by internal IP address or assigned user name.
9. **Individual IP Profiler & Multitasking Dossier (`Ctrl+K`)**:
   - **Global Search Bar**: Always accessible in the top navigation header on both panels (`/` and `/softflowd`), allowing instant search by IP address, employee name, or department with keyboard navigation and predictive suggestions.
   - **Multitasking Host Dossier Inspector (`IpProfileModal`)**:
     - **Centered Modal Mode**: Deep-dive full-screen inspection view.
     - **Docked Right Drawer Mode (Multitasking)**: Pin the dossier to the right side of the screen (`w-full sm:w-[540px]`) without blocking the dashboard—allowing admins to browse tables, filter metrics, or switch hosts simultaneously!
     - **Corner Floating Pill**: Minimize the dossier into a non-intrusive floating status chip at the bottom right corner to quickly restore at any point.
     - **Employee Attribution**: User name, department, workstation notes, with inline quick-edit saving directly to SQLite.
     - **Squid Web Proxy Audit**: Total requests, cache volume, first/last seen timestamps, top visited domains, and full blocked request history with copyable URLs.
     - **pfSense L3/L4 Telemetry**: Download volume (⬇️), Upload volume (⬆️), total packets, top remote endpoints accessed, Layer 4 network services, and recent flow sessions with TCP flags.
     - **One-Click Filtering**: 'Filter View' button to immediately isolate all dashboard charts to that specific host.
10. **Dual NOC Multitask Split View (`Multitask Split View ⧉`)**:
   - **Side-by-Side Dual NOC Panel**: Monitor Squid HTTP/S Proxy activity and pfSense L3/L4 Flow Telemetry simultaneously on a single unified screen.
   - **Seamless Navigation**: Zero-reloading tab switches between Squid Proxy, pfSense softflowd, and Multitask Split View.
   - **Synchronized Filter Linking (`Sync Filters 🔗`)**: Filter an IP or date window in one panel to instantly sync and isolate records across both proxies and routers in real-time.

---

## Quick Start

### 1. Installation

```bash
cd squid-log-analyzer
npm install
```

### 2. Configuration (`.env.local`)

Copy `.env.example` to `.env.local` and configure your credentials:

```ini
# Database Path
DATABASE_PATH=./data/squid_analytics.db

# Ingestion Batch Settings
BATCH_SIZE=500
BATCH_FLUSH_INTERVAL_MS=2000

# Retention Settings (Raw log retention period in days)
RETENTION_DAYS=60

# Squid SSH Connection Configuration
SQUID_SSH_HOST=squid.nipponbpo.local
SQUID_SSH_PORT=22
SQUID_SSH_USER=squiduser
SQUID_SSH_PASSWORD=your_password_here
# Or use private key:
# SQUID_SSH_KEY_PATH=/path/to/id_rsa

# Remote Squid log path
SQUID_LOG_PATH=/var/log/squid/access.log
```

### 3. Generate Demonstration Logs (Optional)

To test the system immediately without connecting to a live SSH proxy server:

```bash
npm run seed-demo
```
This inserts realistic synthetic traffic from `nipponbpo.local` internal IP subnets, including corporate services and blocked events, plus records older than 65 days to verify retention pruning.

### 4. Run the 60-Day Retention Job

```bash
npm run retention
```

### 5. Start the Web Dashboard

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Start the Squid SSH Ingestion Daemon

```bash
npm run ingest
```

### 7. Start the pfSense softflowd NetFlow Collector Daemon

**Prerequisite (Windows Firewall)**: Allow inbound UDP traffic on port 2055 in an Administrator PowerShell:
```powershell
New-NetFirewallRule -DisplayName "NetFlow UDP Collector" -Direction Inbound -LocalPort 2055 -Protocol UDP -Action Allow
```

Start the collector daemon:
```bash
npm run netflow
# or
npm run flow-collector
```
Listens for NetFlow v5 UDP packets from pfSense (defaults to port `2055`, configurable via `NETFLOW_PORT` and `NETFLOW_BIND_HOST`).

### 8. pfSense Syslog Collector Daemon (RFC 3164 / RFC 5424)

Start the UDP Syslog collector daemon (listens by default on UDP `1514`):

```bash
npm run syslog
```

#### Firewall Rules (Allow Inbound UDP 1514)

- **Windows PowerShell (Run as Administrator)**:
  ```powershell
  New-NetFirewallRule -DisplayName "pfSense Syslog UDP Collector" -Direction Inbound -LocalPort 1514 -Protocol UDP -Action Allow
  ```

- **Linux (UFW)**:
  ```bash
  sudo ufw allow 1514/udp comment "pfSense Syslog UDP Collector"
  ```

- **Linux (iptables)**:
  ```bash
  sudo iptables -A INPUT -p udp --dport 1514 -j ACCEPT
  ```

#### pfSense Remote Syslog Configuration

1. Log in to pfSense WebGUI (e.g., `https://192.168.0.1`).
2. Navigate to **Status > System Logs**, then click the **Settings** tab.
3. Scroll down to **Remote Logging Options**.
4. Check **Enable Remote Logging**.
5. Set **Remote log servers** to `<collector-machine-ip>:1514` (e.g. `192.168.0.50:1514`).
6. Select the log categories to forward under **Remote Syslog Contents**:
   - **System Events** (Squid errors, daemon alerts, DNS events)
   - **Firewall Events** (filterlog blocked and passed packets)
   - **DHCP Service Events** (Leases, renewals, conflicts)
   - **Gateway Monitor** (dpinger packet loss / latency stats)
7. Click **Save**.
8. *(Optional)* To mirror Squid access events via Syslog, go to **Services > Squid Proxy > Custom Options** and append:
   ```text
   access_log syslog:local0.info
   ```

### 9. Generate Synthetic NetFlow & Syslog (Optional)

```bash
# Seed demo NetFlow flows
npm run seed-flows

# Seed demo Syslog firewall & system events
npm run seed-syslog
```

### 10. Backup and Restore Database (CLI)

```bash
# Dump clean SQLite backup snapshot into backups/ folder
npm run backup

# Restore a database backup from another machine
npm run restore backups/squid_analytics_backup_2026-10-13T04-08-50.db

# Clear all data (starts fresh and empty)
npm run clear-db
```

---

## Database Schema

```sql
-- Raw logs table (URL preserved ONLY for blocked requests)
CREATE TABLE raw_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,            -- Unix epoch in ms
    client_ip TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT,                              -- NULL for allowed; full URL ONLY if blocked
    domain TEXT NOT NULL,
    result_code TEXT NOT NULL,             -- e.g. 'TCP_DENIED/403'
    is_blocked INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0
);

-- Daily summary aggregate table
CREATE TABLE daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
    client_ip TEXT NOT NULL,
    domain TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    blocked_count INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_daily_ip_domain UNIQUE(date, client_ip, domain)
);

-- IP to User / Host mappings
CREATE TABLE ip_mappings (
    client_ip TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    department TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- pfSense softflowd Layer 3/4 flow records
CREATE TABLE netflow_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,            -- Unix epoch in ms
    src_ip TEXT NOT NULL,
    dst_ip TEXT NOT NULL,
    src_port INTEGER NOT NULL,
    dst_port INTEGER NOT NULL,
    protocol TEXT NOT NULL,                -- 'TCP', 'UDP', 'ICMP', etc.
    service_name TEXT,                     -- 'HTTPS', 'DNS', 'SSH', 'RDP', etc.
    bytes INTEGER NOT NULL DEFAULT 0,
    packets INTEGER NOT NULL DEFAULT 0,
    tcp_flags TEXT,                        -- 'SYN', 'ACK', 'FIN', etc.
    flow_duration_ms INTEGER DEFAULT 0
);

-- Daily aggregate summaries for softflowd
CREATE TABLE netflow_daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
    src_ip TEXT NOT NULL,
    dst_ip TEXT NOT NULL,
    dst_port INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    service_name TEXT,
    flow_count INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0,
    packets INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_netflow_daily UNIQUE(date, src_ip, dst_ip, dst_port, protocol)
);
```
