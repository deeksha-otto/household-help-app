import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `hist${Date.now()}@gmail.com`

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

  // Add worker with 1 paid leave
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Kavita Bai')
  await page.type('input[placeholder="0"]', '10000')
  await page.evaluate(() => {
    const plus = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)

  const card = await page.$('main button.bg-white')
  await card.click()
  await wait(1500)
  const workerId = page.url().split('/workers/')[1].split('/')[0]
  console.log('worker id:', workerId)

  // Mark attendance: present today
  await page.goto(`http://localhost:5173/workers/${workerId}/attendance`, { waitUntil: 'networkidle2' })
  await wait(800)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Present') && b.textContent.includes('✅'))
    if (btn) btn.click()
  })
  await wait(1000)

  // Log a payment
  await page.goto(`http://localhost:5173/workers/${workerId}/payments`, { waitUntil: 'networkidle2' })
  await wait(800)
  await page.click('input[type=number]')
  await page.type('input[type=number]', '3000')
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input[type=text]')].find(i => i.placeholder.includes('Diwali'))
    if (input) { input.value = 'Advance'; input.dispatchEvent(new Event('input', { bubbles: true })) }
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=submit]')].find(b => b.textContent.includes('Log'))
    if (btn) btn.click()
  })
  await wait(1500)

  // Go to Summary — screenshot empty History first
  await page.goto(`http://localhost:5173/workers/${workerId}/history`, { waitUntil: 'networkidle2' })
  await wait(800)
  await page.screenshot({ path: '/tmp/hist-s1-empty.png' })
  console.log('s1: empty history')

  // Go to Summary and settle
  await page.goto(`http://localhost:5173/workers/${workerId}/summary`, { waitUntil: 'networkidle2' })
  await wait(1200)
  await page.screenshot({ path: '/tmp/hist-s2-summary.png' })
  console.log('s2: summary before settle')

  // Set up dialog handler BEFORE clicking
  page.once('dialog', async dialog => { await dialog.accept() })
  // Click Mark as Settled
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Mark as Settled'))
    if (btn) btn.click()
  })
  await wait(2500)
  await page.screenshot({ path: '/tmp/hist-s3-settled.png' })
  console.log('s3: after settle (banner)')

  // Go to History
  await page.goto(`http://localhost:5173/workers/${workerId}/history`, { waitUntil: 'networkidle2' })
  await wait(1000)
  await page.screenshot({ path: '/tmp/hist-s4-list.png' })
  console.log('s4: history list collapsed')

  // Expand the first item
  const firstRow = await page.$('button.w-full.px-5')
  if (firstRow) { await firstRow.click(); await wait(400) }
  await page.screenshot({ path: '/tmp/hist-s5-expanded.png' })
  console.log('s5: history expanded')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/hist-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
