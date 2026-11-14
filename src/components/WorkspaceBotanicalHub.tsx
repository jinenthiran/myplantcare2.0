import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Sprout,
  Stethoscope,
  Lock,
  LogOut,
  FilePlus2,
  FolderOpen,
  Users,
} from 'lucide-react';
import {
  auth,
  googleSignIn,
  getAccessToken,
  getCachedAccessToken,
  subscribeWorkspaceToken,
  logout,
  getFirebaseProjectId,
} from '../lib/firebase';

export interface WorkspacePrefillPayload {
  targetTab?: 'docs' | 'chat';
  title?: string;
  bodyText?: string;
  plantName?: string;
}

interface WorkspaceBotanicalHubProps {
  plants?: any[];
  diagnoses?: any[];
  prefill?: WorkspacePrefillPayload | null;
  onClearPrefill?: () => void;
}

interface DriveDocFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface ChatSpaceItem {
  name: string;
  displayName?: string;
  spaceType?: string;
}

interface ChatMessageItem {
  name: string;
  text?: string;
  createTime?: string;
  sender?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
}

interface PendingConfirmation {
  title: string;
  description: string;
  targetLabel: string;
  payloadPreview?: string;
  destructive?: boolean;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

/**
 * Recursively extracts plain text from Google Docs StructuralElement arrays
 * (handles paragraphs and tables per Google Docs API v1 schema).
 */
export function extractGoogleDocText(elements: any[] = []): string {
  let text = '';
  for (const el of elements) {
    if (el.paragraph?.elements) {
      for (const run of el.paragraph.elements) {
        text += run.textRun?.content ?? '';
      }
    } else if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          text += extractGoogleDocText(cell.content);
        }
      }
    }
  }
  return text;
}

export const OfficialGoogleSignInButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}> = ({ onClick, disabled = false, label = 'Sign in with Google' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-testid="workspace-google-signin-btn"
    className="gsi-material-button"
  >
    <div className="gsi-material-button-state" />
    <div className="gsi-material-button-content-wrapper">
      <div className="gsi-material-button-icon">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          style={{ display: 'block' }}
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </div>
      <span className="gsi-material-button-contents">{label}</span>
    </div>
  </button>
);

export const WorkspaceBotanicalHub: React.FC<WorkspaceBotanicalHubProps> = ({
  plants = [],
  diagnoses = [],
  prefill = null,
  onClearPrefill,
}) => {
  const projectId = getFirebaseProjectId();
  const chatConsoleConfigUrl = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${projectId}`;

  const [activeTab, setActiveTab] = useState<'docs' | 'chat'>(prefill?.targetTab || 'docs');
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [hasInMemoryToken, setHasInMemoryToken] = useState<boolean>(() => Boolean(getCachedAccessToken()));
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Confirmation modal state for all mutating/destructive operations
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmingBusy, setConfirmingBusy] = useState<boolean>(false);

  // Google Docs state
  const [docsList, setDocsList] = useState<DriveDocFile[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string>('');
  const [selectedDocContent, setSelectedDocContent] = useState<string>('');
  const [loadingDocDetail, setLoadingDocDetail] = useState<boolean>(false);

  const [newDocTitle, setNewDocTitle] = useState<string>(
    prefill?.title || `MYPLANTCARE Botanical Care Report — ${new Date().toLocaleDateString()}`
  );
  const [newDocBody, setNewDocBody] = useState<string>(() => {
    if (prefill?.bodyText) return prefill.bodyText;
    const samplePlant = plants[0];
    const sampleDiag = diagnoses[0];
    return [
      `Botanical Care & Pathology Log (${new Date().toLocaleString()})`,
      samplePlant
        ? `Primary Specimen: ${samplePlant.name} (${samplePlant.species || 'Botanical Taxon'}) — Health Score: ${samplePlant.healthScore ?? 92}%`
        : 'Primary Specimen: Monstera deliciosa (Sanctuary Conservatory)',
      sampleDiag
        ? `Recent AI Pathology Summary: ${sampleDiag.diseaseName || sampleDiag.condition || 'Healthy Foliage'} — ${sampleDiag.recommendation || 'Maintain balanced indirect light and organic soil hydration.'}`
        : 'Care Protocol: Maintain bright filtered light, check top 2 inches of soil before watering, and inspect leaf undersides weekly.',
    ].join('\n\n');
  });
  const [appendEntryText, setAppendEntryText] = useState<string>(
    `[${new Date().toLocaleDateString()}] Care Observation: Checked soil moisture and foliar turgor. Leaves show vibrant chlorophyll balance.`
  );

  // Google Chat state
  const [chatSpaces, setChatSpaces] = useState<ChatSpaceItem[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState<boolean>(false);
  const [chatConfigNotFound404, setChatConfigNotFound404] = useState<boolean>(false);
  const [chatErrorDetail, setChatErrorDetail] = useState<string | null>(null);
  const [selectedSpaceName, setSelectedSpaceName] = useState<string>('');
  const [spaceMessages, setSpaceMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [newSpaceDisplayName, setNewSpaceDisplayName] = useState<string>('Botanical Care & Conservatory Team');
  const [chatDraftMessage, setChatDraftMessage] = useState<string>(() => {
    if (prefill?.bodyText) return prefill.bodyText;
    return `🌿 MYPLANTCARE Observatory Update: All conservatory specimens inspected today. Next organic foliar misting scheduled for tomorrow morning.`;
  });

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      setHasInMemoryToken(Boolean(getCachedAccessToken()));
    });
    const unsubToken = subscribeWorkspaceToken((token) => {
      setHasInMemoryToken(Boolean(token));
    });
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  useEffect(() => {
    if (prefill) {
      if (prefill.targetTab) setActiveTab(prefill.targetTab);
      if (prefill.title) setNewDocTitle(prefill.title);
      if (prefill.bodyText) {
        setNewDocBody(prefill.bodyText);
        setChatDraftMessage(prefill.bodyText);
      }
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefill, onClearPrefill]);

  const handleWorkspaceSignIn = async () => {
    setAuthBusy(true);
    setStatusMessage(null);
    try {
      const token = await googleSignIn();
      if (token) {
        setStatusMessage({
          type: 'success',
          text: 'Google Workspace OAuth access token granted and held securely in memory.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Google Workspace sign-in was cancelled or blocked.',
      });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleWorkspaceSignOut = async () => {
    await logout();
    setDocsList([]);
    setSelectedDocId(null);
    setSelectedDocContent('');
    setChatSpaces([]);
    setSpaceMessages([]);
    setStatusMessage({
      type: 'info',
      text: 'Signed out and cleared in-memory Google Workspace OAuth access token.',
    });
  };

  // Fetch recent Google Docs from Drive API
  const fetchRecentGoogleDocs = useCallback(async () => {
    setLoadingDocs(true);
    setStatusMessage(null);
    try {
      const token = await getAccessToken();
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.document' and trashed=false");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,webViewLink)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Google Drive API error (${res.status})`);
      }
      const data = await res.json();
      const files: DriveDocFile[] = data.files || [];
      setDocsList(files);
      if (files.length > 0 && !selectedDocId) {
        void inspectGoogleDoc(files[0].id);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Unable to list Google Docs.',
      });
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedDocId]);

  const inspectGoogleDoc = async (documentId: string) => {
    setLoadingDocDetail(true);
    setSelectedDocId(documentId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Google Docs API error (${res.status})`);
      }
      const docData = await res.json();
      setSelectedDocTitle(docData.title || 'Untitled Document');
      const extracted = extractGoogleDocText(docData.body?.content || []);
      setSelectedDocContent(extracted.trim() || '(Document is currently empty)');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to read Google Doc content.',
      });
    } finally {
      setLoadingDocDetail(false);
    }
  };

  // Mutating Action 1: Create Google Doc + batchUpdate content (Requires User Confirmation)
  const requestCreateGoogleDoc = () => {
    const cleanTitle = newDocTitle.trim() || 'MYPLANTCARE Botanical Report';
    const cleanBody = newDocBody.trim() || 'Botanical Care Report generated by MYPLANTCARE.';
    setPendingConfirmation({
      title: 'Confirm Google Doc Creation',
      description:
        'This will create a new Google Document in your Google Drive and write the botanical care report into it using docs.googleapis.com.',
      targetLabel: `New Document: "${cleanTitle}"`,
      payloadPreview: `${cleanTitle}\n\n${cleanBody}`,
      confirmLabel: 'Create Google Doc',
      onConfirm: async () => {
        const token = await getAccessToken();
        // Step 1: Create blank doc with title
        const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: cleanTitle }),
        });
        if (!createRes.ok) {
          const errBody = await createRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to create Google Doc (${createRes.status})`);
        }
        const createdDoc = await createRes.json();
        const docId: string = createdDoc.documentId;

        // Step 2: Populate heading + body via batchUpdate
        const headerLine = `${cleanTitle}\n`;
        const fullText = `${headerLine}\n${cleanBody}\n`;
        const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: fullText,
                },
              },
              {
                updateParagraphStyle: {
                  range: { startIndex: 1, endIndex: 1 + headerLine.length },
                  paragraphStyle: { namedStyleType: 'HEADING_1' },
                  fields: 'namedStyleType',
                },
              },
            ],
          }),
        });
        if (!batchRes.ok) {
          const errBody = await batchRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to populate Google Doc (${batchRes.status})`);
        }

        setStatusMessage({
          type: 'success',
          text: `Created Google Doc "${cleanTitle}" and populated botanical report.`,
        });
        await fetchRecentGoogleDocs();
        await inspectGoogleDoc(docId);
      },
    });
  };

  // Mutating Action 2: Append care log entry to existing Google Doc (Requires User Confirmation)
  const requestAppendToGoogleDoc = () => {
    if (!selectedDocId) return;
    const cleanEntry = appendEntryText.trim();
    if (!cleanEntry) return;
    setPendingConfirmation({
      title: 'Confirm Appending Care Entry to Google Doc',
      description:
        'This will append the following botanical observation to the end of your selected Google Document.',
      targetLabel: `Target Document: "${selectedDocTitle || selectedDocId}"`,
      payloadPreview: cleanEntry,
      confirmLabel: 'Append to Document',
      onConfirm: async () => {
        const token = await getAccessToken();
        const batchRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${selectedDocId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    endOfSegmentLocation: { segmentId: '' },
                    text: `\n\n${cleanEntry}\n`,
                  },
                },
              ],
            }),
          }
        );
        if (!batchRes.ok) {
          const errBody = await batchRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to update Google Doc (${batchRes.status})`);
        }
        setStatusMessage({
          type: 'success',
          text: `Appended care log entry to "${selectedDocTitle}".`,
        });
        await inspectGoogleDoc(selectedDocId);
      },
    });
  };

  // Destructive Action 3: Delete Google Doc via Drive API (Requires User Confirmation)
  const requestDeleteGoogleDoc = (docFile: DriveDocFile) => {
    setPendingConfirmation({
      title: 'Confirm Permanent Deletion of Google Doc',
      description:
        'This will permanently delete the selected Google Document from your Google Drive. This action cannot be undone.',
      targetLabel: `Delete Document: "${docFile.name}"`,
      payloadPreview: `Document ID: ${docFile.id}`,
      destructive: true,
      confirmLabel: 'Delete Document',
      onConfirm: async () => {
        const token = await getAccessToken();
        const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${docFile.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!delRes.ok) {
          const errBody = await delRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to delete Google Doc (${delRes.status})`);
        }
        setStatusMessage({
          type: 'info',
          text: `Deleted Google Doc "${docFile.name}".`,
        });
        if (selectedDocId === docFile.id) {
          setSelectedDocId(null);
          setSelectedDocTitle('');
          setSelectedDocContent('');
        }
        await fetchRecentGoogleDocs();
      },
    });
  };

  // Google Chat API: List Spaces
  const fetchChatSpaces = useCallback(async () => {
    setLoadingSpaces(true);
    setChatConfigNotFound404(false);
    setChatErrorDetail(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=25', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg: string =
          errBody?.error?.message || `Google Chat API returned HTTP ${res.status}`;
        if (
          res.status === 404 ||
          msg.toLowerCase().includes('google chat app not found') ||
          msg.toLowerCase().includes('configure the app in the google cloud console')
        ) {
          setChatConfigNotFound404(true);
          setChatErrorDetail(msg);
          return;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      const spaces: ChatSpaceItem[] = data.spaces || [];
      setChatSpaces(spaces);
      if (spaces.length > 0 && !selectedSpaceName) {
        setSelectedSpaceName(spaces[0].name);
        void fetchSpaceMessages(spaces[0].name);
      }
    } catch (err: any) {
      setChatErrorDetail(err?.message || 'Unable to list Google Chat spaces.');
    } finally {
      setLoadingSpaces(false);
    }
  }, [selectedSpaceName]);

  // Google Chat API: List Messages in Space
  const fetchSpaceMessages = async (spaceName: string) => {
    if (!spaceName) return;
    setLoadingMessages(true);
    setSelectedSpaceName(spaceName);
    setChatErrorDetail(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=20&orderBy=createTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg: string =
          errBody?.error?.message || `Google Chat API error (${res.status})`;
        if (res.status === 404 && msg.toLowerCase().includes('chat app not found')) {
          setChatConfigNotFound404(true);
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setSpaceMessages(data.messages || []);
    } catch (err: any) {
      setChatErrorDetail(err?.message || 'Unable to load messages for this space.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Mutating Action 4: Create Google Chat Space (Requires User Confirmation)
  const requestCreateChatSpace = () => {
    const cleanName = newSpaceDisplayName.trim() || 'Botanical Care Team';
    setPendingConfirmation({
      title: 'Confirm Creating a New Google Chat Space',
      description:
        'This will create a new Google Chat space in your Google Workspace organization.',
      targetLabel: `New Chat Space: "${cleanName}"`,
      payloadPreview: JSON.stringify({ spaceType: 'SPACE', displayName: cleanName }, null, 2),
      confirmLabel: 'Create Chat Space',
      onConfirm: async () => {
        const token = await getAccessToken();
        const res = await fetch('https://chat.googleapis.com/v1/spaces', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spaceType: 'SPACE',
            displayName: cleanName,
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg: string = errBody?.error?.message || `Failed to create space (${res.status})`;
          if (res.status === 404 && msg.toLowerCase().includes('chat app not found')) {
            setChatConfigNotFound404(true);
          }
          throw new Error(msg);
        }
        const createdSpace = await res.json();
        setStatusMessage({
          type: 'success',
          text: `Created Google Chat space "${cleanName}".`,
        });
        await fetchChatSpaces();
        if (createdSpace?.name) {
          await fetchSpaceMessages(createdSpace.name);
        }
      },
    });
  };

  // Mutating Action 5: Post Message to Google Chat Space (Requires User Confirmation)
  const requestSendChatMessage = () => {
    if (!selectedSpaceName) return;
    const cleanText = chatDraftMessage.trim();
    if (!cleanText) return;
    const targetSpaceObj = chatSpaces.find((s) => s.name === selectedSpaceName);
    const spaceLabel = targetSpaceObj?.displayName || selectedSpaceName;

    setPendingConfirmation({
      title: 'Confirm Sending Message to Google Chat Space',
      description:
        'This will post your botanical care update to all members in the selected Google Chat space.',
      targetLabel: `Destination Space: "${spaceLabel}" (${selectedSpaceName})`,
      payloadPreview: cleanText,
      confirmLabel: 'Send Chat Message',
      onConfirm: async () => {
        const token = await getAccessToken();
        const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpaceName}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: cleanText }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to send Chat message (${res.status})`);
        }
        setStatusMessage({
          type: 'success',
          text: `Posted botanical update to ${spaceLabel}.`,
        });
        await fetchSpaceMessages(selectedSpaceName);
      },
    });
  };

  // Destructive Action 6: Delete Google Chat Message (Requires User Confirmation)
  const requestDeleteChatMessage = (msg: ChatMessageItem) => {
    setPendingConfirmation({
      title: 'Confirm Deleting Google Chat Message',
      description:
        'This will permanently delete the selected message from the Google Chat space.',
      targetLabel: `Message Resource: ${msg.name}`,
      payloadPreview: msg.text || '(No text content)',
      destructive: true,
      confirmLabel: 'Delete Message',
      onConfirm: async () => {
        const token = await getAccessToken();
        const res = await fetch(`https://chat.googleapis.com/v1/${msg.name}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Failed to delete message (${res.status})`);
        }
        setStatusMessage({
          type: 'info',
          text: `Deleted message ${msg.name}.`,
        });
        if (selectedSpaceName) {
          await fetchSpaceMessages(selectedSpaceName);
        }
      },
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirmation) return;
    setConfirmingBusy(true);
    setStatusMessage(null);
    try {
      await pendingConfirmation.onConfirm();
      setPendingConfirmation(null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Operation failed.',
      });
      setPendingConfirmation(null);
    } finally {
      setConfirmingBusy(false);
    }
  };

  // Populate report template from a user plant or diagnosis
  const loadPlantTemplateIntoDraft = (plant: any) => {
    const title = `Botanical Care Dossier — ${plant.name} (${new Date().toLocaleDateString()})`;
    const body = [
      `Specimen Name: ${plant.name}`,
      `Botanical Species: ${plant.species || 'Verified Sanctuary Taxon'}`,
      `Current Health Score: ${plant.healthScore ?? 92}%`,
      `Light & Placement: ${plant.light || 'Bright indirect light'} · ${plant.location || 'Indoor Conservatory'}`,
      `Watering Schedule: Every ${plant.wateringFrequencyDays || 7} days`,
      `Notes & Care Protocol: Maintain balanced soil moisture, inspect leaf undersides for pests, and log weekly foliar observations in MYPLANTCARE.`,
    ].join('\n');
    setNewDocTitle(title);
    setNewDocBody(body);
    setChatDraftMessage(`🌱 *${plant.name}* (${plant.species || 'Specimen'}) Care Update — Health: ${plant.healthScore ?? 92}%. Next watering every ${plant.wateringFrequencyDays || 7} days.`);
  };

  return (
    <div data-testid="workspace-botanical-hub" className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-3xl border border-[#174C38]/16 dark:border-[#00D69A]/28 bg-white/90 dark:bg-[#153026]/90 backdrop-blur-xl p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GOOGLE WORKSPACE BOTANICAL STUDIO · DOCS & CHAT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
              Google Docs Care Journals & Google Chat Conservatory Spaces
            </h1>
            <p className="text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
              Export AI Plant Doctor pathology reports directly into structured Google Docs, append timestamped care observations, and coordinate plant rescue alerts with your team in Google Chat spaces.
            </p>
          </div>

          {/* Auth Status & Official Google Sign-In Control */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            {hasInMemoryToken && currentUser ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3.5 py-2 rounded-2xl border border-[#00D69A]/40 bg-[#00D69A]/10 text-xs">
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D69A]" />
                    <span>Workspace Connected (In-Memory Token)</span>
                  </div>
                  <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] truncate max-w-[220px]">
                    {currentUser.email || currentUser.displayName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleWorkspaceSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FF806B]/40 text-xs font-semibold text-[#FF806B] hover:bg-[#FF806B]/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <OfficialGoogleSignInButton
                  onClick={handleWorkspaceSignIn}
                  disabled={authBusy}
                  label={
                    authBusy
                      ? 'Authorizing Google Workspace...'
                      : currentUser
                        ? 'Authorize Google Docs & Chat Scopes'
                        : 'Sign in with Google'
                  }
                />
                <p className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#00D69A]" />
                  OAuth token cached strictly in memory (never written to localStorage)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-6 pt-5 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-2xl p-1 bg-[#F1ECE0] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/18">
            <button
              type="button"
              data-testid="workspace-tab-docs"
              onClick={() => setActiveTab('docs')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] shadow-sm'
                  : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Google Docs Care Journals
            </button>
            <button
              type="button"
              data-testid="workspace-tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] shadow-sm'
                  : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Google Chat Spaces & Alerts
            </button>
          </div>

          {/* Quick Specimen Prefill Pills */}
          {plants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                Prefill from Garden:
              </span>
              {plants.slice(0, 3).map((p: any) => (
                <button
                  key={p.id || p.name}
                  type="button"
                  onClick={() => loadPlantTemplateIntoDraft(p)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E9F0E6] dark:bg-[#193A2E] text-[#10251D] dark:text-[#C7F36B] hover:border-[#00D69A] border border-transparent transition-all cursor-pointer"
                >
                  <Sprout className="w-3 h-3 text-[#00D69A]" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Status Notification Bar */}
      {statusMessage && (
        <div
          role="status"
          data-testid="workspace-status-banner"
          className={`rounded-2xl p-4 border flex items-center justify-between gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-[#00D69A]/12 border-[#00D69A]/45 text-[#10251D] dark:text-[#FAF7EE]'
              : statusMessage.type === 'error'
                ? 'bg-[#FF806B]/14 border-[#FF806B]/50 text-[#10251D] dark:text-[#FAF7EE]'
                : 'bg-[#F5CA62]/15 border-[#F5CA62]/45 text-[#10251D] dark:text-[#FAF7EE]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D69A] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#FF806B] shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-mono underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: GOOGLE DOCS CARE JOURNALS & DIAGNOSTIC REPORTS */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Create New Google Doc Report & List Drive Docs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="w-5 h-5 text-[#00D69A]" />
                  <h2 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                    Create Botanical Care Report in Google Docs
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A]">
                  docs.googleapis.com/v1
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="new-doc-title-input"
                    className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4] mb-1"
                  >
                    Document Title
                  </label>
                  <input
                    id="new-doc-title-input"
                    data-testid="new-doc-title-input"
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g., Monstera Pathology & Care Journal"
                    className="w-full rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3.5 py-2.5 text-sm text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-doc-body-input"
                    className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4] mb-1"
                  >
                    Botanical Report Body (Formatted via batchUpdate)
                  </label>
                  <textarea
                    id="new-doc-body-input"
                    data-testid="new-doc-body-input"
                    rows={6}
                    value={newDocBody}
                    onChange={(e) => setNewDocBody(e.target.value)}
                    className="w-full rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3.5 py-2.5 text-xs sm:text-sm text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A] leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">
                    Creates document and formats Heading 1 + paragraphs. Confirmation required.
                  </span>
                  <button
                    type="button"
                    data-testid="create-google-doc-btn"
                    onClick={requestCreateGoogleDoc}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create Google Doc Report
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Google Docs List from Drive */}
            <div className="rounded-3xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-[#F5CA62]" />
                  <h2 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                    Your Google Docs in Drive
                  </h2>
                </div>
                <button
                  type="button"
                  data-testid="refresh-google-docs-btn"
                  onClick={fetchRecentGoogleDocs}
                  disabled={loadingDocs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                  {loadingDocs ? 'Loading...' : 'Load Google Docs'}
                </button>
              </div>

              {docsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#174C38]/20 dark:border-[#B6CDB4]/20 p-6 text-center space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-[#10251D] dark:text-[#FAF7EE]">
                    No Google Docs loaded yet
                  </p>
                  <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                    Click &ldquo;Load Google Docs&rdquo; to list your documents from Google Drive, or create a new Botanical Care Report above.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {docsList.map((file) => {
                    const isSelected = file.id === selectedDocId;
                    return (
                      <li
                        key={file.id}
                        className={`rounded-2xl border p-3 flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'border-[#00D69A] bg-[#00D69A]/10'
                            : 'border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-[#FAF7EE]/60 dark:bg-[#10251D]/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => inspectGoogleDoc(file.id)}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs sm:text-sm font-bold text-[#10251D] dark:text-[#FAF7EE] truncate">
                            {file.name}
                          </div>
                          {file.modifiedTime && (
                            <div className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                              Updated {new Date(file.modifiedTime).toLocaleString()}
                            </div>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={
                              file.webViewLink ||
                              `https://docs.google.com/document/d/${file.id}/edit`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Docs"
                            className="p-2 rounded-xl border border-[#174C38]/15 dark:border-[#B6CDB4]/20 text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => requestDeleteGoogleDoc(file)}
                            title="Delete Google Doc"
                            className="p-2 rounded-xl border border-[#FF806B]/30 text-[#FF806B] hover:bg-[#FF806B]/12 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column: Live Document Reader & Append Care Log */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-sm h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A]">
                      Document Inspector
                    </span>
                    <h2 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                      {selectedDocTitle || 'Select or Create a Google Doc'}
                    </h2>
                  </div>
                  {selectedDocId && (
                    <a
                      href={`https://docs.google.com/document/d/${selectedDocId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9F0E6] dark:bg-[#193A2E] text-xs font-semibold text-[#10251D] dark:text-[#C7F36B] hover:brightness-105"
                    >
                      Open in Google Docs <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-[#FAF7EE] dark:bg-[#10251D] p-4 min-h-[220px] max-h-[340px] overflow-y-auto">
                  {loadingDocDetail ? (
                    <p className="text-xs font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                      Reading document structure from docs.googleapis.com...
                    </p>
                  ) : selectedDocId ? (
                    <pre className="text-xs sm:text-sm font-sans whitespace-pre-wrap text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">
                      {selectedDocContent}
                    </pre>
                  ) : (
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                      Select any document from your Google Drive list on the left or create a new Botanical Care Report to inspect its live contents here.
                    </p>
                  )}
                </div>
              </div>

              {/* Append Care Observation Section */}
              <div className="pt-4 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 space-y-3">
                <label
                  htmlFor="append-doc-entry-input"
                  className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4]"
                >
                  Append Timestamped Care Observation to Selected Doc
                </label>
                <textarea
                  id="append-doc-entry-input"
                  data-testid="append-doc-entry-input"
                  rows={3}
                  value={appendEntryText}
                  onChange={(e) => setAppendEntryText(e.target.value)}
                  className="w-full rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3.5 py-2 text-xs sm:text-sm text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    data-testid="append-google-doc-btn"
                    disabled={!selectedDocId}
                    onClick={requestAppendToGoogleDoc}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold disabled:opacity-40 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Append Entry to Google Doc
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE CHAT SPACES & BOTANICAL ALERTS */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          {/* Mandatory Google Chat Prerequisites Notice Banner */}
          <div
            data-testid="google-chat-prerequisites-banner"
            className="rounded-3xl border border-[#F5CA62]/50 bg-[#F5CA62]/12 dark:bg-[#193A2E]/90 p-5 sm:p-6 space-y-3"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#F5CA62] shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs sm:text-sm">
                <h2 className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  Google Chat API Prerequisites (Required by chat.googleapis.com)
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-[#4A665B] dark:text-[#B6CDB4]">
                  <li>
                    <strong>1. Google Workspace Business or Enterprise Account:</strong> Calling{' '}
                    <code className="font-mono">chat.googleapis.com</code> with user authentication requires a Google Workspace organization account with Google Chat enabled (consumer <code className="font-mono">@gmail.com</code> accounts are not supported by the Chat API).
                  </li>
                  <li>
                    <strong>2. One-Time Google Chat App Configuration in Cloud Console:</strong> Even for user-authenticated requests, Google Cloud requires configuring an App Name, Avatar URL, and Description on the{' '}
                    <strong>Google Chat API &gt; Configuration</strong> page in your Cloud project (<code className="font-mono">{projectId}</code>). Until saved, <code className="font-mono">chat.googleapis.com</code> returns HTTP 404 (<code className="font-mono">Google Chat app not found</code>).
                  </li>
                </ul>
                <div className="pt-1">
                  <a
                    href={chatConsoleConfigUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="google-chat-console-config-link"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all"
                  >
                    Open Google Chat API Configuration ({projectId})
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated 404 Chat App Not Configured Callout */}
          {chatConfigNotFound404 && (
            <div
              data-testid="google-chat-404-setup-callout"
              className="rounded-2xl border border-[#FF806B]/60 bg-[#FF806B]/14 p-5 space-y-2 text-xs sm:text-sm"
            >
              <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF806B]" />
                <span>Action Required in Google Cloud Console: Google Chat App Not Configured Yet</span>
              </div>
              <p className="text-[#4A665B] dark:text-[#B6CDB4]">
                The Google Chat API returned: <code className="font-mono">{chatErrorDetail}</code>. Please open the{' '}
                <a
                  href={chatConsoleConfigUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-[#10251D] dark:text-[#00D69A]"
                >
                  Google Chat API Configuration page for project {projectId}
                </a>
                , fill in the App Name, Avatar URL, and Description, click Save, and then click &ldquo;Load Spaces&rdquo; below.
              </p>
            </div>
          )}

          {chatErrorDetail && !chatConfigNotFound404 && (
            <div className="rounded-2xl border border-[#FF806B]/50 bg-[#FF806B]/12 p-4 text-xs text-[#10251D] dark:text-[#FAF7EE]">
              <strong>Google Chat API Notice:</strong> {chatErrorDetail}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Spaces List & Create Space */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00D69A]" />
                    <h2 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                      Google Chat Spaces
                    </h2>
                  </div>
                  <button
                    type="button"
                    data-testid="refresh-chat-spaces-btn"
                    onClick={fetchChatSpaces}
                    disabled={loadingSpaces}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
                    {loadingSpaces ? 'Loading...' : 'Load Spaces'}
                  </button>
                </div>

                {chatSpaces.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#174C38]/20 dark:border-[#B6CDB4]/20 p-5 text-center space-y-1.5">
                    <p className="text-xs sm:text-sm font-medium text-[#10251D] dark:text-[#FAF7EE]">
                      No Google Chat spaces loaded
                    </p>
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                      Click &ldquo;Load Spaces&rdquo; after signing in with your Google Workspace account, or create a new space below.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {chatSpaces.map((space) => {
                      const isSelected = space.name === selectedSpaceName;
                      return (
                        <li key={space.name}>
                          <button
                            type="button"
                            onClick={() => fetchSpaceMessages(space.name)}
                            className={`w-full text-left rounded-2xl border p-3 transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-[#00D69A] bg-[#00D69A]/12'
                                : 'border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-[#FAF7EE]/60 dark:bg-[#10251D]/60'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-bold text-[#10251D] dark:text-[#FAF7EE]">
                              {space.displayName || space.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                              {space.name} · {space.spaceType || 'SPACE'}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Create New Google Chat Space */}
                <div className="pt-4 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 space-y-2.5">
                  <label
                    htmlFor="new-chat-space-input"
                    className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4]"
                  >
                    Create New Botanical Chat Space
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="new-chat-space-input"
                      data-testid="new-chat-space-input"
                      type="text"
                      value={newSpaceDisplayName}
                      onChange={(e) => setNewSpaceDisplayName(e.target.value)}
                      placeholder="Space display name"
                      className="flex-1 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3 py-2 text-xs text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                    />
                    <button
                      type="button"
                      data-testid="create-chat-space-btn"
                      onClick={requestCreateChatSpace}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Space
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Space Messages & Post Care Alert */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A]">
                      Space Timeline
                    </span>
                    <h2 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                      {selectedSpaceName
                        ? chatSpaces.find((s) => s.name === selectedSpaceName)?.displayName ||
                          selectedSpaceName
                        : 'Select a Google Chat Space'}
                    </h2>
                  </div>
                  {selectedSpaceName && (
                    <button
                      type="button"
                      onClick={() => fetchSpaceMessages(selectedSpaceName)}
                      disabled={loadingMessages}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#174C38]/16 dark:border-[#B6CDB4]/20 text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                      Refresh Messages
                    </button>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-[#FAF7EE] dark:bg-[#10251D] p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2.5">
                  {loadingMessages ? (
                    <p className="text-xs font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                      Loading space messages from chat.googleapis.com...
                    </p>
                  ) : spaceMessages.length === 0 ? (
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                      {selectedSpaceName
                        ? 'No messages found in this space yet. Post a botanical care update below.'
                        : 'Select a Google Chat space on the left (or enter a space resource name like spaces/AAAA...) to view or post messages.'}
                    </p>
                  ) : (
                    spaceMessages.map((msg) => (
                      <div
                        key={msg.name}
                        className="rounded-xl border border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-3 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A]">
                            <span>{msg.sender?.displayName || msg.sender?.name || 'Member'}</span>
                            {msg.createTime && (
                              <span>· {new Date(msg.createTime).toLocaleString()}</span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[#10251D] dark:text-[#FAF7EE] whitespace-pre-wrap break-words">
                            {msg.text || '(Attachment / Card Message)'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => requestDeleteChatMessage(msg)}
                          title="Delete Chat Message"
                          className="p-1.5 rounded-lg text-[#FF806B] hover:bg-[#FF806B]/12 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Compose & Send Message */}
                <div className="pt-3 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="target-space-resource-input"
                        className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4] mb-1"
                      >
                        Target Space Resource Name
                      </label>
                      <input
                        id="target-space-resource-input"
                        data-testid="target-space-resource-input"
                        type="text"
                        value={selectedSpaceName}
                        onChange={(e) => setSelectedSpaceName(e.target.value)}
                        placeholder="e.g., spaces/AAAABBBB"
                        className="w-full rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3 py-2 text-xs font-mono text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="chat-draft-message-input"
                      className="block text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4] mb-1"
                    >
                      Botanical Care / Diagnosis Alert Message
                    </label>
                    <textarea
                      id="chat-draft-message-input"
                      data-testid="chat-draft-message-input"
                      rows={3}
                      value={chatDraftMessage}
                      onChange={(e) => setChatDraftMessage(e.target.value)}
                      className="w-full rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] px-3.5 py-2 text-xs sm:text-sm text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">
                      Prompts for confirmation before posting to Google Chat.
                    </span>
                    <button
                      type="button"
                      data-testid="send-chat-message-btn"
                      disabled={!selectedSpaceName.trim()}
                      onClick={requestSendChatMessage}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold disabled:opacity-40 hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Message to Space
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR ALL MUTATING / DESTRUCTIVE OPERATIONS */}
      {pendingConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="workspace-confirmation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/80 backdrop-blur-sm p-4"
        >
          <div className="max-w-lg w-full rounded-3xl border border-[#174C38]/20 dark:border-[#00D69A]/35 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingConfirmation.destructive
                    ? 'bg-[#FF806B]/20 text-[#FF806B]'
                    : 'bg-[#00D69A]/20 text-[#0F6B50] dark:text-[#00D69A]'
                }`}
              >
                {pendingConfirmation.destructive ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <Stethoscope className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  {pendingConfirmation.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4]">
                  {pendingConfirmation.description}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-[#FAF7EE] dark:bg-[#10251D] p-3.5 space-y-2">
              <div className="text-xs font-mono font-bold text-[#0F6B50] dark:text-[#00D69A]">
                {pendingConfirmation.targetLabel}
              </div>
              {pendingConfirmation.payloadPreview && (
                <pre className="text-xs font-sans whitespace-pre-wrap text-[#10251D] dark:text-[#FAF7EE] max-h-40 overflow-y-auto">
                  {pendingConfirmation.payloadPreview}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="workspace-confirm-cancel-btn"
                disabled={confirmingBusy}
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/25 text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] hover:bg-[#E9F0E6] dark:hover:bg-[#193A2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="workspace-confirm-proceed-btn"
                disabled={confirmingBusy}
                onClick={executeConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                  pendingConfirmation.destructive
                    ? 'bg-[#FF806B] text-[#10251D] hover:brightness-110'
                    : 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] hover:brightness-110'
                }`}
              >
                {confirmingBusy ? 'Executing...' : pendingConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
