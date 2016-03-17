'use strict';

var cl = require('cheerio-httpcli');
var fs     = require('fs');
var path   = require('path');

var cheerio = {
  fetchImage: function(event, name, imgDir) {
    if (! fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

    // リスナはたまる一方なので削除
    cl.download.removeAllListeners();
    // 削除した後、再度ダウンロードすることがあるのでキャッシュはクリアする(キャッシュがあると再ダウンロードを行わない)
    cl.download.clearCache();

    cl.download
    .on('ready', function (stream) {
      var file = name + stream.url.pathname.match(/.([^.]+)$/)[0];
      var savePath = path.join(imgDir, file);
      stream.pipe(fs.createWriteStream(savePath));
    })
    .on('error', function (err) {
      event.sender.send('async-fetchImage-reply');
    })
    .on('end', function (err) {
      event.sender.send('async-fetchImage-reply');
    });

    // 並行してダウンロードすることはない
    cl.download.parallel = 1;

    var url = 'http://talent.search.yahoo.co.jp/search?p=' + encodeURI(name);

    cl.fetch(url)
    .then(function (result) {
      var $imgs = result.$('.rw .tb a img').eq(0);

      // 画像がない場合は何もしない
      if (typeof $imgs[0] === 'undefined') {
        event.sender.send('async-fetchImage-reply')
        return;
      }

      $imgs.download();
    })
    .catch(function (err) {
      event.sender.send('async-fetchImage-reply');
    })
    .finally(function () {
    });
  },

  fetchProgramList: function(event, area, name, platformId, index) {
    if (typeof name === 'object') name = name[index];

    cl.fetch('http://tv.so-net.ne.jp/')
    .then(function (result) {
      var $ = result.$;
      // 地域をセット
      $('form[name=changeStationAreaForm]').field({
        stationAreaId: area
      });
      return $('[name=changeStationAreaForm]').submit();
    }).then(function (result) {
      // 地域をセットした後、検索
      return cl.fetch('http://tv.so-net.ne.jp/schedulesBySearch.action?stationPlatformId=' + platformId + '&condition.keyword=' + encodeURI(name));
    }).then(function (result) {
      var response = cheerio.createResponseObject(result.$, area, name, platformId);
      event.sender.send('async-fetchProgramList-reply', {response: response, index: index});
    }).finally(function () {
    });
  },

  createResponseObject: function($, area, name, platformId) {
    var response = [];
    var baseUrl = "https://tv.so-net.ne.jp/chan-toru/intent?";
    // スカパーのIDはなぜか検索時と番組紹介時で逆にしないといけない
    if (platformId === '4') platformId = 5;
    if (platformId === '5') platformId = 4;

    $('.contBlockNB .utileList').each(function () {
      var utileListProperty = $(this).find('.utileListProperty').text().split('\r\n');
      if (utileListProperty.length === 1) return response;

      var pid = $(this).find('h2 a').attr('href').split('/')[2].split('.')[0];
      var dateArray = utileListProperty[1].split(' ');
      var dateString = dateArray[0] + dateArray[1] + ' ' + dateArray[2] + dateArray[3] + dateArray[4];
      var dateTime = pid.slice(6, 18);
      var title = $(this).find('h2 a').text();
      var channel = utileListProperty[2];
      var url = baseUrl + 'cat=' + platformId + '&area=' + area + '&pid=' + pid + '&from=tw'

      var obj = {
        pid: pid,
        date: dateString,
        dateTime: dateTime,
        title: title,
        channel: channel,
        url: url,
        name: name,
        imgPaths: []
      };
      response.push(obj);
    });

    return response;
  }
};

module.exports = cheerio;
