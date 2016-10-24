'use strict'

const m = require('moment')

const moment = {
  getCurrentDate() {
    return m()
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