const { test, expect } = require('@playwright/test')

// Drupal's admin paths are not content: the site's server hands them to
// Drupal on this origin, so a session the sign-in opened reaches them.
test.describe('admin', () => {
  test('an admin path is Drupal’s, answered on this origin', async ({
    request,
  }) => {
    const response = await request.get('/admin/content', { maxRedirects: 0 })
    // Signed out, Drupal itself sends the visitor to sign in, on this origin.
    expect(response.status()).toBe(302)
    expect(response.headers()['x-generator']).toMatch(/Drupal/)
    expect(response.headers().location).toMatch(/^\/en\/user\/login/)
  })

  test('a content path that starts like an admin one stays content', async ({
    request,
  }) => {
    const add = await request.get('/node/add/recipe', { maxRedirects: 0 })
    expect(add.headers()['x-generator']).toMatch(/Drupal/)
    const recipes = await request.get('/en/recipes')
    expect(recipes.status()).toBe(200)
    expect(recipes.headers()['x-generator']).toBeUndefined()
  })
})
