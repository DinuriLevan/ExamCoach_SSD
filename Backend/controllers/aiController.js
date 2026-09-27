const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const pdfParse = require("pdf-parse");
const AISummary = require('../models/AISummary');
const { cloudinary } = require('../config/cloudinary');
const stream = require('stream');

dotenv.config();

const normalizeRelatedResources = (resources) => {
    if (!resources) return [];

    let parsedResources = resources;
    if (typeof parsedResources === 'string') {
        try {
            parsedResources = JSON.parse(parsedResources);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(parsedResources)) return [];

    const normalized = parsedResources
        .map((resource) => {
            if (!resource) return null;

            const title = String(
                resource.title || resource.name || resource.label || ''
            ).trim();
            const link = String(
                resource.link || resource.url || resource.href || ''
            ).trim();
            const rawType = String(resource.type || '').toLowerCase();

            if (!title || !link) return null;
            if (!/^https?:\/\//i.test(link)) return null;

            let type = 'other';
            if (rawType === 'youtube' || /youtube\.com|youtu\.be/i.test(link)) {
                type = 'youtube';
            } else if (rawType === 'website') {
                type = 'website';
            }

            return { title, link, type };
        })
        .filter(Boolean);

    return normalized;
};

const extractJsonObject = (text) => {
    if (!text || typeof text !== 'string') return null;

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');

        if (start !== -1 && end !== -1 && end > start) {
            const candidate = cleaned.substring(start, end + 1);
            try {
                return JSON.parse(candidate);
            } catch {
                return null;
            }
        }

        return null;
    }
};

const extractLinksFromText = (text) => {
    if (!text) return [];

    const regex = /(https?:\/\/[^\s)\]}"'>]+)/gi;
    const matches = text.match(regex) || [];
    const unique = [...new Set(matches)].slice(0, 6);

    return unique.map((link, index) => ({
        title: `Related Resource ${index + 1}`,
        link,
        type: /youtube\.com|youtu\.be/i.test(link) ? 'youtube' : 'website'
    }));
};

const parseRelatedResourcesInput = (input) => {
    if (!input) return [];

    if (Array.isArray(input)) return normalizeRelatedResources(input);

    if (typeof input === 'object') {
        return normalizeRelatedResources([input]);
    }

    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            return normalizeRelatedResources(parsed);
        } catch {
            return [];
        }
    }

    return [];
};

const summarizeText = async (req, res) => {
    try {
        let text = req.body.text;
        const summaryType = String(req.body.summaryType || 'paragraph').toLowerCase();

        if (req.files && req.files.length > 0) {
            console.log("Processing PDF files...");
            try {
                const extractedTexts = await Promise.all(
                    req.files.map(async (file) => {
                        const pdfData = await pdfParse(file.buffer);
                        return pdfData.text;
                    })
                );
                text = extractedTexts.filter(Boolean).join("\n\n");
                console.log("PDF Text extracted, length:", text.length);
            } catch (pdfError) {
                console.error("Error parsing PDF:", pdfError);
                return res.status(400).json({ message: "Failed to parse PDF file", error: pdfError.message });
            }
        }

        if (!text) {
            return res.status(400).json({ message: "Text or PDF file is required for summarization" });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing");
            return res.status(500).json({ message: "Server configuration error: API Key missing" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-1.5-flash 
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log("Generating summary with model...");

        // Request structured JSON output
        const summaryStyleMap = {
            paragraph: 'Write a standard, flowing paragraph that explains the main ideas clearly.',
            qa: 'Return summary as an array of objects with keys "question" and "answer".',
            glossary: 'Return summary as an array of objects with keys "term" and "definition".',
            exam: 'Return summary as an array of strings, each string being a bullet-worthy exam fact.'
        };

          const summaryInstruction = summaryStyleMap[summaryType] || summaryStyleMap.paragraph;

        const prompt = `
          Analyze the following text and provide a response in JSON format.
          The JSON object must have two keys:
        1. "summary": A concise summary of the text. ${summaryInstruction}
          2. "relatedResources": An array of at least 3 related study resources found on the web (YouTube videos, articles, documentation).
              Each resource object must have:
              - "title": Title of the resource
              - "link": A valid URL (search for actual relevant links if possible, or generate highly probable search links)
              - "type": One of "youtube", "website", "other"

          Text to analyze:
          ${text}
          `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        const parsedResponse = extractJsonObject(textResponse);

        const rawSummary =
            parsedResponse?.summary ||
            parsedResponse?.result ||
            parsedResponse?.text ||
            textResponse;

        const formatSummaryByType = (value) => {
            if (!value) return '';

            if (summaryType === 'qa') {
                if (Array.isArray(value)) {
                    return value
                        .map((item) => {
                            const question = String(item?.question || item?.q || '').trim();
                            const answer = String(item?.answer || item?.a || '').trim();
                            if (!question && !answer) return null;
                            return `Q: ${question}\nA: ${answer}`.trim();
                        })
                        .filter(Boolean)
                        .join('\n\n');
                }
            }

            if (summaryType === 'glossary') {
                if (Array.isArray(value)) {
                    return value
                        .map((item) => {
                            const term = String(item?.term || item?.key || '').trim();
                            const definition = String(item?.definition || item?.value || '').trim();
                            if (!term && !definition) return null;
                            return `${term}: ${definition}`.trim();
                        })
                        .filter(Boolean)
                        .join('\n');
                }
            }

            if (summaryType === 'exam') {
                if (Array.isArray(value)) {
                    return value
                        .map((item) => String(item || '').trim())
                        .filter(Boolean)
                        .map((item) => `• ${item}`)
                        .join('\n');
                }
            }

            return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        };

        const summary = formatSummaryByType(rawSummary);

        const relatedResourcesCandidates = [
            normalizeRelatedResources(parsedResponse?.relatedResources),
            normalizeRelatedResources(parsedResponse?.resources),
            normalizeRelatedResources(parsedResponse?.related_links)
        ];

        const relatedResources = relatedResourcesCandidates.find(
            (candidate) => Array.isArray(candidate) && candidate.length > 0
        ) || [];

        const fallbackResources = relatedResources.length > 0
            ? relatedResources
            : extractLinksFromText(textResponse);

        console.log("Summary and resources generated successfully");

        res.status(200).json({
            summary,
            relatedResources: fallbackResources
        });
    } catch (error) {
        console.error("Error summarizing text:", error);
        res.status(500).json({ message: "Failed to summarize text", error: error.message });
    }
};

const saveSummary = async (req, res) => {
    try {
        const { title, summary, type, originalText, userId, summaryType } = req.body;
        let originalContent = originalText;
        const parsedRelatedResources = parseRelatedResourcesInput(req.body.relatedResources);

        if (req.file) {
            // Upload to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "ai_learning_lab", resource_type: "auto" },
                async (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        return res.status(500).json({ message: "Upload failed", error });
                    }

                    originalContent = result.secure_url;

                    const newSummary = new AISummary({
                        user: userId,
                        title: title || req.file.originalname,
                        originalContent,
                        summary,
                        summaryType: summaryType || 'paragraph',
                        relatedResources: parsedRelatedResources,
                        type: 'pdf'
                    });

                    await newSummary.save();
                    res.status(201).json(newSummary);
                }
            );

            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);
            bufferStream.pipe(uploadStream);

        } else {
            const newSummary = new AISummary({
                user: userId,
                title: title || 'Text Summary',
                originalContent,
                summary,
                summaryType: summaryType || 'paragraph',
                relatedResources: parsedRelatedResources,
                type: 'text'
            });

            await newSummary.save();
            res.status(201).json(newSummary);
        }

    } catch (error) {
        console.error("Error saving summary:", error);
        res.status(500).json({ message: "Failed to save summary", error: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await AISummary.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Failed to fetch history", error: error.message });
    }
};

const deleteHistoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const deleted = await AISummary.findOneAndDelete({ _id: id, user: userId });

        if (!deleted) {
            return res.status(404).json({ message: 'History item not found' });
        }

        res.status(200).json({ message: 'History item deleted successfully' });
    } catch (error) {
        console.error('Error deleting history item:', error);
        res.status(500).json({ message: 'Failed to delete history item', error: error.message });
    }
};

const updateHistoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, title, summary } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (summary !== undefined) updateData.summary = summary;

        const updated = await AISummary.findOneAndUpdate(
            { _id: id, user: userId },
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'History item not found' });
        }

        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating history item:', error);
        res.status(500).json({ message: 'Failed to update history item', error: error.message });
    }
};

module.exports = { summarizeText, saveSummary, getHistory, deleteHistoryItem, updateHistoryItem };
