"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  HelpCircle, 
  Mail, 
  ExternalLink, 
  MessageSquare, 
  Search, 
  X,
  FileText,
  ShieldAlert,
  Loader2,
  RefreshCw
} from "lucide-react";

export default function AdminIssueReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [spikeCount, setSpikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("open");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/issue-reports/admin/issue-reports?page=${page}&limit=25`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (categoryFilter !== "all") url += `&category=${categoryFilter}`;

      const res = await apiFetch(url);
      if (res) {
        setReports(res.items || []);
        setTotal(res.total || 0);
        setSpikeCount(res.assessment_issues_last_24h || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load issue reports.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenDetail = (report: any) => {
    setSelectedReport(report);
    setUpdateStatus(report.status || "open");
    setAdminNotes(report.admin_notes || "");
    setUpdateSuccess(false);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setUpdating(true);
    setUpdateSuccess(false);
    try {
      const res = await apiFetch(`/issue-reports/admin/issue-reports/${selectedReport.id}`, {
        method: "PATCH",
        json: {
          status: updateStatus,
          admin_notes: adminNotes,
        },
      });

      if (res) {
        setSelectedReport(res);
        setReports((prev) => prev.map((r) => (r.id === res.id ? res : r)));
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err: any) {
      alert("Failed to update report: " + (err.message || "Error"));
    } finally {
      setUpdating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "assessment_email_issue":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"><Mail className="h-3 w-3" /> Assessment Email Issue</span>;
      case "website_bug":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">🐛 Website Bug</span>;
      case "account_login":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">🔑 Account / Login</span>;
      case "feature_request":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">💡 Feature Request</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-300 border border-gray-500/40">❓ General Report</span>;
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "resolved":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Resolved</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"><Clock className="h-3 w-3" /> In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"><AlertTriangle className="h-3 w-3" /> Open</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Reported Issues Triage <HelpCircle className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage user bug reports, login issues, and assessment email delivery complaints.
          </p>
        </div>

        <Button onClick={fetchReports} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh List
        </Button>
      </div>

      {/* SPIKE ALERT BANNER FOR ASSESSMENT ISSUES */}
      {spikeCount >= 1 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-200 text-sm">
                ⚠️ {spikeCount} Assessment Email Issue{spikeCount > 1 ? "s" : ""} Reported in Last 24 Hours
              </h3>
              <p className="text-xs text-amber-200/80">
                Multiple candidates reported problems receiving or opening technical assessment links. Check triage details below.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setCategoryFilter("assessment_email_issue");
              setStatusFilter("all");
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0"
          >
            View Assessment Reports
          </Button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="assessment_email_issue">📧 Assessment Email Issue</option>
            <option value="website_bug">🐛 Website Bug</option>
            <option value="account_login">🔑 Account & Login</option>
            <option value="feature_request">💡 Feature Request</option>
            <option value="other">❓ Other</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          Total Reports: <strong className="text-foreground">{total}</strong>
        </div>
      </div>

      {/* TABLE */}
      {error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center text-destructive text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading issue reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-xl space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-foreground">No Reported Issues Found</h3>
          <p className="text-xs text-muted-foreground">No reports match the selected category and status filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Reporter</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Submitted</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => handleOpenDetail(report)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono text-muted-foreground">#{report.id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{report.reporter_name}</div>
                      <div className="text-[11px] text-muted-foreground">{report.reporter_email}</div>
                    </td>
                    <td className="p-3.5 uppercase text-[11px] font-mono text-muted-foreground">{report.reporter_role}</td>
                    <td className="p-3.5">{getCategoryBadge(report.category)}</td>
                    <td className="p-3.5">{getStatusBadge(report.status)}</td>
                    <td className="p-3.5 text-muted-foreground font-mono">
                      {new Date(report.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]">
                        Review & Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">Report #{selectedReport.id}</span>
                  {getCategoryBadge(selectedReport.category)}
                  {getStatusBadge(selectedReport.status)}
                </div>
                <h2 className="text-xl font-bold text-foreground">Issue Report Detail</h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reporter Meta */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/40 rounded-xl text-xs space-y-1">
              <div>
                <span className="text-muted-foreground block">Reporter Name & Email:</span>
                <span className="font-bold text-foreground">{selectedReport.reporter_name}</span> &bull;{" "}
                <a href={`mailto:${selectedReport.reporter_email}`} className="text-primary hover:underline">{selectedReport.reporter_email}</a>
              </div>
              <div>
                <span className="text-muted-foreground block">Reporter Role:</span>
                <span className="font-bold text-foreground uppercase">{selectedReport.reporter_role}</span>
                {selectedReport.reporter_role_detail && ` (${selectedReport.reporter_role_detail})`}
              </div>
              {selectedReport.page_url && (
                <div className="col-span-2 pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Page URL: </span>
                  <a href={selectedReport.page_url} target="_blank" rel="noreferrer" className="text-primary font-mono hover:underline inline-flex items-center gap-1">
                    {selectedReport.page_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Issue Description</label>
              <div className="p-4 bg-background border border-border rounded-xl text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {selectedReport.description}
              </div>
            </div>

            {/* ASSESSMENT EXTRA TRIAGE FIELDS IF PRESENT */}
            {(selectedReport.category === "assessment_email_issue" || selectedReport.assessment_email_used) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Assessment Specific Triage Data
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-amber-200/90 pt-1">
                  <div>
                    <span className="block text-[11px] text-amber-300/70">Email Used:</span>
                    <strong>{selectedReport.assessment_email_used || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-amber-300/70">Received Email?</span>
                    <strong>{selectedReport.assessment_link_received === true ? "✅ Yes" : (selectedReport.assessment_link_received === false ? "❌ No" : "Unspecified")}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-amber-300/70">Link Worked?</span>
                    <strong>{selectedReport.assessment_link_worked === true ? "✅ Yes" : (selectedReport.assessment_link_worked === false ? "❌ No (Broken/Expired)" : "Unspecified")}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SCREENSHOT PREVIEW IF PRESENT */}
            {selectedReport.screenshot_url && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Attached Screenshot</label>
                <div className="border border-border rounded-xl p-2 bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedReport.screenshot_url} alt="Uploaded screenshot" className="max-h-60 rounded-lg object-contain mx-auto" />
                </div>
              </div>
            )}

            {/* UPDATE STATUS & ADMIN NOTES FORM */}
            <form onSubmit={handleSaveUpdate} className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground">Update Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="open">🔴 Open</option>
                    <option value="in_progress">🟡 In Progress</option>
                    <option value="resolved">🟢 Resolved</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {updateSuccess && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4" /> Updated Successfully!
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Internal Admin Notes (Private)</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add resolution details, candidate follow-up notes, or internal comments..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
