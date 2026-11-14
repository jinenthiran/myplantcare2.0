import React, { useEffect, useState } from 'react';
import {
  Flag,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wrench,
  RotateCcw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { LibraryPlant } from '../../data/plants';
import {
  FLAG_ISSUE_REASONS,
  FlagIssueReasonCode,
  VERIFIED_SOURCE_PRESETS,
  VERIFIED_LICENSE_PRESETS,
  isAuthorizedImageCurator,
  validateAdminImageCorrectionInput,
} from '../../utils/botanicalImageVerification';
import { optimizePlantImageForScan } from '../../utils/imageScanOptimizer';
import { saveImageCorrectionAuditToFirestore } from '../../lib/firebase';
import { BotanicalImage } from '../ui/BotanicalImage';

export interface AdminImageCorrectionProps {
  plant: LibraryPlant;
  hasActiveOverride?: boolean;
  authToken?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  onCorrectionSaved?: () => void;
  onClose?: () => void;
}

interface LiveVerificationState {
  valid: boolean;
  loadable: boolean;
  contentType?: string;
  byteSize?: number;
  issues: string[];
  warnings?: string[];
  aiVisualNote?: string | null;
  proposedStatus: 'verified' | 'needs_review' | 'broken';
}

export const AdminImageCorrection: React.FC<AdminImageCorrectionProps> = ({
  plant,
  hasActiveOverride = false,
  authToken,
  userEmail,
  userRole = 'curator',
  onCorrectionSaved,
  onClose,
}) => {
  const authCheck = isAuthorizedImageCurator(
    {
      email: userEmail,
      role: userRole,
    },
    true
  );
  const isAuthorized = authCheck.authorized;

  const [mode, setMode] = useState<'replace' | 'flag'>('replace');

  // Flagging state
  const [flagReason, setFlagReason] = useState<FlagIssueReasonCode>('unrelated_object');
  const [flagNotes, setFlagNotes] = useState<string>('');
  const [isFlagging, setIsFlagging] = useState<boolean>(false);

  // Replacement & attribution state
  const [candidateImageUrl, setCandidateImageUrl] = useState<string>(plant.imageUrl || '');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 1024,
    height: 768,
  });
  const [photographer, setPhotographer] = useState<string>(plant.attribution?.photographer || '');
  const [source, setSource] = useState<string>(plant.attribution?.source || VERIFIED_SOURCE_PRESETS[0]);
  const [license, setLicense] = useState<string>(plant.attribution?.license || VERIFIED_LICENSE_PRESETS[0]);
  const [sourceUrl, setSourceUrl] = useState<string>(plant.attribution?.sourceUrl || '');
  const [verificationNotes, setVerificationNotes] = useState<string>(plant.verificationNotes || '');
  const [confirmedByAdmin, setConfirmedByAdmin] = useState<boolean>(false);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<LiveVerificationState | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCandidateImageUrl(plant.imageUrl || '');
    setPhotographer(plant.attribution?.photographer || '');
    setSource(plant.attribution?.source || VERIFIED_SOURCE_PRESETS[0]);
    setLicense(plant.attribution?.license || VERIFIED_LICENSE_PRESETS[0]);
    setSourceUrl(plant.attribution?.sourceUrl || '');
    setVerificationNotes(plant.verificationNotes || '');
    setConfirmedByAdmin(false);
    setVerificationResult(null);
    setFeedback(null);
  }, [plant.id]);

  const buildHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const handleUploadVerifiedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: 'Please select a verified botanical photograph under 8 MB.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawDataUrl = String(reader.result || '');
        const optimized = await optimizePlantImageForScan(rawDataUrl, {
          maxDim: 960,
          quality: 0.82,
          originalBytes: file.size,
        });
        setCandidateImageUrl(optimized.dataUrl);
        setImageDimensions({ width: optimized.width, height: optimized.height });
        setVerificationResult(null);
        setFeedback({
          type: 'success',
          text: `Optimized verified photo "${file.name}" (${optimized.width}×${optimized.height}px · ${Math.round(
            optimized.optimizedBytes / 1024
          )} KB).`,
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Could not process uploaded replacement image.',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRunVerification = async () => {
    setVerifying(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/botanical-library/verify-image', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          plantId: plant.id,
          commonName: plant.commonName,
          scientificName: plant.scientificName,
          imageUrl: candidateImageUrl,
          photographer,
          source,
          license,
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Unable to run botanical image verification check.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleFlagIncorrectImage = async () => {
    if (!isAuthorized) {
      setFeedback({ type: 'error', text: 'Only authorized botanical curators may flag catalog records.' });
      return;
    }
    setIsFlagging(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/botanical-library/flag-image', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          plantId: plant.id,
          issueReason: flagReason,
          notes: flagNotes.trim() || `Flagged ${plant.commonName} (${plant.scientificName}) for curator review.`,
          currentImageUrl: plant.imageUrl,
          curatorIdentity: userEmail || 'Authorized Botanical Curator',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to flag plant image.');

      await saveImageCorrectionAuditToFirestore({
        userId: userEmail || 'demo-botanist-uid',
        plantId: plant.id,
        scientificName: plant.scientificName,
        actionType: 'flagged',
        source: plant.attribution?.source || 'Wikimedia Commons',
        license: plant.attribution?.license || 'CC BY-SA 4.0',
        notes: flagNotes.trim() || `Flagged (${flagReason}) for botanical species review`,
      });

      setFeedback({
        type: 'success',
        text:
          data.message ||
          `Flagged ${plant.commonName} (${plant.scientificName}) as "${flagReason}" and logged audit record.`,
      });
      onCorrectionSaved?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not flag image record.',
      });
    } finally {
      setIsFlagging(false);
    }
  };

  const handleSaveVerifiedCorrection = async () => {
    if (!isAuthorized) {
      setFeedback({ type: 'error', text: 'Only authorized botanical curators can update species image records.' });
      return;
    }

    const validation = validateAdminImageCorrectionInput({
      mode: 'replace',
      plantId: plant.id,
      imageUrl: candidateImageUrl,
      photographer,
      source,
      license,
      sourceUrl,
      verificationNotes,
      confirmedByAdmin,
    });

    if (!validation.valid) {
      setFeedback({
        type: 'error',
        text: validation.errors[0] || 'Please complete all required species attribution fields.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/botanical-library/image-override', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          plantId: plant.id,
          imageUrl: candidateImageUrl,
          photographer: photographer.trim(),
          source: source.trim(),
          license: license.trim(),
          sourceUrl: sourceUrl.trim(),
          verificationStatus: verificationResult?.issues?.length ? 'needs_review' : 'verified',
          verificationNotes:
            verificationNotes.trim() ||
            `Verified species replacement for ${plant.commonName} (${plant.scientificName})`,
          confirmedByAdmin: true,
          width: imageDimensions.width,
          height: imageDimensions.height,
          curatorIdentity: userEmail || 'Authorized Botanical Curator',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save verified image correction.');

      await saveImageCorrectionAuditToFirestore({
        userId: userEmail || 'demo-botanist-uid',
        plantId: plant.id,
        scientificName: plant.scientificName,
        actionType: 'verified_override',
        source: source.trim(),
        license: license.trim(),
        notes: verificationNotes.trim() || 'Updated verified species photograph & attribution',
      });

      setFeedback({
        type: 'success',
        text: `Updated verified image and botanical attribution for ${plant.commonName} (${plant.scientificName}).`,
      });
      onCorrectionSaved?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to save image correction.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToCatalogDefault = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/botanical-library/image-override/${encodeURIComponent(plant.id)}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      if (!res.ok) throw new Error('Failed to revert override.');

      await saveImageCorrectionAuditToFirestore({
        userId: userEmail || 'demo-botanist-uid',
        plantId: plant.id,
        scientificName: plant.scientificName,
        actionType: 'reverted',
        source: plant.attribution?.source || 'Wikimedia Commons',
        license: plant.attribution?.license || 'CC BY-SA 4.0',
        notes: 'Reverted to baseline verified catalog photograph',
      });

      setFeedback({
        type: 'success',
        text: `Reverted ${plant.commonName} to baseline verified catalog photograph.`,
      });
      onCorrectionSaved?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not reset override.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="admin-image-correction-panel"
      className="p-4 rounded-2xl border border-[#174C38]/20 dark:border-[#00D69A]/30 bg-[#FAF7EE] dark:bg-[#10251D] space-y-4 text-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#174C38]/12 dark:border-[#00D69A]/20">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#174C38] dark:text-[#00D69A] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AdminImageCorrection · Species-Locked Curator Console · ID: {plant.id}</span>
          </div>
          <h4 className="text-base font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            {plant.commonName} <span className="italic font-normal">({plant.scientificName})</span>
          </h4>
          <div className="text-xs font-tamil font-bold text-[#B37810] dark:text-[#F5CA62]">{plant.tamilName}</div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('replace')}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
              mode === 'replace'
                ? 'bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D]'
                : 'bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#B6CDB4] border border-[#174C38]/20'
            }`}
          >
            <Wrench className="w-3 h-3 inline mr-1" />
            Upload & Update Attribution
          </button>
          <button
            type="button"
            onClick={() => setMode('flag')}
            data-testid="switch-to-flag-mode-btn"
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
              mode === 'flag'
                ? 'bg-[#FF806B] text-[#10251D]'
                : 'bg-white dark:bg-[#153026] text-[#9B3B28] dark:text-[#FF806B] border border-[#FF806B]/40'
            }`}
          >
            <Flag className="w-3 h-3 inline mr-1" />
            Flag Incorrect Image
          </button>
          {hasActiveOverride && (
            <button
              type="button"
              onClick={handleResetToCatalogDefault}
              disabled={saving}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#153026] border border-[#FF806B]/40 text-[#9B3B28] dark:text-[#FF806B] text-[11px] font-bold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Override
            </button>
          )}
        </div>
      </div>

      {!isAuthorized && (
        <div className="p-3 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/40 flex items-center gap-2 text-[#9B3B28] dark:text-[#FF806B]">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Curator authorization is required to modify canonical species imagery.</span>
        </div>
      )}

      {/* Side-by-Side Current vs. Candidate Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#10251D]/65 dark:text-[#B6CDB4]">
            Current Record Image ({plant.verificationStatus || 'verified'})
          </div>
          <div className="h-36 rounded-xl overflow-hidden border border-[#174C38]/20 bg-[#10251D]">
            <BotanicalImage
              src={plant.imageUrl}
              alt={plant.commonName}
              commonName={plant.commonName}
              scientificName={plant.scientificName}
              verificationStatus={plant.verificationStatus}
              fitMode="contain"
              aspectClassName="w-full h-36"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#10251D]/65 dark:text-[#B6CDB4]">
            {mode === 'flag' ? 'Target Record to Flag' : 'Replacement Candidate Preview'}
          </div>
          <div className="h-36 rounded-xl overflow-hidden border border-[#00D69A]/35 bg-[#10251D]">
            <BotanicalImage
              src={mode === 'flag' ? plant.imageUrl : candidateImageUrl}
              alt={`Candidate photo for ${plant.commonName}`}
              commonName={plant.commonName}
              scientificName={plant.scientificName}
              verificationStatus={
                mode === 'flag' ? 'needs_review' : verificationResult?.proposedStatus || 'verified'
              }
              fitMode="contain"
              aspectClassName="w-full h-36"
            />
          </div>
        </div>
      </div>

      {mode === 'flag' ? (
        <div className="space-y-3 p-3.5 rounded-xl bg-white dark:bg-[#153026] border border-[#FF806B]/40">
          <div className="font-bold text-[#9B3B28] dark:text-[#FF806B] flex items-center gap-1.5">
            <Flag className="w-4 h-4" /> Flag Incorrect or Mismatched Plant Image
          </div>
          <p className="text-[11px] text-[#10251D]/75 dark:text-[#B6CDB4]">
            Flagging marks this plant record as <strong>needs_review</strong> in the database and logs an audit entry so
            unrelated objects or mismatched species are immediately quarantined.
          </p>

          <div>
            <label className="block text-[11px] font-semibold mb-1 text-[#10251D] dark:text-[#FAF7EE]">
              Detected Image Issue Reason
            </label>
            <select
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value as FlagIssueReasonCode)}
              aria-label="Detected Image Issue Reason"
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
            >
              {FLAG_ISSUE_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1 text-[#10251D] dark:text-[#FAF7EE]">
              Curator Audit Notes
            </label>
            <textarea
              rows={2}
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              placeholder={`Describe why the current image for ${plant.commonName} (${plant.scientificName}) is inaccurate...`}
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
            />
          </div>

          <button
            type="button"
            onClick={handleFlagIncorrectImage}
            disabled={isFlagging || !isAuthorized}
            data-testid="submit-flag-image-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF806B] text-[#10251D] font-bold hover:brightness-105 cursor-pointer disabled:opacity-50"
          >
            <Flag className="w-3.5 h-3.5" />
            {isFlagging ? 'Flagging Record...' : `Flag ${plant.commonName} Image for Review`}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1 text-[#10251D] dark:text-[#FAF7EE]">
              Verified Botanical Image URL or Upload New Photograph
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={candidateImageUrl}
                onChange={(e) => {
                  setCandidateImageUrl(e.target.value);
                  setVerificationResult(null);
                }}
                placeholder="https://commons.wikimedia.org/... or /images/plants/..."
                aria-label="Verified Botanical Image URL"
                className="flex-1 px-3 py-2 rounded-xl border border-[#174C38]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] font-mono text-[11px]"
              />
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#153026] border border-[#174C38]/25 font-bold cursor-pointer shrink-0 hover:border-[#00D69A]">
                <Upload className="w-3.5 h-3.5 text-[#00D69A]" /> Upload Photo
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleUploadVerifiedFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold mb-0.5 text-[#10251D]/75 dark:text-[#B6CDB4]">
                Photographer / Botanical Credit
              </label>
              <input
                type="text"
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                placeholder="e.g. J.M. Garg / Wikimedia Commons"
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#174C38]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold mb-0.5 text-[#10251D]/75 dark:text-[#B6CDB4]">
                Verified Botanical Source
              </label>
              <input
                type="text"
                list="verified-botanical-sources"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#174C38]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
              />
              <datalist id="verified-botanical-sources">
                {VERIFIED_SOURCE_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-semibold mb-0.5 text-[#10251D]/75 dark:text-[#B6CDB4]">
                License & Usage Rights
              </label>
              <input
                type="text"
                list="verified-botanical-licenses"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#174C38]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
              />
              <datalist id="verified-botanical-licenses">
                {VERIFIED_LICENSE_PRESETS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-semibold mb-0.5 text-[#10251D]/75 dark:text-[#B6CDB4]">
                Canonical Source Reference URL
              </label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://commons.wikimedia.org/wiki/File:..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#174C38]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
          </div>

          {sourceUrl && /^https?:\/\//i.test(sourceUrl) && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#174C38] dark:text-[#00D69A] hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Open Canonical Taxon Source Page
            </a>
          )}

          {verificationResult && (
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                verificationResult.valid
                  ? 'bg-[#00D69A]/12 border-[#00D69A]/40 text-[#174C38] dark:text-[#00D69A]'
                  : 'bg-[#FF806B]/12 border-[#FF806B]/40 text-[#9B3B28] dark:text-[#FF806B]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {verificationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                Verification Status: {verificationResult.proposedStatus.toUpperCase()}
                {verificationResult.contentType ? ` · ${verificationResult.contentType}` : ''}
                {verificationResult.byteSize ? ` · ${Math.round(verificationResult.byteSize / 1024)} KB` : ''}
              </div>
              {verificationResult.issues?.map((iss, idx) => (
                <div key={idx} className="text-[11px]">
                  • {iss}
                </div>
              ))}
              {verificationResult.warnings?.map((w, idx) => (
                <div key={idx} className="text-[11px] text-[#B37810] dark:text-[#F5CA62]">
                  • {w}
                </div>
              ))}
              {verificationResult.aiVisualNote && (
                <div className="text-[11px] font-mono">AI Visual Note: {verificationResult.aiVisualNote}</div>
              )}
            </div>
          )}

          <label className="flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-[#153026] border border-[#174C38]/20 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedByAdmin}
              onChange={(e) => setConfirmedByAdmin(e.target.checked)}
              data-testid="confirm-species-checkbox"
              className="mt-0.5 accent-[#174C38]"
            />
            <span className="text-[11px] text-[#10251D] dark:text-[#FAF7EE]">
              I confirm this photograph accurately represents <strong>{plant.commonName}</strong> (
              <em>{plant.scientificName}</em> · {plant.tamilName}) and carries verified botanical source attribution.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRunVerification}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#153026] border border-[#174C38]/25 text-[#174C38] dark:text-[#00D69A] font-bold hover:border-[#00D69A] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying...' : 'Run Live Verification Check'}
            </button>

            <button
              type="button"
              onClick={handleSaveVerifiedCorrection}
              disabled={saving || !confirmedByAdmin || !isAuthorized}
              data-testid="save-confirmed-species-image-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold hover:brightness-110 cursor-pointer disabled:opacity-45"
            >
              <Wrench className="w-3.5 h-3.5" />
              {saving ? 'Saving Correction...' : 'Save Confirmed Species Image & Attribution'}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-[#174C38]/20 text-[#10251D] dark:text-[#B6CDB4] font-semibold cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`p-2.5 rounded-xl text-[11px] font-semibold ${
            feedback.type === 'success'
              ? 'bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A]'
              : 'bg-[#FF806B]/15 text-[#9B3B28] dark:text-[#FF806B]'
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
};
