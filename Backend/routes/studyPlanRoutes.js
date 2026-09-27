const express = require('express');
const router = express.Router();
const {
    createStudyPlan,
    getStudyPlan,
    deleteStudyPlan,
    addTask,
    toggleTask,
    logStudyTime,
    getTodayProgress,
    handleMissedGoalResponse,
    extractTopicsFromPdf,
    toggleTimetableTask,
    getTimetable,
    getProgress,
    updateStudyPlan,
    updateDayNote,
    getStudyJournal
} = require('../controllers/studyPlanController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, authorize('student'), createStudyPlan)
    .get(protect, authorize('student'), getStudyPlan)
    .put(protect, authorize('student'), updateStudyPlan)
    .delete(protect, authorize('student'), deleteStudyPlan);

router.post('/task', protect, authorize('student'), addTask);
router.patch('/task/:taskId', protect, authorize('student'), toggleTask);

router.post('/log-time', protect, authorize('student'), logStudyTime);
router.get('/today-progress', protect, authorize('student'), getTodayProgress);
router.post('/missed-goal-response', protect, authorize('student'), handleMissedGoalResponse);

router.post('/extract-topics', protect, authorize('student'), upload.single('pdf'), extractTopicsFromPdf);

// Timetable routes
router.get('/timetable', protect, authorize('student'), getTimetable);
router.patch('/timetable/task/:day/:taskIndex', protect, authorize('student'), toggleTimetableTask);
router.put('/timetable/note/:day', protect, authorize('student'), updateDayNote);
router.get('/progress', protect, authorize('student'), getProgress);

// Study Journal
router.get('/journal', protect, authorize('student'), getStudyJournal);

module.exports = router;
