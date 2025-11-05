function normalizePoints(points) {
  return (points || [])
    .map(p => {
      if (Array.isArray(p)) return { lat: p[1], lng: p[0] }
      return { lat: p.lat, lng: p.lng }
    })
    .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
}

function computeBounds(pts) {
  const lats = pts.map(p => p.lat)
  const lngs = pts.map(p => p.lng)
  let minLat = Math.min(...lats)
  let maxLat = Math.max(...lats)
  let minLng = Math.min(...lngs)
  let maxLng = Math.max(...lngs)
  if (minLat === maxLat) { minLat -= 0.0005; maxLat += 0.0005 }
  if (minLng === maxLng) { minLng -= 0.0005; maxLng += 0.0005 }
  return { minLat, maxLat, minLng, maxLng }
}

function buildProjector(pts, width, height, padding) {
  const { minLat, maxLat, minLng, maxLng } = computeBounds(pts)
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const scaleX = innerW / (maxLng - minLng)
  const scaleY = innerH / (maxLat - minLat)
  const scale = Math.min(scaleX, scaleY)
  const offsetX = padding + (innerW - scale * (maxLng - minLng)) / 2
  const offsetY = padding + (innerH - scale * (maxLat - minLat)) / 2
  const toXY = (p) => {
    const x = offsetX + (p.lng - minLng) * scale
    const y = offsetY + (maxLat - p.lat) * scale
    return [x, y]
  }
  return { toXY, bounds: { minLat, maxLat, minLng, maxLng } }
}

async function loadBasemap(bounds, width, height, { key, style = 'streets-v2' } = {}) {
  if (!key) return null
  // MapTiler Static Maps extent endpoint. If it fails, we simply skip and fallback.
  const { minLng, minLat, maxLng, maxLat } = bounds
  // Expand bbox by ~5% (or a tiny epsilon) to avoid zero-area extents
  const dx = Math.max(1e-4, (maxLng - minLng) * 0.05)
  const dy = Math.max(1e-4, (maxLat - minLat) * 0.05)
  const eMinLng = Math.max(-180, minLng - dx)
  const eMaxLng = Math.min(180, maxLng + dx)
  const eMinLat = Math.max(-85, minLat - dy)
  const eMaxLat = Math.min(85, maxLat + dy)
  const tryLoad = (mapStyle) => new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `https://api.maptiler.com/maps/${encodeURIComponent(mapStyle)}/static/extent/${eMinLng},${eMinLat},${eMaxLng},${eMaxLat}/${Math.round(width)}x${Math.round(height)}.png?key=${encodeURIComponent(key)}`
  })
  // Try preferred style, then fallback to streets-v2
  const first = await tryLoad(style)
  if (first) return first
  return await tryLoad('streets-v2')
}

function latToMercatorY(lat) {
  const rad = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

function computeCenterZoom(bounds, width, height) {
  // Compute zoom to fit bounds using Web Mercator approximation
  const paddingRatio = 0.10 // 10% padding
  const innerW = width * (1 - 2 * paddingRatio)
  const innerH = height * (1 - 2 * paddingRatio)
  const minLat = bounds.minLat
  const maxLat = bounds.maxLat
  const minLng = bounds.minLng
  const maxLng = bounds.maxLng

  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  // Convert to Mercator meters proxy (unitless), compute deltas
  const y1 = latToMercatorY(minLat)
  const y2 = latToMercatorY(maxLat)
  const deltaY = Math.abs(y2 - y1)
  const deltaX = Math.abs(maxLng - minLng) * Math.PI / 180 // in radians as proxy

  // World size in pixels at zoom z is 256 * 2^z
  // Required scale to fit: s = worldPixels / delta
  // So 256 * 2^z / delta = innerSize => 2^z = innerSize * delta / 256
  // Choose the limiting dimension
  const reqZx = Math.log2((innerW * Math.PI) / (256 * Math.max(deltaX, 1e-6)))
  const reqZy = Math.log2((innerH) / (256 * Math.max(deltaY, 1e-6)))
  let zoom = Math.floor(Math.min(reqZx, reqZy))
  zoom = Math.max(2, Math.min(18, zoom))
  return { centerLat, centerLng, zoom }
}

async function loadBasemapCenter(bounds, width, height, { key, style }) {
  const { centerLat, centerLng, zoom } = computeCenterZoom(bounds, width, height)
  const tryLoad = (mapStyle) => new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `https://api.maptiler.com/maps/${encodeURIComponent(mapStyle)}/static/${centerLng},${centerLat},${zoom}/${Math.round(width)}x${Math.round(height)}.png?key=${encodeURIComponent(key)}`
  })
  const first = await tryLoad(style || 'streets-v2')
  if (first) return first
  return await tryLoad('streets-v2')
}

export async function trackToPng(name, points, options = {}) {
  const pts = normalizePoints(points)
  const width = options.width || 1200
  const height = options.height || 800
  const padding = options.padding ?? 40
  const stroke = options.stroke || '#10b981'
  const startColor = options.startColor || '#2563eb'
  const endColor = options.endColor || '#ef4444'
  const bg = options.bg || '#ffffff'
  const basemapKey = options.basemapKey
  const basemapStyle = options.basemapStyle || 'streets-v2'
  const staticTileUrl = options.staticTileUrl // e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png
  const tileAttribution = options.tileAttribution || '© OpenStreetMap contributors'

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  if (pts.length === 0) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  const { toXY, bounds } = buildProjector(pts, width, height, padding)

  // Try draw basemap
  let drewBasemap = false
  if (basemapKey) {
    let basemap = await loadBasemap(bounds, width, height, { key: basemapKey, style: basemapStyle })
    if (!basemap) {
      basemap = await loadBasemapCenter(bounds, width, height, { key: basemapKey, style: basemapStyle })
    }
    if (basemap) {
      ctx.drawImage(basemap, 0, 0, width, height)
      drewBasemap = true
    }
  }

  // If no MapTiler basemap, try OSM tiles via template
  if (!drewBasemap && staticTileUrl) {
    try {
      await drawTilesFromTemplate(ctx, bounds, width, height, padding, staticTileUrl)
      drewBasemap = true
      // Attribution
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(width - 210, height - 28, 200, 20)
      ctx.fillStyle = '#111827'
      ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(tileAttribution, width - 10, height - 18)
    } catch (_) {
      // ignore, fallback to plain background
    }
  }

  // Title
  if (name) {
    ctx.font = '20px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    ctx.fillStyle = '#374151'
    ctx.textBaseline = 'top'
    ctx.fillText(String(name), padding, padding)
  }

  // Track path
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = stroke
  ctx.beginPath()
  pts.forEach((p, i) => {
    const [x, y] = toXY(p)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Start & end markers
  const [sx, sy] = toXY(pts[0])
  const [ex, ey] = toXY(pts[pts.length - 1])
  ctx.fillStyle = startColor
  ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = endColor
  ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill()

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

// ---------- Tile utilities (OSM template) ----------
const TILE_SIZE = 256

function lon2x(lon, z) {
  const n = 2 ** z
  return ((lon + 180) / 360) * n * TILE_SIZE
}

function lat2y(lat, z) {
  const rad = (lat * Math.PI) / 180
  const n = 2 ** z
  const mercY = Math.log(Math.tan(Math.PI / 4 + rad / 2))
  return (1 - mercY / Math.PI) / 2 * n * TILE_SIZE
}

async function loadTile(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function drawTilesFromTemplate(ctx, bounds, width, height, padding, template) {
  // Compute zoom to fit bounds into inner area
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const { minLat, maxLat, minLng, maxLng } = bounds

  // Estimate zoom to fit (use same approach as computeCenterZoom but with pixel conversion)
  function estimateZoom() {
    for (let z = 18; z >= 2; z--) {
      const px1 = lon2x(minLng, z)
      const px2 = lon2x(maxLng, z)
      const py1 = lat2y(maxLat, z)
      const py2 = lat2y(minLat, z)
      const dx = Math.abs(px2 - px1)
      const dy = Math.abs(py2 - py1)
      if (dx <= innerW && dy <= innerH) return z
    }
    return 2
  }

  const z = estimateZoom()
  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2
  const centerX = lon2x(centerLng, z)
  const centerY = lat2y(centerLat, z)
  const topLeftX = centerX - width / 2
  const topLeftY = centerY - height / 2

  const startTileX = Math.floor(topLeftX / TILE_SIZE)
  const startTileY = Math.floor(topLeftY / TILE_SIZE)
  const endTileX = Math.floor((topLeftX + width) / TILE_SIZE)
  const endTileY = Math.floor((topLeftY + height) / TILE_SIZE)

  const promises = []
  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
      const n = 2 ** z
      // wrap x, clamp y
      const tx = ((x % n) + n) % n
      const ty = Math.min(Math.max(y, 0), n - 1)
      const url = template
        .replace('{z}', z)
        .replace('{x}', tx)
        .replace('{y}', ty)
      promises.push(
        loadTile(url).then(img => {
          const dx = x * TILE_SIZE - topLeftX
          const dy = y * TILE_SIZE - topLeftY
          ctx.drawImage(img, dx, dy)
        })
      )
    }
  }
  await Promise.allSettled(promises)
}
