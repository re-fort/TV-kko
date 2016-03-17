"use strict";

var fs     = require('fs');
var request = require('request');

var file = {
  downloadCastsFile: function(event, path) {
    request(
      {method: 'GET', url: 'https://gist.githubusercontent.com/re-fort/dcb15e5e3a3d4f5a95d4/raw/TV-kko_casts.json', encoding: 'utf-8'},
      function (error, response, body){
        if(!error && response.statusCode === 200){
          console.log(path);
          fs.writeFile(path + '/renderer/casts.json', body);
        }
      }
    );
    event.sender.send('async-downloadCastsFile-reply');
  }
};

module.exports = file;
