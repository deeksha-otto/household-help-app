import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `pay${Date.now()}@gmail.com`

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

  // Add worker
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Raju Kumar')
  await page.type('input[placeholder="0"]', '8000')
  await page.click('button[type=submit]')
  await wait(2500)

  // Open worker → Payments tab
  const card = await page.$('main button.bg-white')
  await card.click()
  await wait(1500)

  // Navigate to Payments tab
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('nav button')]
    const t = tabs.find(b => b.textContent.includes('Payments'))
    if (t) t.click()
  })
  await wait(800)
  console.log('payments url:', page.url())

  // Screenshot 1: empty state
  await page.screenshot({ path: '/tmp/pay-s1-empty.png' })
  console.log('s1: empty state')

  // Log first payment: ₹2000
  await page.click('input[type=number]')
  await page.type('input[type=number]', '2000')
  await page.evaluate(() => {
    const noteInput = [...document.querySelectorAll('input[type=text]')].find(i => i.placeholder.includes('Diwali'))
    if (noteInput) noteInput.value = 'Monthly advance'
    if (noteInput) noteInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=submit]')].find(b => b.textContent.includes('Log Payment'))
    if (btn) btn.click()
  })
  await wait(1500)

  // Log second payment: ₹1500
  await page.click('input[type=number]')
  await page.type('input[type=number]', '1500')
  await page.evaluate(() => {
    const noteInput = [...document.querySelectorAll('input[type=text]')].find(i => i.placeholder.includes('Diwali'))
    if (noteInput) noteInput.value = 'Festival bonus'
    if (noteInput) noteInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=submit]')].find(b => b.textContent.includes('Log Payment'))
    if (btn) btn.click()
  })
  await wait(1500)

  // Screenshot 2: with payments
  await page.screenshot({ path: '/tmp/pay-s2-filled.png' })
  console.log('s2: with payments')

  // Screenshot 3: scroll to see full list
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await wait(300)
  await page.screenshot({ path: '/tmp/pay-s3-scrolled.png' })
  console.log('s3: scrolled')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/pay-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
