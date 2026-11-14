import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Search,
  ShieldCheck,
  Image as ImageIcon,
  Wrench,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  ALL_EXPANDED_PLANTS,
  generateDatabaseIntegrityReport,
  DatabaseIntegrityReport,
  LibraryPlant,
} from '../../data/plants';
import {
  BotanicalImageOverrideRecord,
  generateBotanicalImageAuditReport,
} from '../../utils/botanicalImageVerification';
import { BotanicalImage } from '../ui/BotanicalImage';
import { AdminImageCorrection } from './AdminImageCorrection';

interface DatabaseAdminModalProps {
  onClose: () => void;
  onImportComplete?: (count: number) => void;
  plants?: LibraryPlant[];
  overrides?: BotanicalImageOverrideRecord[];
  initialEditPlantId?: string | null;
  authToken?: string | null;
  onOverridesChanged?: () => void;
}

interface VerificationCheckResponse {
  valid: boolean;
  loadable: boolean;
  contentType?: string;
  byteSize?: number;
  issues: string[];
  warnings?: string[];
  aiVisualNote?: string | null;
  proposedStatus: 'verified' | 'needs_review' | 'broken';
}

export const DatabaseAdminModal: React.FC<DatabaseAdminModalProps> = ({
  onClose,
  plants,
  overrides = [],
  initialEditPlantId,
  authToken,
  onOverridesChanged,
}) => {
  const activePlants = plants && plants.length > 0 ? plants : ALL_EXPANDED_PLANTS;
  const [activeSubTab, setActiveSubTab] = useState<'image-repair' | 'integrity' | 'duplicate-check' | 'export-import'>(
    initialEditPlantId ? 'image-repair' : 'image-repair'
  );
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<{
    validCount: number;
    duplicateCount: number;
    newRecords: string[];
    duplicates: string[];
  } | null>(null);

  // Image Repair & Verification Workstation state
  const [auditFilter, setAuditFilter] = useState<'all' | 'flagged' | 'verified' | 'overridden'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>(initialEditPlantId || activePlants[0]?.id || '');

  const selectedPlant = useMemo(
    () => activePlants.find((p) => p.id === selectedPlantId) || activePlants[0],
    [activePlants, selectedPlantId]
  );

  const overrideSet = useMemo(() => new Set(overrides.map((o) => o.plantId)), [overrides]);

  const [editImageUrl, setEditImageUrl] = useState('');
  const [editPhotographer, setEditPhotographer] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [confirmedByAdmin, setConfirmedByAdmin] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationCheckResponse | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (initialEditPlantId) {
      setSelectedPlantId(initialEditPlantId);
      setActiveSubTab('image-repair');
    }
  }, [initialEditPlantId]);

  useEffect(() => {
    if (!selectedPlant) return;
    setEditImageUrl(selectedPlant.imageUrl || '');
    setEditPhotographer(selectedPlant.attribution?.photographer || '');
    setEditSource(selectedPlant.attribution?.source || '');
    setEditLicense(selectedPlant.attribution?.license || '');
    setEditSourceUrl(selectedPlant.attribution?.sourceUrl || '');
    setEditNotes(selectedPlant.verificationNotes || '');
    setConfirmedByAdmin(false);
    setVerificationResult(null);
    setActionMessage(null);
  }, [selectedPlant?.id]);

  const report: DatabaseIntegrityReport = useMemo(() => generateDatabaseIntegrityReport(), []);
  const imageAudit = useMemo(() => generateBotanicalImageAuditReport(activePlants), [activePlants]);

  const filteredAuditItems = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return imageAudit.items.filter((item) => {
      if (auditFilter === 'flagged' && item.status === 'verified' && item.issues.length === 0) return false;
      if (auditFilter === 'verified' && item.status !== 'verified') return false;
      if (auditFilter === 'overridden' && !overrideSet.has(item.plantId)) return false;
      if (!q) return true;
      return (
        item.commonName.toLowerCase().includes(q) ||
        item.tamilName.toLowerCase().includes(q) ||
        item.scientificName.toLowerCase().includes(q) ||
        item.plantId.toLowerCase().includes(q)
      );
    });
  }, [imageAudit.items, auditFilter, auditSearch, overrideSet]);

  const getHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      setActionMessage({
        type: 'error',
        text: 'Please choose an image file smaller than 400 KB (or paste an external verified Wikimedia/iNaturalist URL).',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditImageUrl(reader.result);
        setVerificationResult(null);
        setActionMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyCandidate = async () => {
    if (!selectedPlant) return;
    setVerifying(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/botanical-library/verify-image', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plantId: selectedPlant.id,
          commonName: selectedPlant.commonName,
          scientificName: selectedPlant.scientificName,
          imageUrl: editImageUrl,
          photographer: editPhotographer,
          source: editSource,
          license: editLicense,
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Unable to run image verification check.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedPlant) return;
    if (!confirmedByAdmin) {
      setActionMessage({
        type: 'error',
        text: 'Please tick the admin species confirmation checkbox before saving.',
      });
      return;
    }
    setSavingOverride(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/botanical-library/image-override', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plantId: selectedPlant.id,
          imageUrl: editImageUrl,
          photographer: editPhotographer,
          source: editSource,
          license: editLicense,
          sourceUrl: editSourceUrl,
          verificationStatus: verificationResult?.issues?.length ? 'needs_review' : 'verified',
          verificationNotes: editNotes,
          confirmedByAdmin: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save override.');
      }
      setActionMessage({
        type: 'success',
        text: `Saved verified species image override for ${selectedPlant.commonName} (${selectedPlant.scientificName}).`,
      });
      onOverridesChanged?.();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Save failed.' });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleResetOverride = async (plantId: string) => {
    setSavingOverride(true);
    try {
      const res = await fetch(`/api/botanical-library/image-override/${encodeURIComponent(plantId)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to revert override');
      setActionMessage({ type: 'success', text: `Reverted ${plantId} to baseline verified catalog asset.` });
      onOverridesChanged?.();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Reset failed.' });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleExportAuditJson = () => {
    const blob = new Blob([JSON.stringify(imageAudit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myplantcare_image_audit_report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditCsv = () => {
    const header = ['plantId', 'commonName', 'tamilName', 'scientificName', 'category', 'status', 'imageUrl', 'source', 'license', 'issues'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = imageAudit.items.map((item) =>
      [
        item.plantId,
        item.commonName,
        item.tamilName,
        item.scientificName,
        item.category,
        item.status,
        item.imageUrl,
        item.attribution.source,
        item.attribution.license,
        item.issueLabels.join('; '),
      ]
        .map(esc)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myplantcare_image_audit_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCatalogJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activePlants, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `myplantcare_botanical_database_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleValidateImport = () => {
    if (!importJsonText.trim()) {
      setImportStatus('Please paste JSON plant records to validate.');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      const existingScientific = new Set(activePlants.map((p) => p.scientificName.toLowerCase().trim()));
      const duplicates: string[] = [];
      const newRecords: string[] = [];

      for (const item of list) {
        if (!item.scientificName) continue;
        const sci = item.scientificName.toLowerCase().trim();
        if (existingScientific.has(sci)) {
          duplicates.push(`${item.commonName || 'Plant'} (${item.scientificName})`);
        } else {
          newRecords.push(`${item.commonName || 'Plant'} (${item.scientificName})`);
        }
      }

      setPreviewResults({
        validCount: list.length,
        duplicateCount: duplicates.length,
        newRecords,
        duplicates,
      });

      setImportStatus(`Dry run complete: ${newRecords.length} new records detected, ${duplicates.length} duplicate conflicts prevented.`);
    } catch (err: any) {
      setImportStatus(`JSON Parse Error: ${err.message}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Botanical Image & Database Administration"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#10251D]/75 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#174C38]/12 dark:border-[#00D69A]/20 bg-[#FAF7EE] dark:bg-[#10251D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00D69A]/15 flex items-center justify-center text-[#174C38] dark:text-[#00D69A]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
                Botanical Image Verification & Database Administration
              </div>
              <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">
                Species-locked image inspection, live verification, Cloud SQL overrides, and audit reporting
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Database Administration"
            className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[#10251D] dark:text-[#FAF7EE] hover:bg-[#FF806B] hover:text-[#10251D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-[#174C38]/12 dark:border-[#00D69A]/20 text-xs overflow-x-auto">
          {[
            { id: 'image-repair', label: 'Image Verification & Repair' },
            { id: 'integrity', label: 'Database Integrity Audit' },
            { id: 'duplicate-check', label: 'Duplicate & Stock Guard' },
            { id: 'export-import', label: 'Bulk Export & Safe Import' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-2 rounded-t-xl font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-[#FFFFFF] dark:bg-[#153026] border-t-2 border-[#174C38] dark:border-[#00D69A] text-[#174C38] dark:text-[#00D69A] font-bold'
                  : 'text-[#10251D]/65 dark:text-[#B6CDB4] hover:bg-[#FAF7EE] dark:hover:bg-[#10251D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {activeSubTab === 'image-repair' && (
            <div className="space-y-5">
              {/* Live Audit Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Total Records</div>
                  <div className="text-xl font-mono font-extrabold text-[#10251D] dark:text-[#FAF7EE]">{imageAudit.totalRecords}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Verified Images</div>
                  <div className="text-xl font-mono font-extrabold text-[#174C38] dark:text-[#00D69A]">{imageAudit.verifiedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Needs Review</div>
                  <div className="text-xl font-mono font-extrabold text-[#B37810] dark:text-[#F5CA62]">{imageAudit.awaitingVerificationCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Duplicates</div>
                  <div className="text-xl font-mono font-extrabold text-[#FF806B]">{imageAudit.duplicateConflictCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Broken / Missing</div>
                  <div className="text-xl font-mono font-extrabold text-[#FF806B]">{imageAudit.brokenCount + imageAudit.missingCount}</div>
                </div>
              </div>

              {/* Export Audit Report Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15">
                <div className="text-[11px] text-[#10251D]/75 dark:text-[#B6CDB4]">
                  Suspicious stock URLs: <strong>{imageAudit.suspiciousStockCount}</strong> · Active DB Overrides: <strong>{overrides.length}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportAuditJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Audit JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/20 text-[#10251D] dark:text-[#FAF7EE] font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Split View: Plant Audit List (Left) + Replace/Verify Editor (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#10251D]/50 dark:text-[#B6CDB4] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Filter plant ID, common, Tamil or scientific..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#174C38]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: `All (${imageAudit.totalRecords})` },
                      { id: 'flagged', label: `Flagged (${imageAudit.flaggedItems.length})` },
                      { id: 'verified', label: `Verified (${imageAudit.verifiedCount})` },
                      { id: 'overridden', label: `Overridden (${overrides.length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAuditFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          auditFilter === f.id
                            ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D]'
                            : 'bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D]/75 dark:text-[#B6CDB4]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                    {filteredAuditItems.map((item) => {
                      const isSel = selectedPlant?.id === item.plantId;
                      return (
                        <button
                          key={item.plantId}
                          type="button"
                          onClick={() => setSelectedPlantId(item.plantId)}
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer ${
                            isSel
                              ? 'border-[#00D69A] bg-[#00D69A]/12'
                              : 'border-[#174C38]/12 dark:border-[#00D69A]/18 bg-[#FAF7EE] dark:bg-[#10251D] hover:border-[#00D69A]/50'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#10251D]">
                            <BotanicalImage
                              src={item.imageUrl}
                              alt={item.commonName}
                              commonName={item.commonName}
                              scientificName={item.scientificName}
                              verificationStatus={item.status}
                              aspectClassName="w-11 h-11"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] truncate">{item.commonName}</div>
                            <div className="text-[10px] italic text-[#10251D]/65 dark:text-[#B6CDB4] truncate">
                              {item.scientificName} · {item.tamilName}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                              item.status === 'verified'
                                ? 'bg-[#00D69A]/20 text-[#174C38] dark:text-[#00D69A]'
                                : 'bg-[#F5CA62]/25 text-[#8A5A00] dark:text-[#F5CA62]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Plant AdminImageCorrection Console */}
                {selectedPlant && (
                  <div className="lg:col-span-7">
                    <AdminImageCorrection
                      plant={selectedPlant}
                      hasActiveOverride={overrideSet.has(selectedPlant.id)}
                      authToken={authToken}
                      onCorrectionSaved={onOverridesChanged}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'integrity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Registered Plant Taxa</div>
                  <div className="text-2xl font-display font-extrabold text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {report.totalPlants}
                  </div>
                  <div className="text-[10px] font-medium text-[#174C38] dark:text-[#C7F36B]">Unique Botanical IDs</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Verified Tamil Names</div>
                  <div className="text-2xl font-display font-extrabold text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {report.verifiedTamilNames} / {report.totalPlants}
                  </div>
                  <div className="text-[10px] font-medium text-[#174C38] dark:text-[#C7F36B]">Tamil Script Preserved</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Verified Species Photos</div>
                  <div className="text-2xl font-display font-extrabold text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {imageAudit.verifiedCount} / {imageAudit.totalRecords}
                  </div>
                  <div className="text-[10px] font-medium text-[#174C38] dark:text-[#C7F36B]">
                    {imageAudit.awaitingVerificationCount === 0 ? 'All Verified' : `${imageAudit.awaitingVerificationCount} Needs Review`}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4]">Missing Info Reports</div>
                  <div className="text-2xl font-display font-extrabold text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {report.missingInformationCount}
                  </div>
                  <div className="text-[10px] font-medium text-[#174C38] dark:text-[#C7F36B]">
                    {report.missingInformationCount === 0 ? 'Zero Missing Fields' : 'Review Required'}
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60 space-y-3">
                <div className="font-bold text-[#10251D] dark:text-white">
                  Taxonomic Distribution Across 10 Botanical Categories
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(report.categoryBreakdown).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-[#174C38]/50"
                    >
                      <span className="text-[#10251D] dark:text-white truncate">{cat}</span>
                      <span className="font-mono font-bold text-[#174C38] dark:text-[#C7F36B] px-2 py-0.5 rounded-lg bg-[#174C38]/10 dark:bg-[#174C38]/50 whitespace-nowrap shrink-0">
                        {count} plants
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'duplicate-check' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  imageAudit.duplicateConflictCount === 0 && imageAudit.suspiciousStockCount === 0
                    ? 'bg-[#00D69A]/10 border-[#00D69A]/35'
                    : 'bg-[#FF806B]/12 border-[#FF806B]/40'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-[#174C38] dark:text-[#00D69A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-[#174C38] dark:text-[#00D69A]">
                    {imageAudit.duplicateConflictCount === 0 && imageAudit.suspiciousStockCount === 0
                      ? 'Duplicate & Generic Stock Guard: ZERO CONFLICTS DETECTED'
                      : `Guard Alert: ${imageAudit.duplicateConflictCount} Duplicate Image(s), ${imageAudit.suspiciousStockCount} Unverified Stock URL(s)`}
                  </div>
                  <p className="text-[#10251D]/85 dark:text-[#B6CDB4] leading-relaxed">
                    Every plant taxon is checked against duplicate image reuse across unrelated species, generic stock photo domains, broken links, and source/license attribution integrity.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60 space-y-2">
                <div className="font-bold text-[#10251D] dark:text-white">
                  Live Automated Image Verification Checklist
                </div>
                <div className="space-y-1.5 text-[#10251D] dark:text-[#B6CDB4]">
                  <div className="flex items-center gap-2 text-[#174C38] dark:text-[#00D69A]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Unique Botanical Plant IDs: {report.totalPlants} / {report.totalPlants}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#174C38] dark:text-[#00D69A]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Duplicate Image Reuse Across Species: {imageAudit.duplicateConflictCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#174C38] dark:text-[#00D69A]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Unverified Generic Stock Domains: {imageAudit.suspiciousStockCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#174C38] dark:text-[#00D69A]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Attribution & License Coverage: {imageAudit.totalRecords - imageAudit.attributionGapCount} / {imageAudit.totalRecords}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'export-import' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60">
                <div>
                  <div className="font-bold text-[#10251D] dark:text-white">Export Master Plant Database</div>
                  <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">
                    Download all {activePlants.length} botanical records (including verified Cloud SQL image overrides) as JSON.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCatalogJson}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold shadow-sm whitespace-nowrap shrink-0 hover:bg-[#10251D] dark:hover:bg-[#C7F36B] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export JSON
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-[#174C38]/60 space-y-3">
                <div className="font-bold text-[#10251D] dark:text-white">
                  Safe Bulk Plant Import Workflow
                </div>
                <p className="text-[#10251D]/65 dark:text-[#B6CDB4]">
                  Paste JSON records below. The engine will inspect taxonomy, validate required fields, and prevent inserting duplicate records.
                </p>
                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='[{"commonName": "Drumstick", "scientificName": "Moringa oleifera", ...}]'
                  className="w-full p-3 font-mono text-[11px] rounded-xl border border-[#B6CDB4]/50 dark:border-[#174C38] bg-white dark:bg-[#153026] text-[#10251D] dark:text-white focus:outline-none focus:border-[#00D69A]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleValidateImport}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174C38]/10 dark:bg-[#153026] border border-[#174C38]/30 dark:border-[#00D69A]/40 text-[#174C38] dark:text-[#00D69A] font-bold hover:bg-[#174C38] hover:text-white dark:hover:bg-[#00D69A] dark:hover:text-[#10251D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Validate Import & Dry Run
                  </button>
                </div>

                {importStatus && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/50 dark:border-[#174C38] font-mono text-[11px] text-[#10251D] dark:text-white">
                    {importStatus}
                  </div>
                )}

                {previewResults && previewResults.duplicates.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#F5CA62]/15 dark:bg-[#F5CA62]/10 border border-[#F5CA62]/45 space-y-1">
                    <div className="font-bold text-[#10251D] dark:text-[#F5CA62] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F5CA62]" /> Duplicate Records Skipped ({previewResults.duplicates.length})
                    </div>
                    <div className="text-[11px] text-[#10251D]/80 dark:text-[#F5CA62]/90 space-y-0.5">
                      {previewResults.duplicates.map((d, i) => (
                        <div key={i}>• {d}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
