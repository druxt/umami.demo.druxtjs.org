Feature: Homepage

  Scenario: The front page is served at the English prefix
    Given I visit "/en"
    Then the page is server rendered
    And the page has content

  Scenario: The site root sends the visitor to the front page
    Given I visit "/"
    Then I am on "/en"
    And the page has content
