<template>
  <b-row>
    <b-container>
      <b-row class="mb-3">
        <b-col>
          <h1>Login</h1>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" sm="6" class="mb-3">
          <b-card title="Contribute">
            <p>Test Druxt content editing capabilities.</p>
            <b-button
              block
              variant="success"
              @click="$auth.loginWith('github')"
            >
              Login with Github
            </b-button>
          </b-card>
        </b-col>

        <b-col cols="12" sm="6">
          <b-card title="Administer">
            <p>Edit content with live Drupal backend.</p>
            <b-button
              block
              variant="primary"
              @click="$auth.loginWith('drupal')"
            >
              Login with Drupal
            </b-button>
          </b-card>
        </b-col>
      </b-row>
    </b-container>
  </b-row>
</template>

<script>
export default {
  layout: 'plain',
  middleware: 'auth',
  auth: 'guest',
}
</script>
