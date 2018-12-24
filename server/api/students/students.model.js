const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');

require('../blocks/blocks.model');

// const rpiValidator = require('rpi-validator');

const schema = new Schema(
  {
    accountLocked: { type: Boolean, default: false },
    rin: {
      type: String,
      minlength: 9,
      trim: true
      // required: true
      /* validate: {
      validator: function(rin) {
        return rpiValidator.isRIN(rin);
      },
      message: props => `${props.value} is not a valid RIN!`
    } */
    },
    name: {
      first: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 100 /*, required: true */
      },
      preferred: {
        type: String,
        trim: true
      },
      last: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 100 /*, required: true */
      }
    },
    rcs_id: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
      required: true
    },
    grad_year: {
      type: Number,
      min: 2000,
      max: 3000
      /*, required: true */
    }, // maybe?
    semester_schedules: { type: Object, default: {} },
    earliestWorkTime: {
      type: String,
      minlength: 5,
      maxlength: 5,
      default: '06:00'
    },
    latestWorkTime: {
      type: String,
      minlength: 5,
      maxlength: 5,
      default: '23:00'
    },
    unavailability_schedules: { type: Object, default: {} },
    admin: { type: Boolean, default: false },
    integrations: {
      sms: {
        verified: { type: Boolean, default: false },
        verificationCode: { type: String, minlength: 1 },
        phoneNumber: { type: String, minlength: 10, maxlength: 10 },
        preferences: {
          enabled: { type: Boolean, default: false },
          preWorkText: { type: Boolean, default: false },
          postWorkText: { type: Boolean, default: false },
          reminders: { type: Boolean, default: false }
        }
      },
      discord: {
        verified: { type: Boolean, default: false },
        verificationCode: { type: String, minlength: 1 },
        userID: { type: String },
        preferences: {
          enabled: { type: Boolean, default: false },
          preWorkDM: { type: Boolean, default: false },
          postWorkDM: { type: Boolean, default: false }
        }
      },
      email: {
        preferences: {
          enabled: { type: Boolean, default: true },
          dailyReports: { type: Boolean, default: false },
          weeklyReports: { type: Boolean, default: true }
        }
      }
    },
    setup: {
      personal_info: {
        type: Boolean,
        default: false
      }, // what CMS API will give us
      course_schedule: {
        type: Boolean,
        default: false
      }, // what SIS and YACS will give us
      unavailability: {
        type: Boolean,
        default: false
      }, // when the student cannot study or work
      integrations: {
        type: Boolean,
        default: false
      } // when the student has setup (or chosen not to setup) integrations
    },
    joined_date: {
      type: Date,
      required: true
    },
    last_login: Date
  },
  { timestamps: true }
);

schema.set('toObject', { getters: true, virtuals: true });
schema.set('toJSON', { getters: true, virtuals: true });

/* QUERY HELPERS */
// https://mongoosejs.com/docs/guide.html#query-helpers

schema.query.byUsername = function (rcsID) {
  return this.where({
    rcs_id: rcsID
  });
};

/* METHODS */

schema.methods.courseFromCRN = function (schedule, crn) {
  return schedule.filter(c => c.crn === crn)[0];
};

schema.methods.getAssignments = function (start, end) {
  let query = {
    _student: this._id
  };

  if (start) {
    query.dueDate = query.dueDate || {};
    query.dueDate['$gte'] = moment(start, 'YYYY-MM-DD', true).toDate();
  }

  if (end) {
    query.dueDate = query.dueDate || {};
    query.dueDate['$lte'] = moment(end, 'YYYY-MM-DD', true).toDate();
  }

  return this.model('Assignment')
    .find(query)
    .populate('_blocks')
    .sort('dueDate')
    .sort('-priority')
    .exec();
};

schema.methods.getExams = function (start, end) {
  let query = {
    _student: this._id
  };

  if (start) {
    query.date = query.date || {};
    query.date['$gte'] = moment(start, 'YYYY-MM-DD', true).toDate();
  }

  if (end) {
    query.date = query.date || {};
    query.date['$lte'] = moment(end, 'YYYY-MM-DD', true).toDate();
  }

  return this.model('Exam')
    .find(query)
    .sort('date')
    .sort('-timeRemaining')
    .exec();
};

/* VIRTUALS */
// https://mongoosejs.com/docs/guide.html#virtuals

/*
schema
  .virtual('current_unavailability')
  .get(function () {
    if (!this.unavailability_schedules) return [];
    return this.unavailability_schedules[CURRENT_TERM] || [];
  })
  .set(function (newSchedule) {
    this.unavailability_schedules[CURRENT_TERM] = newSchedule;
    this.markModified('unavailability_schedules');
  });
*/

schema.virtual('is_setup').get(function () {
  for (let check in this.setup) if (!this.setup[check]) return false;
  return true;
});

schema.virtual('next_to_setup').get(function () {
  for (let check in this.setup) if (!this.setup[check]) return check;
});

schema.virtual('full_name').get(function () {
  return (this.name.preferred || this.name.first) + ' ' + this.name.last;
});

schema.virtual('display_name').get(function () {
  if (this.name.first) {
    return `${this.full_name} ${
      this.grad_year ? '\'' + this.grad_year.toString().slice(-2) : ''
    }`;
  } else return this.rcs_id;
});

schema.virtual('setup_checks').get(function () {
  return Object.keys(this.setup).filter(check => !check.startsWith('$'));
});

schema.virtual('grade_name').get(function () {
  // TODO: implement properly
  switch (this.grad_year) {
  case 2022:
    return 'Freshman';
  case 2021:
    return 'Sophomore';
  case 2020:
    return 'Junior';
  case 2019:
    return 'Senior';
  default:
    return 'Unknown Grade';
  }
});

module.exports = mongoose.model('Student', schema);
