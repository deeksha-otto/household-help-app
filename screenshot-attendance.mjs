import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})

const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))

const EMAIL = `att${Date.now()}@gmail.com`
const wait = ms => new Promise(r => setTimeout(r, ms))

try {
  // ── Sign up ──────────────────────────────────────────────────────
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.click('button::-p-text(Create Account)')
  await wait(200)
  await page.type('input[type=email]', EMAIL)
  await page.type('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await wait(3500)
  console.log('signed in:', page.url())

  // ── Add Raju – weekly off Mon, 1 paid leave ───────────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Raju Kumar')
  await page.type('input[placeholder="0"]', '8000')

  // Click Mon day pill
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button[type=button]')) {
      if (b.textContent.trim() === 'Mon') { b.click(); return }
    }
  })
  // Tap + once for 1 paid leave
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type=button]')]
    const plus = btns.find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)
  console.log('after add worker:', page.url())

  // ── Open Raju's attendance ────────────────────────────────────────
  const card = await page.$('main button.bg-white')
  if (!card) throw new Error('no worker card found')
  await card.click()
  await wait(1500)
  console.log('attendance url:', page.url())

  // Screenshot 1: 4 big buttons (today=Sunday, Raju off on Mon → buttons show)
  await page.screenshot({ path: '/tmp/redesign-04-buttons.png' })
  console.log('screenshot: buttons')

  // Mark Present → catch success flash
  const presentBtn = await page.$('button::-p-text(Present)')
  if (presentBtn) {
    await presentBtn.click()
    await wait(700)
    // Screenshot 2: success flash
    await page.screenshot({ path: '/tmp/redesign-04-success.png' })
    console.log('screenshot: success flash')
    await wait(1600)
    // Screenshot 3: settled "marked" state
    await page.screenshot({ path: '/tmp/redesign-04-marked.png' })
    console.log('screenshot: marked state')
  }

  // ── Add Sunita – Sunday off → weekly off today ────────────────────
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Sunita Devi')
  await page.type('input[placeholder="0"]', '6000')
  // Sunday off is default — no need to change
  // Set 1 paid leave
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type=button]')]
    const plus = btns.find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)

  // Open Sunita's card
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
  await wait(1000)
  const allCards = await page.$$('main button.bg-white')
  // Sunita is second card alphabetically (Raju, Sunita)
  const sunitaCard = allCards[1] || allCards[0]
  await sunitaCard.click()
  await wait(1500)
  console.log('sunita attendance url:', page.url())

  // Screenshot 4: weekly off state
  await page.screenshot({ path: '/tmp/redesign-04-weeklyoff.png' })
  console.log('screenshot: weekly off')

  // ── Paid leave warning: use Supabase REST to pre-mark a past day as paid_leave ──
  // Actually easier: just directly navigate to a worker with allowed_paid_leaves=0
  // Raju has 1 allowed leave. Let's mark yesterday as paid_leave via the past days section.
  // Navigate to Raju's page, expand past days, mark yesterday as paid_leave
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
  await wait(1000)
  const rajuCard = await page.$('main button.bg-white')
  await rajuCard.click()
  await wait(1500)

  // Expand past days
  const pastBtn = await page.$('button::-p-text(Show)')
  if (pastBtn) {
    await pastBtn.click()
    await wait(500)
    // Mark the first "Mark" button (yesterday) as paid_leave
    const markBtn = await page.$('button::-p-text(Mark)')
    if (markBtn) {
      await markBtn.click()
      await wait(300)
      // Click Paid Leave in the inline buttons
      const plBtns = await page.$$('button::-p-text(Paid Leave)')
      if (plBtns.length > 0) {
        await plBtns[plBtns.length - 1].click()
        await wait(1500)
        console.log('marked past day as paid_leave')
      }
    }
  }

  // Now tap Change attendance on today → then tap Paid Leave → warning should show
  const changeBtn = await page.$('button::-p-text(Change attendance)')
  if (changeBtn) {
    await changeBtn.click()
    await wait(300)
  }
  const todayPLBtn = await page.$('button::-p-text(Paid Leave)')
  if (todayPLBtn) {
    await todayPLBtn.click()
    await wait(500)
    // Screenshot 5: paid leave warning
    await page.screenshot({ path: '/tmp/redesign-04-warning.png' })
    console.log('screenshot: paid leave warning')
  }

} catch (err) {
  console.error('Error:', err.message)
  await page.screenshot({ path: '/tmp/redesign-04-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
