import moment from 'moment';

export default {
  methods: {
    eventRender ({ event, el, view }) {
      const { eventType, assessment, course, period, block } = event.extendedProps;

      if (view.type === 'dayGridMonth') {
        if (
          this.filter && (this.filter.includes(assessment.courseCRN) ||
          (eventType === 'assignment' &&
          (!this.showCompleted && assessment.completed)))
        ) {
          return false;
        }
      }

      el.title = event.title;

      const addIcon = (iconName, selector = '.fc-content', prepend = true) => {
        const icon = document.createElement('i');
        icon.className = 'fas ' + iconName;
        el.querySelector(selector)[prepend ? 'prepend' : 'append'](icon);
      };

      if (eventType === 'course') {
        el.title = `${event.title} | ${period.location}`;

        if (period.type === 'TES') {
          return !!this.$store.state.assessments.upcomingAssessments.find(
            assessment =>
              assessment.assessmentType === 'exam' &&
              assessment.courseCRN === course.crn &&
              moment(assessment.date).isSame(event.start, 'day')
          );
        }

        addIcon('fa-graduation-cap', '.fc-title');

        const locationElement = document.createElement('i');
        locationElement.className = 'event-location';
        locationElement.innerText = period.location;
        el.querySelector('.fc-content').append(locationElement);
      } else if (eventType === 'assignment') {
        addIcon('fa-clipboard-check');

        if (assessment.shared) addIcon('fa-users is-pulled-right');
      } else if (eventType === 'exam') {
        addIcon('fa-exclamation-triangle');
      } else if (eventType === 'academic-calendar-event') {
        addIcon('fa-info-circle');
      } else if (eventType === 'work-block') {
        el.title = `${
          assessment.assessmentType === 'assignment'
            ? 'Work on'
            : 'Study for'
        } ${assessment.title}${
          block.location ? ' | ' + block.location : ''
        }`;

        // --- DELETE BUTTON ---
        const deleteButton = document.createElement('span');
        deleteButton.classList.add('remove-work-block');
        deleteButton.classList.add('delete');
        deleteButton.title = 'Remove from schedule';
        deleteButton.onclick = async ev => {
          ev.stopPropagation();

          let updatedAssessment = await this.$store.dispatch(
            'REMOVE_WORK_BLOCK',
            {
              assessment: assessment,
              blockID: block._id
            }
          );

          this.$toast.open({
            message: 'Unscheduled work block!',
            type: 'is-primary'
          });
        };
        el.querySelector('.fc-content').append(deleteButton);
        // ---------------------


        // --- LOCATION ---
        const locationEl = document.createElement('i');
        locationEl.title = 'Click to set location';
        if (block.location) {
          locationEl.innerText = block.location;
        } else {
          locationEl.className = 'fas fa-map-marker-alt';
        }
        locationEl.classList.add('event-location');
        locationEl.onclick = ev => {
          ev.stopPropagation();
          this.$dialog.prompt({
            message: 'Where do you want this to be?',
            inputAttrs: {
              placeholder: block.location
                ? block.location
                : 'e.g. Bray Hall Classroom',
              maxlength: 200
            },
            onConfirm: async location => {
              const updatedAssessment = await this.$store.dispatch(
                'EDIT_WORK_BLOCK',
                {
                  assessment: assessment,
                  blockID: block._id,
                  start: event.start,
                  end: event.end,
                  location
                }
              );
            }
          });
        };
        el.querySelector('.fc-content').append(locationEl);
        // ----------------

        if (assessment.shared && block.shared) addIcon('fa-users margin-left', '.fc-title', false);
      }
    },
    dateClick ({ date }) {
      date = moment(date);

      this.$store.commit('SET_ADD_ASSIGNMENT_MODAL_VALUES', { dueDate: date });
      this.$store.commit('SET_ADD_EXAM_MODAL_VALUES', { date });

      this.$toast.open({
        message:
          'Add a new assignment or exam with the buttons below the calendar!',
        position: 'is-bottom-left'
      });
    }
  }
};
