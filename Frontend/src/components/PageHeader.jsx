/**
 * PageHeader - Unified branded page header for all student-facing pages.
 *
 * Props:
 *  icon     – SVG path string (the `d` attribute) for the header icon
 *  title    – Page title text
 *  subtitle – Subtext below the title
 *  children – Optional extra content (e.g. action buttons) placed right-side
 */
const PageHeader = ({ icon, title, subtitle, children }) => {
    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-700 to-brand-900">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-brand-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                                </svg>
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-white">{title}</h1>
                            {subtitle && <p className="text-white/80 mt-1">{subtitle}</p>}
                        </div>
                    </div>
                    {children && (
                        <div className="flex items-center gap-3">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageHeader;
