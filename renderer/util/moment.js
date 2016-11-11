'use strict'

const m = require('moment')
m.locale('ja', {weekdaysShort: ['日','月','火','水','木','金','土']})

const moment = {
  getCurrentDate() {
    return m()
  },

  getFormatDate(date, formatString) {
    return m(date, formatString)
  },

  getTimerDate(currentDate, hour) {
    let timerDate = this.getCurrentDate()
    timerDate.hour(hour).minute(0).second(0)

    if (timerDate.isBefore(currentDate)) timerDate = timerDate.add(1, 'days')
    
    return timerDate
  },
  
  getDiff(fromDate, toDate) {
    return toDate.diff(fromDate, 'milliseconds')
  }
}

module.exports = moment