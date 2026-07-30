import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import sharp from "sharp"

const sourceUrl = new URL(process.env.DEVBOOK_PREVIEW_URL ?? "https://devbook.zip")
const outputPath = fileURLToPath(new URL("../../docs/assets/site-home.png", import.meta.url))

if (!["http:", "https:"].includes(sourceUrl.protocol)) {
  throw new Error("DEVBOOK_PREVIEW_URL must use http or https")
}

const viewport = { width: 1440, height: 900 }
const canvas = { width: 2880, height: 1800 }
const frame = { width: 2560, height: 1600, left: 160, top: 100, radius: 44 }

await mkdir(dirname(outputPath), { recursive: true })

const browser = await chromium.launch()

async function capture(theme) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: "reduce",
  })

  await context.addInitScript((value) => {
    localStorage.setItem("theme", value)
    document.documentElement.setAttribute("saved-theme", value)
  }, theme)

  const page = await context.newPage()

  try {
    await page.goto(sourceUrl.href, { waitUntil: "load", timeout: 60_000 })
    await page.locator(".dc-topic-grid").waitFor({ state: "visible", timeout: 60_000 })
    await page.evaluate(async (value) => {
      document.documentElement.setAttribute("saved-theme", value)
      await document.fonts?.ready
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }, theme)

    return await page.screenshot({
      animations: "disabled",
      fullPage: false,
      type: "png",
    })
  } finally {
    await context.close()
  }
}

try {
  const [lightCapture, darkCapture] = await Promise.all([capture("light"), capture("dark")])

  const [light, dark] = await Promise.all(
    [lightCapture, darkCapture].map((image) =>
      sharp(image).resize(frame.width, frame.height, { fit: "fill" }).png().toBuffer(),
    ),
  )

  const darkMask = Buffer.from(`
    <svg width="${frame.width}" height="${frame.height}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,0 0,${frame.height} ${frame.width},${frame.height}" fill="white"/>
    </svg>
  `)

  const darkHalf = await sharp(dark)
    .ensureAlpha()
    .composite([{ input: darkMask, blend: "dest-in" }])
    .png()
    .toBuffer()

  const roundedMask = Buffer.from(`
    <svg width="${frame.width}" height="${frame.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${frame.width}" height="${frame.height}" rx="${frame.radius}" fill="white"/>
    </svg>
  `)

  const screenshot = await sharp(light)
    .ensureAlpha()
    .composite([{ input: darkHalf }, { input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer()

  const background = Buffer.from(`
    <svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#020303"/>
          <stop offset="0.52" stop-color="#07100a"/>
          <stop offset="1" stop-color="#092515"/>
        </linearGradient>
        <radialGradient id="glow-a">
          <stop offset="0" stop-color="#84cc16" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#84cc16" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow-b">
          <stop offset="0" stop-color="#10b981" stop-opacity="0.26"/>
          <stop offset="1" stop-color="#10b981" stop-opacity="0"/>
        </radialGradient>
        <pattern id="grain" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#d9ff9f" opacity="0.08"/>
        </pattern>
        <filter id="soft">
          <feGaussianBlur stdDeviation="90"/>
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="34" stdDeviation="38"
            flood-color="#000000" flood-opacity="0.78"/>
        </filter>
      </defs>

      <rect width="100%" height="100%" fill="url(#base)"/>
      <ellipse cx="2580" cy="260" rx="1050" ry="820" fill="url(#glow-a)"/>
      <ellipse cx="360" cy="1660" rx="1150" ry="760" fill="url(#glow-b)"/>
      <path d="M-260 1560 C420 850 930 1900 1580 1320 S2520 510 3200 930"
        fill="none" stroke="#84cc16" stroke-width="260" opacity="0.11"
        filter="url(#soft)"/>
      <path d="M-220 1510 C430 900 940 1810 1580 1260 S2480 560 3160 940"
        fill="none" stroke="#b8f75d" stroke-width="3" opacity="0.48"/>
      <rect width="100%" height="100%" fill="url(#grain)"/>
      <rect x="${frame.left}" y="${frame.top}" width="${frame.width}" height="${frame.height}"
        rx="${frame.radius}" fill="#020403" filter="url(#shadow)"/>
    </svg>
  `)

  const border = Buffer.from(`
    <svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${frame.left + 1}" y="${frame.top + 1}"
        width="${frame.width - 2}" height="${frame.height - 2}"
        rx="${frame.radius - 1}" fill="none"
        stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
    </svg>
  `)

  await sharp(background)
    .composite([{ input: screenshot, left: frame.left, top: frame.top }, { input: border }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath)

  const result = await sharp(outputPath).metadata()
  if (result.width !== canvas.width || result.height !== canvas.height) {
    throw new Error(
      `Expected ${canvas.width}x${canvas.height}, got ${result.width}x${result.height}`,
    )
  }

  console.log(`Updated ${outputPath} from ${sourceUrl.href}`)
} finally {
  await browser.close()
}
