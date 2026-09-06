const { test, expect } = require('../helpers/local-site');

// « Recevoir le lien » : capture d’e-mail pour les visiteurs qui n’installent pas
// tout de suite. Transport Web3Forms stubbé par le fixture, jamais d’envoi réel.
const placements = [
  { route: '/', id: 'home-waitlist' },
  { route: '/bienvenue', id: 'welcome-waitlist' }
];

for (const config of placements) {
  test.describe(`waitlist on ${config.route}`, () => {
    test('sends the address through Web3Forms and confirms on the page', async ({ page, network }) => {
      await page.goto(config.route);
      const form = page.locator(`#${config.id}`);
      await expect(form).toBeVisible();
      await expect(form.locator('a[href="mailto:feedback@azerty.global"]')).toBeVisible();
      await expect(page.locator('script[src*="web3forms.js"]')).toHaveCount(1);

      await form.locator('input[type="email"]').fill('visiteur@example.com');
      await form.locator('button[type="submit"]').click();

      const status = form.locator('.waitlist-status');
      await expect(status).toBeVisible();
      await expect(status).toContainText('lien d’installation');
      await expect(form.locator('input[type="email"]')).toBeHidden();
      await expect(form).toHaveAttribute('data-state', 'sent');

      const posts = network.web3FormsRequests.filter(request => request.method === 'POST');
      expect(posts).toHaveLength(1);
      expect(network.pageErrors).toEqual([]);
      expect(network.cspViolations).toEqual([]);
    });

    test('rejects an invalid address without sending anything', async ({ page, network }) => {
      await page.goto(config.route);
      const form = page.locator(`#${config.id}`);
      await form.locator('input[type="email"]').fill('pas-un-email');
      await form.locator('button[type="submit"]').click();
      await expect(form.locator('.waitlist-status')).toContainText('adresse e-mail valide');
      expect(network.web3FormsRequests.filter(request => request.method === 'POST')).toHaveLength(0);
      await expect(form.locator('input[type="email"]')).toBeFocused();
    });

    test('offers the mailto fallback when the network fails', async ({ page, network }) => {
      await page.goto(config.route);
      const form = page.locator(`#${config.id}`);
      network.failWeb3FormsNetwork();
      await form.locator('input[type="email"]').fill('visiteur@example.com');
      await form.locator('button[type="submit"]').click();
      await expect(form.locator('[data-form-send-error][role="alert"] a')).toHaveAttribute('href', 'mailto:feedback@azerty.global');
      await expect(form.locator('button[type="submit"]')).toBeEnabled();
      await expect(form).not.toHaveAttribute('data-state', 'sent');
    });
  });
}
