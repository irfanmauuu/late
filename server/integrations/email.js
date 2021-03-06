const logger = require('../modules/logger')
const moment = require('moment')

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

require('../api/assignments/assignments.model')

const GENERTIC_SENDGRID_TEMPLATE_ID = 'd-78a8680f9b724f5196f497857c433c7c'

const emailFunctions = {
  async sendGenericEmail (rcsID, subject, data) {
    return sgMail.send({
      to: rcsID + '@rpi.edu',
      from: 'LATE <noreply@late.work>',
      subject,
      templateId: GENERTIC_SENDGRID_TEMPLATE_ID,
      dynamic_template_data: { ...data, subject }
    })
  },
  async sendNewUserEmail (rcsID) {
    logger.info(`Sending new user email to ${rcsID}@rpi.edu`)
    return sgMail.send({
      to: rcsID + '@rpi.edu',
      from: 'LATE <thefrankmatranga@gmail.com>',
      subject: 'Welcome to LATE',
      templateId: 'd-eeae1b92ce924dc3be9253bf2d5576a3',
      dynamic_template_data: {
        rcsID
      }
    })
  },
  async sendMorningReportEmail (student) {
    // Compile periods for the day
    const day = moment().day()

    const periods = student.current_schedule
      .map(course => course.periods.filter(p => p.day === day))
      .flat()
      .sort((a, b) => parseInt(a.start) - parseInt(b.start))

    periods.forEach(p => {
      const course = student.current_schedule.find(c => c.periods.includes(p))
      p.start = moment(p.start, 'HH:mm', true).format('h:mma')
      p.end = moment(p.end, 'HH:mm', true).format('h:mma')
      p.course = {
        longname: course.longname
      }
    })

    const assignmentsDueToday = await student.getUserAssignments({
      start: moment().startOf('day'),
      end: moment().endOf('day')
    })

    for (const a in assignmentsDueToday) {
      assignmentsDueToday[a] = assignmentsDueToday[a].toJSON()
      assignmentsDueToday[a].course = student.current_schedule.find(
        c => c.crn === assignmentsDueToday[a].courseCRN
      )
      assignmentsDueToday[a].dueString = moment(
        assignmentsDueToday[a].dueDate
      ).format('h:mma')
    }

    logger.info(`Sending morning report to ${student.rcs_id}@rpi.edu`)
    return sgMail.send({
      to: student.rcs_id + '@rpi.edu',
      from: 'LATE <thefrankmatranga@gmail.com>',
      subject: 'Morning Report',
      templateId: 'd-dfb84e300f34479896c697feae156c8a',
      dynamic_template_data: {
        dateString: moment().format('dddd, MMM Do YYYY'),
        student,
        periods,
        assignmentsDueToday
      }
    })
  }
}

module.exports = emailFunctions
