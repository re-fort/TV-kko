'use strict'

const fs = require('fs')
const https = require('https')
const request = require('request')

const file = {
  downloadCastsFile(event, path) {
    request(
      {method: 'GET', url: 'https://gist.githubusercontent.com/re-fort/dcb15e5e3a3d4f5a95d4/raw/TV-kko_casts.json', encoding: 'utf-8'},
      (error, response, body) => {
        if(!error && response.statusCode === 200){
          fs.writeFile(`${path}/renderer/casts.json`, body)
        }
        event.sender.send('async-downloadCastsFile-reply')
      }
    )
  },

  checkForUpdates(event) {
    let currentVersion = require('../../package.json').version
    https.get('https://github.com/re-fort/TV-kko/releases/latest', function(res) {
      res.on('data', () => {
        let latestVersion = /[^/v]*$/.exec(res.headers.location)[0]
        let isOld = latestVersion > currentVersion
        event.sender.send('async-checkForUpdates-reply', {isOld})
      })
    })
  }
}

module.exports = file