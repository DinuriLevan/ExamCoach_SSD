import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

const UnitList = ({ subjectId, onSelect, selectedId }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!subjectId) {
      setLessons([]);
      return;
    }

    const loadLessons = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/lessons?subjectId=${subjectId}`);
        setLessons(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLessons();
  }, [subjectId]);

  if (!subjectId) return <div className="card muted">Pick a subject to browse lessons.</div>;
  if (loading) return <div className="card">Loading lessons...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <p className="eyebrow">Lessons</p>
        <h3>Unit list</h3>
      </div>
      <ul className="list">
        {lessons.map((lesson) => (
          <li
            key={lesson._id}
            className={`list-item ${selectedId === lesson._id ? 'list-item--active' : ''}`}
            onClick={() => onSelect(lesson)}
          >
            <div>
              <p className="muted">Unit {lesson.unit || 'N/A'}</p>
              <p className="title-sm">{lesson.title}</p>
            </div>
            <span className="pill pill--ghost">{lesson.order ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UnitList;
