export function exportCsv(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSvgAsPng(containerEl, filename) {
  const svg = containerEl?.querySelector('svg')
  if (!svg) return
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svg)
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = (svg.clientWidth || 400) * 2
    canvas.height = (svg.clientHeight || 240) * 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#131920'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    canvas.toBlob(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
    })
  }
  img.src = url
}
