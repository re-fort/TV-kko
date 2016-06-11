"use strict"

const app = require('electron').app
const path = app.getAppPath()
const BrowserWindow = require('electron').BrowserWindow
const Menu = require('electron').Menu
const ipcMain = require('electron').ipcMain
const cheerio = require('./renderer/util/cheerio')
const file = require('./renderer/util/file')

let mainWindow = null

app.on("window-all-closed", () => {
  app.quit()
})

app.on("ready", () => {

  mainWindow = new BrowserWindow({ width: 1100, height: 1000, minWidth: 410 })
  mainWindow.loadURL(`file://${__dirname}/renderer/app.html`)

  mainWindow.on("closed", () => {
    mainWindow = null
  })
})

app.once('ready', () => {
  const template = [{
    label: 'Edit',
    submenu: [{
      type: 'separator'
    },
    {
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    },
    {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    },
    {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    },
    {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    }]
  },
  {
    label: 'View',
    submenu: [{
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.reload()
      }
    }]
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [{
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }]
  }]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
})

ipcMain.on('async-downloadCastsFile', (event) => {
  file.downloadCastsFile(event, path)
})

ipcMain.on('async-fetchImage', (event, args) => {
  cheerio.fetchImage(event, args.name, args.imgDir)
})

ipcMain.on('async-fetchProgramList', (event, args) => {
  cheerio.fetchProgramList(event, args.area, args.name, args.platformId, args.index)
})