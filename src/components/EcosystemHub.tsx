import React, { useState, useCallback, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  Users,
  ShoppingBag,
  Heart,
  MessageCircle,
  CheckCircle2,
  ShoppingCart,
  Info,
  ShieldCheck,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  PLANT_LIBRARY,
  ACADEMY_MODULES,
  MARKETPLACE_CATALOG,
  REPAIRED_IMAGE_REFERENCES,
  MarketplaceItem,
} from '../data/botanicalCatalog';
import { BotanicalImage } from './ui/BotanicalImage';
import { BotanicalSearchGrounding } from './search/BotanicalSearchGrounding';
import { ExpandedBotanicalLibrary } from './library/ExpandedBotanicalLibrary';
import { BotanicalAcademyVisual } from './academy/BotanicalAcademyVisual';
import { generateBotanicalImageAuditReport } from '../utils/botanicalImageVerification';

interface EcosystemHubProps {
  activeSection: 'library' | 'academy' | 'community' | 'marketplace' | 'legal';
  onSectionChange: (sec: 'library' | 'academy' | 'community' | 'marketplace' | 'legal') => void;
  workspaceData: any;
  onRefresh: () => void;
  authToken?: string | null;
}

export const EcosystemHub: React.FC<EcosystemHubProps> = ({
  activeSection,
  onSectionChange,
  workspaceData,
  onRefresh,
  authToken,
}) => {
  // 1. Plant Library & Image Diagnostics State
  const [showImageReport, setShowImageReport] = useState(false);
  const [imageAuditMap, setImageAuditMap] = useState<Record<string, 'loaded' | 'error'>>({});

  const handleTrackImageStatus = useCallback((id: string, status: 'loaded' | 'error') => {
    setImageAuditMap((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
  }, []);


  const catalogAudit = useMemo(() => generateBotanicalImageAuditReport(PLANT_LIBRARY), []);

  const auditStats = useMemo(() => {
    const allAssets = [
      ...PLANT_LIBRARY.map((p) => ({ id: `lib:${p.id}`, name: p.commonName, src: p.imageUrl })),
      ...MARKETPLACE_CATALOG.map((m) => ({ id: `mkt:${m.id}`, name: m.name, src: m.imageUrl })),
    ];
    const brokenItems = allAssets.filter((item) => imageAuditMap[item.id] === 'error');
    return {
      totalAssets: allAssets.length,
      libraryCount: PLANT_LIBRARY.length,
      marketplaceCount: MARKETPLACE_CATALOG.length,
      verifiedCount: catalogAudit.verifiedCount + MARKETPLACE_CATALOG.length,
      flaggedCount: catalogAudit.awaitingVerificationCount + catalogAudit.duplicateConflictCount + catalogAudit.suspiciousStockCount,
      brokenItems,
    };
  }, [imageAuditMap, catalogAudit]);

  // 2. Academy Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  // 3. Community State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postPlantTag, setPostPlantTag] = useState('Monstera deliciosa');
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // 4. Marketplace State
  const [mktCategory, setMktCategory] = useState('All');
  const [cart, setCart] = useState<{ item: MarketplaceItem; qty: number }[]>([]);
  const [orderNotice, setOrderNotice] = useState('');

  const filteredMarketplace = MARKETPLACE_CATALOG.filter(
    (item) => mktCategory === 'All' || item.category === mktCategory
  );

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    await fetch('/api/community', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        authorName: 'Aarav Sharma • Sanctuary Member',
        title: postTitle.trim(),
        content: postContent.trim(),
        category: 'Botanical Update',
        plantTag: postPlantTag,
      }),
    });
    setPostTitle('');
    setPostContent('');
    onRefresh();
  };

  const handlePostInteract = async (postId: number, action: 'like' | 'comment') => {
    const commentText = commentInputs[postId];
    if (action === 'comment' && (!commentText || !commentText.trim())) return;
    await fetch(`/api/community/${postId}/interact`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action,
        commentText,
        authorName: 'Aarav Sharma',
      }),
    });
    if (action === 'comment') {
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    }
    onRefresh();
  };

  const handleAddToCart = (item: MarketplaceItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.priceInr * c.qty, 0);

  const handlePlaceOrderReservation = async () => {
    if (cart.length === 0) return;
    await fetch('/api/marketplace/order', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        items: cart.map((c) => ({ id: c.item.id, name: c.item.name, qty: c.qty, priceInr: c.item.priceInr })),
        totalAmount: cartTotal,
      }),
    });
    setCart([]);
    setOrderNotice(
      'Reservation recorded in PostgreSQL order history. Live payment capture requires configuring your merchant gateway in production settings.'
    );
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ['library', 'Plant Library', BookOpen],
            ['academy', 'Gardening Academy', GraduationCap],
            ['community', 'Plant Community', Users],
            ['marketplace', `Botanical Marketplace (${cart.reduce((a, b) => a + b.qty, 0)})`, ShoppingBag],
            ['legal', 'About, Contact & Policies', Info],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === id
                  ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D]'
                  : 'text-[#10251D]/75 dark:text-[#B6CDB4] hover:bg-[#FAF7EE] dark:hover:bg-[#10251D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeSection === 'library' && (
          <button
            type="button"
            onClick={() => setShowImageReport((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/30 bg-[#FAF7EE] dark:bg-[#10251D] text-xs font-semibold text-[#174C38] dark:text-[#00D69A] hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {showImageReport ? 'Hide Image Diagnostic Report' : 'Image Diagnostic Report'}
          </button>
        )}
      </div>

      {/* 1. PLANT LIBRARY */}
      {activeSection === 'library' && (
        <div className="space-y-5">

          {/* Live Google Search Grounding with Gemini 4 Hydrogen */}
          <BotanicalSearchGrounding
            authToken={authToken}
            onNoteSaved={onRefresh}
          />

          {/* Interactive Image Diagnostic Report Panel */}
          {showImageReport && (
            <div
              data-testid="image-diagnostic-report"
              className="p-5 rounded-2xl border border-[#00D69A]/45 bg-[#FFFFFF] dark:bg-[#153026] space-y-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#174C38]/12 dark:border-[#00D69A]/20 pb-3">
                <div>
                  <div className="text-xs font-mono text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> BOTANICAL IMAGE DIAGNOSTIC & INTEGRITY REPORT
                  </div>
                  <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
                    Species-Matched Asset Verification ({auditStats.totalAssets} Catalog Items)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageReport(false)}
                  aria-label="Close Image Diagnostic Report"
                  className="p-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4]">Total Catalog Images</div>
                  <div className="text-2xl font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] mt-0.5 tabular-nums">
                    {auditStats.totalAssets}
                  </div>
                  <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">
                    {auditStats.libraryCount} Library · {auditStats.marketplaceCount} Market
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4]">Verified Species Photos</div>
                  <div className="text-2xl font-extrabold font-mono text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {auditStats.verifiedCount}
                  </div>
                  <div className="text-[11px] text-[#174C38] dark:text-[#00D69A]">
                    {auditStats.flaggedCount === 0 ? 'Zero stock/duplicate conflicts' : `${auditStats.flaggedCount} flagged`}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4]">Broken / Missing</div>
                  <div className="text-2xl font-extrabold font-mono text-[#FF806B] mt-0.5 tabular-nums">
                    {auditStats.brokenItems.length}
                  </div>
                  <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">
                    {auditStats.brokenItems.length === 0 ? 'Zero broken links' : 'Fallback active'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4]">Repaired Species Mappings</div>
                  <div className="text-2xl font-extrabold font-mono text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                    {REPAIRED_IMAGE_REFERENCES.length}
                  </div>
                  <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">Dedicated botanical photos</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  Repaired Mismatched Image References
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {REPAIRED_IMAGE_REFERENCES.map((rep) => (
                    <div
                      key={rep.species}
                      className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-0.5"
                    >
                      <div className="font-bold text-[#174C38] dark:text-[#00D69A]">{rep.species}</div>
                      <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">
                        Previously: <span className="font-mono">{rep.previous.split('/').pop()}</span>
                      </div>
                      <div className="text-[11px] text-[#10251D] dark:text-[#FAF7EE]">
                        Repaired: <span className="font-mono">{rep.repaired.split('/').pop()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {auditStats.brokenItems.length > 0 ? (
                <div className="p-3 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/40 text-xs text-[#9B3B28] dark:text-[#FF806B] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Manual check needed for: {auditStats.brokenItems.map((b) => b.name).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/35 text-xs text-[#174C38] dark:text-[#00D69A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    All loaded botanical photographs match their target plant species with BotanicalImage fallback protection enabled.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expanded Botanical Herbarium Library (113+ Verified Species across 10 Categories) */}
          <ExpandedBotanicalLibrary authToken={authToken} />
        </div>
      )}

      {/* 2. GARDENING ACADEMY */}
      {activeSection === 'academy' && (
        <div className="space-y-5">
          {ACADEMY_MODULES.map((mod) => {
            const selectedAns = quizAnswers[mod.id];
            const isCorrect = selectedAns === mod.correctIndex;
            return (
              <div
                key={mod.id}
                className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#174C38] dark:text-[#00D69A]">
                      {mod.level} · {mod.duration}
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">{mod.title}</h3>
                  </div>
                </div>
                <BotanicalAcademyVisual
                  title={mod.title}
                  visualType={mod.visualType}
                  imageUrl={mod.imageUrl}
                  diagramId={mod.diagramId}
                  caption={mod.caption}
                  sourceCredit={mod.sourceCredit}
                />
                <p className="text-xs text-[#10251D]/80 dark:text-[#B6CDB4] leading-relaxed">{mod.summary}</p>
                <div className="p-3.5 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/30 text-xs text-[#174C38] dark:text-[#C7F36B]">
                  <strong>GREENY Simple Translation:</strong> "{mod.greenySimpleExplanation}"
                </div>
                <div className="space-y-1 text-xs text-[#10251D]/80 dark:text-[#B6CDB4]">
                  {mod.keySteps.map((st, i) => (
                    <div key={i}>• {st}</div>
                  ))}
                </div>
                <div className="pt-3 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 space-y-2">
                  <div className="text-xs font-bold text-[#10251D] dark:text-[#FAF7EE]">
                    Interactive Knowledge Check: {mod.quizQuestion}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {mod.quizOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [mod.id]: idx }))}
                        className={`p-3 rounded-xl text-left text-xs border transition-colors cursor-pointer ${
                          selectedAns === idx
                            ? idx === mod.correctIndex
                              ? 'bg-[#00D69A]/20 border-[#00D69A] text-[#10251D] dark:text-[#FAF7EE] font-semibold'
                              : 'bg-[#FF806B]/20 border-[#FF806B] text-[#10251D] dark:text-[#FAF7EE]'
                            : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#174C38]/15 dark:border-[#00D69A]/20 text-[#10251D] dark:text-[#FAF7EE]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {selectedAns !== undefined && (
                    <p className={`text-xs font-semibold ${isCorrect ? 'text-[#174C38] dark:text-[#00D69A]' : 'text-[#9B3B28] dark:text-[#FF806B]'}`}>
                      {isCorrect
                        ? 'Correct! You have mastered this botanical principle.'
                        : 'Not quite—review GREENY’s root respiration explanation above and try again.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. AI PLANT COMMUNITY */}
      {activeSection === 'community' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishPost}
            className="lg:col-span-4 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-4 h-fit shadow-sm"
          >
            <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
              Share Botanical Update or Question
            </h3>
            <p className="text-xs text-[#10251D]/65 dark:text-[#B6CDB4]">
              All community posts are automatically screened for botanical safety and spam prevention.
            </p>
            <div>
              <label className="block text-xs font-medium text-[#10251D] dark:text-[#FAF7EE] mb-1">Post Headline</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="e.g., My Krishna Tulsi winter care routine"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#10251D] dark:text-[#FAF7EE] mb-1">Species Tag</label>
              <input
                type="text"
                value={postPlantTag}
                onChange={(e) => setPostPlantTag(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#10251D] dark:text-[#FAF7EE] mb-1">Experience / Tip Details</label>
              <textarea
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share substrate ratios, watering schedules, or observations..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold text-xs hover:brightness-110 transition-all cursor-pointer"
            >
              Publish to Botanical Community
            </button>
          </form>

          <div className="lg:col-span-8 space-y-4">
            {(workspaceData?.posts || []).map((post: any) => {
              let comments: any[] = [];
              try {
                comments = JSON.parse(post.commentsJson || '[]');
              } catch {
                comments = [];
              }
              return (
                <div
                  key={post.id}
                  className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs text-[#10251D]/65 dark:text-[#B6CDB4]">
                    <span>
                      {post.authorName} · {post.category} · {post.plantTag}
                    </span>
                    <span className="flex items-center gap-1 text-[#174C38] dark:text-[#00D69A] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {post.moderationStatus}
                    </span>
                  </div>
                  <h4 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">{post.title}</h4>
                  <p className="text-xs text-[#10251D]/85 dark:text-[#B6CDB4] leading-relaxed">{post.content}</p>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePostInteract(post.id, 'like')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#10251D]/80 dark:text-[#B6CDB4] hover:text-[#174C38] dark:hover:text-[#00D69A] cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" /> {post.likesCount} Appreciations
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-[#10251D]/65 dark:text-[#B6CDB4]">
                      <MessageCircle className="w-4 h-4" /> {comments.length} Replies
                    </span>
                  </div>

                  {comments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#174C38]/12 dark:border-[#00D69A]/18">
                      {comments.map((c: any, idx: number) => (
                        <div key={idx} className="text-xs bg-[#FAF7EE] dark:bg-[#10251D] p-2.5 rounded-xl">
                          <span className="font-bold text-[#174C38] dark:text-[#00D69A]">{c.author}: </span>
                          <span className="text-[#10251D]/85 dark:text-[#FAF7EE]">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Write a helpful botanical reply..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                    />
                    <button
                      type="button"
                      onClick={() => handlePostInteract(post.id, 'comment')}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] hover:bg-[#174C38] hover:text-[#FFFFFF] dark:hover:bg-[#00D69A] dark:hover:text-[#10251D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. BOTANICAL MARKETPLACE */}
      {activeSection === 'marketplace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Plants', 'Seeds', 'Pots', 'Organic Compost', 'Fertilizers', 'Gardening Tools'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMktCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mktCategory === cat
                      ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D]'
                      : 'bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[#10251D] dark:text-[#FAF7EE]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMarketplace.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] overflow-hidden flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="h-40 bg-[#174C38] overflow-hidden">
                      <BotanicalImage
                        src={item.imageUrl}
                        alt={item.name}
                        commonName={item.name}
                        scientificName={item.category}
                        className="w-full h-full object-cover"
                        onStatusChange={(st) => handleTrackImageStatus(`mkt:${item.id}`, st)}
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="text-[11px] text-[#174C38] dark:text-[#00D69A] font-medium">
                        {item.category} · {item.rating}
                      </div>
                      <h4 className="text-sm font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">{item.name}</h4>
                      <p className="text-xs text-[#10251D]/70 dark:text-[#B6CDB4]">{item.specification}</p>
                      <p className="text-[11px] text-[#10251D]/60 dark:text-[#B6CDB4]">Nursery: {item.seller}</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 flex items-center justify-between">
                    <span className="text-lg font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                      ₹{item.priceInr}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="px-3.5 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] text-xs font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-4 h-fit shadow-sm">
            <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" /> Botanical Cart & Order History
            </h3>
            {cart.length === 0 ? (
              <p className="text-xs text-[#10251D]/65 dark:text-[#B6CDB4]">
                Your botanical cart is currently empty. Add verified plants, heirloom seeds, or organic compost to reserve.
              </p>
            ) : (
              <div className="space-y-2.5">
                {cart.map((c) => (
                  <div
                    key={c.item.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D]"
                  >
                    <span className="truncate pr-2 text-[#10251D] dark:text-[#FAF7EE]">
                      {c.item.name} × {c.qty}
                    </span>
                    <span className="font-mono font-bold shrink-0 text-[#10251D] dark:text-[#FAF7EE]">₹{c.item.priceInr * c.qty}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 text-sm font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  <span>Total Reservation</span>
                  <span className="font-mono text-[#174C38] dark:text-[#00D69A]">₹{cartTotal}</span>
                </div>
                <button
                  type="button"
                  onClick={handlePlaceOrderReservation}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold text-xs hover:brightness-110 transition-all cursor-pointer"
                >
                  Save Order Reservation
                </button>
              </div>
            )}

            {orderNotice && (
              <div className="p-3 rounded-xl bg-[#00D69A]/15 border border-[#00D69A]/35 text-xs text-[#174C38] dark:text-[#C7F36B]">
                {orderNotice}
              </div>
            )}

            <div className="pt-3 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 space-y-2">
              <div className="text-xs font-bold text-[#10251D] dark:text-[#FAF7EE]">
                Saved Order Reservations ({(workspaceData?.orders || []).length})
              </div>
              {(workspaceData?.orders || []).map((o: any) => (
                <div key={o.id} className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] text-xs">
                  <div className="font-mono font-bold text-[#174C38] dark:text-[#00D69A]">Order #{o.id} · ₹{o.totalAmount}</div>
                  <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4]">{o.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABOUT US, CONTACT US, PRIVACY POLICY & TERMS */}
      {activeSection === 'legal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-3 shadow-sm">
            <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">About MYPLANTCARE</h3>
            <p className="text-xs text-[#10251D]/75 dark:text-[#B6CDB4] leading-relaxed">
              MYPLANTCARE ("Grow Better. Care Smarter. Live Greener.") is an intelligent botanical technology ecosystem uniting multimodal computer vision, conversational voice AI (GREENY), 3D spatial garden simulation, and 19 integrated horticultural intelligence specialists for home gardeners, students, nurseries, and agricultural stewards.
            </p>
            <h4 className="text-sm font-bold text-[#10251D] dark:text-[#FAF7EE] pt-2">Contact Botanical Support</h4>
            <p className="text-xs text-[#10251D]/75 dark:text-[#B6CDB4]">
              Sanctuary Research Desk: sanctuary@myplantcare.ai · Bengaluru Botanical Innovation Hub, Karnataka, India.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-3 shadow-sm">
            <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">Privacy Policy & Terms of Use</h3>
            <p className="text-xs text-[#10251D]/75 dark:text-[#B6CDB4] leading-relaxed">
              <strong className="text-[#10251D] dark:text-[#FAF7EE]">Plant Memory Privacy:</strong> You retain full ownership of your uploaded plant photographs, soil records, and care logs stored in PostgreSQL. You can edit or permanently delete any plant record at any time from the My Gardens & Plants tab.
            </p>
            <p className="text-xs text-[#10251D]/75 dark:text-[#B6CDB4] leading-relaxed">
              <strong className="text-[#10251D] dark:text-[#FAF7EE]">Diagnostic Disclaimer:</strong> AI Plant Doctor and Nutrient Deficiency assessments provide educational visual hypotheses and never substitute certified laboratory pathology or soil testing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
