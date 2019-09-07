<template>
    <div class="container container-fluid">
        <div class="row">
            <div class="col-12 col-md-6 mb-3">
                <!-- Status -->
                <div class="card">
                    <div class="card-body shadow pl-2 pr-2">
                        <ul class="list-group list-group-horizontal d-flex flex-wrap p-0">
                            <li class="list-group-item flex-fill mb-2" v-if="count_down !== 0">
                                倒计时
                                <div class="alert alert-secondary">
                                    {{count_down}}毫秒
                                </div>
                            </li>
                            <li class="list-group-item flex-fill mb-2">
                                当前状态
                                <div class="alert alert-secondary">
                                    {{stat_str}}
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 mb-3">
                <!-- Controller -->
                <div class="card">
                    <div class="card-body shadow">
                        <button class="btn btn-outline-primary mb-3 ml-3" @click="start"
                                v-show="stat === 0 || stat === 3">
                            开始&nbsp;<v-icon name="flag"/>
                        </button>
                        <button class="btn btn-outline-warning mb-3 ml-3" @click="pause"
                                v-show="stat === 1 || stat === 2">
                            暂停&nbsp;<v-icon name="pause"/>
                        </button>
                        <button class="btn btn-outline-success mb-3 ml-3" @click="recover" v-show="stat === 4">
                            恢复&nbsp;<v-icon name="play"/>
                        </button>
                        <button class="btn btn-outline-danger mb-3 ml-3" @click="reset">
                            重置&nbsp;<v-icon name="stop-circle"/>
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 mb-3">
                <!-- Time setting -->
                <div class="card">
                    <div class="card-body shadow pl-2 pr-2 pl-md-3 pr-md-3">
                        <div class="input-group mb-3">
                            <div class="input-group-prepend">
                                <span class="input-group-text">倒计时时间</span>
                            </div>
                            <input type="number" class="form-control" aria-label="countdown"
                                   aria-describedby="button-addon2" v-model="t1">
                            <div class="input-group-append">
                                <span class="input-group-text">ms</span>
                                <button class="btn btn-outline-secondary" type="button" @click="modt">
                                    <v-icon name="check"></v-icon>
                                </button>
                            </div>
                        </div>
                        <div class="input-group mb-3">
                            <div class="input-group-prepend">
                                <span class="input-group-text">抢答时间</span>
                            </div>
                            <input type="number" class="form-control" aria-label="countdown"
                                   aria-describedby="button-addon2" v-model="t2">
                            <div class="input-group-append">
                                <span class="input-group-text">ms</span>
                                <button class="btn btn-outline-secondary" type="button" @click="modt2">
                                    <v-icon name="check"></v-icon>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 mb-3">
                <div class="card">
                    <div class="card-body shadow pl-2 pr-2 pl-md-3 pr-md-3">
                        <h5 class="card-title">选手</h5>
                        <ul class="list-group">
                            <li class="list-group-item d-flex justify-content-between align-items-center pl-2 pr-2 pl-md-3 pr-md-3"
                                v-for="(name, idx) in users">
                                <div class="input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text" id="basic-addon1">{{idx + 1}}</span>
                                    </div>
                                    <input type="text" aria-label="name" class="form-control"
                                           v-model="users[idx]">
                                    <div class="input-group-append">
                                        <button class="btn btn-outline-secondary" type="button" @click="rename(idx)">
                                            <v-icon name="check"></v-icon>
                                        </button>
                                    </div>
                                    <div class="input-group-append" v-if="stat !== 0 && results[idx] !== 0">
                                        <span class="input-group-text"
                                              :class="[results[idx] > 0 ? 'text-success' : 'text-danger' ]"
                                              id="basic-addon2">{{results[idx]}}ms</span>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="card fixed-bottom">
            <div class="card-body shadow pt-0 pb-0">
                &copy;<a href="https://github.com/mrthanlon/spot">Spot</a>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: "console",
        props: {},
        data: function () {
            return {
                stat_str: "加载中",
                /**
                 * 状态标记，
                 * - 0.初始化完成，等同于3
                 * - 1.倒计时
                 * - 2.抢答
                 * - 3.结束，出结果
                 * - 4.暂停
                 */
                stat: 0,
                count_down: 0,
                is_start: false,
                is_pause: true,
                is_recov: true,
                is_reset: true,
                t1: "",
                t2: "",
                /**
                 * 倒计时结束时刻
                 */
                nt: 0,
                /**
                 * 与服务器的时间差，>0为服务器快于本机，<0为本机快于服务器
                 */
                t_sync: 0,
                /**
                 * 用于保存暂停时候的倒计时
                 */
                tmp_t: 0,
                be_t: 0,
                users: [],
                results: [],
                stat_text: ["初始化完成", "倒计时", "抢答", "结束", "暂停"],
                sig_t: 0
            }
        },
        created: function () {
            //消息
            let ws_msg = new WebSocket(`ws://${document.domain}:3000/msg`)
            ws_msg.onerror = function () {
                console.debug(`[WS_MSG] Connect failed`)
                //alert(`连接失败`)
            }
            ws_msg.onclose = (e) => {
                console.debug(`[WS_MSG] WebSocket closed`, e)
            }
            /**
             * FIXME: 修改为响应式处理，不用专门判断stat，参考display组件
             */
            ws_msg.onmessage = (e) => {
                console.debug(`[WS_MSG] Message:${e.data}`)
                const msg = JSON.parse(e.data)
                this.results = msg.res
                this.t_sync = msg.ct - new Date().getTime()
                this.nt = msg.nt

                this.stat = msg.stat

                if (this.stat !== 1 && this.stat !== 2) {
                    //停止
                    if (this.stat !== 4)
                    //不是暂停，倒计时清空
                        this.count_down = 0
                    cancelAnimationFrame(this.sig_t)
                } else {
                    //调用倒计时动画
                    this.act_countdown()
                }
                this.stat_str = this.stat_text[this.stat]
            }
            //配置文件变化
            let ws_cof = new WebSocket(`ws://${document.domain}:3000/config`)
            ws_cof.onerror = function () {
                console.debug(`[WS_COF] Connect failed`)
                //alert(`连接失败`)
            }
            ws_cof.onclose = (e) => {
                console.debug(`[WS_COF] WebSocket closed:`, e)
            }
            ws_cof.onmessage = (e) => {
                console.debug(`[WS_COF] Message:${e.data}`)
                const conf = JSON.parse(e.data)
                this.stat = conf.stat
                this.stat_str = this.stat_text[this.stat]
                this.t1 = conf.t1
                this.t2 = conf.t2
                this.users = conf.names
            }
            /**
             * TODO: RTT功能
             */
        },
        methods: {
            rename: function (idx) {
                //console.debug(this.users[idx])
                if (this.users[idx] === null) {
                    alert(`发送成功`)
                    return
                }
                console.debug(`http://${document.domain}:8090/ctr?act=name&id=${idx}&name=${this.users[idx]}`)
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            console.debug(xhr.status)
                            console.debug(xhr.responseText)
                            alert(`发送失败！`)
                            return
                        }
                        this.is_start = false
                        this.is_pause = true
                        this.is_reset = false
                        alert(`发送成功！`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=name&id=${idx}&name=${this.users[idx]}`, true)
                xhr.send()
            },
            modt: function () {
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            console.debug(xhr.status)
                            console.debug(xhr.responseText)
                            alert(`发送失败！`)
                            return
                        }
                        this.is_start = false
                        this.is_pause = true
                        this.is_reset = false
                        alert(`发送成功！`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=modt&val=${this.t1}`, true)
                xhr.send()
            },
            modt2: function () {
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            console.debug(xhr.status)
                            console.debug(xhr.responseText)
                            alert(`发送失败！`)
                            return
                        }
                        this.is_start = false
                        this.is_pause = true
                        this.is_reset = false
                        alert(`发送成功！`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=modt2&val=${this.t2}`, true)
                xhr.send()
            },
            start: function () {
                //开始
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            console.debug(xhr.status)
                            console.debug(xhr.responseText)
                            alert(`发送失败！`)
                            return
                        }
                        this.is_start = false
                        this.is_pause = true
                        this.is_reset = false
                        //alert(`发送成功！`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=start`, true)
                xhr.send()
            },
            pause: function () {
                //暂停
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            alert(`发送失败`)
                            return
                        }
                        this.is_pause = true
                        this.is_recov = false
                        //alert(`发送成功`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=pause`, true)
                xhr.send()
            },
            recover: function () {
                //恢复
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            alert(`发送失败`)
                            return
                        }
                        this.is_pause = false
                        this.is_recov = true
                        //alert(`发送成功`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=continue`, true)
                xhr.send()
            },
            reset: function () {
                //重置
                let xhr = new XMLHttpRequest()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status !== 200 || xhr.responseText !== "0") {
                            alert(`发送失败`)
                            return
                        }
                        this.is_start = false
                        this.is_pause = true
                        this.is_recov = true
                        this.is_reset = true
                        //alert(`发送成功`)
                    }
                }
                xhr.open('get', `http://${document.domain}:8090/ctr?act=reset`, true)
                xhr.send()
            },

            act_countdown: function () {
                //倒计时动画
                if ((this.stat !== 1 &&
                    this.stat !== 2) ||
                    this.count_down < 0) {
                    //停止
                    this.count_down = 0
                    return
                }
                //当前倒计时等于结束时刻-当前时刻（当前时刻与服务器时差的修正）
                this.count_down = this.nt - (new Date().getTime() + this.t_sync)
                this.sig_t = requestAnimationFrame(this.act_countdown)
            }
        }
    }
</script>

<style scoped>

</style>
