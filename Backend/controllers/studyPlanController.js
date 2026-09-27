const StudyPlan = require('../models/StudyPlan');
const User = require('../models/User');

// @desc    Create a new study plan
// @route   POST /api/study-plan
// @access  Private (Student)
const createStudyPlan = async (req, res) => {
    try {
        const { studyHoursPerDay, subjects } = req.body;

        if (!subjects || subjects.length === 0) {
            return res.status(400).json({ success: false, error: 'Please add at least one subject' });
        }

        // Validate that all subjects have topics
        const subjectsWithoutTopics = subjects.filter(s => !s.topics || s.topics.length === 0);
        if (subjectsWithoutTopics.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Please upload PDFs for all subjects. Missing topics for: ${subjectsWithoutTopics.map(s => s.name).join(', ')}` 
            });
        }

        console.log('[Controller] Generating detailed timetable...');
        
        // Get today's date in Sri Lankan timezone (UTC+5:30)
        const now = new Date();
        const sriLankaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
        const localTime = new Date(now.getTime() + (sriLankaOffset * 60 * 1000));
        const localToday = new Date(localTime.getFullYear(), localTime.getMonth(), localTime.getDate());

        console.log('[Controller] Current UTC time:', now.toISOString());
        console.log('[Controller] Sri Lanka time:', localTime.toISOString());
        console.log('[Controller] Today (Sri Lanka):', localToday.toDateString());

        // Calculate daysUntilExam for each subject (needed for timetable generation)
        const subjectsWithDays = subjects.map(sub => {
            const exam = new Date(sub.examDate + 'T00:00:00+05:30'); // Parse as Sri Lanka time
            const examLocal = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
            const daysUntilExam = Math.max(1, Math.ceil((examLocal - localToday) / (1000 * 60 * 60 * 24)));
            
            console.log(`[Controller] Subject: ${sub.name}`);
            console.log(`[Controller] Exam date: ${examLocal.toDateString()}`);
            console.log(`[Controller] Days until exam: ${daysUntilExam}`);
            
            return {
                ...sub,
                daysUntilExam,
                todayDate: localToday
            };
        });
        
        // Generate detailed day-by-day timetable
        const { generateDetailedTimetable } = require('../services/aiService');
        let timetable;
        
        try {
            timetable = await generateDetailedTimetable(studyHoursPerDay, subjectsWithDays);
            console.log('[Controller] Timetable generated successfully');
        } catch (aiError) {
            console.error('[Controller] AI timetable generation failed:', aiError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to generate study timetable. Please try again.' 
            });
        }

        // Calculate urgency scores for generatedPlan (backward compatibility)
        let totalScore = 0;
        const subjectCalculations = subjectsWithDays.map(sub => {
            let daysLeft = sub.daysUntilExam;
            if (daysLeft < 0) daysLeft = 0;
            if (daysLeft === 0) daysLeft = 0.5;

            let urgency = 10 / (daysLeft + 1);
            if (sub.isWeak) {
                urgency *= 1.5;
            }

            return {
                ...sub,
                daysLeft,
                score: urgency
            };
        });

        totalScore = subjectCalculations.reduce((acc, curr) => acc + curr.score, 0);

        // Generate simple plan for backward compatibility
        const generatedPlan = subjectCalculations.map(sub => {
            const ratio = totalScore > 0 ? sub.score / totalScore : 0;
            const minutes = Math.round(studyHoursPerDay * 60 * ratio);

            return {
                subject: sub.name,
                examDate: sub.examDate,
                allocatedMinutes: minutes,
                isWeak: sub.isWeak,
                daysLeft: sub.daysLeft,
                tasks: []
            };
        });

        generatedPlan.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

        const nextExamDays = generatedPlan.length > 0 ? Math.min(...generatedPlan.map(p => p.daysLeft)) : 0;

        // Delete existing plan
        const existingPlan = await StudyPlan.findOne({ user: req.user.id });
        if (existingPlan) {
            await StudyPlan.findOneAndDelete({ user: req.user.id });
        }

        // Create new plan with timetable
        const plan = await StudyPlan.create({
            user: req.user.id,
            studyHoursPerDay,
            subjects: subjectsWithDays,
            timetable,
            generatedPlan,
            daysUntilNextExam: nextExamDays
        });

        console.log('[Controller] Study plan created with timetable');

        // Auto-sync to Google Calendar if connected
        try {
            const Student = require('../models/Student');
            const calendarService = require('../services/calendarService');

            const student = await Student.findOne({ user: req.user.id }).select('+googleAccessToken +googleRefreshToken');

            if (student && student.googleCalendarConnected) {
                let tokens = {
                    access_token: student.googleAccessToken,
                    refresh_token: student.googleRefreshToken,
                    expiry_date: student.googleTokenExpiry
                };

                if (new Date() >= new Date(student.googleTokenExpiry)) {
                    const newTokens = await calendarService.refreshAccessToken(student.googleRefreshToken);
                    tokens = newTokens;

                    student.googleAccessToken = newTokens.access_token;
                    student.googleTokenExpiry = new Date(newTokens.expiry_date);
                    await student.save();
                }

                await calendarService.createStudyPlanEvents(tokens, plan);
            }
        } catch (calendarError) {
            console.error('Calendar sync error:', calendarError);
        }

        res.status(201).json({
            success: true,
            data: plan
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get current user's study plan
// @route   GET /api/study-plan
// @access  Private (Student)
const getStudyPlan = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'No study plan found' });
        }

        // Recalculate days left on read (simple update)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find next exam days
        const daysUntilNext = plan.subjects.reduce((min, sub) => {
            const exam = new Date(sub.examDate);
            const diff = Math.ceil((exam - today) / (1000 * 3600 * 24));
            return (diff >= 0 && diff < min) ? diff : min;
        }, 9999);

        if (plan.daysUntilNextExam !== daysUntilNext && daysUntilNext !== 9999) {
            plan.daysUntilNextExam = daysUntilNext;
            await plan.save();
        }

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add a task to a subject
// @route   POST /api/study-plan/task
// @access  Private (Student)
const addTask = async (req, res) => {
    try {
        const { subjectName, taskText } = req.body;
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        const subjectEntry = plan.generatedPlan.find(item => item.subject === subjectName);
        if (!subjectEntry) {
            return res.status(404).json({ success: false, error: 'Subject not found in plan' });
        }

        subjectEntry.tasks.push({ text: taskText, isCompleted: false });
        await plan.save();

        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

//update tasks
// @desc    Toggle task completion status
// @route   PATCH /api/study-plan/task/:taskId
// @access  Private (Student)
const toggleTask = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        // Find the task across all subjects
        let taskFound = false;
        for (const subject of plan.generatedPlan) {
            const task = subject.tasks.id(req.params.taskId);
            if (task) {
                task.isCompleted = !task.isCompleted;
                taskFound = true;
                break;
            }
        }

        if (!taskFound) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        await plan.save();
        res.status(200).json({ success: true, data: plan });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Delete study plan
// @route   DELETE /api/study-plan
// @access  Private (Student)
const deleteStudyPlan = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'No study plan found' });
        }

        // Delete Google Calendar events if connected
        try {
            const Student = require('../models/Student');
            const calendarService = require('../services/calendarService');

            const student = await Student.findOne({ user: req.user.id }).select('+googleAccessToken +googleRefreshToken');

            if (student && student.googleCalendarConnected) {
                let tokens = {
                    access_token: student.googleAccessToken,
                    refresh_token: student.googleRefreshToken,
                    expiry_date: student.googleTokenExpiry
                };

                // Refresh token if expired
                if (new Date() >= new Date(student.googleTokenExpiry)) {
                    const newTokens = await calendarService.refreshAccessToken(student.googleRefreshToken);
                    tokens = newTokens;

                    student.googleAccessToken = newTokens.access_token;
                    student.googleTokenExpiry = new Date(newTokens.expiry_date);
                    await student.save();
                }

                // Delete calendar events
                await calendarService.deleteStudyPlanEvents(tokens, plan);
                console.log('Calendar events deleted successfully');
            }
        } catch (calendarError) {
            console.error('Calendar deletion error:', calendarError);
            // Continue with plan deletion even if calendar deletion fails
        }

        // Delete the study plan
        await StudyPlan.findOneAndDelete({ user: req.user.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Log study time for today
// @route   POST /api/study-plan/log-time
// @access  Private (Student)
const logStudyTime = async (req, res) => {
    try {
        const { hours, minutes } = req.body;

        if (hours === undefined || minutes === undefined) {
            return res.status(400).json({ success: false, error: 'Please provide hours and minutes' });
        }

        const plan = await StudyPlan.findOne({ user: req.user.id });
        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate total minutes
        const totalMinutes = (parseInt(hours) * 60) + parseInt(minutes);
        const dailyGoalMinutes = plan.studyHoursPerDay * 60;

        // Check if there's a pending missed time to add
        let adjustedGoalMinutes = dailyGoalMinutes;
        if (plan.pendingMissedTime && plan.pendingMissedTime.isActive) {
            const pendingMinutes = (plan.pendingMissedTime.hours * 60) + plan.pendingMissedTime.minutes;
            adjustedGoalMinutes += pendingMinutes;
        }

        const goalMet = totalMinutes >= adjustedGoalMinutes;

        // Check if log for today already exists
        const existingLogIndex = plan.dailyLogs.findIndex(log => {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        if (existingLogIndex !== -1) {
            // Update existing log
            plan.dailyLogs[existingLogIndex] = {
                date: today,
                hoursStudied: parseInt(hours),
                minutesStudied: parseInt(minutes),
                totalMinutes,
                goalMet
            };
        } else {
            // Add new log
            plan.dailyLogs.push({
                date: today,
                hoursStudied: parseInt(hours),
                minutesStudied: parseInt(minutes),
                totalMinutes,
                goalMet
            });
        }

        // If goal not met, calculate missed time for suggestion
        if (!goalMet) {
            const missedMinutes = adjustedGoalMinutes - totalMinutes;
            const missedHours = Math.floor(missedMinutes / 60);
            const missedMins = missedMinutes % 60;

            plan.pendingMissedTime = {
                hours: missedHours,
                minutes: missedMins,
                fromDate: today,
                isActive: true
            };
        } else {
            // Goal met, clear pending missed time
            plan.pendingMissedTime = {
                hours: 0,
                minutes: 0,
                fromDate: null,
                isActive: false
            };
        }

        await plan.save();

        res.status(200).json({
            success: true,
            data: {
                plan,
                goalMet,
                totalMinutes,
                goalMinutes: adjustedGoalMinutes
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get today's study progress
// @route   GET /api/study-plan/today-progress
// @access  Private (Student)
const getTodayProgress = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });
        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's log
        const todayLog = plan.dailyLogs.find(log => {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        const dailyGoalMinutes = plan.studyHoursPerDay * 60;
        let adjustedGoalMinutes = dailyGoalMinutes;

        // Add pending missed time if active
        if (plan.pendingMissedTime && plan.pendingMissedTime.isActive) {
            const pendingMinutes = (plan.pendingMissedTime.hours * 60) + plan.pendingMissedTime.minutes;
            adjustedGoalMinutes += pendingMinutes;
        }

        res.status(200).json({
            success: true,
            data: {
                todayLog: todayLog || null,
                dailyGoalMinutes,
                adjustedGoalMinutes,
                pendingMissedTime: plan.pendingMissedTime
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Handle missed goal suggestion response (accept/decline)
// @route   POST /api/study-plan/missed-goal-response
// @access  Private (Student)
const handleMissedGoalResponse = async (req, res) => {
    try {
        const { accept } = req.body;

        const plan = await StudyPlan.findOne({ user: req.user.id });
        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        if (!plan.pendingMissedTime || !plan.pendingMissedTime.isActive) {
            return res.status(400).json({ success: false, error: 'No pending missed time suggestion' });
        }

        if (accept) {
            // Keep the pending missed time active (it will be added to today's goal)
            // It's already set, so we just acknowledge it
            res.status(200).json({
                success: true,
                message: 'Missed time will be added to your next study session',
                data: plan
            });
        } else {
            // Clear the pending missed time
            plan.pendingMissedTime = {
                hours: 0,
                minutes: 0,
                fromDate: null,
                isActive: false
            };
            await plan.save();

            res.status(200).json({
                success: true,
                message: 'Missed time suggestion declined',
                data: plan
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Extract topics from uploaded PDF
// @route   POST /api/study-plan/extract-topics
// @access  Private (Student)
const extractTopicsFromPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Please upload a PDF file' });
        }

        console.log('[Controller] Processing PDF:', req.file.originalname, 'Size:', req.file.size);

        const { smartExtractText } = require('../services/ocrService');
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // Use smart extraction (tries regular first, then OCR)
        let extractedText = '';
        let extractionMethod = 'unknown';
        
        try {
            console.log('[Controller] Using smart extraction (regular + OCR fallback)...');
            const result = await smartExtractText(req.file.buffer);
            extractedText = result.text;
            extractionMethod = result.method;
            
            console.log('[Controller] Extraction method:', extractionMethod);
            console.log('[Controller] Pages:', result.pages);
            console.log('[Controller] Text length:', extractedText.length);
            console.log('[Controller] First 300 chars:', extractedText.substring(0, 300));
            
        } catch (extractError) {
            console.error('[Controller] Extraction error:', extractError.message);
            return res.status(400).json({ 
                success: false, 
                error: 'Failed to read PDF. The file may be corrupted or in an unsupported format.' 
            });
        }

        if (!extractedText || extractedText.trim().length < 50) {
            console.log('[Controller] Insufficient text extracted');
            return res.status(400).json({ 
                success: false, 
                error: 'Could not extract enough text from PDF. Please ensure the PDF contains readable content or try a different file.' 
            });
        }

        // Upload to Cloudinary for storage (optional, for future reference)
        const { cloudinary } = require('../middleware/uploadMiddleware');
        let pdfUrl = '';
        
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'raw', folder: 'study-materials' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            pdfUrl = uploadResult.secure_url;
            console.log('[Controller] PDF uploaded to Cloudinary:', pdfUrl);
        } catch (uploadError) {
            console.error('[Controller] Cloudinary upload warning:', uploadError.message);
            // Continue even if upload fails
        }

        // Extract topics using AI
        try {
            console.log('[Controller] Sending to AI for topic extraction...');
            
            // Check if API key exists
            if (!process.env.GROQ_API_KEY) {
                console.error('[Controller] GROQ_API_KEY not found in environment variables');
                return res.status(500).json({ 
                    success: false, 
                    error: 'AI service not configured. Please contact support.' 
                });
            }
            
            const prompt = `Extract all topics, chapters, and concepts from this educational document.

DOCUMENT TEXT:
${extractedText.substring(0, 8000)}

Return ONLY a JSON array of topic strings. Each topic should be clear and concise.
Example: ["Cell Structure", "Photosynthesis", "DNA Replication", "Mitosis and Meiosis"]

Topics:`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are an expert at extracting educational topics from documents. Return only JSON arrays of topic strings, no explanations.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
                max_tokens: 1500,
            });

            let response = completion.choices[0]?.message?.content || '[]';
            console.log('[Controller] AI response:', response);
            
            response = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            
            const start = response.indexOf('[');
            const end = response.lastIndexOf(']');
            
            if (start !== -1 && end !== -1) {
                const topics = JSON.parse(response.substring(start, end + 1));
                
                if (Array.isArray(topics) && topics.length > 0) {
                    console.log('[Controller] Successfully extracted', topics.length, 'topics');
                    return res.status(200).json({
                        success: true,
                        topics,
                        pdfUrl,
                        extractionMethod // Tell frontend if OCR was used
                    });
                }
            }

            console.log('[Controller] No topics found in AI response');
            return res.status(400).json({ 
                success: false, 
                error: 'Could not identify topics from the PDF content. Please ensure the PDF contains educational material with clear topics or chapters.' 
            });

        } catch (aiError) {
            console.error('[Controller] AI extraction error:', aiError);
            console.error('[Controller] AI error details:', {
                message: aiError.message,
                stack: aiError.stack,
                name: aiError.name
            });
            
            // Check for specific error types
            if (aiError.message?.includes('API key')) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'AI service authentication failed. Please contact support.' 
                });
            }
            
            if (aiError.message?.includes('rate limit') || aiError.message?.includes('429')) {
                // Extract wait time if available
                const waitTimeMatch = aiError.message.match(/try again in (\d+m\d+)/);
                const waitTime = waitTimeMatch ? waitTimeMatch[1] : '10 minutes';
                
                return res.status(429).json({ 
                    success: false, 
                    error: `AI service daily limit reached. Please try again in ${waitTime}. This is a temporary limitation of the free tier.` 
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                error: `AI service error: ${aiError.message}. Please try again or contact support if the issue persists.` 
            });
        }

    } catch (error) {
        console.error('[Controller] Extract topics error:', error);
        res.status(500).json({ success: false, error: 'Server error while processing PDF. Please try again.' });
    }
};

// @desc    Toggle task completion in timetable
// @route   PATCH /api/study-plan/timetable/task/:day/:taskIndex
// @access  Private (Student)
const toggleTimetableTask = async (req, res) => {
    try {
        const { day, taskIndex } = req.params;
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan || !plan.timetable) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        const daySchedule = plan.timetable.dailySchedule.find(d => d.day === parseInt(day));
        if (!daySchedule) {
            return res.status(404).json({ success: false, error: 'Day not found in schedule' });
        }

        const task = daySchedule.tasks[parseInt(taskIndex)];
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        // Toggle completion
        task.isCompleted = !task.isCompleted;
        task.completedAt = task.isCompleted ? new Date() : null;

        // Update day completion status and minutes
        const completedTasks = daySchedule.tasks.filter(t => t.isCompleted);
        daySchedule.completedMinutes = completedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
        daySchedule.isCompleted = completedTasks.length === daySchedule.tasks.length;

        // Update subject summary
        const subjectSummary = plan.timetable.subjectSummary.find(s => s.subject === task.subject);
        if (subjectSummary) {
            // Recalculate completed minutes for this subject
            let completedMinutes = 0;
            plan.timetable.dailySchedule.forEach(day => {
                day.tasks.forEach(t => {
                    if (t.subject === task.subject && t.isCompleted) {
                        completedMinutes += t.durationMinutes;
                    }
                });
            });
            subjectSummary.completedMinutes = completedMinutes;
        }

        await plan.save();

        res.status(200).json({ success: true, data: plan });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get timetable for specific day or range
// @route   GET /api/study-plan/timetable?day=1 or ?from=1&to=7
// @access  Private (Student)
const getTimetable = async (req, res) => {
    try {
        const { day, from, to } = req.query;
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan || !plan.timetable) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        let schedule;
        if (day) {
            // Get specific day
            schedule = plan.timetable.dailySchedule.find(d => d.day === parseInt(day));
            if (!schedule) {
                return res.status(404).json({ success: false, error: 'Day not found' });
            }
        } else if (from && to) {
            // Get range of days
            schedule = plan.timetable.dailySchedule.filter(
                d => d.day >= parseInt(from) && d.day <= parseInt(to)
            );
        } else {
            // Get all
            schedule = plan.timetable.dailySchedule;
        }

        res.status(200).json({
            success: true,
            data: {
                schedule,
                summary: plan.timetable.subjectSummary,
                totalDays: plan.timetable.totalDays
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get overall progress statistics
// @route   GET /api/study-plan/progress
// @access  Private (Student)
const getProgress = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan || !plan.timetable) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        // Calculate overall progress
        const totalTasks = plan.timetable.dailySchedule.reduce((sum, day) => sum + day.tasks.length, 0);
        const completedTasks = plan.timetable.dailySchedule.reduce((sum, day) => 
            sum + day.tasks.filter(t => t.isCompleted).length, 0
        );

        const totalMinutes = plan.timetable.dailySchedule.reduce((sum, day) => sum + day.totalMinutes, 0);
        const completedMinutes = plan.timetable.dailySchedule.reduce((sum, day) => sum + day.completedMinutes, 0);

        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate days completed
        const completedDays = plan.timetable.dailySchedule.filter(d => d.isCompleted).length;

        // Get current day (based on creation date)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const planStart = new Date(plan.createdAt);
        planStart.setHours(0, 0, 0, 0);
        const daysSinceStart = Math.ceil((today - planStart) / (1000 * 60 * 60 * 24)) + 1;
        const currentDay = Math.min(daysSinceStart, plan.timetable.totalDays);

        // Get today's schedule
        const todaySchedule = plan.timetable.dailySchedule.find(d => d.day === currentDay);

        res.status(200).json({
            success: true,
            data: {
                overall: {
                    totalTasks,
                    completedTasks,
                    totalMinutes,
                    completedMinutes,
                    completionPercentage,
                    totalDays: plan.timetable.totalDays,
                    completedDays,
                    currentDay
                },
                todaySchedule,
                subjectProgress: plan.timetable.subjectSummary.map(s => ({
                    ...s.toObject(),
                    completionPercentage: s.totalMinutes > 0 
                        ? Math.round((s.completedMinutes / s.totalMinutes) * 100) 
                        : 0
                }))
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update study plan (regenerates timetable)
// @route   PUT /api/study-plan
// @access  Private (Student)
const updateStudyPlan = async (req, res) => {
    try {
        const { studyHoursPerDay, subjects } = req.body;

        if (!subjects || subjects.length === 0) {
            return res.status(400).json({ success: false, error: 'Please add at least one subject' });
        }

        // Validate that all subjects have topics
        const subjectsWithoutTopics = subjects.filter(s => !s.topics || s.topics.length === 0);
        if (subjectsWithoutTopics.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Please upload PDFs for all subjects. Missing topics for: ${subjectsWithoutTopics.map(s => s.name).join(', ')}` 
            });
        }

        console.log('[Controller] Updating study plan and regenerating timetable...');
        
        // Get today's date in Sri Lankan timezone (UTC+5:30)
        const now = new Date();
        const sriLankaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
        const localTime = new Date(now.getTime() + (sriLankaOffset * 60 * 1000));
        const localToday = new Date(localTime.getFullYear(), localTime.getMonth(), localTime.getDate());

        // Calculate daysUntilExam for each subject (needed for timetable generation)
        const subjectsWithDays = subjects.map(sub => {
            const exam = new Date(sub.examDate + 'T00:00:00+05:30'); // Parse as Sri Lanka time
            const examLocal = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
            const daysUntilExam = Math.max(1, Math.ceil((examLocal - localToday) / (1000 * 60 * 60 * 24)));
            
            return {
                ...sub,
                daysUntilExam,
                todayDate: localToday
            };
        });
        
        // Generate new timetable
        const { generateDetailedTimetable } = require('../services/aiService');
        let timetable;
        
        try {
            timetable = await generateDetailedTimetable(studyHoursPerDay, subjectsWithDays);
            console.log('[Controller] Timetable regenerated successfully');
        } catch (aiError) {
            console.error('[Controller] Timetable regeneration failed:', aiError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to regenerate study timetable. Please try again.' 
            });
        }

        // Calculate urgency scores for generatedPlan (backward compatibility)
        let totalScore = 0;
        const subjectCalculations = subjectsWithDays.map(sub => {
            let daysLeft = sub.daysUntilExam;
            if (daysLeft < 0) daysLeft = 0;
            if (daysLeft === 0) daysLeft = 0.5;

            let urgency = 10 / (daysLeft + 1);
            if (sub.isWeak) {
                urgency *= 1.5;
            }

            return {
                ...sub,
                daysLeft,
                score: urgency
            };
        });

        totalScore = subjectCalculations.reduce((acc, curr) => acc + curr.score, 0);

        // Generate simple plan for backward compatibility
        const generatedPlan = subjectCalculations.map(sub => {
            const ratio = totalScore > 0 ? sub.score / totalScore : 0;
            const minutes = Math.round(studyHoursPerDay * 60 * ratio);

            return {
                subject: sub.name,
                examDate: sub.examDate,
                allocatedMinutes: minutes,
                isWeak: sub.isWeak,
                daysLeft: sub.daysLeft,
                tasks: []
            };
        });

        generatedPlan.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

        const nextExamDays = generatedPlan.length > 0 ? Math.min(...generatedPlan.map(p => p.daysLeft)) : 0;

        // Update existing plan
        const plan = await StudyPlan.findOneAndUpdate(
            { user: req.user.id },
            {
                studyHoursPerDay,
                subjects: subjectsWithDays,
                timetable,
                generatedPlan,
                daysUntilNextExam: nextExamDays
            },
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found' });
        }

        console.log('[Controller] Study plan updated with new timetable');

        res.status(200).json({
            success: true,
            data: plan
        });

    } catch (error) {
        console.error('[Controller] Update study plan error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add/Update note for a specific day
// @route   PUT /api/study-plan/timetable/note/:day
// @access  Private (Student)
const updateDayNote = async (req, res) => {
    try {
        const { day } = req.params;
        const { note } = req.body;

        console.log(`[Note] Updating note for day ${day}:`, note?.substring(0, 50));

        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'No study plan found' });
        }

        const daySchedule = plan.timetable.dailySchedule.find(d => d.day === parseInt(day));

        if (!daySchedule) {
            return res.status(404).json({ success: false, error: 'Day not found' });
        }

        daySchedule.note = note || '';
        daySchedule.noteUpdatedAt = new Date();

        await plan.save();

        console.log(`[Note] Note saved for day ${day}`);

        res.status(200).json({
            success: true,
            data: daySchedule
        });
    } catch (error) {
        console.error('[Note] Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get all notes (Study Journal)
// @route   GET /api/study-plan/journal
// @access  Private (Student)
const getStudyJournal = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user.id });

        if (!plan) {
            return res.status(404).json({ success: false, error: 'No study plan found' });
        }

        console.log('[Journal] Plan found, checking timetable...');
        console.log('[Journal] Has timetable:', !!plan.timetable);
        console.log('[Journal] Has dailySchedule:', !!plan.timetable?.dailySchedule);
        console.log('[Journal] Daily schedule length:', plan.timetable?.dailySchedule?.length || 0);

        // Check if timetable exists
        if (!plan.timetable || !plan.timetable.dailySchedule) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        // Filter days that have notes
        const journal = plan.timetable.dailySchedule
            .filter(day => {
                const hasNote = day.note && day.note.trim() !== '';
                if (hasNote) {
                    console.log(`[Journal] Day ${day.day} has note:`, day.note.substring(0, 50));
                }
                return hasNote;
            })
            .map(day => ({
                day: day.day,
                date: day.date,
                note: day.note,
                noteUpdatedAt: day.noteUpdatedAt,
                totalMinutes: day.totalMinutes,
                completedMinutes: day.completedMinutes,
                isCompleted: day.isCompleted,
                tasks: day.tasks.map(t => ({
                    subject: t.subject,
                    topic: t.topic,
                    type: t.type,
                    isCompleted: t.isCompleted
                }))
            }));

        console.log('[Journal] Returning', journal.length, 'journal entries');

        res.status(200).json({
            success: true,
            data: journal
        });
    } catch (error) {
        console.error('[Journal] Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
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
};
