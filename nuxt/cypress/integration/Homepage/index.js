/* globals cy */
import { Given, Then } from 'cypress-cucumber-preprocessor/steps'

Given('I visit {string}', (path) => cy.visit(path))

Then('I am on {string}', (path) => cy.location('pathname').should('eq', path))

// Asserting that #__nuxt exists only proves Nuxt ran: the empty redirect stub
// contains it too, which is how a blank front page passed CI.
Then('the page is server rendered', () =>
  cy.window().its('__NUXT__.serverRendered').should('eq', true)
)

Then('the page has content', () =>
  cy.get('#__nuxt').invoke('text').should('have.length.greaterThan', 100)
)
