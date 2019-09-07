<template>
    <div class="container container-fluid">
        <div class="card shadow">
            <div class="card-header">
                <h3 class="card-title mb-0">
                    {{stat_text}}
                </h3>
            </div>
            <div class="card-body">
                <div class="progress mb-5" style="height: 30px;font-size: 30px;" v-if="stat!==0 && stat!== 3">
                    <div class="progress-bar" role="progressbar"
                         style="transition-duration: 0s"
                         :class="[stat===1?'bg-danger':stat===2?'bg-success':stat===4?'bg-warning':'bg-secondary']"
                         :style="{width:progress_width}">
                        {{count_down}}
                    </div>
                </div>
                <!-- 分数榜 -->
                <!--<span v-if="scores.length > 0" style="font-size: 40px">抢答</span>-->
                <ul class="list-group">
                    <li class="list-group-item" style="font-size: 40px"
                        v-for="(item,idx) in scores"
                        :class="{active: idx===0}">
                        {{item.id}}号选手{{item.name}}:<span class="text-success">{{item.score}}ms</span>&nbsp;
                        <v-icon name="crown" style="height: 40px;width: 40px" v-if="idx===0"/>
                    </li>
                </ul>
                <!--<span v-if="baneds.length > 0" style="font-size: 40px">违规</span>-->
                <ul class="list-group">
                    <li class="list-group-item" style="font-size: 40px"
                        v-for="(item,idx) in baneds">
                        {{item.id}}号选手{{item.name}}:<span class="text-danger">{{item.score}}ms</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
    /**
     * 展示面板主要作用是展示，在倒计时开始前什么都不显示，只工作于
     * - 1.倒计时阶段，倒计时动画
     * - 2.抢答阶段，倒计时动画，抢答动画
     * - 3.结束阶段，展示抢答结果
     * - 4.暂停阶段，展示抢答结果
     * 因此在0阶段都时候显示空白就可以了
     * TODO:展示面板
     */
    export default {
        name: "viewer",
        data: function () {
            return {
                /**
                 * 状态
                 */
                stat: 0,
                /**
                 * 倒计时结束时刻
                 */
                nt: 0,
                /**
                 * 进行的时间
                 */
                nr: 0,
                count_down: 0,
                /**
                 * 与服务器的时间差，>0为服务器快于本机，<0为本机快于服务器
                 */
                t_sync: 0,
                t1: 0,
                t2: 0,
                /**
                 * 倒计时动画返回值
                 */
                sig_t: 0,
                /**
                 * 抢答结果
                 */
                progress_width: 0,
                results: [],
                names: []
            }
        },
        computed: {
            /**
             * 标题文字
             */
            stat_text: function () {
                return this.stat === 0 ? '' :
                    this.stat === 1 ? '倒计时' :
                        this.stat === 2 ? '抢答' :
                            this.stat === 3 ? '结束' :
                                '暂停'
            },
            /**
             * 得分选手，对象数组
             */
            scores: function () {
                return this.results.reduce((acc, cur, idx) => {
                    if (cur > 0) {
                        acc.push({
                            score: cur,
                            name: this.names[idx],
                            id: idx + 1
                        })
                    }
                    return acc
                }, [])
                    .sort((a, b) => a.score - b.score)
            },
            /**
             * 犯规选手，对象数组
             */
            baneds: function () {
                return this.results.reduce((acc, cur, idx) => {
                    if (cur < 0) {
                        acc.push({
                            score: cur,
                            name: this.names[idx],
                            id: idx + 1
                        })
                    }
                    return acc
                }, [])
                    .sort((a, b) => a.score - b.score)
            },
        },
        created: function () {
            console.log("Display created!")
            //抢答消息
            let ws_msg = new WebSocket(`ws://${document.domain}:3000/msg`)
            ws_msg.onerror = function () {
                console.debug(`[WS_MSG] Connect failed`)
                //alert(`连接失败`)
            }
            ws_msg.onclose = (e) => {
                console.debug(`[WS_MSG] WebSocket closed`, e)
            }
            ws_msg.onmessage = (e) => {
                console.debug(`[WS_MSG] Message:${e.data}`)
                const msg = JSON.parse(e.data)
                this.stat = msg.stat
                if (this.stat === 0) {
                    //清空成绩
                    //this.scores = {} //不需要了
                }
                this.t_sync = msg.ct - new Date().getTime()
                this.nt = msg.nt
                this.nr = msg.nr
                this.results = msg.res
                /*
                if (msg.user !== null) {
                    //有用户抢答
                    if (msg.res[msg.user] > 0)
                        this.scores[msg.res[msg.user]] = msg.user
                    else
                        this.baneds[msg.res[msg.user]] = msg.user
                }
                 */
                //倒计时动画已自动处理
            }
            let ws_cof = new WebSocket(`ws://${document.domain}:3000/config`)
            ws_cof.onerror = function () {
                console.debug(`[WS_COF] Connect failed`)
                //alert(`连接失败`)
            }
            ws_cof.onclose = (e) => {
                console.debug(`[WS_COF] WebSocket closed:`, e)
            }
            //配置文件变动，主要用于获取选手名称
            ws_cof.onmessage = (e) => {
                console.debug(`[WS_COF] Message:${e.data}`)
                const conf = JSON.parse(e.data)
                this.stat = conf.stat
                this.names = conf.names
                this.t1 = conf.t1
                this.t2 = conf.t2
            }
            this.act_countdown()
        },
        methods: {
            act_countdown: function () {
                //倒计时动画
                if (this.stat === 1 || this.stat === 2) {
                    //变化倒计时
                    const ctd = this.nt - (new Date().getTime() + this.t_sync)
                    //小于0的时候不变就好了
                    this.count_down = ctd >= 0 ? ctd : 0
                    //变化进度条
                    this.progress_width = (this.stat === 1 ?
                            (this.count_down / this.t1 * 100) :
                            (this.count_down / this.t2 * 100)
                    ) + '%'

                } else if (this.stat === 3 || this.stat === 0) {
                    this.count_down = 0
                    this.progress_width = 0
                } else {
                    //stat === 4，暂停
                    this.count_down = this.nr < this.t1 ?
                        (this.t1 - this.nr) :
                        (this.t1 + this.t2 - this.nr)
                    this.progress_width = (this.nr < this.t1 ?
                            (this.count_down / this.t1 * 100) :
                            (this.count_down / this.t2 * 100)
                    ) + '%'
                }
                //不需要停下来的感觉
                requestAnimationFrame(this.act_countdown)
            }
        }

    }
</script>

<style scoped>

</style>
