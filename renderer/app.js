'use strict';

const remote = require('electron').remote;
const ipcRenderer = require("electron").ipcRenderer;
const fs = require('fs');
const path = require('path');
const prefecturesJSON = require('./prefectures.json');
var castsJSON = require('./casts.json');
const baseDir = remote.app.getAppPath();
const usrImgDir = remote.app.getPath('userData');
var baseImgDir = path.join(baseDir, 'assets');
    baseImgDir = path.join(baseImgDir, 'img');

var Vue = require('vue');

Vue.component('modal', {
  template: '#modal-template',
  props: {
    show: {
      type: Boolean,
      required: true,
      twoWay: true
    }
  }
});

var app = new Vue({
  el: '#app',

  data: {
    extensions: ['.jpg', '.png'],
    defaultImage: 'no_name.png',
    activeIndex: -99,
    query: '',
    myArea: 23,
    myPlatformId: 1,
    name: '',
    prefectures: [],
    casts: [],
    myCasts: [],
    programs: [],
    fetchCounter: 0,
    renderable: false,
    showModal: false
  },

  ready: function() {
    //
    // イベントハンドラ
    //
    ipcRenderer.on('async-downloadCastsFile-reply', function(ev, arg) {
      castsJSON = require('./casts.json');
    });

    ipcRenderer.on('async-fetchImage-reply', function(ev, arg) {
      app.addMyCast();
      app.fetchStatusChange('fetchImage', 'End');
    });

    ipcRenderer.on('async-fetchProgramList-reply', function(ev, arg) {
      app.createPrograms(arg.response);
      if (typeof app.$data.name === 'object' && app.$data.name.length - 1 !== app.$data.fetchCounter) {
        ++app.$data.fetchCounter;
      }
      else {
        // 非同期で取得した番組を放送日時順にソート
        app.$data.programs.sort(function(k,l){
          if(k.dateTime < l.dateTime) return -1;
          if(k.dateTime > l.dateTime) return 1;
          return 0;
        });

        app.$data.renderable = true;
        app.fetchStatusChange('fetchProgramList', 'End');
      }
    });

    //
    // 初期設定
    //
    this.downloadCastsFile();

    var selectedArea = this.getLocalStorageByKey('setting', 'myArea');
    var selectedPlatformId = this.getLocalStorageByKey('setting', 'myPlatformId');

    if (selectedArea !== '') this.myArea = selectedArea;
    if (selectedPlatformId !== '') this.myPlatformId = selectedPlatformId;

    this.prefectures = prefecturesJSON;
    this.casts = castsJSON;
    this.getMyCasts();
  },

  methods: {
    //
    // set.*
    //
    setName: function(name) {
      if (name === '') {
        this.name = this.getLocalStorageByKey('name', '');
      }
      else {
        this.name = name;
      }
    },

    setLocalStorage: function() {
      var setting = [
        {
          key: 'myArea', value: this.myArea
        },
        {
          key: 'myPlatformId', value: this.myPlatformId
        }
      ];

      localStorage.setItem('setting', JSON.stringify(setting))
    },

    setInput: function(value) {
      this.query = value;
      this.name = value;
    },

    //
    // get.*
    //
    getLocalStorageByKey: function(mainKey, subKey) {
      var values = JSON.parse(localStorage.getItem(mainKey)) || '';
      if (values === '') return '';
      if (subKey === '') return values;
      var filteredArray = [];

      if (values !== null) {
        filteredArray = values.filter(function(values, index){
          if (values.key === subKey) return true;
        })
      }

      return filteredArray ? filteredArray[0].value : '';
    },

    getMyCasts: function() {
      var names = JSON.parse(localStorage.getItem('name')) || [];
      var myCasts = [];

      for (var name of names) {
        var myCast = {
          name: name,
          imgPath: this.getImagePath(name)
        };
        this.myCasts.push(myCast);
      }
    },

    getImagePath: function(name) {
      var imgPath = path.join(baseImgDir, this.defaultImage);

      for (var extension of this.extensions) {
        if (fs.existsSync(path.join(usrImgDir, name + extension))) {
          imgPath = path.join(usrImgDir, name + extension);
          break;
        }
      }

      return imgPath;
    },

    //
    // fetch.*
    //
    fetchImage: function() {
      if (!this.query) return;

      this.fetchStatusChange('fetchImage', 'Start');
      ipcRenderer.send('async-fetchImage', {name: this.query, imgDir: usrImgDir});
    },

    fetchProgramList: function() {
      this.fetchStatusChange('fetchProgramList', 'Start');
      this.programs = [];
      this.programsTmp = [];
      this.renderable = false;
      this.fetchCounter = 0;

      if (this.name.length === 0) {
        this.fetchStatusChange('fetchProgramList', 'End');
        return;
      }

      if (typeof this.name === 'object') {
        var index = 0;
        for (var name in this.name) {
          ipcRenderer.send('async-fetchProgramList', {area: this.myArea, name: this.name, platformId: this.myPlatformId, index: index});
          ++index;
        };
      }
      else {
        ipcRenderer.send('async-fetchProgramList', {area: this.myArea, name: this.name, platformId: this.myPlatformId, index: 0});
      }
    },

    fetchStatusChange: function(target, status) {
      var isStart = status === 'Start' ? true : false;

      if (target === 'fetchImage') {
        this.toggleDisplay('.image--loading', isStart);
        this.toggleDisplay('.list-scroll', !isStart);
        this.toggleDisplay('.list-cog', !isStart);
      }

      if (target === 'fetchProgramList') {
        this.toggleDisplay('.content--loading', isStart);
      }
    },

    //
    // add.*
    //
    addMyCast: function() {
      var names = JSON.parse(localStorage.getItem('name')) || [];

      if (names.indexOf(this.query) === -1) {
        var myCast = {
          name: this.query,
          imgPath: this.getImagePath(this.query)
        };

        this.myCasts.push(myCast);
        names.push(this.query);
        localStorage.setItem('name', JSON.stringify(names));
      }

      this.query = '';
    },

    addActiveClass: function(id, name) {
      this.activeIndex = id;
      this.setName(name);
    },

    //
    // remove.*
    //
    removeMyCast: function() {
      var names = JSON.parse(localStorage.getItem('name')) || [];
      var name = this.name;

      names.some(function(key, i){
        if (key === name) names.splice(i,1)
      })

      var myCasts = this.myCasts;
      myCasts.some(function(c, i){
        if (c.name === name) myCasts.splice(i,1);
      })

      this.deleteImageFile();
      localStorage.setItem('name', JSON.stringify(names));
    },

    //
    // delete.*
    //
    deleteImageFile: function() {
      var imgPath = path.join(baseImgDir, this.defaultImage);

      for (var extension of this.extensions) {
        if (fs.existsSync(path.join(usrImgDir, this.name + extension))) {
          imgPath = path.join(usrImgDir, this.name + extension);
          fs.unlinkSync(imgPath);
          break;
        }
      }
    },

    //
    // download.*
    //
    downloadCastsFile: function() {
      ipcRenderer.send('async-downloadCastsFile');
    },

    //
    // create.*
    //
    createPrograms: function(objects) {
      var names = [];
      var imgPath = '';

      for (var obj of objects) {
        var name = obj.name;
        var isAdd = false;

        if (name in names) {
          imgPath = names[name];
        }
        else {
          imgPath = this.getImagePath(obj.name);
          names[name] = imgPath;
        }

        this.programs.some(function(p, i){
          if (p.pid === obj.pid) {
            app.$data.programs[i].imgPaths.push(imgPath);
            isAdd = true;
          }
        })

        if (!isAdd) {
          obj.imgPaths.push(imgPath);
          this.programs.push(obj);
        }
      }
    },

    //
    // toggle.*
    //
    toggleDisplay: function(elName, isBlock) {
      if (isBlock) {
        document.querySelector(elName).style.display = "block";
      }
      else {
        document.querySelector(elName).style.display = "none";
      }
    },

    toggleMenuDisplay: function() {
      var el = document.querySelector('.menu');

      if (el.classList.contains('menu--open')) {
        el.classList.remove('menu--open');
      }
      else {
        el.classList.add('menu--open');
      }
    }
  }
});
