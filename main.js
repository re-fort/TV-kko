'use strict'

const app = require('electron').app
const path = app.getAppPath()
const BrowserWindow = require('electron').BrowserWindow
const Menu = require('electron').Menu
const ipcMain = require('electron').ipcMain
const abema = require('./renderer/util/abema')
const cheerio = require('./renderer/util/cheerio')
const file = require('./renderer/util/file')
const nasne = require('./renderer/util/nasne')

let mainWindow = null

app.on('window-all-closed', () => {
  app.quit()
})

app.on('ready', () => {

  mainWindow = new BrowserWindow({ width: 1100, height: 1000, minWidth: 410 })
  mainWindow.loadURL(`file://${__dirname}/renderer/app.html`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
})

app.once('ready', () => {
  const template = [
  {
    label: 'Application',
    submenu: [{
      type: 'separator'
    },
    {
      label: 'About TV-kko',
      click: showAbout
    }]
  },
  {
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

ipcMain.on('async-checkForUpdates', (event) => {
  file.checkForUpdates(event)
})

ipcMain.on('async-fetchImage', (event, args) => {
  cheerio.fetchImage(event, args.name, args.imgDir)
})

ipcMain.on('async-fetchProgramList', (event, args) => {
  if (args.platformId === 'Abema') {
    abema.fetchProgramList(event, args.name, args.index)
  } else {
    cheerio.fetchProgramList(event, args.area, args.name, args.platformId, args.index)
  }
})

ipcMain.on('async-fetchReservedList', (event, args) => {
  nasne.fetchReservedList(event, args.ip)
})

function showAbout() {
  const aboutWindow = new BrowserWindow({
    width: 275,
    minWidth: 275,
    maxWidth: 275,
    height: 160,
    minHeight: 160,
    maxHeight: 160,
    parent: mainWindow
  })
  let currentVersion = require('./package.json').version
  aboutWindow.loadURL(`file://${__dirname}/renderer/about.html#${currentVersion}`)
}