const { test, expect } = require('@playwright/test')
const { RECIPE } = require('./helpers')

// What a search engine, a share card or an assistant reads: the head of a
// page and the machine-readable files in the export.
test.describe('seo', () => {
  test.describe.configure({ mode: 'parallel' })

  const meta = (page, selector) =>
    page.locator(`head meta[${selector}]`).getAttribute('content')

  test('a recipe page describes itself for search and sharing', async ({
    page,
    baseURL,
  }) => {
    await page.goto(RECIPE)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle(/Crema catalana/)
    expect(await meta(page, 'property="og:title"')).toMatch(/Crema catalana/)
    expect(await meta(page, 'property="og:type"')).toBe('article')
    expect(await meta(page, 'property="og:locale"')).toBe('en_US')
    expect(await meta(page, 'name="description"')).toMatch(/dessert/i)
    expect(await meta(page, 'name="twitter:card"')).toBe('summary_large_image')
    // The photograph is the share image, as an absolute URL.
    const image = await meta(page, 'property="og:image"')
    expect(image).toMatch(/^https?:\/\/.+\.(jpe?g|png|webp)$/i)
    expect(image).not.toContain('/og/site.png')
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${baseURL}${RECIPE}`,
    )
    // Structured data: the recipe as schema.org has it.
    const graphs = await page
      .locator('head script[type="application/ld+json"]')
      .allTextContents()
    const recipe = graphs
      .map((g) => JSON.parse(g))
      .find((g) => g['@type'] === 'Recipe')
    expect(recipe).toBeTruthy()
    expect(recipe.recipeIngredient.length).toBeGreaterThan(2)
    expect(recipe.cookTime).toMatch(/^PT\d+M$/)
    expect(graphs.some((g) => g.includes('"WebSite"'))).toBe(true)
  })

  test('a Spanish page is Spanish in its head too', async ({ page }) => {
    await page.goto('/es/recipes/pizza-sin-gluten')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    expect(await meta(page, 'property="og:locale"')).toBe('es_ES')
    expect(await meta(page, 'property="og:title"')).toMatch(/Pizza sin gluten/)
  })

  test('the home is canonical at its prefix, with the site card', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/en')
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${baseURL}/en`,
    )
    expect(await meta(page, 'property="og:image"')).toBe(
      `${baseURL}/og/site.png`,
    )
    expect(await meta(page, 'property="og:image:width"')).toBe('1200')
    const card = await page.request.get('/og/site.png')
    expect(card.status()).toBe(200)
    expect(card.headers()['content-type']).toContain('image/png')
  })

  test('the sign-in page stays out of search', async ({ page }) => {
    await page.goto('/login')
    expect(await meta(page, 'name="robots"')).toMatch(/noindex/)
  })

  test('robots.txt, sitemap.xml and the llms files are in the export', async ({
    request,
    baseURL,
  }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(robots.headers()['content-type']).toContain('text/plain')
    expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`)

    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    expect(sitemap.headers()['content-type']).toContain('xml')
    const xml = await sitemap.text()
    expect(xml).toContain(`<loc>${baseURL}${RECIPE}</loc>`)
    expect(xml).toContain(`<loc>${baseURL}/es/recipes/pizza-sin-gluten</loc>`)
    expect(xml).not.toContain('/node/preview')
    expect(xml).not.toContain('/login')

    const llms = await request.get('/llms.txt')
    expect(llms.status()).toBe(200)
    expect(llms.headers()['content-type']).toContain('text/plain')
    const index = await llms.text()
    expect(index).toMatch(/^# Umami\n/)
    expect(index).toContain('## Recipes')
    expect(index).toContain(`(${baseURL}${RECIPE}?utm_source=llms-txt`)
    expect(index).toContain('## Optional')

    const full = await request.get('/llms-full.txt')
    expect(full.status()).toBe(200)
    const text = await full.text()
    expect(text).toContain('## Crema catalana')
    expect(text).toContain('### Ingredients')
    expect(text).toContain('# En español')
  })
})
