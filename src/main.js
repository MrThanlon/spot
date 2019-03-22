import Vue from 'vue'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap'
import router from './router'

//包含全部包
import 'vue-awesome/icons'
import Icon from 'vue-awesome/components/Icon'
// 全局注册（在 `main .js` 文件中）
Vue.component('v-icon', Icon)


Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
