const Groq = require('groq-sdk');
const pdf = require('pdf-parse');
const axios = require('axios');
const JSON5 = require('json5');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extractTextFromPDF = async (url) => {
    try {
        console.log('[AI] Downloading PDF from:', url);
        const response = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 30000,
            maxContentLength: 50 * 1024 * 1024 // 50MB max
        });
        
        console.log('[AI] PDF downloaded, size:', response.data.length, 'bytes');
        
        const dataBuffer = Buffer.from(response.data);
        
        // Try to parse PDF with different options
        const options = {
            max: 0, // Parse all pages
            version: 'v2.0.550' // Specify pdf.js version
        };
        
        const data = await pdf(dataBuffer, options);
        
        console.log('[AI] PDF parsed successfully');
        console.log('[AI] Number of pages:', data.numpages);
        console.log('[AI] Text length:', data.text?.length || 0);
        
        if (!data.text || data.text.trim().length < 50) {
            console.log('[AI] Extracted text too short or empty');
            console.log('[AI] First 200 chars:', data.text?.substring(0, 200));
            
            // Try to extract from metadata or info
            if (data.info && data.info.Title) {
                console.log('[AI] Using PDF title as fallback:', data.info.Title);
                return data.info.Title;
            }
            
            return '';
        }
        
        console.log('[AI] Successfully extracted text, first 200 chars:', data.text.substring(0, 200));
        return data.text || '';
        
    } catch (error) {
        console.error('[AI] PDF extraction failed:', error.message);
        console.error('[AI] Error details:', error);
        return '';
    }
};

const cleanText = (text) => {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
};

const extractTopicsFromText = async (subjectName, documentText) => {
    if (!documentText || documentText.length < 50) {
        console.log(`[AI] No text for ${subjectName}, skipping topic extraction`);
        return [];
    }

    const prompt = `Extract all topics, chapters, and concepts from this document.

DOCUMENT TEXT:
${documentText.substring(0, 6000)}

Return ONLY a JSON array of topic strings. No explanations.
Example: ["Cell Structure", "Photosynthesis", "DNA Replication"]

Topics:`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You extract topics from educational content. Return only JSON arrays of topic strings.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 1000,
        });

        let response = completion.choices[0]?.message?.content || '[]';
        response = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        const start = response.indexOf('[');
        const end = response.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            const topics = JSON.parse(response.substring(start, end + 1));
            console.log(`[AI] Extracted ${topics.length} topics from ${subjectName}`);
            return Array.isArray(topics) ? topics : [];
        }
        return [];
    } catch (error) {
        console.error(`[AI] Topic extraction failed for ${subjectName}:`, error.message);
        return [];
    }
};

const generateStudyPlan = async (studyHoursPerDay, subjects, materials) => {
    try {
        console.log('[AI] Step 1: Extracting topics from materials...');
        
        const subjectsWithTopics = await Promise.all(
            subjects.map(async (subject) => {
                const subjectMaterials = materials.filter(m => m.subject === subject.name);
                
                if (subjectMaterials.length === 0) {
                    console.log(`[AI] No materials for ${subject.name}`);
                    return { ...subject, topics: [], hasContent: false };
                }

                const allTopics = [];
                for (const material of subjectMaterials) {
                    const cleanedText = cleanText(material.extractedText || '');
                    const topics = await extractTopicsFromText(subject.name, cleanedText);
                    allTopics.push(...topics);
                }

                const uniqueTopics = [...new Set(allTopics)];
                console.log(`[AI] ${subject.name}: ${uniqueTopics.length} unique topics`);
                
                return {
                    ...subject,
                    topics: uniqueTopics,
                    hasContent: uniqueTopics.length > 0
                };
            })
        );

        console.log('[AI] Step 2: Generating timetable from extracted topics...');

        const subjectList = subjectsWithTopics.map(s => {
            const topicList = s.topics.length > 0 
                ? s.topics.join(', ')
                : 'No topics extracted';
            return `- "${s.name}" (Exam: ${new Date(s.examDate).toDateString()})
  Topics: ${topicList}`;
        }).join('\n\n');

        const prompt = `Create a study timetable using these EXACT topics.

DAILY CAPACITY: ${studyHoursPerDay} hours (${studyHoursPerDay * 60} minutes total)
MAXIMUM TASKS PER DAY: 4 tasks (distribute topics across multiple days)

SUBJECTS WITH EXTRACTED TOPICS:
${subjectList}

CRITICAL RULES:
1. Use ONLY the topics listed above - one task per topic
2. LIMIT: Maximum 4 tasks per day across ALL subjects
3. Distribute topics evenly across available days until exam
4. Each study task: 45-60 minutes
5. Schedule revision tasks in the final 30% of days before exam
6. Each revision task: 30-45 minutes
7. Daily total should be close to ${studyHoursPerDay * 60} minutes but never exceed it

DISTRIBUTION STRATEGY:
- Calculate days available for each subject
- Use first 70% of days for studying new topics (max 4 topics/day)
- Use last 30% of days for revision sessions
- Spread topics across days - don't overload any single day

Return ONLY valid JSON (no markdown):
[
  {
    "subject": "Subject Name",
    "tasks": [
      { "text": "Study: Topic Name", "dayNumber": 1, "durationMinutes": 60, "type": "study" },
      { "text": "Study: Another Topic", "dayNumber": 2, "durationMinutes": 60, "type": "study" },
      { "text": "Revision: Topic Name", "dayNumber": 10, "durationMinutes": 45, "type": "revision" }
    ]
  }
]`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You create study timetables using provided topics. Output only JSON.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 4096,
        });

        let rawText = completion.choices[0]?.message?.content || '';
        console.log('[AI] Timetable generated, parsing response...');

        rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const start = rawText.indexOf('[');
        const end = rawText.lastIndexOf(']');
        if (start === -1 || end === -1) {
            console.error('[AI] No JSON array found');
            throw new Error('AI did not return a valid study plan');
        }

        const parsed = JSON.parse(rawText.substring(start, end + 1));

        if (!Array.isArray(parsed)) {
            throw new Error('AI response was not an array');
        }

        // Post-process to enforce constraints
        const processedPlan = parsed.map(sub => ({
            subject: (sub.subject || '').trim(),
            summary: sub.summary || '',
            tasks: (sub.tasks || []).map(t => ({
                text: t.text || 'Study session',
                dayNumber: typeof t.dayNumber === 'number' ? t.dayNumber : 1,
                durationMinutes: typeof t.durationMinutes === 'number' ? t.durationMinutes : 60,
                type: t.type === 'revision' ? 'revision' : 'study'
            }))
        }));

        // Validate and redistribute if needed
        const dailyTaskCount = {};
        const dailyMinutes = {};
        const maxMinutesPerDay = studyHoursPerDay * 60;

        // Count tasks per day
        processedPlan.forEach(subject => {
            subject.tasks.forEach(task => {
                const day = task.dayNumber;
                dailyTaskCount[day] = (dailyTaskCount[day] || 0) + 1;
                dailyMinutes[day] = (dailyMinutes[day] || 0) + task.durationMinutes;
            });
        });

        // Check if redistribution is needed
        const needsRedistribution = Object.values(dailyTaskCount).some(count => count > 4) ||
                                    Object.values(dailyMinutes).some(mins => mins > maxMinutesPerDay);

        if (needsRedistribution) {
            console.log('[AI] Plan exceeds constraints, redistributing tasks...');
            return redistributeTasks(processedPlan, studyHoursPerDay, subjects);
        }

        return processedPlan;

    } catch (error) {
        console.error('[AI] generateStudyPlan error:', error.message);
        throw error;
    }
};

/**
 * Generate a fallback timetable when AI fails
 * Handles multiple subjects with different exam dates
 * Each subject is only studied until its exam date
 * EVERY day must have exactly studyHoursPerDay worth of tasks
 * @param {number} studyHoursPerDay 
 * @param {Array} subjects 
 * @returns {Object}
 */
const generateFallbackTimetable = (studyHoursPerDay, subjects) => {
    console.log('[Fallback] Generating balanced timetable...');
    console.log('[Fallback] Study hours per day:', studyHoursPerDay);
    console.log('[Fallback] Number of subjects:', subjects.length);
    
    const firstSubject = subjects[0];
    const localToday = firstSubject.todayDate || new Date();
    
    console.log('[Fallback] Today (Sri Lanka):', localToday.toDateString());
    
    const maxDays = Math.max(...subjects.map(s => s.daysUntilExam));
    const totalDays = Math.max(maxDays, 1);
    
    console.log('[Fallback] Days until latest exam:', maxDays);
    console.log('[Fallback] Total timetable days:', totalDays);
    
    const dailyMinutes = studyHoursPerDay * 60;
    console.log('[Fallback] Target daily minutes (EXACT):', dailyMinutes);
    const dailySchedule = [];
    const subjectSummary = [];
    
    // Initialize all days
    for (let day = 0; day < totalDays; day++) {
        const date = new Date(localToday);
        date.setDate(date.getDate() + day);
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        dailySchedule.push({
            day: day + 1,
            date: dateStr,
            tasks: [],
            note: '',
            noteUpdatedAt: null,
            totalMinutes: 0,
            completedMinutes: 0,
            isCompleted: false
        });
    }
    
    // Sort subjects by exam date (earliest first)
    const sortedSubjects = [...subjects].sort((a, b) => a.daysUntilExam - b.daysUntilExam);
    
    console.log('[Fallback] Subjects sorted by exam date:');
    sortedSubjects.forEach(s => {
        console.log(`  - ${s.name}: ${s.daysUntilExam} days, ${s.topics?.length || 0} topics`);
    });
    
    // Calculate urgency scores for each subject
    const subjectsWithScores = sortedSubjects.map(subject => {
        const topics = subject.topics || [];
        const daysLeft = subject.daysUntilExam;
        let urgency = 10 / (daysLeft + 1);
        
        if (subject.isWeak) {
            urgency *= 1.5;
        }
        
        return {
            ...subject,
            topics,
            urgency,
            daysLeft,
            examDay: daysLeft // Day number when exam happens (1-indexed)
        };
    });
    
    // Calculate total urgency score
    const totalUrgency = subjectsWithScores.reduce((sum, s) => sum + s.urgency, 0);
    
    // Allocate time per subject based on urgency and available days
    const subjectsWithTime = subjectsWithScores.map(subject => {
        const timeRatio = subject.urgency / totalUrgency;
        const availableDays = subject.examDay; // Only study until exam day
        const totalMinutesForSubject = Math.round(dailyMinutes * availableDays * timeRatio);
        const topicCount = subject.topics.length;
        
        // 70% for study, 30% for revision (within available days)
        const studyDays = Math.ceil(availableDays * 0.7);
        const revisionDays = availableDays - studyDays;
        
        const studyMinutes = Math.round(totalMinutesForSubject * 0.7);
        const revisionMinutes = totalMinutesForSubject - studyMinutes;
        
        const minutesPerTopic = topicCount > 0 ? Math.round(studyMinutes / topicCount) : 0;
        
        console.log(`[Fallback] ${subject.name}: Exam on day ${subject.examDay}, ${topicCount} topics, ${studyDays} study days, ${revisionDays} revision days`);
        
        return {
            ...subject,
            availableDays,
            studyDays,
            revisionDays,
            totalMinutesForSubject,
            studyMinutes,
            revisionMinutes,
            minutesPerTopic
        };
    });
    
    // Create study tasks for each subject (tagged with max day they can appear)
    const allStudyTasks = [];
    subjectsWithTime.forEach(subject => {
        subject.topics.forEach(topic => {
            allStudyTasks.push({
                subject: subject.name,
                topic: topic,
                type: 'study',
                durationMinutes: subject.minutesPerTopic,
                description: `Study ${topic}`,
                isCompleted: false,
                maxDay: subject.studyDays, // Can only appear in first 70% of subject's days
                examDay: subject.examDay
            });
        });
    });
    
    console.log(`[Fallback] Total study tasks to distribute: ${allStudyTasks.length}`);
    
    // Distribute study tasks across days, respecting each subject's exam date
    let taskIndex = 0;
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dayScheduleItem = dailySchedule[dayNum - 1];
        let dayMinutesUsed = 0;
        
        // Get available subjects for this day (only subjects whose exam hasn't happened yet)
        const availableSubjects = subjectsWithTime.filter(s => dayNum <= s.examDay);
        
        if (availableSubjects.length === 0) {
            // All exams done, fill with general revision of all subjects
            console.log(`[Fallback] Day ${dayNum}: All exams done, adding general revision`);
            
            const minutesPerSubject = Math.floor(dailyMinutes / subjectsWithTime.length);
            const remainder = dailyMinutes % subjectsWithTime.length;
            
            subjectsWithTime.forEach((subject, subIdx) => {
                let revisionDuration = minutesPerSubject;
                if (subIdx < remainder) {
                    revisionDuration += 1;
                }
                
                dayScheduleItem.tasks.push({
                    subject: subject.name,
                    topic: `Final Revision - ${subject.name}`,
                    type: 'revision',
                    durationMinutes: revisionDuration,
                    description: `Final comprehensive revision for ${subject.name}`,
                    isCompleted: false
                });
            });
            
            dayScheduleItem.totalMinutes = dailyMinutes;
            continue; // Move to next day
        }
        
        // Fill this day to EXACTLY dailyMinutes with available tasks
        while (dayMinutesUsed < dailyMinutes) {
            // Find next available task for this day
            let foundTask = false;
            
            for (let i = taskIndex; i < allStudyTasks.length; i++) {
                const task = allStudyTasks[i];
                
                // Check if this task's subject is still available on this day
                if (dayNum <= task.maxDay && dayNum <= task.examDay) {
                    const remainingMinutes = dailyMinutes - dayMinutesUsed;
                    const taskCopy = { ...task };
                    
                    // Adjust duration if needed
                    if (taskCopy.durationMinutes > remainingMinutes) {
                        taskCopy.durationMinutes = remainingMinutes;
                    }
                    
                    dayScheduleItem.tasks.push(taskCopy);
                    dayMinutesUsed += taskCopy.durationMinutes;
                    
                    // Remove this task from the list
                    allStudyTasks.splice(i, 1);
                    foundTask = true;
                    break;
                }
            }
            
            // If no study task found, add revision for available subjects
            if (!foundTask) {
                const remainingMinutes = dailyMinutes - dayMinutesUsed;
                
                // Distribute remaining time among available subjects
                const minutesPerSubject = Math.floor(remainingMinutes / availableSubjects.length);
                const remainder = remainingMinutes % availableSubjects.length;
                
                availableSubjects.forEach((subject, idx) => {
                    let revisionDuration = minutesPerSubject;
                    if (idx < remainder) {
                        revisionDuration += 1;
                    }
                    
                    if (revisionDuration > 0) {
                        dayScheduleItem.tasks.push({
                            subject: subject.name,
                            topic: `Revision - ${subject.name}`,
                            type: 'revision',
                            durationMinutes: revisionDuration,
                            description: `Comprehensive revision for ${subject.name}`,
                            isCompleted: false
                        });
                        
                        dayMinutesUsed += revisionDuration;
                    }
                });
                
                break; // Day is filled
            }
        }
        
        dayScheduleItem.totalMinutes = dailyMinutes;
        console.log(`[Fallback] Day ${dayNum}: ${dayScheduleItem.tasks.length} tasks, ${dayScheduleItem.totalMinutes}min, subjects: ${[...new Set(dayScheduleItem.tasks.map(t => t.subject))].join(', ')}`);
    }
    
    // Fill any remaining empty days (after all exams) with general revision of all subjects
    dailySchedule.forEach((day, idx) => {
        if (day.tasks.length === 0) {
            console.log(`[Fallback] Day ${day.day} is empty (after all exams), adding general revision`);
            
            const minutesPerSubject = Math.floor(dailyMinutes / subjectsWithTime.length);
            const remainder = dailyMinutes % subjectsWithTime.length;
            
            subjectsWithTime.forEach((subject, subIdx) => {
                let revisionDuration = minutesPerSubject;
                if (subIdx < remainder) {
                    revisionDuration += 1;
                }
                
                day.tasks.push({
                    subject: subject.name,
                    topic: `Final Revision - ${subject.name}`,
                    type: 'revision',
                    durationMinutes: revisionDuration,
                    description: `Final comprehensive revision for ${subject.name}`,
                    isCompleted: false
                });
            });
            
            day.totalMinutes = dailyMinutes;
        }
    });
    
    // Calculate subject summary
    subjects.forEach(subject => {
        let studySessions = 0;
        let revisionSessions = 0;
        let totalMinutes = 0;
        
        dailySchedule.forEach(day => {
            day.tasks.forEach(task => {
                if (task.subject === subject.name) {
                    if (task.type === 'study') {
                        studySessions++;
                    } else {
                        revisionSessions++;
                    }
                    totalMinutes += task.durationMinutes;
                }
            });
        });
        
        subjectSummary.push({
            subject: subject.name,
            totalTopics: subject.topics?.length || 0,
            studySessions,
            revisionSessions,
            totalMinutes,
            completedMinutes: 0
        });
    });
    
    console.log('[Fallback] Generated timetable with', dailySchedule.length, 'days');
    
    // Verify all days have exact dailyMinutes
    const emptyDays = dailySchedule.filter(d => d.tasks.length === 0).length;
    const incorrectDays = dailySchedule.filter(d => d.totalMinutes !== dailyMinutes).length;
    
    console.log('[Fallback] Empty days:', emptyDays, '(should be 0)');
    console.log('[Fallback] Days with incorrect minutes:', incorrectDays, '(should be 0)');
    console.log('[Fallback] All days have exactly', dailyMinutes, 'minutes:', incorrectDays === 0 && emptyDays === 0);
    
    // Log subject distribution per day
    console.log('[Fallback] Subject distribution:');
    sortedSubjects.forEach(subject => {
        const subjectDays = dailySchedule.filter(d => 
            d.tasks.some(t => t.subject === subject.name)
        );
        console.log(`  - ${subject.name}: appears in ${subjectDays.length} days (exam on day ${subject.daysUntilExam})`);
    });
    
    return {
        totalDays: dailySchedule.length,
        dailySchedule,
        subjectSummary
    };
};

/**
 * Generate a detailed day-by-day study timetable with topics
 * Simple deterministic algorithm - supports up to 3 subjects
 * @param {number} studyHoursPerDay - Daily study hours
 * @param {Array} subjects - Array of subjects with topics and exam dates
 * @returns {Object} - Detailed timetable with daily schedule
 */
const generateDetailedTimetable = async (studyHoursPerDay, subjects) => {
    try {
        console.log('[AI] Generating timetable using deterministic algorithm...');
        console.log(`[AI] Subjects: ${subjects.length}`);
        
        subjects.forEach(subject => {
            console.log(`[AI] - ${subject.name}: ${subject.daysUntilExam} days, ${subject.topics?.length || 0} topics`);
        });
        
        // Use fallback algorithm (supports multiple subjects)
        const timetable = generateFallbackTimetable(studyHoursPerDay, subjects);
        
        console.log('[AI] Timetable generated successfully');
        console.log('[AI] Total days:', timetable.totalDays);
        console.log('[AI] First 3 days:', timetable.dailySchedule.slice(0, 3).map(d => 
            `Day ${d.day} (${d.date}): ${d.tasks.length} tasks, ${d.totalMinutes}min`
        ));
        
        return timetable;

    } catch (error) {
        console.error('[AI] generateDetailedTimetable error:', error.message);
        throw error;
    }
};

module.exports = { generateStudyPlan, extractTextFromPDF, generateDetailedTimetable };
