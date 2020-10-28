<template>
  <div>

    <b-row>
      <b-col>
        <b-jumbotron header="Your diet can fight climate change" lead="And you don’t have to convert to vegetarian or vegan to do it!" />
      </b-col>
    </b-row>

    <b-row class="mb-5">
      <b-col md="6">
        <h2>What can I do?</h2>
        <p>Not many people are aware that about 1/4 of climate change today is fueled by agriculture and factory farming.</p>

        <p>The good news is that research shows that even small changes to our diets can make big differences. Here are some options for you to try.</p>

        <h2>Go 'flexitarian'</h2>

        <p>The “flexitarian” diet is a semi-vegetarian diet where vegetables, fruits, grains and pulses (like beans, peas and lentils) are the main portion of your meal. “Three-fourths of your plate would be filled with plants, and maybe one-fourth would have your animal food,”</p>
      </b-col>

      <b-col md="6">
        <div class="youtube-responsive-container">
          <iframe width="560" height="315" src="https://www.youtube.com/embed/nUnJQWO4YJY?controls=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </b-col>
    </b-row>

    <b-row>
      <b-col>
       <h2>Adopt a Mediterranean Diet</h2>

        <p>The Mediterranean Diet is one of the healthiest ways to reduce meat consumption. The diet replaces meat with fish, which has a smaller environmental impact and is good for your heart.</p>

        <p>It’s very plant based, filled with whole grains and vegetables, fruits, nuts, seeds, pulses, with just small amounts of fish as the main animal protein, and not even that much dairy, mostly in the form of yogurt or cheese rather than fresh milk.</p>
      </b-col>
    </b-row>

    <b-row>
      <b-col class="mb-5" md="6">
        <Druxt
          module="entity"
          mode="card"
          type="node--recipe"
          uuid="b1f2aae6-4c93-407e-a057-6087ba6b35ae"
        />
      </b-col>
      <b-col class="mb-5" md="6">
        <Druxt
          module="entity"
          mode="card"
          type="node--recipe"
          uuid="d0e64dc4-eaad-42f3-a0c8-7b1d21837684"
        />
      </b-col>
    </b-row>

    <b-row class="mb-4 row-eq-height">
      <b-col md="6">
        <h2>Eat vegetarian one day a week</h2>

        <p>Another great way to reduce meat consumption is to dedicate one day a week to eating vegetarian meals,  ‘Meatless Mondays’ are a great way to get started.</p>

        <p>Tell yourself, “for one whole week I’m going to have a plant-based diet and see how I like it, where you don’t have to commit to it forever, but you’re just trying it on to see how it fits, and maybe you realize it’s not that hard, makes you feel good, it was interesting and fun,”</p>

        <p>There are even now plenty of great dessert options that are vegetarian or vegan, so you don't have to miss out at all, give it a try and you'll be surprised how easy it is.</p>
      </b-col>

      <b-col md="3">
        <Druxt
          module="entity"
          mode="card"
          type="node--recipe"
          uuid="411d3bf6-a29c-4b10-a17a-c359f1f291b5"
        />
      </b-col>

      <b-col md="3">
        <Druxt
          module="entity"
          mode="card"
          type="node--recipe"
          uuid="55c4195b-39eb-4fd3-bdc6-971058394763"
        />
      </b-col>
    </b-row>

    <b-row>
      <b-col md="6">
        <h2>Sign up to get notified of suitable recipes</h2>
        <p>contact form here</p>
      </b-col>
      <b-col md="6">
        <h2>Search for recipes now</h2>
        <p>Search form here</p>
      </b-col>
    </b-row>

  </div>
</template>

<style scoped>
.youtube-responsive-container {
  height: 0;
  overflow: hidden;
  position: relative;
  padding-bottom: 56.25%;
  padding-top: 30px;
}

.youtube-responsive-container iframe,
.youtube-responsive-container object,
.youtube-responsive-container embed {
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}
</style>
