# 🥾 Let's Walk!

A personal project born out of my love for hiking and my desire to learn React. Are there thousands of similar apps? Yes. Does it feel good to have my own when I go out on a trail? Also yes.



https://github.com/user-attachments/assets/25f54abb-e63a-47e7-a376-31660a736e5e

---

## Features

- **Route Planning** — Search for hiking routes by start and end point using OpenRouteService
- **Interactive Map** — Visualize routes on an OpenStreetMap-based map powered by Leaflet
- **GPS Navigation** — Real-time position tracking with turn-by-turn instructions and off-route warnings
- **Elevation Data** — View total ascent and descent for each route
- **Badges** — Earn achievements as you complete routes and reach milestones
- **Route Saving** — Save your favourite routes via Appwrite backend
- **GPX Export** — Export routes as GPX files for use in other apps

---

## Tech Stack

| Area              | Technology                           |
| ----------------- | ------------------------------------ |
| Frontend          | React, Tailwind CSS                  |
| Maps              | Leaflet, OpenStreetMap               |
| Routing           | OpenRouteService API                 |
| Geocoding         | Nominatim                            |
| Static map images | MapTiler                             |
| Backend           | Appwrite (auth, database, functions) |
| Build tool        | Vite                                 |

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- An [OpenRouteService](https://openrouteservice.org/) account (free tier available)
- An [Appwrite](https://appwrite.io/) account (free tier available)
- A [MapTiler](https://www.maptiler.com/) account (free tier available)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/s-motto/project-1.git
   cd project-1
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory by copying the example below and filling in your values:

   ```dotenv
   # Appwrite Configuration
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your_project_id
   VITE_APPWRITE_DATABASE_ID=your_database_id
   VITE_APPWRITE_ROUTES_COLLECTION_ID=your_collection_id
   VITE_APPWRITE_FUNCTION_ID=your_function_id

   # OpenRouteService (for local development only)
   # In production, the API key is managed by the Appwrite Function
   VITE_OPENROUTE_API_KEY=your_ors_api_key

   # MapTiler (for static route preview images)
   VITE_MAPTILER_KEY=your_maptiler_key

   # Tile server (fallback if MapTiler is unavailable)
   VITE_STATIC_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
   VITE_TILE_ATTRIBUTION=© OpenStreetMap contributors
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Project Status

This project is under active development — and probably always will be, because there's always something to improve. Core features (route planning, GPS navigation, badges, route saving) are working. Some features may still be incomplete or subject to change.

---

## Notes

- The ORS API key is intentionally kept client-side for local development only. In production, API calls are proxied through an Appwrite Function to keep the key secure.
- GPS navigation requires a device with location services enabled and works best outdoors.

---

## Acknowledgements

- [OpenRouteService](https://openrouteservice.org/) for routing and navigation data
- [OpenStreetMap](https://www.openstreetmap.org/) contributors for map data
- [Leaflet](https://leafletjs.com/) for the interactive map
- [Appwrite](https://appwrite.io/) for backend services
- [MapTiler](https://www.maptiler.com/) for static map imagery
