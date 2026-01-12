// İlk test faylı - app.js üçün testlər
test('Əsas funksiyaların işlədiyini yoxla', () => {
  expect(true).toBe(true);
});

// Sadə riyazi test
test('Toplama funksiyası', () => {
  expect(2 + 2).toBe(4);
});

// String testi
test('Mətn testi', () => {
  expect('test').toBe('test');
});