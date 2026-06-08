import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Generates a printable student ID card as a PDF blob.
 * Card size: credit card (85.6mm x 53.98mm) — 242 x 153 points
 */
export async function generateStudentCardPDF({ student, ownerProfile, qrDataUrl, validUntil }) {
  const cardW = 242
  const cardH = 153
  const pageW = 595 // A4 width in points
  const pageH = 842 // A4 height in points

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([pageW, pageH])

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

  // Center card on page
  const offsetX = (pageW - cardW) / 2
  const offsetY = pageH - cardH - 80

  // Card background with border
  page.drawRectangle({
    x: offsetX,
    y: offsetY,
    width: cardW,
    height: cardH,
    borderColor: rgb(0.09, 0.09, 0.09),
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  })

  // Header bar (dark)
  page.drawRectangle({
    x: offsetX,
    y: offsetY + cardH - 28,
    width: cardW,
    height: 28,
    color: rgb(0.09, 0.09, 0.09),
  })

  // Reading area name in header
  page.drawText(ownerProfile.reading_area_name || 'Reading Area', {
    x: offsetX + 10,
    y: offsetY + cardH - 19,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // "STUDENT ID CARD" label
  page.drawText('STUDENT ID CARD', {
    x: offsetX + cardW - 82,
    y: offsetY + cardH - 19,
    size: 6,
    font: fontRegular,
    color: rgb(0.7, 0.7, 0.7),
  })

  // Student name
  page.drawText(student.name, {
    x: offsetX + 10,
    y: offsetY + cardH - 48,
    size: 11,
    font: fontBold,
    color: rgb(0.09, 0.09, 0.09),
  })

  // Student ID
  page.drawText(student.student_id, {
    x: offsetX + 10,
    y: offsetY + cardH - 62,
    size: 9,
    font: fontMono,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Phone
  if (student.phone) {
    page.drawText(`Ph: ${student.phone}`, {
      x: offsetX + 10,
      y: offsetY + cardH - 78,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  // Validity
  if (validUntil) {
    page.drawText(`Valid until: ${validUntil}`, {
      x: offsetX + 10,
      y: offsetY + cardH - 92,
      size: 7,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    })
  }

  // Join date
  if (student.joined_at) {
    page.drawText(`Joined: ${new Date(student.joined_at).toLocaleDateString('en-IN')}`, {
      x: offsetX + 10,
      y: offsetY + cardH - 105,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Owner contact at bottom
  page.drawText(ownerProfile.phone || '', {
    x: offsetX + 10,
    y: offsetY + 8,
    size: 6,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  })

  page.drawText(ownerProfile.address || '', {
    x: offsetX + 10,
    y: offsetY + 18,
    size: 6,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  })

  // QR Code (right side)
  if (qrDataUrl) {
    try {
      const qrImageBytes = await fetch(qrDataUrl).then(r => r.arrayBuffer())
      const qrImage = await pdfDoc.embedPng(qrImageBytes)
      const qrSize = 70
      page.drawImage(qrImage, {
        x: offsetX + cardW - qrSize - 12,
        y: offsetY + cardH - qrSize - 40,
        width: qrSize,
        height: qrSize,
      })

      // QR label
      page.drawText('Scan for entry/exit', {
        x: offsetX + cardW - qrSize - 10,
        y: offsetY + cardH - qrSize - 52,
        size: 5.5,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      })
    } catch (e) {
      // QR embed failed - skip silently
    }
  }

  // Photo placeholder if no photo
  if (student.photo_url) {
    try {
      const photoBytes = await fetch(student.photo_url).then(r => r.arrayBuffer())
      // Try JPG first, then PNG
      let photoImage
      try {
        photoImage = await pdfDoc.embedJpg(photoBytes)
      } catch {
        photoImage = await pdfDoc.embedPng(photoBytes)
      }
      page.drawImage(photoImage, {
        x: offsetX + cardW - 85,
        y: offsetY + 6,
        width: 30,
        height: 36,
      })
    } catch (e) {
      // Photo embed failed - skip
    }
  }

  // Instructions below card
  const instrY = offsetY - 30
  page.drawText('Instructions:', {
    x: offsetX,
    y: instrY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })

  const instructions = [
    '1. Scan the QR code at the reading area entrance with your phone camera.',
    '2. Enter your Student ID and tap ENTRY when arriving.',
    '3. Scan again and tap EXIT when leaving.',
    '4. Keep this card safe. Show it when asked by the owner.',
  ]
  instructions.forEach((line, i) => {
    page.drawText(line, {
      x: offsetX,
      y: instrY - 14 - (i * 12),
      size: 7,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    })
  })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

/**
 * Triggers download of the PDF blob
 */
export function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
