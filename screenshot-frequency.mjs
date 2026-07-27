import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `freq${Date.now()}@gmail.com`

try {
  // Sign up
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Account'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.type('input[type=email]', EMAIL)
  await page.type('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await wait(3500)

  // ── Screenshot 1: Add Worker form — Daily (default) ──────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await wait(300)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await wait(200)
  await page.screenshot({ path: '/tmp/freq-s1-daily.png' })
  console.log('s1: add worker — daily frequency (scrolled to schedule section)')

  // ── Screenshot 2: Specific Days selected ─────────────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await wait(300)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.includes('Specific Days'))
    if (btn) btn.click()
  })
  await wait(200)
  // Select Mon + Thu
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type=button]')]
    btns.find(b => b.textContent.trim() === 'Mon')?.click()
    btns.find(b => b.textContent.trim() === 'Thu')?.click()
  })
  await wait(200)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await wait(200)
  await page.screenshot({ path: '/tmp/freq-s2-specific.png' })
  console.log('s2: specific days — Mon + Thu selected')

  // ── Screenshot 3: Alternate Days selected ─────────────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await wait(300)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.includes('Alternate Days'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await wait(200)
  await page.screenshot({ path: '/tmp/freq-s3-alternate.png' })
  console.log('s3: alternate days — start date shown')

  // ── Add Gardener with Specific Days (Mon + Thu) ───────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await wait(300)
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Ramu Gardener')
  // Gardener role
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.includes('Gardener'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.type('input[placeholder="0"]', '4000')
  // Specific Days
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.includes('Specific Days'))
    if (btn) btn.click()
  })
  await wait(200)
  // Mon + Thu
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type=button]')]
    btns.find(b => b.textContent.trim() === 'Mon')?.click()
    btns.find(b => b.textContent.trim() === 'Thu')?.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)
  console.log('gardener added, url:', page.url())

  // Worker list — should show "Mon, Thu · ₹4,000/mo"
  await page.screenshot({ path: '/tmp/freq-s4-workerlist.png' })
  console.log('s4: worker list (schedule label)')

  // Open worker's attendance
  const card = await page.$('main button.bg-white')
  if (!card) throw new Error('no worker card')
  await card.click()
  await wait(1500)
  await page.screenshot({ path: '/tmp/freq-s5-attendance.png' })
  console.log('s5: attendance for Mon/Thu worker — today is', new Date().toLocaleDateString('en-IN', { weekday: 'long' }))

  // ── Add Daily worker (cook) ───────────────────────────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await wait(300)
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Sunita Cook')
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.includes('Cook'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.type('input[placeholder="0"]', '9000')
  // Daily is default — set Sunday off (default)
  await page.click('button[type=submit]')
  await wait(2500)

  // Open Sunita's attendance to see Summary with new per-day rate
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
  await wait(800)
  const allCards = await page.$$('main button.bg-white')
  // Click Sunita (should be second card, alphabetically Ramu < Sunita)
  const sunitaCard = allCards[1] || allCards[0]
  await sunitaCard.click()
  await wait(1500)
  // Go to Summary tab
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('nav button')].find(b => b.textContent.includes('Summary'))
    if (tab) tab.click()
  })
  await wait(1200)
  await page.screenshot({ path: '/tmp/freq-s6-summary.png' })
  console.log('s6: summary showing expectedWorkingDays in per-day rate')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/freq-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
