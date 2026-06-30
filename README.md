# Kilter Board Web App

A beautiful, mobile-first Next.js web app for browsing and lighting up Kilter Board climbing routes.

## Features

- 🧗 **Browse Climbs**: Browse thousands of Kilter Board routes with real-time stats
- 🔍 **Smart Filtering**: Filter by V-grade, ascents, quality, board angle, and more
- 🎨 **Visual Routes**: See exactly what your climb looks like before you try it
- 📱 **Web Bluetooth**: Connect to a physical Kilter Board via Web Bluetooth and light up holds as you climb
- 🔓 **No Database**: All data proxied from the Kilter Portal API (no self-managed database)
- 📲 **PWA Ready**: Install as a home screen app for offline access

## Quick Start

### Prerequisites

- Node.js 18+
- A Kilter Board account with API credentials

### Setup

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your Kilter credentials:
   ```
   KILTER_USERNAME=your_username
   KILTER_PASSWORD=your_password
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **BLE**: Web Bluetooth API (native, no external library)
- **Hosting**: Netlify (via `@netlify/plugin-nextjs`)
- **Database**: None - API proxy pattern

### Project Structure

```
kilterwebapp/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home redirect to /climbs
│   ├── climbs/
│   │   ├── page.tsx            # Climb list with filters & search
│   │   └── [uuid]/page.tsx     # Climb detail + board visualization
│   ├── connect/page.tsx        # Bluetooth connection management
│   ├── about/page.tsx          # About page
│   └── api/
│       ├── climbs/route.ts     # GET: Proxied climb list
│       ├── climbs/[uuid]/route.ts  # GET: Proxied climb detail
│       └── health/route.ts     # GET: Health check
├── components/
│   ├── ui/                     # shadcn UI components
│   ├── climb-card.tsx          # Climb list item
│   ├── climb-filters.tsx       # Filter panel (bottom sheet)
│   ├── search-bar.tsx          # Name/setter search
│   ├── board-viewer.tsx        # SVG board visualization
│   ├── ble-provider.tsx        # Bluetooth context
│   ├── ble-connect-button.tsx  # Connect/disconnect UI
│   ├── browser-compat-banner.tsx  # BLE support warning
│   └── bottom-nav.tsx          # Mobile navigation
├── lib/
│   ├── kilter-auth.ts          # Keycloak token management
│   ├── kilter-client.ts        # Kilter API wrapper
│   ├── ble.ts                  # Web Bluetooth wrapper
│   ├── grades.ts               # V-grade helpers
│   ├── frames.ts               # Climb encoding/decoding
│   └── utils.ts                # General utilities
├── types/index.ts              # TypeScript types
├── public/manifest.json        # PWA manifest
└── netlify.toml                # Deployment config
```

## API Integration

### Keycloak Auth

Server-side token management in `lib/kilter-auth.ts`:
- Automatic token refresh
- Credentials stored in environment variables
- Cached tokens for performance

### Kilter Portal API

The app proxies requests to the official Kilter Portal API:
- `/api/climbs` → Fetch and filter climb listings
- `/api/climbs/[uuid]` → Get climb details
- Full support for: ratings, logs, user profiles, circuits, walls

See `lib/kilter-client.ts` for all available endpoints.

## Bluetooth Connection

### Browser Support

| Browser | Status |
|---------|--------|
| Chrome 56+ | ✅ Supported |
| Edge 79+ | ✅ Supported |
| Opera 43+ | ✅ Supported |
| Safari/iOS | ❌ Not supported (yet) |
| Firefox | ❌ Limited support |

### How It Works

1. User clicks "Connect to Board"
2. Browser opens Bluetooth pairing dialog
3. User selects their Kilter Board
4. Connection established via Web Bluetooth API
5. On any climb, user can tap "Light It Up" to illuminate holds
6. Holds are identified via the climb's `climb_concat` field and mapped to LED positions

## Deployment

### Netlify

1. **Connect your repo** to Netlify
2. **Set environment variables**:
   - `KILTER_USERNAME`
   - `KILTER_PASSWORD`
3. **Deploy**:
   ```bash
   npm run build
   ```

The build automatically uses `@netlify/plugin-nextjs` for optimized deployment.

## Development

### Running Tests

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

### Environment Variables

Create a `.env.local` file (see `.env.local.example`):

```
KILTER_USERNAME=your_kilter_username
KILTER_PASSWORD=your_kilter_password
NEXT_PUBLIC_DEFAULT_LAYOUT_UUID=e4561ba7-195e-4722-90e4-4c8f7fa26749
```

## Performance

- **Client-side caching**: React Query-like patterns in API routes
- **API response caching**: `Cache-Control` headers on Kilter API responses
- **Code splitting**: Dynamic imports for BLE features
- **Image optimization**: Tailwind CSS for minimal bundle size
- **Zero external databases**: No cold starts, instant data retrieval

## Browser Compatibility

| Feature | Chrome | Edge | Opera | Safari | Firefox |
|---------|--------|------|-------|--------|---------|
| Browse Climbs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Web Bluetooth | ✅ | ✅ | ✅ | ❌ | ❌ |
| PWA Install | ✅ | ✅ | ✅ | ⚠️ | ✅ |

## Contributing

Contributions welcome! Please open an issue or PR to discuss changes.

## License

MIT

## Support

For issues with the Kilter Portal API, visit [https://kiltergrips.com](https://kiltergrips.com)

---

Built with ❤️ for climbers by climbers.
