'use strict'

const fs = require('fs')
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
  }
}

module.exports = file