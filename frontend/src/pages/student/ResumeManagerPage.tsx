import { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Share2,
  Lock,
  Edit2,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  Copy,
} from 'lucide-react';
import {
  resumeManagerApi,
  ResumeVersionSummary,
  ResumeFreshnessInfo,
  SkillGapAnalysisResult,
} from '../../api/resumeManager';
import { useToast } from '../../context/ToastContext';

export default function ResumeManagerPage() {
  const { addToast } = useToast();
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [freshness, setFreshness] = useState<ResumeFreshnessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Active / Selected analysis view
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapAnalysisResult | null>(null);
  const [, setIsLoadingAnalysis] = useState(false);
  const [filterState, setFilterState] = useState<'all' | 'demonstrated' | 'declared_not_on_resume' | 'missing'>('all');

  // Share link modal state
  const [shareModal, setShareModal] = useState<{ open: boolean; url: string; expiresAt: string } | null>(null);

  // Label edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelText, setEditLabelText] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await resumeManagerApi.listMyResumes();
      setVersions(data.versions);
      setFreshness(data.freshness);

      // Also load initial skill gap recommendations
      const reco = await resumeManagerApi.getMyRecommendations();
      setSkillGap(reco);

      // Select active version if available
      const active = data.versions.find((v) => v.isActive);
      if (active) {
        setSelectedVersionId(active.id);
        loadVersionAnalysis(active.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to load resume versions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersionAnalysis = async (id: string) => {
    try {
      setIsLoadingAnalysis(true);
      const analysis = await resumeManagerApi.getAnalysis(id);
      setAnalysisData(analysis);
      if (analysis.skillGap) {
        setSkillGap(analysis.skillGap);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      addToast('File exceeds 5MB limit. Please compress or select a smaller PDF/DOCX.', 'error');
      return;
    }

    setFile(selected);
    if (!label) {
      const extName = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name;
      setLabel(extName.replace(/[_-]/g, ' '));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a PDF or DOCX resume to upload.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (label.trim()) {
        formData.append('label', label.trim());
      }

      const res = await resumeManagerApi.uploadResume(formData);
      addToast(res.message || 'Resume uploaded successfully!', 'success');
      setFile(null);
      setLabel('');

      // Refresh list
      await loadData();

      if (res.data?.version?.id) {
        setSelectedVersionId(res.data.version.id);
        loadVersionAnalysis(res.data.version.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to upload resume', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await resumeManagerApi.activateVersion(id);
      addToast(res.message || 'Active resume updated', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to set active version', 'error');
    }
  };

  const handleSaveLabel = async (id: string) => {
    if (!editLabelText.trim()) return;
    try {
      await resumeManagerApi.setLabel(id, editLabelText.trim());
      addToast('Label updated', 'success');
      setEditingId(null);
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update label', 'error');
    }
  };

  const handleShareLink = async (id: string) => {
    try {
      const res = await resumeManagerApi.generateShareLink(id, 7);
      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      setShareModal({
        open: true,
        url: fullUrl,
        expiresAt: new Date(res.expiresAt).toLocaleDateString(),
      });
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to generate share link', 'error');
    }
  };

  const handleConfirmSkills = async () => {
    if (!selectedVersionId || !analysisData?.version?.parsedData?.skills) return;
    try {
      const skillsToSync = analysisData.version.parsedData.skills;
      const summaryToSync = analysisData.version.parsedData.summary;
      const linksToSync = analysisData.version.parsedData.links;

      await resumeManagerApi.confirmParsedData(selectedVersionId, {
        skills: skillsToSync,
        summary: summaryToSync,
        links: linksToSync,
      });

      addToast('Skills imported to Resume Builder! Verified academic records remain protected.', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to sync parsed skills', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading resume versions and alignment data...</p>
        </div>
      </div>
    );
  }

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];
  const privacyFindings = selectedVersion?.privacyScan || [];

  const filteredSkills = skillGap?.categorizedSkills.filter((s) => {
    if (filterState === 'all') return true;
    return s.state === filterState;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          Resume & Profile Manager
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage versioned resumes, inspect deterministic skill parsing, and ensure alignment with live placement drives.
        </p>
      </div>

      {/* Freshness Banner (Challenge 104 / 115) */}
      {freshness?.isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900">
              Resume Freshness Recommendation
            </h4>
            <p className="text-sm text-amber-800">
              {freshness.message ||
                `Your active resume was uploaded ${freshness.daysSinceUpload ?? 'many'} days ago (threshold: ${freshness.thresholdDays} days). Consider updating your resume to reflect recent projects, certifications, and skills.`}
            </p>
            <p className="text-xs text-amber-700 italic">
              Notice: You will never be auto-rejected or disqualified from placement drives due to resume age.
            </p>
          </div>
        </div>
      )}

      {!freshness?.hasActiveResume && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">No Active Resume on File</h4>
            <p className="text-sm text-blue-800 mt-0.5">
              Upload your first resume below. Once uploaded, IntelliPlace will deterministically parse your skills, check for privacy alerts, and attach it to your drive applications.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Upload & Versions list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload New Resume Version
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document File (.pdf or .docx, max 5MB)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-file-input"
                  />
                  <label htmlFor="resume-file-input" className="cursor-pointer block">
                    {file ? (
                      <div className="space-y-1">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                        <p className="text-sm font-medium text-slate-800 truncate max-w-xs mx-auto">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500">
                        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-medium text-slate-700">
                          Click to select or drag file here
                        </p>
                        <p className="text-xs text-slate-400">PDF and DOCX only</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Version Label (Optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. SDE Frontend Focus 2026"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing & Validating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Set Active
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Privacy Scan Warnings (Challenge 113) */}
          {privacyFindings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Privacy & Identity Findings ({privacyFindings.length})
              </h4>
              <p className="text-xs text-red-800">
                The parser detected sensitive identifiers on this resume version. Review before sharing:
              </p>
              <div className="space-y-2">
                {privacyFindings.map((finding, idx) => (
                  <div key={idx} className="bg-white border border-red-100 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-red-700">
                        {finding.type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-medium">
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-slate-700">{finding.description}</p>
                    {finding.matchedSnippet && (
                      <p className="text-slate-500 font-mono text-[11px] bg-slate-50 p-1 rounded">
                        Snippet: {finding.matchedSnippet}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Versions Table & Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Versions Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Resume Versions</h3>
                <p className="text-xs text-slate-500">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} stored • Single active version is attached to new drive applications.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No resume versions uploaded yet.
                </div>
              ) : (
                versions.map((ver) => {
                  const isSelected = ver.id === selectedVersionId;
                  return (
                    <div
                      key={ver.id}
                      className={`p-4 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              v{ver.version}
                            </span>

                            {ver.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                ACTIVE
                              </span>
                            )}

                            {ver.isLocked && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex items-center gap-1" title="Submitted with drive applications (immutable snapshot)">
                                <Lock className="w-3 h-3" />
                                Locked ({ver.applicationsCount} drive{ver.applicationsCount > 1 ? 's' : ''})
                              </span>
                            )}

                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                ver.parseStatus === 'parsed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ver.parseStatus === 'needs_review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ver.parseStatus}
                            </span>
                          </div>

                          {editingId === ver.id ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={editLabelText}
                                onChange={(e) => setEditLabelText(e.target.value)}
                                className="text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleSaveLabel(ver.id)}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {ver.label}
                              </p>
                              {!ver.isLocked && (
                                <button
                                  onClick={() => {
                                    setEditingId(ver.id);
                                    setEditLabelText(ver.label);
                                  }}
                                  className="text-slate-400 hover:text-slate-600"
                                  title="Edit Label"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{ver.originalName}</span>
                            <span>•</span>
                            <span>{(ver.fileSize / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ver.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedVersionId(ver.id);
                              loadVersionAnalysis(ver.id);
                            }}
                            className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Inspect parsed skills & gap analysis"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Analysis</span>
                          </button>

                          {!ver.isActive && (
                            <button
                              onClick={() => handleActivate(ver.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                            >
                              Set Active
                            </button>
                          )}

                          <button
                            onClick={() => resumeManagerApi.downloadVersion(ver.id, ver.originalName)}
                            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title="Download document stream"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleShareLink(ver.id)}
                            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title="Generate temporary share link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Analysis & Skill Gap Inspector Drawer */}
          {selectedVersion && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Skill Alignment & Extraction: v{selectedVersion.version} ("{selectedVersion.label}")
                  </h3>
                  <p className="text-xs text-slate-500">
                    Deterministic heuristic parsing with per-field confidence and 3-state gap analysis.
                  </p>
                </div>

                {analysisData?.version?.parsedData?.skills?.length > 0 && (
                  <button
                    onClick={handleConfirmSkills}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                    Sync Skills to Resume Builder
                  </button>
                )}
              </div>

              {/* Profile Comparison Highlights (Challenge 108) */}
              {analysisData?.profileDiff && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Profile Verification & Diff
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Differences */}
                    {analysisData.profileDiff.differences.map((diff: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-semibold text-slate-800 capitalize">{diff.field} Notice</span>
                        <p className="text-slate-600">{diff.explanation}</p>
                      </div>
                    ))}

                    {/* Verified Conflicts */}
                    {analysisData.profileDiff.verifiedConflicts.map((conf: any, i: number) => (
                      <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                        <span className="font-semibold text-amber-900 capitalize flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Academic Verification Notice
                        </span>
                        <p className="text-amber-800">{conf.warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Three-State Skill Gap Analysis (Challenge 107) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Placement Drive Skill Alignment
                  </h4>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 text-xs">
                    {(['all', 'demonstrated', 'declared_not_on_resume', 'missing'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFilterState(filter)}
                        className={`px-2.5 py-1 rounded-full capitalize font-medium transition-colors ${
                          filterState === filter
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filter.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categorized Skills Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {filteredSkills.map((item, idx) => {
                    const badgeStyles =
                      item.state === 'demonstrated'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : item.state === 'declared_not_on_resume'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : item.state === 'missing'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 ${badgeStyles}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">{item.skill}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/70">
                            {item.state.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {item.drivesDemanding > 0 && (
                          <p className="text-[11px] opacity-80">
                            Required by {item.drivesDemanding} active drive{item.drivesDemanding > 1 ? 's' : ''} ({item.driveTitles.slice(0, 2).join(', ')})
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredSkills.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No skills in this category.
                  </p>
                )}
              </div>

              {/* Per-Drive Readiness Matches */}
              {skillGap?.driveMatches && skillGap.driveMatches.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Target Placement Drive Coverage
                  </h4>
                  <div className="space-y-2">
                    {skillGap.driveMatches.map((drive) => (
                      <div
                        key={drive.driveId}
                        className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{drive.driveTitle}</span>
                            <span className="text-slate-500">({drive.companyName})</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            Skills matched: {drive.matchedResumeSkills.join(', ') || 'None yet'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                drive.matchPercentage >= 70
                                  ? 'bg-green-500'
                                  : drive.matchPercentage >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${drive.matchPercentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 w-10 text-right">
                            {drive.matchPercentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {skillGap?.recommendations && skillGap.recommendations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Actionable Improvement Recommendations
                  </h4>
                  <div className="space-y-2">
                    {skillGap.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/40 text-xs flex items-start gap-3"
                      >
                        <ChevronRight className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-indigo-950 font-medium">{rec.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Link Modal (Challenge 112) */}
      {shareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Temporary Resume Share Link
            </h3>
            <p className="text-xs text-slate-600">
              This link streams the selected resume version without authentication. It expires on{' '}
              <span className="font-semibold text-slate-800">{shareModal.expiresAt}</span>.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareModal.url}
                className="w-full text-xs font-mono p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareModal.url);
                  addToast('Share link copied to clipboard!', 'success');
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShareModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
