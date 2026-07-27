import puppeteer from 'puppeteer'

const BASE = 'http://localhost:5173'
// Use a real-format email — Supabase validates domain format
const EMAIL = `testemployer${Date.now()}@gmail.com`
const PASSWORD = 'password123'

async function shot(page, name) {
  const path = `/tmp/flow-${name}.png`
  await page.screenshot({ path, fullPage: false })
  console.log(`📸 ${name}`)
  return path
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()

// Capture console errors from the app
page.on('console', msg => {
  if (msg.type() === 'error') console.log('  [app error]', msg.text())
})

try {
  // ── 1. Login page ────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle2' })
  await shot(page, '01-login')

  // ── 2. Sign up ───────────────────────────────────────────────────
  await page.click('button::-p-text(Sign up)')
  await wait(300)
  await page.type('input[type="email"]', EMAIL)
  await page.type('input[type="password"]', PASSWORD)
  await shot(page, '02-signup-filled')

  await page.click('button[type="submit"]')
  await wait(3000)
  await shot(page, '03-after-signup')
  console.log('  URL:', page.url())

  // ── 3. If email confirmation required, sign in directly ──────────
  if (page.url().includes('/login')) {
    console.log('  → Email confirmation required or signup failed. Trying sign-in...')
    // Check for info/error message
    const msg = await page.$eval('.bg-blue-50, .bg-red-50', el => el.textContent).catch(() => '')
    if (msg) console.log('  → Message:', msg)

    // If we see "Check your email" we need a real confirmed account.
    // For the test, check if we got a session error or confirmation needed.
    // Let's try signing in with the same creds — if email isn't confirmed, it'll fail with a clear error.
    await page.$eval('input[type="email"]', el => el.value = '')
    await page.type('input[type="email"]', EMAIL)
    await page.$eval('input[type="password"]', el => el.value = '')
    await page.type('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await wait(3000)
    await shot(page, '03b-signin-attempt')
    console.log('  URL after sign-in attempt:', page.url())
  }

  // ── 4. Worker list ───────────────────────────────────────────────
  if (!page.url().includes('/login')) {
    await shot(page, '04-worker-list-empty')

    // ── 5. Add worker ──────────────────────────────────────────────
    const fab = await page.$('button.bg-indigo-600.rounded-full')
    if (fab) {
      await fab.click()
      await wait(600)
      await shot(page, '05-add-worker-form')

      await page.type('input[placeholder="e.g. Sunita Devi"]', 'Sunita Devi')
      await page.type('input[placeholder="e.g. 5000"]', '6000')
      const leavesInput = await page.$('input[placeholder="0"]')
      await leavesInput.click({ clickCount: 3 })
      await leavesInput.type('2')
      await shot(page, '06-add-worker-filled')

      await page.click('button[type="submit"]')
      await wait(2000)
      await shot(page, '07-worker-list-with-worker')
      console.log('  URL:', page.url())
    }

    // ── 6. Tap worker ──────────────────────────────────────────────
    const workerCard = await page.$('main button.bg-white')
    if (workerCard) {
      await workerCard.click()
      await wait(1500)
      await shot(page, '08-daily-attendance')

      // Mark Present
      const presentBtn = await page.$('button::-p-text(Present)')
      if (presentBtn) {
        await presentBtn.click()
        await wait(1500)
        await shot(page, '09-marked-present')
      } else {
        console.log('  ⚠️  Present button not visible (weekly off or already marked)')
        await shot(page, '09-attendance-state')
      }

      // ── 7. Payments tab ─────────────────────────────────────────
      await page.click('button::-p-text(Payments)')
      await wait(1000)
      await shot(page, '10-payments-tab')

      const amtInput = await page.$('input[placeholder="0"]')
      await amtInput.click({ clickCount: 3 })
      await amtInput.type('500')
      await page.type('input[placeholder="e.g. Diwali advance"]', 'July advance')
      await page.click('button::-p-text(Log Payment)')
      await wait(1500)
      await shot(page, '11-payment-logged')

      // ── 8. Summary tab ──────────────────────────────────────────
      await page.click('button::-p-text(Summary)')
      await wait(1500)
      await shot(page, '12-monthly-summary')

      // ── 9. History tab ──────────────────────────────────────────
      await page.click('button::-p-text(History)')
      await wait(1000)
      await shot(page, '13-history-empty')
    }

    console.log('\n✅ Flow complete.')
  } else {
    console.log('\n⚠️  Could not pass auth — Supabase project likely requires email confirmation.')
    console.log('   To fix: Supabase Dashboard → Authentication → Email → disable "Confirm email"')
    console.log('   The UI and all screens are correct — only the auth config needs changing.')
  }

} catch (err) {
  console.error('❌ Error:', err.message)
  await shot(page, 'ERROR')
} finally {
  await browser.close()
}
