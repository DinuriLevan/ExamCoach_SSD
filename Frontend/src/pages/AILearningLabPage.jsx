import StudentNavbar from '../components/StudentNavbar';
import Footer from '../components/Footer';
import AILearningLab from '../components/AILearningLab';
import PageHeader from '../components/PageHeader';

const AILearningLabPage = () => {
    return (
        <div className="min-h-screen bg-brand-50 flex flex-col">
            <StudentNavbar />
            <PageHeader
                icon="M13 10V3L4 14h7v7l9-11h-7z"
                title="AI Learning Lab"
                subtitle="Use the power of AI to summarize your study materials and enhance your learning."
            />
            <div className="max-w-screen-2xl mx-auto px-8 py-10 flex-1">
                <AILearningLab />
            </div>
            <Footer />
        </div>
    );
};

export default AILearningLabPage;
