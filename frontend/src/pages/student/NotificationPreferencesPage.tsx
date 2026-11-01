import { useEffect, useState } from 'react';
import { notificationApi } from '../../api/notification';
import type { NotificationPreferences } from '../../api/notification';
import { Bell, Mail, Smartphone, ShieldCheck, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'placement_drive', label: 'Placement Drives', desc: 'New drive announcements and major updates' },
  { key: 'application', label: 'Applications', desc: 'Application confirmations, shortlists, and status updates' },
  { key: 'interview', label: 'Interviews & Schedules', desc: 'Interview slots, reminder alerts, and meeting links' },
  { key: 'deadline', label: 'Deadlines & Expiries', desc: 'Urgent 48h and 24h registration deadline reminders' },
  { key: 'eligibility', label: 'Eligibility Status', desc: 'Criteria changes and academic evaluation notifications' },
  { key: 'company_update', label: 'Company Updates', desc: 'Company profile modifications and salary revisions' },
  { key: 'system_announcement', label: 'System Announcements', desc: 'Maintenance alerts and platform announcements' },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    notificationApi
      .getPreferences()
      .then((data) => {
        setPrefs(data);
      })
      .catch((err) => console.error('Failed to load preferences', err))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (category: string, channel: 'email' | 'push') => {
    const currentCat = prefs[category] || { in_app: true, email: true, push: true };
    const nextPrefs = {
      ...prefs,
      [category]: {
        ...currentCat,
        [channel]: !currentCat[channel],
      },
    };
    setPrefs(nextPrefs);

    try {
      await notificationApi.updatePreferences(nextPrefs);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (err) {
      console.error('Failed to update preference', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading communication preferences...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            Communication & Notification Preferences
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage email and push delivery channels across recruitment categories. In-app notifications remain authoritative for critical placement alerts.
          </p>
        </div>
        {savedMessage && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Preferences Saved
          </span>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Critical Placement Alert Bypass (Challenge 139):</strong> Offers, interview conflict warnings, and urgent shortlists with <span className="font-semibold text-rose-700">Critical Priority</span> will automatically bypass non-essential suppression settings to guarantee candidate receipt.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 w-32 text-center">In-App</th>
              <th className="py-3.5 px-4 w-32 text-center">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Email
                </span>
              </th>
              <th className="py-3.5 px-4 w-32 text-center">
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  Push
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {CATEGORIES.map((cat) => {
              const catPref = prefs[cat.key] || { in_app: true, email: false, push: false };
              return (
                <tr key={cat.key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-900">{cat.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Always On
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={catPref.email ?? false}
                      onChange={() => toggle(cat.key, 'email')}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={catPref.push ?? false}
                      onChange={() => toggle(cat.key, 'push')}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
