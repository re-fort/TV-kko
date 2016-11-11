'use strict'

const request = require('request')
const moment = require('./moment')

const abema = {
  fetchProgramList(event, name, index = 0) {
    //認証情報を取得してからAPI呼び出し
    let options = {
      method: 'GET',
      url: 'https://gist.githubusercontent.com/re-fort/a8eb7e63eda13368277a52baccfd2cd6/raw/AbemaTV_auth.json',
      encoding: 'utf-8',
      json: true
    }
    request(options, (error, res, body) => {
      if (error || res.statusCode !== 200) {
        event.sender.send('async-fetchProgramList-reply')
        return
      }

      let auth = body.auth
      let options = {
        method: 'GET',
        url: `https://api.abema.io/v1/search/slots?q=${encodeURI(name)}&offset=0&limit=10&type=future`,
        auth: {
          'bearer': auth
        },
        encoding: 'utf-8',
        json: true
      }
      request(options, (error, res, body) => {
        if (error || res.statusCode !== 200) {
          event.sender.send('async-fetchProgramList-reply')
          return
        }
        
        let response = this.createResponseObject(body.dataSet, name)
        event.sender.send('async-fetchProgramList-reply', {response, index})
      })
    })
  },

  createResponseObject(dataSet, name) {
    let response = []
    let baseUrl = 'https://abema.tv/channels/'
    let channels = dataSet.channels

    for (let slot of dataSet.slots) {
      let pid = slot.id
      let sid = 'abemaTV'
      let startDate = moment.getFormatDate(slot.startAt, 'X')
      let endDate = moment.getFormatDate(slot.endAt, 'X')
      let date = startDate.format('MM/DD(ddd) HH:mm') + endDate.format('～HH:mm')
      let dateTime = startDate.format('YYYYMMDDHHmm')
      let dateTimeMs = parseInt(slot.startAt + '000')
      let title = slot.title
      let channel = this.getChannelName(channels, slot.channelId)
      let url = `${baseUrl}${slot.channelId}/slots/${slot.id}`

      let obj = {
        pid,
        sid,
        date,
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
    }

    return response
  },

  getChannelName(channels, channelId) {
    return channels.filter((channel) => {
      return channel.id === channelId
    })[0].name
  }
}

module.exports = abema
