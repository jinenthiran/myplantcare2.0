import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Users,
  ShoppingBag,
  Search,
  Heart,
  MessageCircle,
  CheckCircle2,
  ShoppingCart,
  Info,
} from 'lucide-react';
import {
  PLANT_LIBRARY,
  ACADEMY_MODULES,
  MARKETPLACE_CATALOG,
  LibraryPlant,
  MarketplaceItem,
} from '../data/botanicalCatalog';

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
  // 1. Plant Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inspectedPlant, setInspectedPlant] = useState<LibraryPlant | null>(null);

  const filteredPlants = PLANT_LIBRARY.filter((p) => {
    const matchesSearch =
      p.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.benefits.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeSection === id
                ? 'bg-[#00C878] text-[#071B12]'
                : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 1. PLANT LIBRARY */}
      {activeSection === 'library' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by common name, Latin binomial, or air-purifying benefit..."
                aria-label="Search Plant Library"
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Indoor Foliage', 'Sacred & Medicinal', 'Air Purifying', 'Tropical Flowering', 'Kitchen & Culinary'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#00C878] text-[#071B12] font-bold'
                        : 'bg-slate-100 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredPlants.map((plant) => (
              <div
                key={plant.id}
                className="group rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="overflow-hidden h-44 bg-[#071B12]">
                    <img
                      src={plant.imageUrl}
                      alt={plant.commonName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] text-slate-500 dark:text-[#B7F76B]">
                      {plant.family} · {plant.category}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{plant.commonName}</h3>
                    <p className="text-xs italic text-slate-500 dark:text-[#F7F9F2]/65">{plant.scientificName}</p>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 line-clamp-3">{plant.benefits}</p>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => setInspectedPlant(plant)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#123D2A] text-slate-900 dark:text-white text-xs font-semibold hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                  >
                    Inspect Botanical Monograph
                  </button>
                </div>
              </div>
            ))}
          </div>

          {inspectedPlant && (
            <div className="p-6 rounded-2xl border border-[#00C878] bg-white dark:bg-[#0B2419] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#00C878]">
                    BOTANICAL MONOGRAPH · {inspectedPlant.scientificName}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">{inspectedPlant.commonName}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedPlant(null)}
                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#123D2A] text-xs font-semibold"
                >
                  Close Monograph
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <strong>Leaf & Flower Morphology:</strong> {inspectedPlant.leafStructure}. {inspectedPlant.flowerInfo}
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <strong>Ideal Substrate & pH:</strong> {inspectedPlant.soilMix}
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <strong>Growth & Microclimate:</strong> {inspectedPlant.growthRate} · Max Height: {inspectedPlant.maxHeight}
                </div>
              </div>
            </div>
          )}
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
                className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#00C878]">
                      {mod.level} · {mod.duration}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{mod.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-[#F7F9F2]/85 leading-relaxed">{mod.summary}</p>
                <div className="p-3.5 rounded-xl bg-[#00C878]/10 border border-[#00C878]/30 text-xs text-slate-800 dark:text-[#B7F76B]">
                  <strong>GREENY Simple Translation:</strong> "{mod.greenySimpleExplanation}"
                </div>
                <div className="space-y-1 text-xs text-slate-600 dark:text-[#F7F9F2]/80">
                  {mod.keySteps.map((st, i) => (
                    <div key={i}>• {st}</div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#123D2A] space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Interactive Knowledge Check: {mod.quizQuestion}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {mod.quizOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [mod.id]: idx }))}
                        className={`p-3 rounded-xl text-left text-xs border transition-colors ${
                          selectedAns === idx
                            ? idx === mod.correctIndex
                              ? 'bg-[#00C878]/20 border-[#00C878] text-slate-900 dark:text-white font-semibold'
                              : 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-[#071B12] border-slate-200 dark:border-[#123D2A]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {selectedAns !== undefined && (
                    <p className={`text-xs font-semibold ${isCorrect ? 'text-[#00C878]' : 'text-amber-500'}`}>
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
            className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Share Botanical Update or Question
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
              All community posts are automatically screened for botanical safety and spam prevention.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">Post Headline</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="e.g., My Krishna Tulsi winter care routine"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Species Tag</label>
              <input
                type="text"
                value={postPlantTag}
                onChange={(e) => setPostPlantTag(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Experience / Tip Details</label>
              <textarea
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share substrate ratios, watering schedules, or observations..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
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
                  className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#B7F76B]">
                    <span>
                      {post.authorName} · {post.category} · {post.plantTag}
                    </span>
                    <span className="flex items-center gap-1 text-[#00C878] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {post.moderationStatus}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{post.title}</h4>
                  <p className="text-xs text-slate-700 dark:text-[#F7F9F2]/85 leading-relaxed">{post.content}</p>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePostInteract(post.id, 'like')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#F7F9F2]/80 hover:text-[#00C878]"
                    >
                      <Heart className="w-4 h-4 text-[#00C878]" /> {post.likesCount} Appreciations
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#F7F9F2]/65">
                      <MessageCircle className="w-4 h-4" /> {comments.length} Replies
                    </span>
                  </div>

                  {comments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#123D2A]">
                      {comments.map((c: any, idx: number) => (
                        <div key={idx} className="text-xs bg-slate-50 dark:bg-[#071B12] p-2.5 rounded-xl">
                          <span className="font-bold text-slate-900 dark:text-[#B7F76B]">{c.author}: </span>
                          <span className="text-slate-700 dark:text-[#F7F9F2]/85">{c.text}</span>
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
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                    />
                    <button
                      type="button"
                      onClick={() => handlePostInteract(post.id, 'comment')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#123D2A] text-xs font-semibold hover:bg-[#00C878] hover:text-[#071B12]"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    mktCategory === cat
                      ? 'bg-[#00C878] text-[#071B12]'
                      : 'bg-white dark:bg-[#0B2419] border border-slate-200 dark:border-[#123D2A]'
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
                  className="rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4 space-y-1.5">
                      <div className="text-[11px] text-slate-500 dark:text-[#B7F76B]">
                        {item.category} · {item.rating}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">{item.specification}</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/60">Nursery: {item.seller}</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 flex items-center justify-between">
                    <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      ₹{item.priceInr}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="px-3.5 py-2 rounded-xl bg-[#00C878] text-[#071B12] text-xs font-bold hover:bg-[#B7F76B] transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4 h-fit">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#00C878]" /> Botanical Cart & Order History
            </h3>
            {cart.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">
                Your botanical cart is currently empty. Add verified plants, heirloom seeds, or organic compost to reserve.
              </p>
            ) : (
              <div className="space-y-2.5">
                {cart.map((c) => (
                  <div
                    key={c.item.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-[#071B12]"
                  >
                    <span className="truncate pr-2">
                      {c.item.name} × {c.qty}
                    </span>
                    <span className="font-mono font-bold shrink-0">₹{c.item.priceInr * c.qty}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#123D2A] text-sm font-bold">
                  <span>Total Reservation</span>
                  <span className="font-mono text-[#00C878]">₹{cartTotal}</span>
                </div>
                <button
                  type="button"
                  onClick={handlePlaceOrderReservation}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B]"
                >
                  Save Order Reservation
                </button>
              </div>
            )}

            {orderNotice && (
              <div className="p-3 rounded-xl bg-[#00C878]/15 border border-[#00C878]/30 text-xs text-slate-800 dark:text-[#B7F76B]">
                {orderNotice}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-[#123D2A] space-y-2">
              <div className="text-xs font-bold">Saved Order Reservations ({(workspaceData?.orders || []).length})</div>
              {(workspaceData?.orders || []).map((o: any) => (
                <div key={o.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#071B12] text-xs">
                  <div className="font-mono font-bold text-[#00C878]">Order #{o.id} · ₹{o.totalAmount}</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">{o.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABOUT US, CONTACT US, PRIVACY POLICY & TERMS */}
      {activeSection === 'legal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">About MYPLANTCARE</h3>
            <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
              MYPLANTCARE ("Grow Better. Care Smarter. Live Greener.") is an intelligent botanical technology ecosystem uniting multimodal computer vision, conversational voice AI (GREENY), 3D spatial garden simulation, and precision soil-water-weather analytics for home gardeners, students, nurseries, and agricultural stewards.
            </p>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white pt-2">Contact Botanical Support</h4>
            <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80">
              Sanctuary Research Desk: sanctuary@myplantcare.ai · Bengaluru Botanical Innovation Hub, Karnataka, India.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Privacy Policy & Terms of Use</h3>
            <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
              <strong>Plant Memory Privacy:</strong> You retain full ownership of your uploaded plant photographs, soil records, and care logs stored in PostgreSQL. You can edit or permanently delete any plant record at any time from the My Plants tab.
            </p>
            <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
              <strong>Diagnostic Disclaimer:</strong> AI Plant Doctor and Nutrient Deficiency assessments provide educational visual hypotheses and never substitute certified laboratory pathology or soil testing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
