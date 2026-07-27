import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('page err:', e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const EMAIL = `summ${Date.now()}@gmail.com`

async function goToSummary(workerId) {
  await page.goto(`http://localhost:5173/workers/${workerId}/summary`, { waitUntil: 'networkidle2' })
  await wait(1200)
}

async function markAttendance(workerId, date, status) {
  // Direct Supabase REST call via page context
  await page.evaluate(async ({ workerId, date, status }) => {
    const { supabase } = await import('/src/lib/supabase.js')
    await supabase.from('attendance').upsert({ worker_id: workerId, date, status }, { onConflict: 'worker_id,date' })
  }, { workerId, date, status })
}

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

  // Add worker with 1 allowed paid leave
  await page.goto('http://localhost:5173/workers/new', { waitUntil: 'networkidle2' })
  await page.type('input[placeholder="e.g. Sunita Devi"]', 'Meena Devi')
  await page.type('input[placeholder="0"]', '9000')
  // 1 allowed paid leave
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type=button]')]
    const plus = btns.find(b => b.textContent.trim() === '+')
    if (plus) plus.click()
  })
  await wait(200)
  await page.click('button[type=submit]')
  await wait(2500)

  // Get worker ID from URL after clicking card
  const card = await page.$('main button.bg-white')
  await card.click()
  await wait(1500)
  const url = page.url()
  const workerId = url.split('/workers/')[1].split('/')[0]
  console.log('worker id:', workerId)

  // Mark some attendance via the UI attendance tab
  // Today: mark Present
  await page.goto(`http://localhost:5173/workers/${workerId}/attendance`, { waitUntil: 'networkidle2' })
  await wait(800)

  // Mark today as Present
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Present') && !b.textContent.includes('Past'))
    if (btn) btn.click()
  })
  await wait(1000)

  // Expand past days and mark a few
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Show'))
    if (btn) btn.click()
  })
  await wait(500)

  // Mark first visible Mark button as Absent
  const markBtns = await page.$$('button')
  let markCount = 0
  for (const b of markBtns) {
    const txt = await b.evaluate(el => el.textContent.trim())
    if (txt === 'Mark' && markCount === 0) {
      await b.click(); await wait(300)
      // Click Absent in inline row
      const innerBtns = await page.$$('button')
      for (const ib of innerBtns) {
        const itxt = await ib.evaluate(el => el.textContent)
        if (itxt.includes('Absent') && itxt.includes('❌')) { await ib.click(); break }
      }
      await wait(1000)
      markCount++
      break
    }
  }

  // Mark second Mark button as Half Day
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Show'))
    if (btn) btn.click()
  })
  await wait(500)
  const markBtns2 = await page.$$('button')
  let markCount2 = 0
  for (const b of markBtns2) {
    const txt = await b.evaluate(el => el.textContent.trim())
    if (txt === 'Mark' && markCount2 === 0) {
      await b.click(); await wait(300)
      const innerBtns = await page.$$('button')
      for (const ib of innerBtns) {
        const itxt = await ib.evaluate(el => el.textContent)
        if (itxt.includes('Half Day') && itxt.includes('🌓')) { await ib.click(); break }
      }
      await wait(1000)
      markCount2++
      break
    }
  }

  // Mark third Mark button as Paid Leave (will use the 1 allowed)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Show'))
    if (btn) btn.click()
  })
  await wait(500)
  const markBtns3 = await page.$$('button')
  let markCount3 = 0
  for (const b of markBtns3) {
    const txt = await b.evaluate(el => el.textContent.trim())
    if (txt === 'Mark' && markCount3 === 0) {
      await b.click(); await wait(300)
      const innerBtns = await page.$$('button')
      for (const ib of innerBtns) {
        const itxt = await ib.evaluate(el => el.textContent)
        if (itxt.includes('Paid Leave') && itxt.includes('📋')) { await ib.click(); break }
      }
      await wait(1000)
      markCount3++
      break
    }
  }

  // Also log a payment
  await page.goto(`http://localhost:5173/workers/${workerId}/payments`, { waitUntil: 'networkidle2' })
  await wait(800)
  await page.click('input[type=number]')
  await page.type('input[type=number]', '2000')
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=submit]')].find(b => b.textContent.includes('Log'))
    if (btn) btn.click()
  })
  await wait(1500)

  // Now go to Summary
  await goToSummary(workerId)
  await page.screenshot({ path: '/tmp/summ-s1-main.png' })
  console.log('s1: summary main')

  // Scroll to see full page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await wait(300)
  await page.screenshot({ path: '/tmp/summ-s2-bottom.png' })
  console.log('s2: summary bottom')

} catch (e) {
  console.error('Error:', e.message)
  await page.screenshot({ path: '/tmp/summ-error.png' })
} finally {
  await browser.close()
  console.log('done')
}
