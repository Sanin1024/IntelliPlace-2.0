import { useEffect, useState } from 'react';
import { trainerApi, type TrainerBatchAssignment, type TrainerTask, type StudentPerformance } from '../../api/trainer';
import { Users, CheckSquare, AlertTriangle, BookOpen, Clock } from 'lucide-react';

export default function TrainerDashboardPage() {
  const [batches, setBatches] = useState<TrainerBatchAssignment[]>([]);
  const [tasks, setTasks] = useState<TrainerTask[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [struggling, setStruggling] = useState<StudentPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      trainerApi.getMyBatches().catch(() => ({ success: false, data: [] })),
      trainerApi.getMyTasks().catch(() => ({ success: false, data: [] })),
    ]).then(([b, t]) => {
      const batchList = (b as any).data || [];
      setBatches(batchList);
      setTasks((t as any).data || []);
      if (batchList.length > 0) {
        loadPerformance(batchList[0].batchId);
      }
    });
  }, []);

  const loadPerformance = async (batchId: number) => {
    try {
      setSelectedBatch(batchId);
      setLoading(true);
      const r = await trainerApi.getBatchPerformance(batchId);
      if (r?.data) {
        setPerformance(r.data.performance || []);
        setStruggling(r.data.struggling || []);
      }
    } catch (err) {
      console.error('Failed to load batch performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (taskId: string) => {
    try {
      setTaskActionLoading(taskId);
      await trainerApi.acknowledgeTask(taskId);
      const updated = await trainerApi.getMyTasks();
      setTasks(updated.data || []);
    } catch (err) {
      console.error('Failed to acknowledge task:', err);
    } finally {
      setTaskActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trainer Management & Batch Operations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your assigned cohorts, monitor struggling candidates, and complete administrative tasks.
          </p>
        </div>
      </div>

      {/* Tasks Overview (Challenge 182) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">My Assigned Tasks</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
            {tasks.filter((t) => t.status === 'pending').length} pending
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No active trainer tasks at this time.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((t) => (
              <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{t.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        t.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : t.status === 'acknowledged'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  {t.deadline && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>Due: {new Date(t.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div>
                  {t.status === 'pending' && (
                    <button
                      onClick={() => handleAcknowledge(t.id)}
                      disabled={taskActionLoading === t.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                    >
                      {taskActionLoading === t.id ? 'Saving...' : 'Acknowledge Task'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Batches (Challenge 176) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Assigned Cohorts & Batches</h2>
        </div>

        {batches.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No active batch assignments found.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => loadPerformance(b.batchId)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  selectedBatch === b.batchId
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {b.batch.name} ({b.role})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Batch Performance & Interventions (Challenges 178, 185) */}
      {selectedBatch && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Cohort Performance & Interventions</h2>
            </div>
            {loading && <span className="text-xs text-gray-400">Loading metrics...</span>}
          </div>

          {/* Struggling Students Alert */}
          {struggling.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Requires Intervention ({struggling.length} Students below 50% threshold):</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {struggling.map((s) => (
                  <span
                    key={s.studentId}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-red-700 border border-red-200 shadow-2xs"
                  >
                    {s.name} ({s.avgScore ?? 0}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Performance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Avg Assessment Score</th>
                  <th className="px-4 py-3">Modules Completed</th>
                  <th className="px-4 py-3">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {performance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No student records found in this batch.
                    </td>
                  </tr>
                ) : (
                  performance.map((p) => (
                    <tr key={p.studentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.email}</td>
                      <td className="px-4 py-3 font-semibold">
                        {p.avgScore !== null ? (
                          <span className={p.avgScore < 50 ? 'text-red-600' : 'text-green-600'}>
                            {p.avgScore}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.completedModules}</td>
                      <td className="px-4 py-3 text-gray-700">{p.attendance}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

