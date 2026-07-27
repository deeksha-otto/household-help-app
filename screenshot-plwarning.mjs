import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `plwarn${Date.now()}@gmail.com`

try {
  // Sign up
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const btn = btns.find(b => b.textContent.includes('Create Account'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.type('input[type=email]', EMAIL)
  await page.type('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await wait(3500)
  console.log('signed in, url:', page.url())

  // Add worker — 0 paid leaves (default, no + taps), Sunday off (default)
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Priya Sharma')
  await page.type('input[placeholder="0"]', '7000')
  // Leave allowed_paid_leaves at 0 (default) — no stepper taps
  await page.click('button[type=submit]')
  await wait(2500)
  console.log('worker added, url:', page.url())

  // Open worker attendance
  const card = await page.$('main button.bg-white')
  if (!card) throw new Error('no worker card found')
  await card.click()
  await wait(1500)
  console.log('attendance url:', page.url())

  // Screenshot the 4-button state
  await page.screenshot({ path: '/tmp/pl-s1-buttons.png' })
  console.log('s1: 4 buttons')

  // Click Paid Leave — with 0 allowed leaves, warning fires immediately
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const btn = btns.find(b => b.textContent.includes('Paid Leave'))
    if (btn) btn.click()
    else console.error('Paid Leave button not found')
  })
  await wait(600)

  // Screenshot warning overlay
  await page.screenshot({ path: '/tmp/pl-s2-warning.png' })
  console.log('s2: paid leave warning')

  // Click "Cancel" and verify we're back
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const btn = btns.find(b => b.textContent.trim() === 'Cancel')
    if (btn) btn.click()
  })
  await wait(400)
  await page.screenshot({ path: '/tmp/pl-s3-back.png' })
  console.log('s3: back to buttons after cancel')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/pl-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
