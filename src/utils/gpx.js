export function generateGpxFromTrack(name, points) { // genero un file GPX da un array di punti
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="HikeApp" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`
  const metadata = `<metadata><name>${esc(name)}</name><time>${new Date().toISOString()}</time></metadata>`
  const trkStart = `<trk><name>${esc(name)}</name><trkseg>`
  const trkpts = (points || [])
    .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
    .map(p => {
      const attrs = `lat="${p.lat}" lon="${p.lng}"`
      const ele = p.altitude !== undefined && p.altitude !== null ? `<ele>${p.altitude}</ele>` : ''
      const time = p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : ''
      return `<trkpt ${attrs}>${ele}${time}</trkpt>`
    })
    .join('')
  const trkEnd = `</trkseg></trk>`
  const footer = `</gpx>`
  return `${header}${metadata}${trkStart}${trkpts}${trkEnd}${footer}`
}
