<!--
Title this merge request the way you would title a commit:

    <type>(<scope>): <description>

A squash merge makes the title the commit subject. A prose title passes review
and then breaks the next push to the target branch.
-->

## What changed

## Why

## How it was checked

- [ ] `npm run lint` and `yarn lint` in `nuxt/` pass
- [ ] `.devtools/test` passes in `drupal/`, if the backend changed
- [ ] `test:stack` passes, if the start script or the Lagoon setup changed
- [ ] Nothing that resolves only on a private network reached a tracked file
