import { test, expect } from '@playwright/test';

test('territorial app starts and exposes its main navigation and filters', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Dati territoriali', { timeout: 45000 });
  await expect(page.locator('#nav .nav')).toHaveCount(13);
  await expect(page.locator('#circ option')).toHaveCount(9);
  await expect(page.locator('#quart option')).toHaveCount(26);
  await expect(page.locator('#asc3 option').first()).toHaveText('Tutte');
  await expect(page.locator('#content')).not.toBeEmpty();

  await page.locator('#nav [data-page="demography"]').click();
  await expect(page.locator('#content')).toContainText('Analisi demografica');

  await page.locator('#nav [data-page="gis"]').click();
  await expect(page.locator('#content')).toContainText('Cartografia GIS');
  const polygonPaths = page.locator('#map .leaflet-overlay-pane path');
  await expect.poll(async () => polygonPaths.count(), {
    timeout: 60000,
    message: 'The eight circoscrizione polygons must be rendered'
  }).toBeGreaterThanOrEqual(8);
  await expect(page.locator('#gisSelectAsc1 option')).toHaveCount(9);
  await expect(page.locator('#map')).toBeVisible();

  expect(pageErrors, 'Unexpected JavaScript runtime errors').toEqual([]);
});
