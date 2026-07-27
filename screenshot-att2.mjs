import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `att2${Date.now()}@gmail.com`

try {
  // Sign up
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.click('button::-p-text(Create Account)')
  await wait(200)
  await page.type('input[type=email]', EMAIL)
  await page.type('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await wait(3500)

  // Add worker: Wed off (not today=Mon), 1 paid leave allowed
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Test Worker')
  await page.type('input[placeholder="0"]', '6000')
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button[type=button]')) {
      if (b.textContent.trim() === 'Wed') { b.click(); return }
    }
  })
  await page.evaluate(() => {
    const plus = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)

  // Open worker page
  const card = await page.$('main button.bg-white')
  await card.click()
  await wait(1500)
  console.log('url:', page.url())

  // Screenshot: 4 buttons visible
  await page.screenshot({ path: '/tmp/att-s1-buttons.png' })
  console.log('s1 buttons')

  // Click Present
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const btn = btns.find(b => b.textContent.trim() === '✅\nPresent' || b.querySelector('span + span')?.textContent === 'Present' || b.textContent.includes('Present'))
    if (btn) btn.click()
  })
  await wait(700)

  // Screenshot: success flash
  await page.screenshot({ path: '/tmp/att-s2-success.png' })
  console.log('s2 success flash')

  await wait(1800)
  // Screenshot: settled marked state
  await page.screenshot({ path: '/tmp/att-s3-marked.png' })
  console.log('s3 marked')

  // ── Now get the paid-leave warning ──────────────────────────────
  // Expand past days, mark one as paid_leave (uses the 1 allowed leave)
  const showPast = await page.$('button::-p-text(Show)')
  if (showPast) {
    await showPast.click()
    await wait(500)
    const markBtn = await page.$('button::-p-text(Mark)')
    if (markBtn) {
      await markBtn.click()
      await wait(300)
      // Click Paid Leave in the inline row
      const allPL = await page.$$('button')
      for (const b of allPL) {
        const txt = await b.evaluate(el => el.textContent)
        if (txt.includes('Paid Leave')) { await b.click(); break }
      }
      await wait(1500)
      console.log('past day marked as PL')
    }
  }

  // Now tap Change attendance → then Paid Leave → warning should appear
  const changeBtn = await page.$('button::-p-text(Change attendance)')
  if (changeBtn) { await changeBtn.click(); await wait(300) }

  // Find and click Paid Leave button for today
  const allBtns = await page.$$('button')
  for (const b of allBtns) {
    const txt = await b.evaluate(el => el.textContent)
    if (txt.includes('Paid Leave') && txt.includes('📋')) { await b.click(); break }
  }
  await wait(600)
  await page.screenshot({ path: '/tmp/att-s4-warning.png' })
  console.log('s4 warning')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/att-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
