/* globals cy */
import { Given, Then } from 'cypress-cucumber-preprocessor/steps'

Given('I visit the homepage', () => cy.visit('/'))
Then('I see "#__nuxt" element', () => cy.get('#__nuxt').should('exist'))
