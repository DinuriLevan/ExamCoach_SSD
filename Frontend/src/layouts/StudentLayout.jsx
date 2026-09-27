import StudentNavbar from '../components/StudentNavbar';

const StudentLayout = ({ children, header }) => {
    return (
        <div className="min-h-screen bg-brand-50 flex flex-col">
            <StudentNavbar />
            {header && header}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
