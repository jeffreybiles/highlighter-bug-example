<template>
  <div id="nav">
    <router-link to="/">Home</router-link> |
    <router-link to="/about">About</router-link>
  </div>
  <router-view/>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

div, span, p, button, tr, h1, h2, h3, h4, h5, h6 {
  font-family: Roboto;
  font-size: 16px;
}

h1 span {
  @apply text-4xl;
}
h2 span {
  @apply text-2xl;
}
h3 span {
  @apply text-xl;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.my-highlights {
  // these values are dependent on the line-height
  padding-bottom: 5px;
  padding-top: 5px;
}
</style>
