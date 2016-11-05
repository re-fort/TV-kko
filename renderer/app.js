'use strict'

const remote = require('electron').remote
const ipcRenderer = require("electron").ipcRenderer
const fs = require('fs')
const path = require('path')
const prefecturesJSON = require('./prefectures.json')
let castsJSON = require('./casts.json')
const moment = require('./util/moment')
const baseDir = remote.app.getAppPath()
const usrImgDir = remote.app.getPath('userData')
let baseImgDir = path.join(baseDir, 'assets')
    baseImgDir = path.join(baseImgDir, 'img')

let Vue = require('vue/dist/vue')

Vue.component('modal', {
  template: '#modal-template'
})

let app = new Vue({
  el: '#app',

  data () {
    return {
      extensions: ['.jpg', '.png'],
      defaultImage: 'no_name.png',
      showType: 'user',
      showSubType: '',
      searchType: '',
      activeIndex: -99,
      castQuery: '',
      programQuery: '',
      programSearchType: '2',
      myArea: 23,
      myPlatformId: 1,
      myNasneIp: '',
      name: '',
      prefectures: [],
      casts: [],
      myCasts: [],
      programs: [],
      myPrograms: [],
      myExPrograms: [],
      scheduledList: [],
      fetchCounter: 0,
      renderable: false,
      showSettingModal: false,
      showUpdateModal: false,
      autoCheck: false,
      autoCheckTime: 19
    }
  },

  computed: {
    filteredCasts: function () {
      let castQuery = this.castQuery
      return this.casts.filter(function (cast) {
        return cast.name.indexOf(castQuery) !== -1
      })
    }
  },

  created () {
    //
    // イベントハンドラ
    //
    ipcRenderer.on('async-downloadCastsFile-reply', (ev, arg) => {
      castsJSON = require('./casts.json')
    })

    ipcRenderer.on('async-checkForUpdates-reply', (ev, arg) => {
      this.showUpdateModal = arg.isOld
    })

    ipcRenderer.on('async-fetchImage-reply', (ev, arg) => {
      this.addMyCast()
      this.fetchStatusChange('fetchImage', 'End')
    })

    ipcRenderer.on('async-fetchProgramList-reply', (ev, arg) => {
      this.createPrograms(arg.response)
      if (typeof this.name === 'object' && this.name.length - 1 !== this.fetchCounter) {
        ++this.fetchCounter
      }
      else {
        // 非同期で取得した番組を放送日時順にソート
        this.programs.sort((k, l) => {
          if(k.dateTime < l.dateTime) return -1
          if(k.dateTime > l.dateTime) return 1
          return 0
        })

        this.fetchReservedList()
        this.renderable = true
        this.fetchStatusChange('fetchProgramList', 'End')
      }
    })

    ipcRenderer.on('async-fetchReservedList-reply', (ev, arg) => {
      if (arg.error) {
        alert('nasneの録画予約情報更新に失敗しました。')
      }
      
      this.scheduledList = arg.list
      this.updateScheduled()
    })

    //
    // 初期設定
    //
    this.init()
  },

  methods: {
    //
    // init.*
    //
    init() {
      this.downloadCastsFile()
      this.checkForUpdates()

      let selectedArea = this.getLocalStorageByKey('setting', 'myArea')
      let selectedPlatformId = this.getLocalStorageByKey('setting', 'myPlatformId')
      let selectedAutoCheck = this.getLocalStorageByKey('setting', 'autoCheck')
      let selectedAutoCheckTime = this.getLocalStorageByKey('setting', 'autoCheckTime')
      let selectedNasneIp = this.getLocalStorageByKey('setting', 'myNasneIp')

      if (selectedArea !== '') this.myArea = selectedArea
      if (selectedPlatformId !== '') this.myPlatformId = selectedPlatformId
      if (selectedAutoCheck !== '') this.autoCheck = selectedAutoCheck
      if (selectedAutoCheckTime !== '') this.autoCheckTime = selectedAutoCheckTime
      if (selectedNasneIp !== '') this.myNasneIp = selectedNasneIp

      this.prefectures = prefecturesJSON
      this.casts = castsJSON
      this.getMyCasts()
      this.getMyPrograms()
      this.getMyExPrograms()
      this.setTimer()
      this.fetchReservedList()
    },

    initPrograms() {
      this.programs = []
      this.programsTmp = []
      this.renderable = false
      this.fetchCounter = 0
    },

    //
    // set.*
    //
    setSelected(id, name, searchType) {
      this.setActiveIndex(id)
      this.setName(name)
      this.setSearchType(searchType)
    },

    setActiveIndex(id) {
      this.activeIndex = id
    },

    setName(name) {
      if (name === '') {
        let allName = this.getLocalStorageByKey('name', '')
        let allProgram = this.getLocalStorageByKey('program', '')
        this.name = allName.concat(allProgram)
      }
      else {
        this.name = name
      }
    },

    setSearchType(searchType) {
      this.searchType = searchType
    },

    setLocalStorage() {
      let setting = [
        {
          key: 'myArea', value: this.myArea
        },
        {
          key: 'myPlatformId', value: this.myPlatformId
        },
        {
          key: 'autoCheck', value: this.autoCheck
        },
        {
          key: 'autoCheckTime', value: this.autoCheckTime
        },
        {
          key: 'myNasneIp', value: this.myNasneIp
        }
      ]

      localStorage.setItem('setting', JSON.stringify(setting))
    },

    setInput(value) {
      this.castQuery = value
      this.name = value
    },

    setTimer() {
      clearTimeout()
      if (!this.autoCheck) return

      let currentDate = moment.getCurrentDate()
      let timerDate = moment.getTimerDate(currentDate, this.autoCheckTime)
      let diffMiliSeconds = moment.getDiff(currentDate, timerDate)

      setTimeout(() => {
        this.setSelected(-99, '', 'all')
        this.fetchProgramList()
        this.setTimer()
      }, diffMiliSeconds)
    },

    //
    // get.*
    //
    getLocalStorageByKey(mainKey, subKey) {
      let values = JSON.parse(localStorage.getItem(mainKey)) || ''
      if (values === '') return ''
      if (subKey === '') return values
      let filteredArray = []

      if (values !== null) {
        filteredArray = values.filter((values, index) => {
          if (values.key === subKey) return true
        })
      }

      return filteredArray.length !== 0 ? filteredArray[0].value : ''
    },

    getMyCasts() {
      let names = JSON.parse(localStorage.getItem('name')) || []
      let myCasts = []

      for (let name of names) {
        let myCast = {
          name,
          imgPath: this.getImagePath(name)
        }
        this.myCasts.push(myCast)
      }
    },

    getImagePath(name) {
      let imgPath = path.join(baseImgDir, this.defaultImage)

      this.extensions.some((extension) => {
        if (fs.existsSync(path.join(usrImgDir, name + extension))) {
          imgPath = path.join(usrImgDir, name + extension)
          return true
        }
      })

      return imgPath
    },

    getMyPrograms() {
      this.myPrograms = JSON.parse(localStorage.getItem('program')) || []
    },

    getMyExPrograms() {
      this.myExPrograms = JSON.parse(localStorage.getItem('exProgram')) || []
    },

    //
    // fetch.*
    //
    fetchImage() {
      if (!this.castQuery) return

      this.fetchStatusChange('fetchImage', 'Start')
      ipcRenderer.send('async-fetchImage', {name: this.castQuery, imgDir: usrImgDir})
    },

    fetchProgramList() {
      if (this.searchType === 'user' && !this.myCasts.some((c) => {
        if (c.name === this.name) return true
      })) {
        this.setActiveIndex(-99)
        return
      }

      if (this.searchType === 'program' && !this.myPrograms.some((p) => {
        if (p === this.name) return true
      })) {
        this.setActiveIndex(-99)
        return
      }

      this.fetchStatusChange('fetchProgramList', 'Start')
      this.initPrograms()

      if (this.name.length === 0) {
        this.fetchStatusChange('fetchProgramList', 'End')
        return
      }

      if (typeof this.name === 'object') {
        let index = 0
        for (let name of this.name) {
          ipcRenderer.send('async-fetchProgramList', {area: this.myArea, name: this.name, platformId: this.myPlatformId, index})
          ++index
        }
      }
      else {
        ipcRenderer.send('async-fetchProgramList', {area: this.myArea, name: this.name, platformId: this.myPlatformId, index: 0})
      }
    },

    fetchStatusChange(target, status) {
      let isStart = status === 'Start' ? true : false

      if (target === 'fetchImage') {
        this.toggleDisplay('.image--loading', isStart)
        this.toggleDisplay('.list-cast-scroll', !isStart)
      }

      if (target === 'fetchProgramList') {
        this.toggleDisplay('.content--loading', isStart)
      }
    },

    fetchReservedList() {
      if (this.myNasneIp === '') return
      ipcRenderer.send('async-fetchReservedList', {ip: this.myNasneIp})
    },

    //
    // add.*
    //
    addMyCast() {
      let names = JSON.parse(localStorage.getItem('name')) || []

      if (names.indexOf(this.castQuery) === -1) {
        let myCast = {
          name: this.castQuery,
          imgPath: this.getImagePath(this.castQuery)
        }

        this.myCasts.push(myCast)
        names.push(this.castQuery)
        localStorage.setItem('name', JSON.stringify(names))
      }

      this.castQuery = ''
    },

    addMyProgram() {
      if (this.programQuery === '') return
      if (! this.myPrograms.some((p) => {
        if (p === this.programQuery)
          return true
      })) {
        this.myPrograms.push(this.programQuery)
        localStorage.setItem('program', JSON.stringify(this.myPrograms))
      }

      this.programQuery = ''
    },

    addMyExProgram() {
      if (this.programQuery === '') return
      if (! this.myExPrograms.some((p) => {
        if (p.title === this.programQuery && p.searchType === this.programSearchType)
          return true
      })) {
        this.myExPrograms.push({title: this.programQuery, searchType: this.programSearchType})
        localStorage.setItem('exProgram', JSON.stringify(this.myExPrograms))
      }

      this.programQuery = ''
    },

    //
    // remove.*
    //
    removeMyCast(name) {
      let names = JSON.parse(localStorage.getItem('name')) || []

      names.some((key, i) => {
        if (key === name) {
          names.splice(i,1)
          return true
        }
      })

      let myCasts = this.myCasts
      myCasts.some((c, i) => {
        if (c.name === name) {
          myCasts.splice(i,1)
          return true
        }
      })

      this.deleteImageFile()
      localStorage.setItem('name', JSON.stringify(names))
    },

    removeMyProgram(title) {
      this.myPrograms.some((p, i) => {
        if (p === title) {
          this.myPrograms.splice(i,1)
          return true
        }
      })

      localStorage.setItem('program', JSON.stringify(this.myPrograms))
    },

    removeMyExProgram(myExProgram) {
      this.myExPrograms.some((p, i) => {
        if (p === myExProgram) {
          this.myExPrograms.splice(i,1)
          return true
        }
      })

      localStorage.setItem('exProgram', JSON.stringify(this.myExPrograms))
    },

    //
    // delete.*
    //
    deleteImageFile() {
      let imgPath = path.join(baseImgDir, this.defaultImage)

      this.extensions.some((extension) => {
        if (fs.existsSync(path.join(usrImgDir, this.name + extension))) {
          imgPath = path.join(usrImgDir, this.name + extension)
          fs.unlinkSync(imgPath)
          return true
        }
      })
    },

    //
    // download.*
    //
    downloadCastsFile() {
      ipcRenderer.send('async-downloadCastsFile')
    },

    //
    // check.*
    //
    checkForUpdates() {
      ipcRenderer.send('async-checkForUpdates')
    },

    //
    // create.*
    //
    createPrograms(objects) {
      let names = []
      let imgPath = ''

      for (let obj of objects) {
        if (! this.myExPrograms.some((p) => {
          p['1'] = function() { return '^' + p.title + '.*?'}
          p['2'] = function() { return '.*?' + p.title + '.*?'}
          p['3'] = function() { return '.*?' + p.title + '$'}
          if(obj.title.match(new RegExp(p[p.searchType](), 'g')))
            return true
        })) {
          let name = obj.name
          let isAdd = false

          if (name in names) {
            imgPath = names[name]
          }
          else {
            imgPath = this.getImagePath(obj.name)
            names[name] = imgPath
          }

          if (! this.programs.some((p, i) => {
            if (p.pid === obj.pid) {
              if (! this.programs[i].imgs.some((img) => {
                if (img.name === obj.name && img.path === imgPath)
                  return true
              })) {
                this.programs[i].imgs.push({name: obj.name, path: imgPath})
              }
              return true
            }
          })) {
            obj.imgs.push({name: obj.name, path: imgPath})
            this.programs.push(obj)
          }
        }
      }
    },

    //
    // toggle.*
    //
    toggleDisplay(elName, isBlock) {
      if (isBlock) {
        document.querySelector(elName).style.display = "block"
      }
      else {
        document.querySelector(elName).style.display = "none"
      }
    },

    toggleMenuDisplay() {
      let el = document.querySelector('.menu')

      if (el.classList.contains('menu--open')) {
        el.classList.remove('menu--open')
      }
      else {
        el.classList.add('menu--open')
      }
    },

    //
    // update.*
    //
    updateScheduled() {
      this.programs.forEach((e, i) => {
        this.programs[i].isScheduled = false
      })
      for (let scheduled of this.scheduledList) {
        this.programs.some((program, i) => {
          if (program.dateTimeMs === scheduled.dateTimeMs && program.sid === scheduled.sid) {
            this.programs[i].isScheduled = true
            return true
          }
        })
      }
    }
  }
})