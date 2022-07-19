// router.js
import Vue from 'vue'
import Router from 'vue-router'
import Home from './Home'
import About from './About'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: '/site/hello/world/index/main',
  routes: [
    {
      path: '/',
      component: Home
    },
    {
      path: '/about',
      component: About
    }
  ]
})
