# Kilter Board Web App

Build a mobile-first Next.js + TypeScript web app that lets users browse, filter, and search Kilter Board climbs, then connect to a physical Kilter Board via Web Bluetooth to light up routes. Hosted on Netlify with no self-managed database -- data served by proxying the new Kilter Portal API.

---

## API Research (from APK v2.5.2 reverse engineering)

The Kilter Board ecosystem split from Aurora Climbing in March 2026. The new Kilter-owned infrastructure has three layers:

### Authentication -- Keycloak OIDC

| Detail | Value |
|---|---|
| Token endpoint | `POST https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/token` |
| Auth page | `https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/auth` |
| Logout | `https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/logout` |
| Client ID | `kilter` |
| Scope | `openid offline_access` |
| Grant type | `password` |
| OAuth redirect (mobile) | `com.kiltergrips:/oauthredirect` |

### Data Sync -- PowerSync

| Detail | Value |
|---|---|
| Sync endpoint | `https://sync1.kiltergrips.com` |
| Protocol | PowerSync BSON stream (`application/vnd.powersync.bson-stream`) |
| Checkpoint | `write-checkpoint2.json?client_id=` |

PowerSync syncs the following tables into a local SQLite database:

- `climbs`, `climb_stats`, `climb_ratings`, `climb_mounting_holes`
- `gyms`, `walls`
- `circuits` (playlists), `logs` (ascent/attempt logs)
- `difficulty_grades`, `placement_types`, `hold_placements`, `mounting_holes`, `holds`, `hold_sets`, `product_layouts`

### Portal REST API

Base URL: `https://portal.kiltergrips.com/api`

#### Climb endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/climbs/all/{productLayoutUuid}` | GET | Fetch all climbs for a board layout |
| `/api/climb-stat/all/{...}` | GET | Fetch all climb stats for a board layout |
| `/api/climbs/{uuid}` | GET | Single climb details |
| `/api/climbs/climbdetails/{...}` | GET | Climb detail with edges/hold info |
| `/api/climbs/climbdetails/productName/edges` | GET | Climb edges for a product |
| `/api/climbs/climbdetails/productName/edges/count` | GET | Edge count for a product |
| `/api/climbs/curated` | GET | Curated/featured climbs |
| `/api/climbs/logged` | GET | User's logged climbs |
| `/api/climbs/create-climb/transaction` | POST | Create a new climb |
| `/api/climbs/update-climb/transaction` | PUT | Update an existing climb |
| `/api/climb-mounting-holes/{...}` | GET | Hold positions for a climb |
| `/api/report-climb` | POST | Report a climb |

#### Rating & logging endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v2/climb-rating` | GET/POST | Get or submit climb ratings |
| `/api/v2/climb-rating/{uuid}` | GET | Rating for a specific climb |
| `/api/v2/logs` | GET/POST | Get or create log entries |
| `/api/v2/logs/{uuid}` | GET | Specific log entry |
| `/api/v2/logs/bulk` | POST | Bulk log creation |

#### Wall & gym endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/walls` | GET | List walls/boards |
| `/api/walls/climbcount` | GET | Climb count per wall |
| `/api/walls/custom-wall` | POST | Create custom wall |

#### User endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/users/{uuid}` | GET | User profile |
| `/api/users/find` | GET | Search users (setter search) |
| `/api/users/register` | POST | Register new user |
| `/api/users/email/verification` | POST | Email verification |
| `/api/users/user-settings` | GET/PUT | User settings |
| `/api/users/user-analytics` | GET | User analytics |
| `/api/users/block-climb` | POST | Block a climb |
| `/api/users/unblock-climb` | POST | Unblock a climb |
| `/api/image/user` | GET | User profile image |

#### Social endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/followers/user` | GET | User followers |
| `/api/followers/user/following` | GET | Users being followed |
| `/api/followers/gym/{uuid}` | GET | Gym followers |
| `/api/v2/followers/gyms/{...}` | GET | Follow gyms (v2) |
| `/api/v2/followers/users/{...}` | GET | Follow users (v2) |
| `/api/notifications/{...}` | GET | Notifications |

#### Circuit/playlist endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/circuits` | GET/POST | List or create playlists |
| `/api/circuits/{uuid}` | GET | Specific playlist |
| `/api/circuit-climbs` | GET/POST | Climbs within a playlist |

### Database Schema (from compiled Dart code)

**`climbs` table:**

```sql
CREATE TABLE climbs (
  climb_uuid                  TEXT PRIMARY KEY,
  climb_concat                TEXT,          -- encoded hold+role data
  name                        TEXT NOT NULL,
  description                 TEXT,
  edge_left                   INTEGER NOT NULL,
  edge_right                  INTEGER NOT NULL,
  edge_bottom                 INTEGER NOT NULL,
  edge_top                    INTEGER NOT NULL,
  frame_count                 INTEGER NOT NULL,
  frames_pace                 INTEGER NOT NULL,
  user_uuid                   TEXT NOT NULL,  -- setter ID
  username                    TEXT NOT NULL,  -- setter display name
  product_name                TEXT NOT NULL,
  product_layout_uuid         TEXT NOT NULL,
  allow_match                 INTEGER NOT NULL,
  is_draft                    INTEGER NOT NULL,
  is_listed                   INTEGER NOT NULL,
  angle                       INTEGER,
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL,
  is_deleted                  INTEGER NOT NULL DEFAULT 0,
  accumulated_hold_set_value  INTEGER NOT NULL DEFAULT 0,
  curated                     INTEGER
);
```

**`climb_stats` table:**

```sql
CREATE TABLE climb_stats (
  climb_uuid                TEXT NOT NULL,
  angle                     INTEGER NOT NULL,
  ascent_count              INTEGER NOT NULL,
  current_difficulty_id     INTEGER NOT NULL,
  official_kilter_difficulty INTEGER,       -- Kilter's verified grade (replaces old benchmark_difficulty)
  difficulty_average        REAL,
  quality_average           REAL,
  fa_username               TEXT,
  fa_at                     TEXT,
  curated                   INTEGER,
  PRIMARY KEY (climb_uuid, angle)
);
```

**Key queries found in the app:**

```sql
-- Main climb list query (joins climbs with stats at a given angle)
SELECT climbs.*,
  (SELECT ascent_count FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS ascent_count,
  (SELECT current_difficulty_id FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS current_difficulty_id,
  (SELECT official_kilter_difficulty FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS official_kilter_difficulty,
  (SELECT difficulty_average FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS difficulty_average,
  (SELECT quality_average FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS quality_average,
  (SELECT fa_username FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS fa_username,
  (SELECT fa_at FROM climb_stats WHERE climb_stats.climb_uuid = climbs.climb_uuid
   AND climb_stats.angle = climbs.angle LIMIT 1) AS fa_at
FROM climbs
WHERE climbs.product_layout_uuid IN (?)
  AND climbs.is_listed = 1
  AND climbs.is_draft = 0
  AND (SELECT current_difficulty_id FROM climb_stats ...) BETWEEN ? AND ?
ORDER BY climbs.created_at DESC;

-- Verified/benchmark filter
AND (SELECT official_kilter_difficulty FROM climb_stats ...) IS NOT NULL

-- Grade filter using official OR community grade
AND (SELECT current_difficulty_id FROM climb_stats ...) BETWEEN ? AND ?
OR (SELECT official_kilter_difficulty FROM climb_stats ...) BETWEEN ? AND ?
```

### BLE Protocol

| Detail | Value |
|---|---|
| Advertising service UUID | `4488B571-7806-4DF6-BCFF-A2897E4953FF` |
| Data transfer service UUID | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| Write characteristic UUID | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |
| Chunk size | 20 bytes |
| Library | `@hangtime/grip-connect` (handles protocol internally) |

---

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **BLE**: `@hangtime/grip-connect`
- **Hosting**: Netlify (via `@netlify/plugin-nextjs`)
- **Database**: None -- proxy to Kilter Portal API with in-memory caching

---

## Phase 1: Project Foundation + API Integration

**Goal**: Scaffold the app, wire up Kilter API auth and data fetching.

### 1.1 Scaffold

- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, ESLint
- Install shadcn/ui components (Button, Card, Input, Sheet, Badge, Slider, Toggle, Skeleton)
- Install `@hangtime/grip-connect`
- Add `@netlify/plugin-nextjs` for deployment

### 1.2 Keycloak Auth Flow

Server-side token management in `lib/kilter-auth.ts`:

```
POST https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=password
client_id=kilter
username=<user>
password=<pass>
scope=openid offline_access
```

- Cache access token in memory, refresh before expiry
- Credentials stored as env vars (`KILTER_USERNAME`, `KILTER_PASSWORD`)

### 1.3 Kilter API Client

Server-side wrapper in `lib/kilter-client.ts`:
- Wraps `fetch` calls to `portal.kiltergrips.com/api`
- Auto-refreshes token on 401
- Retry with exponential backoff on 429/5xx
- Response caching via `Cache-Control` / `stale-while-revalidate`

### 1.4 Basic Layout

- Root layout with mobile-first viewport, sticky header, bottom navigation
- Placeholder pages for `/climbs` and `/connect`

**Deliverable**: App boots, authenticates with Kilter API, can fetch raw climb data.

---

## Phase 2: Climb List + Search + Filters

**Goal**: Build the main climbs browsing page with all requested filtering.

### 2.1 API Route: `GET /api/climbs`

Proxies to `/api/climbs/all/{productLayoutUuid}` + `/api/climb-stat/all/{...}`. Query params:

- `minGrade` / `maxGrade` -- V-grade strings mapped to `current_difficulty_id` ranges
- `minAscents` -- minimum `ascent_count`
- `verified` -- filters to `official_kilter_difficulty IS NOT NULL`
- `sortBy` -- `ascents` | `quality` | `difficulty` | `newest`
- `name` -- climb name search
- `setter` -- setter username search (uses `/api/users/find`)
- `angle` -- board angle (0-70)
- `page` / `limit` -- pagination

### 2.2 Climb List Page (`/climbs`)

Mobile-first card list showing:
- Climb name
- V-grade badge (color-coded)
- Setter username
- Ascent count
- Quality stars
- Board angle

Infinite scroll or "Load more" pagination.

### 2.3 Filter Panel

Bottom sheet (mobile) / sidebar (desktop):
- **Grade range**: V1 through V17 pill selectors
- **Min ascents**: preset buttons (Any, 10+, 50+, 100+, 500+)
- **Verified only**: toggle (filters to `official_kilter_difficulty IS NOT NULL`)
- **Sort by**: Most Repeats, Quality, Grade, Newest
- **Angle**: pill selector (0, 5, 10, ... 70)

### 2.4 Search

- Debounced text input with toggle between "Climb name" and "Setter" mode
- Filters persist in URL query params (bookmarkable/shareable)

**Deliverable**: Full climb browsing with all filters working.

---

## Phase 3: Climb Detail + Board Visualization

**Goal**: Show detailed climb info and visual hold map.

### 3.1 Climb Detail Page (`/climbs/[uuid]`)

- Climb name, V-grade, setter, description
- Stats: ascent count, quality, official Kilter grade badge
- First ascent info
- Share button (copies URL)
- "Light It Up" button (when BLE connected)

### 3.2 Board SVG Component

- Render board grid from `climb_mounting_holes` data
- Color-code holds by role (start=green, middle=blue, foot=orange, finish=red)
- Parse `climb_concat` field for hold positions and roles
- Responsive, fits mobile viewport

**Deliverable**: Tapping a climb shows detail page with visual hold map.

---

## Phase 4: Bluetooth Connection

**Goal**: Connect to a physical Kilter Board and light up routes.

### 4.1 BLE Wrapper (`lib/ble.ts`)

Client-only module wrapping `@hangtime/grip-connect`:

```typescript
import { KilterBoard } from "@hangtime/grip-connect";
const board = new KilterBoard();

export async function connectToBoard() { await board.connect(); }
export async function lightHolds(holds: { position: number; role_id: number }[]) { await board.led(holds); }
export function isConnected() { return board.isConnected(); }
export function disconnect() { board.disconnect(); }
```

### 4.2 Connect Button + Provider

- React context (`ble-provider.tsx`) shares connection state across pages
- `ble-connect-button.tsx` loaded via `next/dynamic` with `ssr: false`
- States: Disconnected -> Connecting -> Connected
- `/connect` page with instructions and connection management

### 4.3 "Light It Up" on Climb Detail

- Parse climb's `climb_concat` to extract hold placement IDs
- Map placements to LED positions via mounting hole / LED data
- Call `board.led([{ position, role_id }, ...])` to illuminate holds

### 4.4 Browser Compatibility

- Detect `navigator.bluetooth` availability
- Banner on unsupported browsers (Safari, Firefox, iOS)
- BLE features hidden gracefully -- browsing works everywhere

**Deliverable**: Users on Chrome/Edge can pair and light up any climb.

---

## Phase 5: Polish + Deployment

**Goal**: Production-ready mobile experience on Netlify.

### 5.1 Mobile UX

- Bottom nav (Climbs, Connect, About)
- Skeleton loading states, empty states
- Pull-to-refresh, touch-optimized controls (48px tap targets)

### 5.2 PWA

- Web app manifest for "Add to Home Screen"
- Service worker for offline climb cache
- App icons and splash screen

### 5.3 Netlify Deployment

- `netlify.toml` with `@netlify/plugin-nextjs`
- Env vars in Netlify dashboard
- Optional custom domain

### 5.4 Performance

- API response caching with `Cache-Control` headers
- Lightweight bundle (tree-shake unused components)

**Deliverable**: Installable PWA deployed on Netlify.

---

## File Structure

```
kilterwebapp/
  app/
    layout.tsx                    -- Root layout, providers, bottom nav
    page.tsx                      -- Redirect to /climbs
    climbs/
      page.tsx                    -- Climb list with filters + search
      [uuid]/
        page.tsx                  -- Climb detail + board viz + BLE button
    connect/
      page.tsx                    -- BLE connection management
    api/
      climbs/
        route.ts                  -- GET: proxied climb list
      climbs/[uuid]/
        route.ts                  -- GET: proxied climb detail
      auth/
        route.ts                  -- POST: Keycloak token exchange
      health/
        route.ts                  -- GET: health check
  components/
    climb-card.tsx                -- Climb list item card
    climb-filters.tsx             -- Filter bottom sheet
    search-bar.tsx                -- Name / setter search input
    board-viewer.tsx              -- SVG board with hold positions
    ble-connect-button.tsx        -- Bluetooth connect (client-only)
    ble-provider.tsx              -- BLE connection context
    grade-badge.tsx               -- V-grade colored pill
    browser-compat-banner.tsx     -- Unsupported browser warning
    bottom-nav.tsx                -- Mobile bottom navigation
  lib/
    kilter-auth.ts                -- Keycloak token management (server-only)
    kilter-client.ts              -- Kilter Portal API wrapper (server-only)
    ble.ts                        -- @hangtime/grip-connect wrapper (client-only)
    grades.ts                     -- V-grade <-> difficulty_id mapping
    frames.ts                     -- Parse climb_concat to hold positions
  types/
    index.ts                      -- Shared TypeScript types
  public/
    manifest.json                 -- PWA manifest
  netlify.toml                    -- Netlify deployment config
  tailwind.config.ts
  next.config.ts
  package.json
  tsconfig.json
  .env.local                      -- KILTER_USERNAME, KILTER_PASSWORD
```

---

## Browser Support

| Browser | Climb browsing | Bluetooth |
|---|---|---|
| Chrome 56+ (desktop + Android) | Yes | Yes |
| Edge 79+ | Yes | Yes |
| Opera 43+ | Yes | Yes |
| Safari / iOS | Yes | No (banner shown) |
| Firefox | Yes | No (banner shown) |
