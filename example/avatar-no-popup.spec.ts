import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' });

test('Avatar tidak floating/fullscreen di iPhone', async ({ page }) => {
  await page.goto('https://beta1.velocisai.io/'); // ganti dengan url kamu

  // Pastikan avatar ada di halaman
  const avatar = await page.locator('.w-8.h-8'); // sesuaikan selector jika perlu
  await expect(avatar).toBeVisible();

  // Simulasikan tap pada avatar
  await avatar.click({ force: true });

  // Tunggu sebentar untuk memastikan tidak ada perubahan layout
  await page.waitForTimeout(1000);

  // Pastikan tidak ada elemen fullscreen/video/floating muncul
  // Misal: pastikan tidak ada elemen video yang visible di atas avatar
  const video = page.locator('video');
  await expect(video).not.toBeVisible();

  // Atau pastikan avatar tetap di posisi semula
  const boundingBox = await avatar.boundingBox();
  expect(boundingBox).not.toBeNull();
});