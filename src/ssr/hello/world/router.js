// router.js
import Vue from 'vue'
import Router from 'vue-router'
import Home from './Home'
import About from './About'

Vue.use(Router)

export function createRouter() {
  return new Router({
    mode: 'history',
    base: '/ssr/hello/world',
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
}
