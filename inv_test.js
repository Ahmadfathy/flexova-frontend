const { chromium } = require('playwright');

async function run() {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const pg = await b.newPage();
  await pg.setViewportSize({ width: 1440, height: 900 });

  // 1. Default
  await pg.goto('http://localhost:5174/inventory/items');
  await pg.waitForSelector('h1', { timeout: 10000 });
  const h1 = await pg.$eval('h1', e => e.textContent);
  const rows = (await pg.$$('tbody tr')).length;
  const hdrs = await pg.$$eval('th', els => els.map(e => e.textContent.trim()).filter(Boolean));
  await pg.screenshot({ path: 'inv-01-default.png' });
  console.log('=== DEFAULT ===');
  console.log('H1:', h1.trim(), '| Rows:', rows);
  console.log('Headers:', JSON.stringify(hdrs));

  // 2. Loading skeleton
  await pg.goto('http://localhost:5174/inventory/items?mock=loading');
  await pg.waitForTimeout(800);
  const hasSkel = (await pg.$('.animate-pulse')) !== null;
  await pg.screenshot({ path: 'inv-02-loading.png' });
  console.log('\n=== LOADING ===  Skeleton visible:', hasSkel);

  // 3. Empty
  await pg.goto('http://localhost:5174/inventory/items?mock=empty');
  await pg.waitForTimeout(1800);
  const emptyTxt = await pg.$eval('body', e => e.innerText);
  await pg.screenshot({ path: 'inv-03-empty.png' });
  console.log('\n=== EMPTY ===  keyword found:', emptyTxt.includes('مفيش') || emptyTxt.includes('No items'));

  // 4. Error
  await pg.goto('http://localhost:5174/inventory/items?mock=error');
  await pg.waitForTimeout(1800);
  const errTxt = await pg.$eval('body', e => e.innerText);
  await pg.screenshot({ path: 'inv-04-error.png' });
  console.log('\n=== ERROR ===  error text found:', errTxt.includes('تعذّر') || errTxt.includes('Failed'));

  // 5. Offline
  await pg.goto('http://localhost:5174/inventory/items?mock=offline');
  await pg.waitForTimeout(1800);
  const offTxt = await pg.$eval('body', e => e.innerText);
  await pg.screenshot({ path: 'inv-05-offline.png' });
  console.log('\n=== OFFLINE ===  banner found:', offTxt.includes('غير متصل') || offTxt.includes('Offline'));
  console.log('Table still shows rows (cached data):', (await pg.$$('tbody tr')).length);

  // 6. Search
  await pg.goto('http://localhost:5174/inventory/items');
  await pg.waitForSelector('input[placeholder]', { timeout: 8000 });
  await pg.fill('input[placeholder]', 'أرز');
  await pg.waitForTimeout(600);
  const searchRows = (await pg.$$('tbody tr')).length;
  await pg.screenshot({ path: 'inv-06-search.png' });
  console.log('\n=== SEARCH "أرز" ===  rows:', searchRows, '(expect 1)');

  // 7. Bulk bar
  await pg.goto('http://localhost:5174/inventory/items');
  await pg.waitForSelector('tbody tr', { timeout: 8000 });
  const firstCb = await pg.$('tbody tr:first-child [role=checkbox]');
  if (firstCb) await firstCb.click();
  await pg.waitForTimeout(500);
  const bulkVisible = (await pg.$('.fixed.bottom-6')) !== null;
  await pg.screenshot({ path: 'inv-07-bulkbar.png' });
  console.log('\n=== BULK BAR visible ===', bulkVisible);

  // 8. Row actions menu
  await pg.goto('http://localhost:5174/inventory/items');
  await pg.waitForSelector('tbody tr', { timeout: 8000 });
  const rowBtns = await pg.$$('tbody tr:first-child button');
  if (rowBtns.length) await rowBtns[rowBtns.length - 1].click();
  await pg.waitForTimeout(400);
  const menuItems = (await pg.$$('[role=menuitem]')).length;
  await pg.screenshot({ path: 'inv-08-menu.png' });
  console.log('\n=== ROW MENU ===  items:', menuItems);

  // 9. Mobile card list
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.goto('http://localhost:5174/inventory/items');
  await pg.waitForTimeout(1800);
  const wrapperDisp = await pg.$eval('.hidden.sm\:block', el => window.getComputedStyle(el).display).catch(() => 'not-found');
  await pg.screenshot({ path: 'inv-09-mobile.png' });
  console.log('\n=== MOBILE ===  table wrapper display:', wrapperDisp, '(expect none)');

  await b.close();
  console.log('\n✅ All checks done');
}
run().catch(e => { console.error(e.message); process.exit(1); });
