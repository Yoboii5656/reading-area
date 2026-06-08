/**
 * Captures a QR code SVG element and renders it as a PNG data URL.
 * Used for embedding QR codes into generated PDFs.
 */
export function svgToDataUrl(svgElement, size = 200) {
  return new Promise((resolve, reject) => {
    if (!svgElement) {
      reject(new Error('No SVG element provided'))
      return
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)

      const dataUrl = canvas.toDataURL('image/png')
      URL.revokeObjectURL(url)
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to render SVG to image'))
    }
    img.src = url
  })
}
