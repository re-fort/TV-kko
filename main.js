"use strict";

const app = require('electron').app;
const path = app.getAppPath();
const BrowserWindow = require('electron').BrowserWindow;
const ipcMain = require('electron').ipcMain;
const cheerio = require('./renderer/store/cheerio');
const file = require('./renderer/store/file');

require("crash-reporter").start();

var mainWindow = null;

app.on("window-all-closed", function() {
  app.quit();
});

app.on("ready", function() {

  mainWindow = new BrowserWindow({ width: 1100, height: 1000, minWidth: 410 });
  mainWindow.loadURL("file://" + __dirname + "/renderer/app.html");

  mainWindow.on("closed", function() {
    mainWindow = null;
  });
});

ipcMain.on('async-downloadCastsFile', function(event){
  file.downloadCastsFile(event, path);
});

ipcMain.on('async-fetchImage', function(event, args){
  cheerio.fetchImage(event, args.name, args.imgDir);
});

ipcMain.on('async-fetchProgramList', function(event, args){
  cheerio.fetchProgramList(event, args.area, args.name, args.platformId, args.index);
});