const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studyHoursPerDay: {
        type: Number,
        required: true
    },
    subjects: [{
        name: {
            type: String,
            required: true
        },
        examDate: {
            type: Date,
            required: true
        },
        isWeak: {
            type: Boolean,
            default: false
        },
        topics: [{
            type: String
        }]
    }],
    // Detailed day-by-day timetable
    timetable: {
        totalDays: {
            type: Number,
            default: 0
        },
        dailySchedule: [{
            day: {
                type: Number,
                required: true
            },
            date: {
                type: String,
                required: true
            },
            tasks: [{
                subject: {
                    type: String,
                    required: true
                },
                topic: {
                    type: String,
                    required: true
                },
                type: {
                    type: String,
                    enum: ['study', 'revision'],
                    required: true
                },
                durationMinutes: {
                    type: Number,
                    required: true
                },
                description: {
                    type: String
                },
                isCompleted: {
                    type: Boolean,
                    default: false
                },
                completedAt: {
                    type: Date
                }
            }],
            note: {
                type: String,
                default: ''
            },
            noteUpdatedAt: {
                type: Date
            },
            totalMinutes: {
                type: Number,
                required: true
            },
            completedMinutes: {
                type: Number,
                default: 0
            },
            isCompleted: {
                type: Boolean,
                default: false
            }
        }],
        subjectSummary: [{
            subject: {
                type: String,
                required: true
            },
            totalTopics: {
                type: Number,
                default: 0
            },
            studySessions: {
                type: Number,
                default: 0
            },
            revisionSessions: {
                type: Number,
                default: 0
            },
            totalMinutes: {
                type: Number,
                default: 0
            },
            completedMinutes: {
                type: Number,
                default: 0
            }
        }]
    },
    generatedPlan: [{
        subject: {
            type: String,
            required: true
        },
        examDate: {
            type: Date,
            required: true
        },
        allocatedMinutes: {
            type: Number,
            required: true
        },
        tasks: [{
            text: {
                type: String,
                required: true
            },
            isCompleted: {
                type: Boolean,
                default: false
            }
        }]
    }],
    daysUntilNextExam: {
        type: Number
    },
    dailyLogs: [{
        date: {
            type: Date,
            required: true
        },
        hoursStudied: {
            type: Number,
            required: true,
            default: 0
        },
        minutesStudied: {
            type: Number,
            required: true,
            default: 0
        },
        totalMinutes: {
            type: Number,
            required: true
        },
        goalMet: {
            type: Boolean,
            default: false
        }
    }],
    pendingMissedTime: {
        hours: {
            type: Number,
            default: 0
        },
        minutes: {
            type: Number,
            default: 0
        },
        fromDate: {
            type: Date
        },
        isActive: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
