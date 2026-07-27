import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const BASE = 'https://household-help-app.vercel.app'
const EMAIL = `prod${Date.now()}@gmail.com`

try {
  // Login screen
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(500)
  await page.screenshot({ path: '/tmp/prod-s1-login.png' })
  console.log('s1: login')

  // Sign up
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Account'))
    if (btn) btn.click()
  })
  await wait(200)
  await page.type('input[type=email]', EMAIL)
  await page.type('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await wait(4000)
  console.log('signed up, url:', page.url())

  // Worker list (empty)
  await page.screenshot({ path: '/tmp/prod-s2-workerlist.png' })
  console.log('s2: worker list')

  // Add worker
  await page.goto(`${BASE}/workers/new`, { waitUntil: 'networkidle2' })
  await wait(500)
  await page.screenshot({ path: '/tmp/prod-s3-addworker.png' })
  console.log('s3: add worker form')

  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Sunita Devi')
  await page.type('input[placeholder="0"]', '8000')
  await page.evaluate(() => {
    const plus = [...document.querySelectorAll('button[type=button]')].find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(3000)

  // Open worker attendance
  const card = await page.$('main button.bg-white')
  await card.click()
  await wait(2000)
  const workerId = page.url().split('/workers/')[1].split('/')[0]
  console.log('worker id:', workerId)

  await page.screenshot({ path: '/tmp/prod-s4-attendance.png' })
  console.log('s4: attendance')

  // Mark present
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Present') && b.textContent.includes('✅'))
    if (btn) btn.click()
  })
  await wait(800)
  await page.screenshot({ path: '/tmp/prod-s5-marked.png' })
  console.log('s5: marked present')

  // Payments tab
  await page.goto(`${BASE}/workers/${workerId}/payments`, { waitUntil: 'networkidle2' })
  await wait(800)
  await page.screenshot({ path: '/tmp/prod-s6-payments.png' })
  console.log('s6: payments')

  // Summary tab
  await page.goto(`${BASE}/workers/${workerId}/summary`, { waitUntil: 'networkidle2' })
  await wait(1200)
  await page.screenshot({ path: '/tmp/prod-s7-summary.png' })
  console.log('s7: summary')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/prod-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
