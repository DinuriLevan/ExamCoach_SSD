import React, { useState, useEffect } from 'react';
import { Upload, FileText, Save, Clock, RefreshCw, File, Loader2, Trash2, Search, Sparkles, BookOpen, Download } from 'lucide-react';

const AILearningLab = () => {
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'text'
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [summary, setSummary] = useState('');
    const [currentTitle, setCurrentTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [relatedResources, setRelatedResources] = useState([]);
    const [activeResultTab, setActiveResultTab] = useState('summary'); // 'summary', 'resources'
    const [deletingHistoryId, setDeletingHistoryId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [summaryType, setSummaryType] = useState('paragraph');

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

        return parsedResources
            .map((resource) => {
                if (!resource) return null;

                const title = String(resource.title || resource.name || '').trim();
                const link = String(resource.link || resource.url || '').trim();
                const rawType = String(resource.type || '').toLowerCase();

                if (!title || !link) return null;

                let type = 'other';
                if (rawType === 'youtube' || /youtube\.com|youtu\.be/i.test(link)) {
                    type = 'youtube';
                } else if (rawType === 'website') {
                    type = 'website';
                }

                return { title, link, type };
            })
            .filter(Boolean);
    };

    const summaryTypeOptions = [
        {
            value: 'paragraph',
            label: 'Paragraph Summary (Executive Summary)',
            description: 'A standard, written paragraph that explains the main ideas in a flowing story format.'
        },
        {
            value: 'qa',
            label: 'Q&A Style (Flashcard Ready)',
            description: 'A list of Questions and Answers based on the most important facts.'
        },
        {
            value: 'glossary',
            label: 'Key Terms & Definitions (Glossary)',
            description: 'Important vocabulary words with simple definitions.'
        },
        {
            value: 'exam',
            label: '"Exam Focus" Summary',
            description: 'Highlights formulas, dates, main arguments, or rules most likely to appear on a test.'
        }
    ];

    const selectedSummaryOption = summaryTypeOptions.find((option) => option.value === summaryType);

    const escapeHtml = (value) =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const splitSentences = (content) => {
        if (!content) return [];
        return content
            .split(/(?<=[.!?])\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean)
            .slice(0, 5);
    };

    const renderSummaryContent = () => {
        if (!summary) return null;

        if (summaryType === 'qa') {
            const blocks = summary
                .split(/\n\s*\n/)
                .map((block) => block.trim())
                .filter(Boolean);

            return (
                <div className="space-y-4">
                    {blocks.map((block, index) => {
                        const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
                        const questionLine = lines.find((line) => line.toLowerCase().startsWith('q:'));
                        const answerLine = lines.find((line) => line.toLowerCase().startsWith('a:'));

                        return (
                            <div key={index} className="rounded-2xl border border-brand-50 bg-brand-50/40 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-xl bg-brand-700/10 p-2 text-brand-700">🧠</div>
                                    <div className="space-y-2 text-base text-gray-700">
                                        <div className="font-semibold text-gray-900">
                                            Q{index + 1}. {questionLine ? questionLine.replace(/^Q:\s*/i, '') : `Question ${index + 1}`}
                                        </div>
                                        {answerLine && (
                                            <div className="rounded-xl bg-white px-3 py-2 text-gray-600 shadow-sm">
                                                <span className="font-semibold">Answer:</span> {answerLine.replace(/^A:\s*/i, '')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (summaryType === 'glossary') {
            const terms = summary
                .split(/\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const [term, ...rest] = line.split(':');
                    return {
                        term: term?.trim(),
                        definition: rest.join(':').trim()
                    };
                })
                .filter((entry) => entry.term);

            return (
                <div className="grid gap-3">
                    {terms.map((entry, index) => (
                        <div key={index} className="rounded-2xl border border-brand-50 bg-brand-50/40 p-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-xl bg-brand-700/10 p-2 text-brand-700">📘</div>
                                <div>
                                    <div className="text-base font-semibold text-gray-900">{entry.term}</div>
                                    <div className="text-base text-gray-600 mt-1">{entry.definition || 'Definition not provided.'}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (summaryType === 'exam') {
            const points = summary
                .split(/\n/)
                .map((line) => line.replace(/^•\s*/, '').trim())
                .filter(Boolean);

            return (
                <div className="space-y-3">
                    {points.map((point, index) => (
                        <div key={index} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-xl bg-amber-500/10 p-2 text-amber-600">🎯</div>
                                <div className="text-base text-gray-700">
                                    <span className="font-semibold">{index + 1}.</span> {point}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        const keyPoints = splitSentences(summary);
        return (
            <div className="space-y-5">
                {keyPoints.length > 0 && (
                    <div className="rounded-2xl border border-brand-50 bg-brand-50 p-5">
                        <div className="flex items-center gap-2 text-base font-semibold text-gray-700 mb-3">
                            ✨ Key Points
                        </div>
                        <div className="space-y-2">
                            {keyPoints.map((point, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <span className="h-6 w-6 rounded-full bg-brand-700 text-white text-xs font-semibold flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <span className="text-base text-gray-700">{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-brand-50 bg-white p-5 text-base text-gray-700 leading-relaxed">
                    <span className="font-semibold">📌 Summary:</span> {summary}
                </div>
            </div>
        );
    };

    const getWordCount = (content) => {
        if (!content || typeof content !== 'string') return 0;
        return content.trim().split(/\s+/).filter(Boolean).length;
    };

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user ? user.id : null;

    useEffect(() => {
        if (userId) {
            fetchHistory();
        }
    }, [userId]);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/ai/history/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 3) {
            setError('You can upload up to 3 PDF files.');
            setFiles(selectedFiles.slice(0, 3));
        } else {
            setError(null);
            setFiles(selectedFiles);
        }
        setSummary('');
        setRelatedResources([]);
        setCurrentTitle('');
        setSelectedHistoryId(null);
        setActiveResultTab('summary');
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
    };

    const handleSummarize = async () => {
        if (!text.trim() && files.length === 0) {
            setError('Please enter text or upload a PDF to summarize.');
            return;
        }

        setLoading(true);
        setError(null);
        setSummary('');
        setRelatedResources([]);
        setSelectedHistoryId(null);
        setActiveResultTab('summary');

        const formData = new FormData();
        if (activeTab === 'text' && text) {
            formData.append('text', text);
            setCurrentTitle(text.substring(0, 30) + (text.length > 30 ? '...' : ''));
        } else if (activeTab === 'upload' && files.length > 0) {
            files.forEach((selectedFile) => {
                formData.append('files', selectedFile);
            });
            if (files.length === 1) {
                setCurrentTitle(files[0].name);
            } else if (files.length === 2) {
                setCurrentTitle(`${files[0].name} + ${files[1].name}`);
            } else {
                setCurrentTitle(`${files[0].name} + ${files[1].name} +${files.length - 2} more`);
            }
        }
        formData.append('summaryType', summaryType);

        try {
            // Note: Ensure backend allows just file or just text
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/ai/summarize', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to summarize text');
            }

            setSummary(data.summary || '');

            const normalizedResources =
                normalizeRelatedResources(data.relatedResources).length > 0
                    ? normalizeRelatedResources(data.relatedResources)
                    : normalizeRelatedResources(data.resources);

            setRelatedResources(normalizedResources);
            if (data.relatedResources && data.relatedResources.length > 0) {
                // specific logic if needed, but we start at summary tab
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!summary) return;

        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('title', currentTitle || 'New Summary');
            formData.append('summary', summary);
            formData.append('summaryType', summaryType);
            formData.append('relatedResources', JSON.stringify(relatedResources));
            formData.append('type', activeTab === 'upload' ? 'pdf' : 'text');

            if (activeTab === 'text') {
                formData.append('originalText', text);
            } else if (files.length > 0) {
                formData.append('file', files[0]);
            }

            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/ai/save', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                fetchHistory(); // Refresh list
                alert('Summary saved!');
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            console.error(err);
            setError("Failed to save summary.");
        }
    };

    const handleDownloadSummary = () => {
        if (!summary) {
            setError('No summary available to download.');
            return;
        }

        const title = currentTitle || 'AI Summary';
        const summaryTypeLabel = selectedSummaryOption?.label || 'Summary';
        const buildSummaryHtml = () => {
            if (summaryType === 'qa') {
                const blocks = summary
                    .split(/\n\s*\n/)
                    .map((block) => block.trim())
                    .filter(Boolean);

                return blocks
                    .map((block, index) => {
                        const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
                        const questionLine = lines.find((line) => line.toLowerCase().startsWith('q:'));
                        const answerLine = lines.find((line) => line.toLowerCase().startsWith('a:'));
                        const question = escapeHtml(questionLine ? questionLine.replace(/^Q:\s*/i, '') : `Question ${index + 1}`);
                        const answer = escapeHtml(answerLine ? answerLine.replace(/^A:\s*/i, '') : '');

                        return `
                            <div class="card">
                                <div class="icon">🧠</div>
                                <div>
                                    <div class="title">Q${index + 1}. ${question}</div>
                                    ${answer ? `<div class="pill"><strong>Answer:</strong> ${answer}</div>` : ''}
                                </div>
                            </div>
                        `;
                    })
                    .join('');
            }

            if (summaryType === 'glossary') {
                const terms = summary
                    .split(/\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                        const [term, ...rest] = line.split(':');
                        return {
                            term: term?.trim(),
                            definition: rest.join(':').trim()
                        };
                    })
                    .filter((entry) => entry.term);

                return terms
                    .map((entry) => `
                        <div class="card">
                            <div class="icon">📘</div>
                            <div>
                                <div class="title">${escapeHtml(entry.term)}</div>
                                <div class="body">${escapeHtml(entry.definition || 'Definition not provided.')}</div>
                            </div>
                        </div>
                    `)
                    .join('');
            }

            if (summaryType === 'exam') {
                const points = summary
                    .split(/\n/)
                    .map((line) => line.replace(/^•\s*/, '').trim())
                    .filter(Boolean);

                return points
                    .map((point, index) => `
                        <div class="card">
                            <div class="icon">🎯</div>
                            <div class="body"><strong>${index + 1}.</strong> ${escapeHtml(point)}</div>
                        </div>
                    `)
                    .join('');
            }

            const keyPoints = splitSentences(summary)
                .map((point, index) => `
                    <div class="list-item">
                        <span class="num">${index + 1}</span>
                        <span>${escapeHtml(point)}</span>
                    </div>
                `)
                .join('');

            return `
                ${keyPoints ? `
                    <div class="section">
                        <div class="section-title">✨ Key Points</div>
                        ${keyPoints}
                    </div>
                ` : ''}
                <div class="section">
                    <div class="section-title">📌 Summary</div>
                    <div class="body">${escapeHtml(summary).replace(/\n/g, '<br/>')}</div>
                </div>
            `;
        };

        const formattedSummary = buildSummaryHtml();
        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            setError('Popup blocked. Please allow popups to download the PDF.');
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>${escapeHtml(title)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                        h1 { font-size: 22px; margin: 0 0 8px; }
                        .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
                        .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 999px; padding: 4px 10px; font-size: 11px; margin-bottom: 16px; }
                        .summary { font-size: 14px; line-height: 1.6; }
                        .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-bottom: 12px; display: flex; gap: 12px; background: #f8fafc; }
                        .icon { font-size: 18px; }
                        .title { font-weight: 600; color: #0f172a; margin-bottom: 6px; }
                        .body { color: #475569; }
                        .pill { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 10px; color: #475569; }
                        .section { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-bottom: 12px; }
                        .section-title { font-weight: 600; margin-bottom: 8px; }
                        .list-item { display: flex; gap: 10px; margin-bottom: 6px; }
                        .num { height: 22px; width: 22px; border-radius: 999px; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
                    </style>
                </head>
                <body>
                    <h1>${escapeHtml(title)}</h1>
                    <div class="meta">Generated on ${new Date().toLocaleDateString()}</div>
                    <div class="badge">${escapeHtml(summaryTypeLabel)}</div>
                    <div class="summary">${formattedSummary}</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        }, 300);
    };

    const loadHistoryItem = (item) => {
        setSelectedHistoryId(item._id);
        setSummary(item.summary);
        setRelatedResources(normalizeRelatedResources(item.relatedResources));
        setCurrentTitle(item.title);
        setSummaryType(item.summaryType || 'paragraph');
        setActiveResultTab('summary');
        setActiveTab(item.type === 'pdf' ? 'upload' : 'text');
        if (item.type === 'text') {
            setText(item.originalContent);
            setFiles([]);
        } else {
            // For PDF, simply show upload tab state, but we can't set file input value programmatically
            setText('');
            setFiles([]);
        }
    };

    const handleDeleteHistoryItem = async (e, itemId) => {
        e.stopPropagation();

        if (!userId || deletingHistoryId === itemId) return;

        const confirmed = window.confirm('Delete this saved note from history?');
        if (!confirmed) return;

        try {
            setDeletingHistoryId(itemId);
            setError(null);

            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/ai/history/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to delete history item');
            }

            if (selectedHistoryId === itemId) {
                setSelectedHistoryId(null);
                setSummary('');
                setRelatedResources([]);
                setCurrentTitle('');
                setText('');
                setFiles([]);
                setActiveResultTab('summary');
            }

            setHistory((prev) => prev.filter((item) => item._id !== itemId));
        } catch (err) {
            setError(err.message || 'Failed to delete history item.');
        } finally {
            setDeletingHistoryId(null);
        }
    };

    const filteredHistory = history.filter((item) => {
        if (!searchTerm.trim()) return true;
        return String(item.title || '')
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase());
    });

    return (
        <div className="relative min-h-[calc(100vh-64px)] bg-brand-50 overflow-hidden font-['Manrope',sans-serif]">
            <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl"></div>
        
            <div className="px-8 pb-10">
                <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                                    <Clock size={16} className="text-brand-700" />
                                    History (My Notes)
                                </h2>
                                <span className="text-[11px] bg-brand-50 text-gray-600 px-2 py-1 rounded-full">{history.length}</span>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search summaries..."
                                    className="w-full rounded-xl border border-gray-200 bg-brand-50 pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                                />
                            </div>

                            <div className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-brand-700"></div>
                                My Notes
                            </div>

                            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                                {filteredHistory.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm bg-brand-50 rounded-2xl border border-dashed border-gray-200">
                                        No history yet.
                                    </div>
                                ) : (
                                    filteredHistory.map(item => (
                                        <div
                                            key={item._id}
                                            onClick={() => loadHistoryItem(item)}
                                            className={`group p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${selectedHistoryId === item._id ? 'bg-brand-50 border-brand-300 shadow-sm' : 'bg-white border-gray-200/60 hover:bg-brand-50'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-1 p-2 rounded-xl ${item.type === 'pdf' ? 'bg-brand-50 text-brand-700' : 'bg-brand-50 text-brand-700'}`}>
                                                    {item.type === 'pdf' ? <FileText size={16} /> : <File size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className={`text-sm font-medium truncate ${selectedHistoryId === item._id ? 'text-brand-900' : 'text-gray-700'}`}>{item.title}</h4>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteHistoryItem(e, item._id)}
                                                            disabled={deletingHistoryId === item._id}
                                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-brand-700 hover:bg-brand-50 transition disabled:opacity-40"
                                                            title="Delete note"
                                                        >
                                                            {deletingHistoryId === item._id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={14} />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] uppercase">
                                                            {item.summaryType || 'paragraph'}
                                                        </span>
                                                        <span>{getWordCount(item.summary)} Words</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-8">
                        <div className="flex flex-col gap-6">
                            {/* Input Card */}
                            <div className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-brand-50 flex items-start justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <BookOpen size={18} className="text-brand-700" />
                                            Generate Summary
                                        </h2>
                                        <p className="text-xs text-brand-700 mt-1">Upload your study materials and let our AI generate concise summaries.</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-brand-50 bg-brand-50/60">
                                    <button
                                        onClick={() => setActiveTab('upload')}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white text-brand-700 border-b-2 border-brand-700' : 'text-brand-700 hover:text-gray-700 hover:bg-white/60'}`}
                                    >
                                        <Upload size={16} /> Upload PDF
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('text')}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-white text-brand-700 border-b-2 border-brand-700' : 'text-brand-700 hover:text-gray-700 hover:bg-white/60'}`}
                                    >
                                        <FileText size={16} /> Paste Text
                                    </button>
                                </div>

                                <div className="p-6 flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600">Summary Type</label>
                                        <div className="mt-2">
                                            <select
                                                value={summaryType}
                                                onChange={(e) => setSummaryType(e.target.value)}
                                                disabled={selectedHistoryId !== null}
                                                className={`w-full rounded-2xl border border-gray-200 bg-brand-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300 ${selectedHistoryId !== null ? 'cursor-not-allowed opacity-70' : ''}`}
                                            >
                                                {summaryTypeOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {activeTab === 'upload' ? (
                                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-brand-300 rounded-2xl bg-brand-50/40 hover:bg-white hover:border-brand-300 transition-all">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                                                <Upload className="w-8 h-8 text-brand-700" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                                            <p className="text-xs text-gray-400 mb-5">PDF files only (max 10MB)</p>

                                            <input
                                                type="file"
                                                id="file-upload"
                                                accept=".pdf"
                                                multiple
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-50 transition-all shadow-sm"
                                            >
                                                Choose File
                                            </label>
                                            {files.length > 0 && (
                                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-brand-700">
                                                    {files.map((selectedFile) => (
                                                        <div key={selectedFile.name} className="flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-50">
                                                            <File size={14} />
                                                            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <textarea
                                            className="w-full min-h-[260px] p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-300 focus:border-transparent resize-none bg-brand-50 focus:bg-white transition-colors text-sm"
                                            placeholder="Paste your lecture notes or text here..."
                                            value={text}
                                            onChange={handleTextChange}
                                        ></textarea>
                                    )}

                                    {error && <p className="text-brand-700 text-sm text-center bg-brand-50 py-2 rounded-xl">{error}</p>}

                                    <button
                                        onClick={handleSummarize}
                                        disabled={loading}
                                        className="w-full bg-brand-700 text-white font-semibold py-3 px-4 rounded-2xl hover:bg-brand-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                                        {loading ? 'Analyzing Content...' : 'Generate New Summary'}
                                    </button>
                                </div>
                            </div>

                            {/* Output Card */}
                            <div className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-5 pt-5 pb-3 border-b border-brand-50 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">AI Summary Preview</h3>
                                        <p className="text-xs text-brand-700 mt-1">AI Generated • {new Date().toLocaleDateString()}</p>
                                        {selectedSummaryOption && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center text-[11px] font-semibold text-brand-900 bg-brand-50 border border-brand-50 px-2.5 py-1 rounded-full">
                                                    {selectedSummaryOption.label}
                                                </span>
                                                <span className="text-[11px] text-brand-700">
                                                    {selectedSummaryOption.description}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleDownloadSummary} className="flex items-center gap-1.5 bg-white text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 hover:bg-brand-50 transition-colors shadow-sm">
                                            <Download size={14} /> Download PDF
                                        </button>
                                        <button onClick={handleSave} className="flex items-center gap-1.5 bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-brand-900 transition-colors shadow-sm">
                                            <Save size={14} /> Save Note
                                        </button>
                                    </div>
                                </div>

                                {/* Result Tabs */}
                                <div className="flex border-b border-brand-50 bg-white sticky top-0 z-10">
                                    <button
                                        onClick={() => setActiveResultTab('summary')}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeResultTab === 'summary' ? 'border-amber-400 text-amber-800 bg-amber-50/60' : 'border-transparent text-brand-700 hover:text-gray-700 hover:bg-brand-50'}`}
                                    >
                                        Summary
                                    </button>
                                    <button
                                        onClick={() => setActiveResultTab('resources')}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeResultTab === 'resources' ? 'border-brand-300 text-brand-900 bg-brand-50/60' : 'border-transparent text-brand-700 hover:text-gray-700 hover:bg-brand-50'}`}
                                    >
                                        Related Resources
                                    </button>
                                </div>

                                <div className="relative flex-1 p-6 overflow-y-auto bg-gradient-to-br from-brand-50 via-white to-brand-50/40">
                                    {loading ? (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                                        </div>
                                    ) : !summary ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-14 text-gray-400">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                                <FileText size={28} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-600 mb-1">Ready to Summarize</h3>
                                            <p className="max-w-xs text-sm">Upload a document or paste text to see the AI-generated summary here.</p>
                                        </div>
                                    ) : (
                                        activeResultTab === 'summary' ? (
                                            <div className="relative">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200 to-yellow-200 rounded-t-2xl"></div>
                                                <span className="absolute -top-3 left-4 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    AI Summary
                                                </span>
                                                <div className="pt-5">{renderSummaryContent()}</div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {relatedResources.length > 0 ? (
                                                    relatedResources.map((resource, index) => (
                                                        <div key={index} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`p-2 rounded-xl ${resource.type === 'youtube' ? 'bg-brand-50 text-brand-700' : 'bg-brand-50 text-brand-700'}`}>
                                                                    {resource.type === 'youtube' ? (
                                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                                                    ) : (
                                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-gray-900 mb-1">{resource.title}</h4>
                                                                    <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 hover:underline flex items-center gap-1">
                                                                        View Resource <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8 text-brand-700">
                                                        No related resources found.
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AILearningLab;
