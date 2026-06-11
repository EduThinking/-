import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  History, 
  User, 
  Download, 
  Share2, 
  Heart, 
  Trash2, 
  Search, 
  PenLine, 
  CreditCard, 
  Check, 
  Copy, 
  X, 
  ExternalLink,
  Smartphone,
  Square,
  Video,
  Monitor,
  Info,
  Calendar,
  Lock,
  LogOut,
  Mail,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { IMAGE_STYLES, INITIAL_USER, INITIAL_INVOICES, AVATAR_OPTIONS, INITIAL_IMAGES } from "./data";
import { GeneratedImage, UserProfile, Invoice, ImageStyle } from "./types";

export default function App() {
  // State managers
  const [activeTab, setActiveTab] = useState<"studio" | "gallery" | "account">("studio");
  
  // Images list, loading from localStorage if exists
  const [images, setImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem("imagine_images");
    return saved ? JSON.parse(saved) : INITIAL_IMAGES;
  });

  // User profile state
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("imagine_user");
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  // Invoice list
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);

  // Active inputs
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("anime");
  const [selectedAspect, setSelectedAspect] = useState<string>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Results holder (currently generated image)
  const [activeResult, setActiveResult] = useState<GeneratedImage | null>(INITIAL_IMAGES[0]);

  // Gallery filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterStyle, setFilterStyle] = useState("all");

  // Edit / Detail Modal state
  const [selectedDetailImage, setSelectedDetailImage] = useState<GeneratedImage | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempPromptName, setTempPromptName] = useState("");

  // Share Modal / Toast state
  const [shareTargetImage, setShareTargetImage] = useState<GeneratedImage | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Profile Edit fields
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatarId);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Invoice detailed receipt modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Rotate loading texts on the generation portal
  const loadingMessages = [
    "AI 모델이 캔버스를 펼쳐 구도를 잡고 있습니다...",
    "선택하신 스타일 요소를 분석하여 스케치를 수행합니다...",
    "색상 팔레트를 매칭하고 명암 및 상세 데코레이션을 주입 중입니다...",
    "마스터피스의 픽셀 밸런스를 조율하는 중입니다. 곧 결과물이 나타납니다!"
  ];

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("imagine_images", JSON.stringify(images));
  }, [images]);

  useEffect(() => {
    localStorage.setItem("imagine_user", JSON.stringify(user));
  }, [user]);

  // Handle generation action
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("이미지의 주제(Prompt)를 검색어 형태로 상세히 적어주세요!");
      return;
    }

    if (user.creditsUsed >= user.creditsMax) {
      alert("이번 달 이용한 크레딧(100회)을 모두 소모하였습니다! 프로필 관리에서 추가 충전하거나 요금제를 업그레이드 해주세요.");
      return;
    }

    setIsGenerating(true);
    setLoadingStep(0);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: selectedAspect
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "이미지 생성 도중 알 수 없는 에러가 발생했습니다.");
      }

      if (data.success && data.imageUrl) {
        const newImage: GeneratedImage = {
          id: `img-${Date.now()}`,
          prompt: prompt.trim(),
          optimizedPrompt: data.optimizedPrompt || prompt.trim(),
          style: selectedStyle,
          aspectRatio: selectedAspect,
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          isFavorite: false,
          model: data.usedModel || "imagen-3.0-generate-002"
        };

        setImages(prev => [newImage, ...prev]);
        setActiveResult(newImage);
        
        // Deduct premium credit
        setUser(prev => ({
          ...prev,
          creditsUsed: Math.min(prev.creditsUsed + 1, prev.creditsMax)
        }));
      } else {
        throw new Error("서버 응답에서 이미지를 수신하지 못했습니다.");
      }

    } catch (err: any) {
      console.error(err);
      
      let errorMsg = err.message || "서버 혹은 네트워크 통신 상태가 원활하지 않습니다.";
      if (err.message?.includes("API_KEY_MISSING")) {
        errorMsg = "AI Studio 설정 오류: 우측 상단의 Settings > Secrets 메뉴에서 GEMINI_API_KEY를 등록해주세요.";
      } else if (err.message?.toLowerCase().includes("paid plans") || err.message?.toLowerCase().includes("quota exceeded") || err.message?.toLowerCase().includes("billing")) {
        errorMsg = "이미지 생성(Imagen 4)은 Google AI Studio의 유료 플랜(Paid Plan, 결제 카드 등록) 계정의 API 키가 필요합니다.\n\n[해결 방법]\n1. Google AI Studio 대시보드(Settings > Billing)에서 유료 플랜으로 업그레이드를 진행해주세요.\n2. 발급받은 유료 플랜용 API 키를 우측 상단 'Settings > Secrets' 메뉴에 GEMINI_API_KEY로 등록해 주시면 정상 작동합니다.";
      }
      
      alert(`이미지 생성 실패:\n\n${errorMsg}\n\n(참고: API 키가 등록되지 않았거나, 무료 계정 할당량 제한으로 인해 발생하는 경우가 대부분입니다.)`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preset triggers
  const usePresetPrompt = (txt: string, styleId: string) => {
    setPrompt(txt);
    setSelectedStyle(styleId);
  };

  // Toggle Favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        const updated = !img.isFavorite;
        // Also sync currently viewing modals or active result
        if (activeResult && activeResult.id === id) {
          setActiveResult({ ...activeResult, isFavorite: updated });
        }
        if (selectedDetailImage && selectedDetailImage.id === id) {
          setSelectedDetailImage({ ...selectedDetailImage, isFavorite: updated });
        }
        return { ...img, isFavorite: updated };
      }
      return img;
    }));
  };

  // Delete Image from history
  const deleteImage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("생성된 이미지를 기록에서 영구 삭제하시겠습니까?")) return;
    
    setImages(prev => prev.filter(img => img.id !== id));
    
    if (activeResult?.id === id) {
      setActiveResult(null);
    }
    if (selectedDetailImage?.id === id) {
      setSelectedDetailImage(null);
    }
  };

  // Rename Image Name
  const saveImageRename = () => {
    if (!selectedDetailImage || !tempPromptName.trim()) return;
    setImages(prev => prev.map(img => {
      if (img.id === selectedDetailImage.id) {
        return { ...img, prompt: tempPromptName.trim() };
      }
      return img;
    }));
    setSelectedDetailImage(prev => prev ? { ...prev, prompt: tempPromptName.trim() } : null);
    setIsEditingName(false);
  };

  // Open Share details
  const openShareModal = (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShareTargetImage(img);
    setHasCopied(false);
  };

  // Copy share URL
  const copyShareLink = () => {
    const mockUrl = `${window.location.origin}/share/${shareTargetImage?.id || 'temp'}`;
    navigator.clipboard.writeText(mockUrl);
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  // Download Image File setup (Cross-browser download helper for base64)
  const downloadImageFile = async (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const link = document.createElement("a");
      link.href = img.imageUrl;
      // Clean up Korean prompt characters for safe file naming
      const safeName = img.prompt.slice(0, 20).replace(/[\s\W]+/g, "_");
      link.download = `imagine-ai-${img.style}-${safeName || "art"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Downloader failed: ", err);
      alert("이미지 로컬 파일 변환 도중 실패했습니다. 우클릭 후 다른 이름으로 저장할 수도 있습니다.");
    }
  };

  // Save profile updates
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(prev => ({
      ...prev,
      name: editName,
      email: editEmail,
      avatarId: editAvatar
    }));
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  // Upgrade or refuel balance credits
  const handlePurchaseCredits = () => {
    if (confirm("정말로 50 크레딧을 추가 충전하시겠습니까? (테스트 결제가 수행되며, 결제 내역에 $4.99가 추가됩니다!)")) {
      // Add custom Invoice
      const newInv: Invoice = {
        id: `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`,
        date: new Date().toISOString().split("T")[0],
        amount: 4900,
        item: "화상 생성 초고속 크레딧 추가 (+50회)",
        status: "Paid",
        paymentMethod: "신한카드 (•••• 4920)"
      };

      setInvoices(prev => [newInv, ...prev]);
      setUser(prev => ({
        ...prev,
        creditsMax: prev.creditsMax + 50
      }));
      alert("크레딧 충전 결제가 정상 완료되었습니다! 50개의 재생성 크레딧이 추가 부여되었습니다.");
    }
  };

  // Aspect ratio helper
  const renderAspectVisual = (aspect: string) => {
    switch(aspect) {
      case "16:9":
        return <div className="w-10 h-6 border-2 border-neutral-400 rounded bg-neutral-800/50 flex items-center justify-center text-[8px]">16:9</div>;
      case "9:16":
        return <div className="w-6 h-10 border-2 border-neutral-400 rounded bg-neutral-800/50 flex items-center justify-center text-[8px]">9:16</div>;
      case "4:3":
        return <div className="w-9 h-7 border-2 border-neutral-400 rounded bg-neutral-800/50 flex items-center justify-center text-[8px]">4:3</div>;
      default:
        return <div className="w-8 h-8 border-2 border-neutral-400 rounded bg-neutral-800/50 flex items-center justify-center text-[8px]">1:1</div>;
    }
  };

  // Filter gallery items
  const filteredImages = images.filter(img => {
    const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          img.optimizedPrompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = filterFavorite ? img.isFavorite : true;
    const matchesStyle = filterStyle === "all" ? true : img.style === filterStyle;
    return matchesSearch && matchesFav && matchesStyle;
  });

  // Current active user avatar
  const activeAvatar = AVATAR_OPTIONS.find(av => av.id === user.avatarId) || AVATAR_OPTIONS[2];

  return (
    <div id="app_root" className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col antialiased relative selection:bg-indigo-550 selection:text-white">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                Imagine <span className="text-indigo-400">AI</span> Studio <span className="text-[11px] font-mono text-indigo-400 border border-slate-800 bg-slate-950/80 px-2 py-0.5 rounded-full">v2.4</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">Server-Side Imagen 3.0 // Sleek Edition</p>
            </div>
          </div>

          {/* Interactive Navigation Tab Pill */}
          <nav className="flex bg-slate-950 p-1 rounded-full border border-slate-800/80">
            <button 
              id="tab_studio"
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 ${
                activeTab === "studio" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              이미지 생성 (Studio)
            </button>
            <button 
              id="tab_gallery"
              onClick={() => setActiveTab("gallery")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 ${
                activeTab === "gallery" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              히스토리 & 보관함
            </button>
            <button 
              id="tab_account"
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 ${
                activeTab === "account" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              프로필 & 설정
            </button>
          </nav>

          {/* User Quick Status */}
          <div className="hidden md:flex items-center gap-3 bg-slate-950 border border-slate-800/60 p-2 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg shadow-inner">
              {activeAvatar.emoji}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-200">{user.name}</p>
              <p className="text-[10px] text-indigo-400 font-mono font-bold">
                {user.creditsMax - user.creditsUsed} / {user.creditsMax} Credits Left
              </p>
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: STUDIO (ACTIVE CREATIVE BOARD) */}
        {activeTab === "studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Control Panel (cols 5) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  STEP 01. Topic Input
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-2.5 flex items-center gap-2">
                  주제 입력
                </h3>
                <p className="text-xs text-slate-400 mt-1">인물, 풍경, 사물, 추상적인 문장 등 원하는 장면을 자유롭게 입력하세요.</p>
              </div>

              {/* Textarea Input area */}
              <div className="flex flex-col gap-2">
                <textarea
                  id="prompt_input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="예: 눈 덮인 가문비나무가 늘어선 오솔길을 질주하는 환상적인 은빛 늑대 가족"
                  maxLength={150}
                  className="w-full min-h-[90px] bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 outline-none resize-none transition-all"
                  disabled={isGenerating}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>한국어로 적으시면 AI가 아름다운 영어 묘사로 자동 번역 및 보강합니다.</span>
                  <span>{prompt.length}/150자</span>
                </div>
              </div>

              {/* Quick suggestions presets */}
              <div className="flex flex-wrap gap-1.5">
                <p className="text-[10px] text-slate-500 w-full mb-0.5">💡 추천 검색어 직접 체험하기:</p>
                <button 
                  onClick={() => usePresetPrompt("에메랄드 바다에서 돛을 올린 빈티지 범선", "watercolor")}
                  className="bg-slate-950 border border-slate-800/80 hover:bg-slate-850 hover:bg-slate-800/30 text-slate-400 hover:text-slate-205 hover:text-slate-200 text-[10px] px-2.5 py-1 rounded-full transition-all"
                >
                  ⛵ 수채화 범선
                </button>
                <button 
                  onClick={() => usePresetPrompt("네온 수트와 투구를 착용하고 오토바이를 탄 라이더", "cyberpunk")}
                  className="bg-slate-950 border border-slate-800/80 hover:bg-slate-850 hover:bg-slate-800/30 text-slate-400 hover:text-slate-205 hover:text-slate-200 text-[10px] px-2.5 py-1 rounded-full transition-all"
                >
                  🏍️ 사이버 라이더
                </button>
                <button 
                  onClick={() => usePresetPrompt("구름 속 찬란한 황금 궁전과 천사 날개", "3d-render")}
                  className="bg-slate-950 border border-slate-800/80 hover:bg-slate-850 hover:bg-slate-800/30 text-slate-400 hover:text-slate-205 hover:text-slate-200 text-[10px] px-2.5 py-1 rounded-full transition-all"
                >
                  🏰 3D 황금성
                </button>
              </div>

              <hr className="border-slate-800/80" />

              {/* STYLES SELECTOR ( cols 10 requested - styled like the Sleek Theme h-20 items ) */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full">
                      STEP 02. Select Style
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-2.5 flex items-center gap-2">
                      화풍 스타일 선택 <span className="text-xs text-slate-500 font-normal">(10개 제공)</span>
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {IMAGE_STYLES.map((style) => {
                    const isSelected = selectedStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        id={`style_btn_${style.id}`}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`group relative flex flex-col items-center justify-center p-3 text-center h-20 rounded-xl border text-xs transition-all duration-200 ${
                          isSelected 
                            ? "bg-indigo-600 border border-indigo-400/50 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                            : "bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-lg mb-1">{style.emoji}</span>
                          <span className="font-bold text-[11px] tracking-tight">{style.name_ko}</span>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-800/80" />

              {/* ASPECT RATIOS */}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  STEP 03. Aspect Ratio
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2.5">종횡비 (Aspect Ratio)</h3>
                
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { id: "1:1", label: "정사각형", desc: "1:1" },
                    { id: "16:9", label: "가로 와이드", desc: "16:9" },
                    { id: "9:16", label: "세로 와이드", desc: "9:16" },
                    { id: "4:3", label: "클래식", desc: "4:3" }
                  ].map((ratio) => {
                    const isRatioSelected = selectedAspect === ratio.id;
                    return (
                      <button
                        key={ratio.id}
                        onClick={() => setSelectedAspect(ratio.id)}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                          isRatioSelected 
                            ? "bg-indigo-600 border border-indigo-400/50 text-white ring-1 ring-indigo-400/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]" 
                            : "bg-slate-950 border-slate-800 hover:border-slate-705 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        {renderAspectVisual(ratio.id)}
                        <span className="text-[10px] font-medium mt-1.5 truncate w-full">{ratio.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GENERATE ACTION BUTTON */}
              <button
                id="btn_generate"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="relative group w-full py-3.5 bg-indigo-600 disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-indigo-500 text-white rounded-xl font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(79,70,229,0.3)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>작품을 그리는 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-bounce" />
                    <span>AI 이미지 생성하기 (1크레딧 소모)</span>
                  </>
                )}
                {/* Visual glow overlay */}
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

            </div>

            {/* Preview Arena (cols 7) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between min-h-[500px] relative">
                
                {/* Active generated image result container */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      /* GENERATION LOADING SCREEN */
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center text-center p-6"
                      >
                        {/* Custom Animated Palette Spinner */}
                        <div className="relative w-24 h-24 mb-6">
                          <div className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500/20 animate-spin [animation-duration:8s]" />
                          <div className="absolute inset-2 rounded-full border-4 border-dotted border-purple-500/40 animate-spin [animation-duration:5s] [animation-direction:reverse]" />
                          <div className="absolute inset-4 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
                        </div>
                        
                        <h4 className="text-base font-bold text-slate-100 animate-pulse">이미지 생성 레이아웃 빌드 중...</h4>
                        
                        <div className="h-10 mt-3 max-w-md">
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {loadingMessages[loadingStep]}
                          </p>
                        </div>
                        
                        {/* Fake linear micro-progress */}
                        <div className="w-48 bg-slate-950 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-800">
                          <motion.div 
                            initial={{ width: "5%" }}
                            animate={{ width: "95%" }}
                            transition={{ duration: 10, ease: "easeOut" }}
                            className="bg-indigo-650 h-full"
                          />
                        </div>

                      </motion.div>
                    ) : activeResult ? (
                      /* RESULT DISPLAY FRAME */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex flex-col items-center gap-5"
                      >
                        {/* Image canvas with interactive layout */}
                        <div className="relative group overflow-hidden bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center max-h-[460px] aspect-video w-full" style={{ aspectRatio: activeResult.aspectRatio === "1:1" ? "1" : activeResult.aspectRatio === "16:9" ? "1.77" : activeResult.aspectRatio === "9:16" ? "0.56" : "1.33" }}>
                          
                          <img 
                            referrerPolicy="no-referrer"
                            src={activeResult.imageUrl} 
                            alt={activeResult.prompt}
                            className="max-w-full max-h-[440px] w-full object-contain p-1"
                          />

                          {/* Quick Toolbar Hover overlays */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-350 select-all truncate max-w-[50%]">Model: {activeResult.model}</span>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => toggleFavorite(activeResult.id, e)}
                                title="즐겨찾기"
                                className={`p-2 rounded-lg backdrop-blur-md transition-all ${
                                  activeResult.isFavorite 
                                    ? "bg-pink-600 hover:bg-pink-700 text-white" 
                                    : "bg-slate-900/80 hover:bg-slate-800 text-white"
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${activeResult.isFavorite ? "fill-white" : ""}`} />
                              </button>
                              <button 
                                onClick={(e) => openShareModal(activeResult, e)}
                                title="공유하기"
                                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md transition-all"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => downloadImageFile(activeResult, e)}
                                title="내 컴퓨터에 저장"
                                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-100 backdrop-blur-md transition-all flex items-center gap-1.5"
                              >
                                <Download className="w-4 h-4" />
                                <span className="text-[10px] font-semibold hidden sm:inline">다운로드</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Prompt detailed summary */}
                        <div className="w-full bg-slate-955/80 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 bg-slate-800 text-indigo-400 rounded text-slate-300 border border-slate-705">
                              {IMAGE_STYLES.find(st => st.id === activeResult.style)?.name_ko || activeResult.style}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              종횡비: {activeResult.aspectRatio} // 생성 완료
                            </span>
                          </div>
                          
                          <p className="text-sm font-semibold text-slate-200">
                            "{activeResult.prompt}"
                          </p>
                          
                          <div className="mt-3 pt-3 border-t border-slate-800/60">
                            <h5 className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-400 flex items-center gap-1">
                              <span>✨ AI가 고안한 고난도 화풍 묘사 (English Prompt):</span>
                            </h5>
                            <p className="text-xs text-slate-400 italic mt-1 font-mono leading-relaxed line-clamp-3">
                              {activeResult.optimizedPrompt}
                            </p>
                          </div>
                        </div>

                        {/* Download Prompt Option Toolbar below canvas */}
                        <div className="flex flex-wrap gap-2 w-full justify-end">
                          <button 
                            onClick={(e) => toggleFavorite(activeResult.id, e)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              activeResult.isFavorite 
                                ? "bg-pink-500/20 text-pink-400 border-pink-500/30" 
                                : "bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800"
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${activeResult.isFavorite ? "fill-current" : ""}`} />
                            {activeResult.isFavorite ? "즐겨찾기 완료" : "즐겨찾기 추가"}
                          </button>
                          <button 
                            onClick={(e) => openShareModal(activeResult, e)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-slate-950 hover:bg-slate-850 hover:bg-slate-800/30 text-slate-400 border-slate-800 transition-all"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            공유하기
                          </button>
                          <button 
                            onClick={(e) => downloadImageFile(activeResult, e)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 transition-all"
                          >
                            <Download className="w-4 h-4" />
                            고해상도 다운로드
                          </button>
                        </div>

                      </motion.div>
                    ) : (
                      /* EMPTY EMPTY CANVAS */
                      <div className="text-center p-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-805 flex items-center justify-center mx-auto mb-4 text-slate-700">
                          <Sparkles className="w-6 h-6 text-slate-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-400">생성된 마스터피스가 없습니다.</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-[280px]">왼쪽 패널의 설정을 마친 다음 다양한 스타일로 이미지를 생성하여 빛내보세요!</p>
                      </div>
                    )}
                  </AnimatePresence>

                </div>

                <div className="border-t border-slate-800/60 pt-4 mt-6 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-indigo-400" />
                    <span>생성된 모든 이미지는 브라우저의 캐시에 안전하게 보관됩니다.</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab("gallery")}
                    className="text-indigo-400 font-semibold hover:underline"
                  >
                    보관함 이력 전체 보기 ({images.length}) &rarr;
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: GALLERY & HISTORY */}
        {activeTab === "gallery" && (
          <div className="flex flex-col gap-6">
            
            {/* Gallery Control Tools */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  생성 히스토리 및 보관함
                </h2>
                <p className="text-xs text-slate-400 mt-1">이전에 본 서비스에서 인공지능으로 복원하고 채색한 내역을 확인하고 즐겨찾기, 파일 배포할 수 있습니다.</p>
              </div>

              {/* Advanced search control bars */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch items-center">
                
                {/* Search query field */}
                <div className="relative flex-1 sm:w-60">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-slate-505 text-slate-500" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어 또는 프롬프트..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs placeholder-slate-650 placeholder-slate-600 text-slate-200 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-2 w-5 flex items-center justify-center text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter Style list */}
                <select
                  value={filterStyle}
                  onChange={(e) => setFilterStyle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 py-2 px-3 rounded-xl outline-none focus:border-indigo-500"
                >
                  <option value="all">모든 화풍 (All Styles)</option>
                  {IMAGE_STYLES.map(st => (
                    <option key={st.id} value={st.id}>{st.emoji} {st.name_ko}</option>
                  ))}
                </select>

                {/* Favorites strict filter button */}
                <button
                  onClick={() => setFilterFavorite(!filterFavorite)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    filterFavorite 
                      ? "bg-pink-500/20 text-pink-400 border-pink-500/30 ring-1 ring-pink-550" 
                      : "bg-slate-950 hover:bg-slate-850 hover:bg-slate-800/30 text-slate-400 border-slate-800"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${filterFavorite ? "fill-pink-400" : ""}`} />
                  즐겨찾기만 필터
                </button>

              </div>
            </div>

            {/* Gallery Grid List */}
            {filteredImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredImages.map((img) => {
                    const styleMeta = IMAGE_STYLES.find(st => st.id === img.style);
                    return (
                      <motion.div
                        layout
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -4 }}
                        className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md transition-all relative flex flex-col justify-between"
                      >
                        {/* Aspect Wrapper Card */}
                        <div 
                          className="w-full bg-slate-950 overflow-hidden relative cursor-pointer"
                          style={{ aspectRatio: "1" }}
                          onClick={() => {
                            setSelectedDetailImage(img);
                            setTempPromptName(img.prompt);
                            setIsEditingName(false);
                          }}
                        >
                          <img 
                            referrerPolicy="no-referrer"
                            src={img.imageUrl} 
                            alt={img.prompt} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />

                          {/* Quick visual style label overlay top */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-900/90 text-indigo-400 border border-slate-800/80 shadow">
                              {styleMeta?.emoji} {styleMeta?.name_ko}
                            </span>
                          </div>

                          {/* Favorite button overlay */}
                          <button
                            onClick={(e) => toggleFavorite(img.id, e)}
                            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-inner"
                          >
                            <Heart className={`w-4 h-4 ${img.isFavorite ? "fill-pink-500 text-pink-500" : "text-slate-350 text-slate-300"}`} />
                          </button>

                          {/* Actions Hover Overlays on whole card center */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedDetailImage(img);
                                setTempPromptName(img.prompt);
                                setIsEditingName(false);
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-white text-slate-950 transition-all flex items-center gap-1 shadow-md"
                            >
                              자세히 보기
                            </button>
                            
                            <button
                              onClick={(e) => downloadImageFile(img, e)}
                              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-md"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => deleteImage(img.id, e)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                              title="기록에서 지우기"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                        {/* Card Meta Content footer */}
                        <div className="p-3.5 text-left flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                              {img.prompt}
                            </p>
                          </div>
                          
                          <div className="mt-3.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-mono">{img.aspectRatio} // {img.model.replace("-generate-002", "")}</span>
                            <span className="font-sans flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              {new Date(img.createdAt).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-slate-600" />
                </div>
                <h4 className="text-base font-bold text-slate-300">검색 조건과 일치하는 이미지가 없습니다.</h4>
                <p className="text-xs text-slate-500 mt-1">검색어를 수정하거나 화풍 필터를 '모든 화풍' 상태로 초기화하여 검색해 보세요.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterFavorite(false);
                    setFilterStyle("all");
                  }}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  필터 설정 전체 초기화
                </button>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ACCOUNT & USER PROFILE & PAYMENT LIST */}
        {activeTab === "account" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Profile modification parameters (cols 5) */}
            <form onSubmit={handleSaveProfile} className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-6">
              
              <div>
                <h3 className="text-base font-bold text-slate-100">프로필 관리 설정</h3>
                <p className="text-xs text-slate-400 mt-1">서비스에 노출되는 내 사용자 닉네임과 연락 이메일, 프로필 아바타를 교체합니다.</p>
              </div>

              {/* Avatar Selector Panel */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-300">프로필 캐릭터 아이콘 선택</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.id)}
                      title={av.label}
                      className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        editAvatar === av.id 
                          ? "bg-indigo-600/35 border-2 border-indigo-500 scale-105" 
                          : "bg-slate-950 border border-slate-800 hover:bg-slate-800/50"
                      }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">지정한 동물 캐릭터는 앱 헤더 상태창에 자동으로 실시간 반영됩니다.</p>
              </div>

              {/* Text fields */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">사용자 이름</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-205 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">연락 이메일 주소</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-205 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] active:scale-95 cursor-pointer"
              >
                업데이트 정보 저장하기
              </button>

              {profileSaveSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>사용자 프로필 정보가 성공적으로 반영되었습니다.</span>
                </div>
              )}

              <hr className="border-slate-800/80" />

              {/* Subscriptions Quota Display */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full self-start">
                  PLAN & CREDITS
                </span>
                
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  나의 요금제 등급: <span className="text-indigo-400 font-extrabold">{user.plan}</span>
                </h4>

                {/* Meter progress bar */}
                <div className="mt-1">
                  <div className="flex justify-between items-center text-xs text-slate-405 text-slate-400 mb-1">
                    <span>이달의 사용한 생성 소모량</span>
                    <span className="font-mono text-white font-bold">{user.creditsMax - user.creditsUsed} / {user.creditsMax} 크레딧 잔여</span>
                  </div>
                  
                  <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-800 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, ((user.creditsMax - user.creditsUsed) / user.creditsMax) * 100))}%` }}
                    />
                  </div>
                </div>

                <ul className="text-[11px] text-slate-500 space-y-1.5 mt-2">
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span>초고속 AI 이미지 상시 우선 대기열 (Imagen 3.0 우선 접속권)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span>10가지 맞춤형 화풍 및 고선명 묘사 프롬프트 확장 최적화 제공</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span>다운로드 무제한 지원 및 평생 히스토리 보관함 영구 소장 가능</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={handlePurchaseCredits}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-indigo-400 font-bold text-[10px] rounded-lg tracking-wider transition-all"
                >
                  ⚡ 고속 생성 크레딧 충전 (+50 크레딧 추가 구매)
                </button>
              </div>

            </form>

            {/* BILLING HISTORY LOGS (cols 7) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    결제 내역 및 영수증 승인서 조회
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">회원님이 이 결제 지점에서 결제하신 명세서 및 Invoice 이력 영수증입니다.</p>
                </div>
              </div>

              {/* Invoices list format */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-mono">
                      <th className="pb-2.5 font-medium">영수증 ID</th>
                      <th className="pb-2.5 font-medium">결제 일자</th>
                      <th className="pb-2.5 font-medium">결제 서비스 내역</th>
                      <th className="pb-2.5 font-medium text-right">금액 (원)</th>
                      <th className="pb-2.5 font-medium text-center">결제상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setViewingInvoice(inv)}
                        className="border-b border-slate-800/50 text-xs hover:bg-slate-850/60 cursor-pointer transition-all duration-150"
                      >
                        <td className="py-3 font-mono text-indigo-400 font-semibold">{inv.id}</td>
                        <td className="py-3 text-slate-400 font-mono">{inv.date}</td>
                        <td className="py-3 font-medium text-slate-200">
                          <div className="flex flex-col">
                            <span>{inv.item}</span>
                            <span className="text-[9px] text-slate-500 font-sans">{inv.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-100 font-mono">
                          {inv.amount.toLocaleString()}원
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            결제 완료
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-805 text-[11px] text-slate-500 leading-relaxed">
                ℹ️ 테이블의 해당 영수증 행을 클릭하시면, 공식적인 승인 고지서 및 출력 서식 영수증을 확인하실 수 있습니다. 가상 거래 시스템으로 실제 결제 승인은 일어나지 않습니다.
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-transparent border-t border-slate-900 mt-12 py-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Image Generator Studio. powered by Gemini API & Live Control Plane Node.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <span className="text-slate-700">PID: {user.avatarId}</span>
            <span className="text-indigo-400/60">Server status: 🟢 ONLINE</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: GALLERY GRID DETAILED INSPECT & RENAME DIALOG */}
      <AnimatePresence>
        {selectedDetailImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
            >
              {/* Close Button top-right */}
              <button
                onClick={() => setSelectedDetailImage(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* View Item frame half */}
              <div className="md:w-1/2 bg-black flex items-center justify-center p-2 relative">
                <img 
                  referrerPolicy="no-referrer"
                  src={selectedDetailImage.imageUrl} 
                  alt={selectedDetailImage.prompt}
                  className="max-h-[460px] object-contain w-full"
                />
              </div>

              {/* Description meta detail half */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between text-left">
                
                <div className="flex flex-col gap-4">
                  
                  {/* Title metadata */}
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-indigo-400 rounded">
                      {IMAGE_STYLES.find(st => st.id === selectedDetailImage.style)?.name_ko || selectedDetailImage.style} 화풍
                    </span>
                    
                    {/* Rename state trigger info */}
                    <div className="mt-3">
                      {isEditingName ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={tempPromptName}
                            onChange={(e) => setTempPromptName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none w-full"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setIsEditingName(false)}
                              className="text-[10px] px-2 py-1 rounded bg-slate-800 font-semibold text-slate-300"
                            >
                              취소
                            </button>
                            <button
                              onClick={saveImageRename}
                              className="text-[10px] px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            >
                              이름 변경
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1 group">
                          <h4 className="text-base font-bold text-slate-100 leading-snug">
                            "{selectedDetailImage.prompt}"
                          </h4>
                          <button
                            onClick={() => setIsEditingName(true)}
                            title="이름 수정"
                            className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <PenLine className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-800/80" />

                  {/* AI English prompt metadata log */}
                  <div>
                    <h5 className="text-[10px] tracking-wider uppercase font-mono font-extrabold text-slate-500 mb-1">
                      Expanded Prompt (AI 영문 묘사문)
                    </h5>
                    <p className="text-xs text-slate-400 font-mono italic leading-relaxed line-clamp-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                      {selectedDetailImage.optimizedPrompt}
                    </p>
                  </div>

                  {/* Technical values table */}
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-550 text-slate-500 block">Aspect Ratio</span>
                      <span className="text-slate-200 mt-0.5 block font-bold">{selectedDetailImage.aspectRatio}</span>
                    </div>
                    <div className="bg-slate-955 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-550 text-slate-500 block">AI Model Eng</span>
                      <span className="text-slate-200 mt-0.5 block font-bold truncate">{selectedDetailImage.model}</span>
                    </div>
                  </div>

                </div>

                {/* Lower Action buttons */}
                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => deleteImage(selectedDetailImage.id, e)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-red-950/40 text-slate-450 hover:text-red-400 border border-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => toggleFavorite(selectedDetailImage.id, e)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        selectedDetailImage.isFavorite
                          ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                          : "bg-slate-950 border-slate-800 text-slate-405 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${selectedDetailImage.isFavorite ? "fill-pink-400" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => openShareModal(selectedDetailImage, e)}
                      className="p-2 rounded-xl border bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => downloadImageFile(selectedDetailImage, e)}
                      className="flex items-center gap-1.5 px-4.5 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      내려받기
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: GORGEOUS EXCLUSIVE SHARE DIALOG */}
      <AnimatePresence>
        {shareTargetImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative text-left"
            >
              <button
                onClick={() => setShareTargetImage(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                  <Share2 className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">동작: 공유 링크 수령</h3>
                  <p className="text-[11px] text-slate-400">외부 고유 주소(URL)를 복사하여 카카오톡이나 SNS에 게시해보세요!</p>
                </div>
              </div>

              {/* Simple card image segment */}
              <div className="flex gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-4 items-center">
                <img 
                  referrerPolicy="no-referrer"
                  src={shareTargetImage.imageUrl} 
                  alt="target" 
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 line-clamp-1">"{shareTargetImage.prompt}"</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Style: {shareTargetImage.style} // Ratio: {shareTargetImage.aspectRatio}</p>
                </div>
              </div>

              {/* Copy URL address field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/share/${shareTargetImage.id}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 outline-none select-all"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 bg-indigo-500 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>복사대기</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>복사</span>
                    </>
                  )}
                </button>
              </div>

              {hasCopied && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-2 animate-pulse flex items-center gap-1">
                  ✓ 클립보드에 가상 공유 고유 링크 복사가 완료되었습니다!
                </p>
              )}

              {/* Social simulators links */}
              <div className="grid grid-cols-3 gap-2 mt-5 font-sans">
                <button 
                  onClick={() => { alert("카카오톡으로 공유 메시지(mock)를 발송했습니다!"); setShareTargetImage(null); }}
                  className="py-2 text-[11px] bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold rounded-lg transition-all cursor-pointer"
                >
                  💬 카카오톡 공유
                </button>
                <button 
                  onClick={() => { alert("X(Twitter)로 내 이미지 업로드 링크 게시글(mock)을 성공적으로 구성했습니다!"); setShareTargetImage(null); }}
                  className="py-2 text-[11px] bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-lg transition-all cursor-pointer"
                >
                  🐦 X 트위터 공유
                </button>
                <button 
                  onClick={() => { alert("핀터레스트에 핀 추가(mock)를 무사히 기록 완료했습니다!"); setShareTargetImage(null); }}
                  className="py-2 text-[11px] bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                >
                  📌 Pinterest 저장
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: INVOICE RECEIPT MODAL FOR PRINT DISPLAY */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-neutral-900 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative text-left border-t-[8px] border-indigo-600"
            >
              {/* Close dark theme override button inside white popover */}
              <button
                onClick={() => setViewingInvoice(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Brand Header invoice popup */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-indigo-700 tracking-tight">IMAGINE STUDIO RECEIPT</h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">승인서 일련번호: {viewingInvoice.id}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  결제 승인 완료
                </span>
              </div>

              {/* Vendor & Client specifications */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-5 border-b border-neutral-200">
                <div>
                  <span className="text-neutral-400 block uppercase font-mono tracking-wider font-extrabold text-[9px]">Supplier (공급자)</span>
                  <span className="text-neutral-800 font-bold block mt-1">Imagine AI Inc.</span>
                  <span className="text-neutral-550 block font-normal text-[11px]">서울특별시 마포구 백범로 31</span>
                  <span className="text-neutral-550 block font-normal text-[11px]">사업자등록: 104-81-99220</span>
                </div>
                <div>
                  <span className="text-neutral-400 block uppercase font-mono tracking-wider font-extrabold text-[9px]">Client (수신자)</span>
                  <span className="text-neutral-800 font-bold block mt-1">{user.name}</span>
                  <span className="text-neutral-550 block font-normal text-[11px] font-mono">{user.email}</span>
                  <span className="text-neutral-550 block font-normal text-[11px]">가입일자: {user.joinedDate}</span>
                </div>
              </div>

              {/* Core item log table */}
              <div className="py-5">
                <div className="flex justify-between items-center text-xs text-neutral-400 pb-2 border-b border-neutral-100 font-mono">
                  <span>품명 및 사양</span>
                  <span>금액</span>
                </div>
                
                <div className="flex justify-between items-center text-xs py-3.5 border-b border-neutral-100 font-medium">
                  <div>
                    <span className="text-neutral-800 block">{viewingInvoice.item}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">{viewingInvoice.paymentMethod}</span>
                  </div>
                  <span className="text-neutral-900 font-bold">{viewingInvoice.amount.toLocaleString()}원</span>
                </div>

                <div className="flex justify-between items-center text-xs pt-4 font-bold">
                  <span className="text-neutral-900">최종 청구 총액 (합계)</span>
                  <span className="text-indigo-700 text-base font-extrabold">{viewingInvoice.amount.toLocaleString()}원</span>
                </div>
              </div>

              {/* Receipt Footer warnings */}
              <div className="bg-neutral-50 p-3 rounded-xl text-[10px] text-neutral-500 leading-relaxed font-medium">
                본 영수증은 가치 상거래 연습 목적의 시뮬레이터 거래 결제 서류입니다. 실제 금융상의 청구는 이루어지지 않음을 보증합니다. 영수증 원본 출력이 필요하시면 아래 버튼을 활용하여 고성능 캡처를 모방할 수 있습니다.
              </div>

              {/* Action operations printable simulations */}
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => alert("영수증 PDF 승인서 가상 빌드가 완료되었습니다! 회원님 이메일로 자동 전송됩니다.")}
                  className="flex-1 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold rounded-lg transition-all"
                >
                  가상 PDF 내려받기
                </button>
                <button
                  onClick={() => {
                    alert("영수증 프린터로 전송 요청(mock)이 발송되었습니다!");
                    setViewingInvoice(null);
                  }}
                  className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-indigo-50 hover:text-white bg-indigo-600 text-xs font-bold rounded-lg transition-all shadow"
                >
                  프린트 영수증 인쇄
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
