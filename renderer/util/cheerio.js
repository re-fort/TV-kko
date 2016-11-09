'use strict'

const cl = require('cheerio-httpcli')
const fs = require('fs')
const path = require('path')

const cheerio = {
  fetchImage(event, name, imgDir) {
    if (! fs.existsSync(imgDir)) fs.mkdirSync(imgDir)

    // リスナはたまる一方なので削除
    cl.download.removeAllListeners()
    // 削除した後、再度ダウンロードすることがあるのでキャッシュはクリアする(キャッシュがあると再ダウンロードを行わない)
    cl.download.clearCache()

    cl.download
    .on('ready', stream => {
      let file = name + stream.url.pathname.match(/.([^.]+)$/)[0]
      let savePath = path.join(imgDir, file)
      stream.pipe(fs.createWriteStream(savePath))
    })
    .on('error', err => {
      event.sender.send('async-fetchImage-reply')
    })
    .on('end', err => {
      event.sender.send('async-fetchImage-reply')
    })

    // 並行してダウンロードすることはない
    cl.download.parallel = 1

    let url = `http://talent.search.yahoo.co.jp/search?p=${encodeURI(name)}`

    cl.fetch(url)
    .then(result => {
      let $imgs = result.$('.rw .tb a img').eq(0)

      // 画像がない場合は何もしない
      if (typeof $imgs[0] === 'undefined') {
        event.sender.send('async-fetchImage-reply')
        return
      }

      $imgs.download()
    })
    .catch(err => {
      event.sender.send('async-fetchImage-reply')
    })
    .finally(() => {
    })
  },

  fetchProgramList(event, area, name, platformId, index = 0) {
    if (typeof name === 'object') name = name[index]

    cl.fetch('http://tv.so-net.ne.jp/')
    .then(result => {
      let $ = result.$
      // 地域をセット
      $('form[name=changeStationAreaForm]').field({
        stationAreaId: area
      })
      return $('[name=changeStationAreaForm]').submit()
    }).then(result => cl.fetch(`http://tv.so-net.ne.jp/schedulesBySearch.action?stationPlatformId=${platformId}&condition.keyword=${encodeURI(name)}`)).then(result => {
      let response = cheerio.createResponseObject(result.$, area, name, platformId)
      event.sender.send('async-fetchProgramList-reply', {response, index})
    }).finally(() => {
    })
  },

  createResponseObject($, area, name, platformId) {
    let response = []
    let baseUrl = "https://tv.so-net.ne.jp/chan-toru/intent?"
    // スカパーのIDはなぜか検索時と番組紹介時で逆にしないといけない
    if (platformId === '4') platformId = 5
    if (platformId === '5') platformId = 4

    $('.contBlockNB .utileList').each(function () {
      let utileListProperty = $(this).find('.utileListProperty').text().split('\r\n')
      if (utileListProperty.length === 1) return response

      let pid = $(this).find('h2 a').attr('href').split('/')[2].split('.')[0]
      let sid = parseInt(pid.slice(2, 6))
      let dateArray = utileListProperty[1].split(' ')
      let dateString = `${dateArray[0] + dateArray[1]} ${dateArray[2]}${dateArray[3]}${dateArray[4]}`
      let dateTime = pid.slice(6, 18)
      let dateTimeMs = Date.parse(`${dateTime.slice(0, 4)}/${dateTime.slice(4, 6)}/${dateTime.slice(6, 8)} ${dateTime.slice(8, 10)}:${dateTime.slice(10, 12)}`)
      let title = $(this).find('h2 a').text()
      let channel = utileListProperty[2]
      let url = `${baseUrl}cat=${platformId}&area=${area}&pid=${pid}&from=tw`

      let obj = {
        pid,
        sid,
        date: dateString,
        dateTime,
        dateTimeMs,
        title,
        channel,
        url,
        name,
        isScheduled: false,
        imgs: []
      }
      response.push(obj)
    })

    return response
  }
}

module.exports = cheerio