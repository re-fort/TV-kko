'use strict'

const request = require('request')

const nasne = {
  fetchReservedList(event, ip) {
    let list = []
    let options = {
      method: 'GET',
      url: `http://${ip}:64220/schedule/reservedListGet`,
      qs: {
        searchCriteria: 0,
        filter: 0,
        startingIndex: 0,
        requestedCount: 0,
        sortCriteria: 0,
        withDescriptionLong: 1,
        withUserData: 0
      },
      encoding: 'utf-8',
      json: true
    }

    request(options, (error, response, body) => {
      if(!error && response.statusCode === 200){
        for (let item of body.item) {
          list.push({title: item.title, dateTimeMs: Date.parse(item.startDateTime), sid: item.serviceId})
        }
      }
      event.sender.send('async-fetchReservedList-reply', {list, error})
    })
  }
}

module.exports = nasne