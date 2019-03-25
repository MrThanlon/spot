import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'
import viewer from './components/viewer'
import console from './components/console'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'viewer',
      component: viewer
    },
    {
      path: '/ctr',
      name: 'console',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: console
    }
  ]
})
