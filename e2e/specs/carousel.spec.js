const { test, expect } = require('@playwright/test')
const { visit, watchErrors } = require('./helpers')

// The front page's banners as a carousel: Drupal's front_carousel view lists
// them, Umami Go first, and each names itself in its kicker.
test.describe('carousel', () => {
  const current = (page) => page.locator('.carousel__slide--on .banner__title')

  test('the slides come from Drupal, Umami Go first', async ({ page }) => {
    const errors = watchErrors(page)
    await visit(page, '/en')
    const slides = page.locator('.carousel__slide')
    await expect(slides).toHaveCount(3)
    await expect(current(page)).toHaveText('Umami Go')
    const kickers = slides.locator('.banner__kicker')
    await expect(kickers.nth(0)).toHaveText('New on Umami')
    await expect(kickers.nth(1)).toHaveText('Recipe of the week')
    await expect(slides.nth(0).locator('a.btn')).toHaveAttribute(
      'href',
      '/play',
    )
    expect(errors).toEqual([])
  })

  test('the bars and arrows move it, and it loops', async ({
    page,
    isMobile,
  }) => {
    await visit(page, '/en')
    const carousel = page.locator('.carousel')
    const where = async () => ({
      bars: await carousel.locator('.carousel__bars').boundingBox(),
      button: await page.locator('.carousel__slide--on a.btn').boundingBox(),
    })
    const first = await where()
    await carousel.locator('.carousel__bar').nth(2).click()
    await expect(current(page)).toHaveText('Vegan chocolate and nut brownies')
    // The bars and the button stay where they were.
    await page.waitForTimeout(800)
    const third = await where()
    expect(third.bars).toEqual(first.bars)
    expect(third.button.y).toBeCloseTo(first.button.y, 0)
    expect(third.button.x).toBeCloseTo(first.button.x, 0)
    // The hidden slides stay out of the tab order.
    await expect(page.locator('.carousel__slide[inert]')).toHaveCount(2)
    if (isMobile) {
      await expect(carousel.locator('.carousel__nav')).toBeHidden()
      return
    }
    await carousel.getByRole('button', { name: 'Next slide' }).click()
    await expect(current(page)).toHaveText('Umami Go')
    await carousel.getByRole('button', { name: 'Previous slide' }).click()
    await expect(current(page)).toHaveText('Vegan chocolate and nut brownies')
  })
})
