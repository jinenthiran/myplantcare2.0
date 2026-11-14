import React, { useEffect, useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Send, Globe, Mail, X } from 'lucide-react';
import { SocialShareService, ShareCardPayload } from '../services/socialShareService';

interface SocialShareModalProps {
  payload?: ShareCardPayload;
  title?: string;
  shareText?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  payload,
  title = 'Share Botanical Achievement',
  shareText: rawShareText,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cardPayload: ShareCardPayload = payload || {
    title,
    summaryText: rawShareText || 'My botanical observatory is thriving.',
    category: 'achievement',
  };

  const formattedText = SocialShareService.formatShareText(cardPayload);
  const platformUrls = SocialShareService.getPlatformShareUrls(cardPayload);

  const handleCopyLink = async () => {
    const result = await SocialShareService.shareCard(cardPayload);
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={cardPayload.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/80 backdrop-blur-sm p-4"
    >
      <div className="bg-[#FAF7EE] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/35 rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#10251D] dark:text-[#FAF7EE] shadow-2xl relative space-y-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] text-[#4A665B] dark:text-[#B6CDB4] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00D69A]/16 border border-[#00D69A]/35 flex items-center justify-center text-[#0F6B50] dark:text-[#00D69A]">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold">{cardPayload.title}</h3>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">Observatory Card Export</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 rounded-2xl p-4 text-xs font-mono whitespace-pre-line text-[#10251D] dark:text-[#FAF7EE] leading-relaxed max-h-48 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A] mb-2">
            Card Preview
          </div>
          {formattedText}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href={platformUrls.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#10251D] hover:border-[#00D69A] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs font-medium transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[#00D69A]" />
            <span>WhatsApp</span>
          </a>

          <a
            href={platformUrls.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#10251D] hover:border-[#56C7C0] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs font-medium transition-colors"
          >
            <Globe className="w-5 h-5 text-[#56C7C0]" />
            <span>Twitter / X</span>
          </a>

          <a
            href={platformUrls.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#10251D] hover:border-[#BBA8F5] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs font-medium transition-colors"
          >
            <Send className="w-5 h-5 text-[#BBA8F5]" />
            <span>LinkedIn</span>
          </a>

          <a
            href={platformUrls.email}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#10251D] hover:border-[#F5CA62] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs font-medium transition-colors"
          >
            <Mail className="w-5 h-5 text-[#F5CA62]" />
            <span>Email</span>
          </a>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied Card to Clipboard' : 'Export Card (Copy / Share)'}</span>
        </button>
      </div>
    </div>
  );
};
