import { useEffect, useState } from 'react';
import {
  Video,
  Calendar,
  Clock,
  User,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  FileText,
  Plus,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import {
  interviewApi,
  MockInterviewSummary,
  InterviewGrowthData,
} from '../../api/interview';
import { useToast } from '../../context/ToastContext';

export default function MyInterviewsPage() {
  const { addToast } = useToast();
  const [upcoming, setUpcoming] = useState<MockInterviewSummary[]>([]);
  const [history, setHistory] = useState<MockInterviewSummary[]>([]);
  const [growth, setGrowth] = useState<InterviewGrowthData | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [feedbackModal, setFeedbackModal] = useState<any | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<MockInterviewSummary | null>(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Exam form state
  const [showExamForm, setShowExamForm] = useState(false);
  const [examSubject, setExamSubject] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [isAddingExam, setIsAddingExam] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [schedule, growthData, examList] = await Promise.all([
        interviewApi.getMySchedule().catch(() => []),
        interviewApi.getMyGrowth().catch(() => null),
        interviewApi.getMyAcademicExams().catch(() => []),
      ]);

      const activeStatuses = ['scheduled', 'confirmed', 'rescheduled', 'in_progress', 'interrupted'];
      setUpcoming(schedule.filter((i) => activeStatuses.includes(i.status)));
      setHistory(schedule.filter((i) => !activeStatuses.includes(i.status)));
      setGrowth(growthData);
      setExams(examList);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to load interviews', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFeedback = async (interviewId: string) => {
    try {
      const feedback = await interviewApi.getFeedback(interviewId);
      setFeedbackModal(feedback);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to load feedback', 'error');
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal) return;

    if (!newStartTime || !newEndTime || !rescheduleReason.trim()) {
      addToast('Please provide new start time, end time, and a reason.', 'error');
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      await interviewApi.reschedule(
        rescheduleModal.id,
        new Date(newStartTime).toISOString(),
        new Date(newEndTime).toISOString(),
        rescheduleReason.trim()
      );
      addToast('Interview rescheduled successfully.', 'success');
      setRescheduleModal(null);
      setNewStartTime('');
      setNewEndTime('');
      setRescheduleReason('');
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to reschedule interview', 'error');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubject.trim() || !examStart || !examEnd) {
      addToast('Please fill out all academic exam fields.', 'error');
      return;
    }

    try {
      setIsAddingExam(true);
      await interviewApi.addAcademicExam({
        subject: examSubject.trim(),
        startTime: new Date(examStart).toISOString(),
        endTime: new Date(examEnd).toISOString(),
      });
      addToast('Academic exam schedule recorded. Conflicts will be blocked.', 'success');
      setExamSubject('');
      setExamStart('');
      setExamEnd('');
      setShowExamForm(false);
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save academic exam', 'error');
    } finally {
      setIsAddingExam(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading mock interview schedules & readiness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Video className="w-7 h-7 text-blue-600" />
            Mock Interviews & Evaluations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track scheduled interview sessions, access meeting rooms, inspect rubric-based evaluations, and monitor readiness growth.
          </p>
        </div>

        <button
          onClick={() => setShowExamForm(!showExamForm)}
          className="self-start sm:self-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-2 border border-indigo-200 shadow-sm"
        >
          <BookOpen className="w-4 h-4" />
          {showExamForm ? 'Hide Exam Timetable' : 'Add Academic Exam (Conflict Guard)'}
        </button>
      </div>

      {/* Academic Exam Form (Challenge 116) */}
      {showExamForm && (
        <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Register Academic Exam Timetable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The platform automatically blocks mock interviews with a 5-minute buffer during your university exam hours (Challenge 116).
            </p>
          </div>

          <form onSubmit={handleAddExam} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject / Paper</label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems"
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={examStart}
                onChange={(e) => setExamStart(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={examEnd}
                onChange={(e) => setExamEnd(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingExam}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingExam ? 'Saving...' : 'Add Exam'}</span>
            </button>
          </form>

          {exams.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Registered Exams ({exams.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {exams.map((ex) => (
                  <span
                    key={ex.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700"
                  >
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    <strong>{ex.subject}</strong>: {new Date(ex.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Trends Card (Challenge 125) */}
      {growth && growth.history && growth.history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Performance Trends & Growth Analytics
            </h3>
            <span className="text-xs text-slate-500">
              {growth.summary.totalInterviews} interview(s) evaluated • Avg Score: {growth.summary.averagePercentage}%
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {Object.entries(growth.trends).map(([skill, trend]) => {
              const badgeStyle =
                trend === 'improving'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : trend === 'declining'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <div
                  key={skill}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${badgeStyle}`}
                >
                  <span className="capitalize">{skill.replace(/_/g, ' ')}</span>:
                  <span className="font-bold">
                    {trend === 'improving' ? '▲ Improving' : trend === 'declining' ? '▼ Declining' : '— Stable'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Interviews */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming Sessions ({upcoming.length})
        </h3>

        {upcoming.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm shadow-sm">
            No upcoming mock interviews scheduled. Placement officers and trainers will schedule sessions based on your target roles.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((iv) => (
              <div
                key={iv.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                      {iv.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        iv.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : iv.status === 'rescheduled'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {iv.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(iv.startTime).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Interviewer: {iv.interviewer?.name || 'Assigned Trainer'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {iv.meetingLink ? (
                    <a
                      href={iv.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Join Meeting</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="flex-1 text-xs text-slate-400 italic py-2">
                      Meeting link will be updated shortly
                    </span>
                  )}

                  <button
                    onClick={() => setRescheduleModal(iv)}
                    className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History & Evaluations */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-700" />
          Completed & Past Sessions ({history.length})
        </h3>

        {history.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm shadow-sm">
            No past interview sessions recorded.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Interviewer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((iv) => (
                    <tr key={iv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {new Date(iv.startTime).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>

                      <td className="py-3 px-4 capitalize">{iv.type.replace(/_/g, ' ')}</td>

                      <td className="py-3 px-4">{iv.interviewer?.name || 'Trainer'}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            iv.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : iv.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {iv.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {iv.status === 'completed' ? (
                          <button
                            onClick={() => handleOpenFeedback(iv.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors text-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>View Feedback</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No feedback</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal (Challenges 124, 128) */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Interview Evaluation Feedback
              </h3>
              <span className="text-xs text-slate-400">
                {new Date(feedbackModal.evaluatedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Rubric Criteria Scores */}
            {feedbackModal.scores && Object.keys(feedbackModal.scores).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Scores & Assessment Criteria
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(feedbackModal.scores).map(([k, val]: any) => (
                    <div key={k} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                      <span className="capitalize text-slate-700 font-medium">{k.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {val} / 10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student Comments */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Interviewer Feedback & Recommendations
              </h4>
              <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                {feedbackModal.studentComments || 'No detailed comments provided.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setFeedbackModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal (Challenge 130) */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Reschedule Interview
            </h3>
            <p className="text-xs text-slate-600">
              Propose a new date and time for your {rescheduleModal.type} interview with {rescheduleModal.interviewer?.name}.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Start Time</label>
                <input
                  type="datetime-local"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New End Time</label>
                <input
                  type="datetime-local"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Academic lab clash or medical leave"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
