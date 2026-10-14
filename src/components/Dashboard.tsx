import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TrendingUp, Search, AlertTriangle, Truck, Package, 
  Clock, Archive, RotateCcw, MessageSquare, FileSpreadsheet, 
  Building2, UserX, Layers, ShieldCheck, CalendarDays, 
  Users, LogOut, Barcode, Send, 
  PauseCircle, PlayCircle, RefreshCw, ChevronRight, ChevronLeft,
  Menu, X
} from "lucide-react";
import { supabase } from "../lib/supabase";

export type UserRole = "leader" | "accountant" | "courier";

export interface CurrentUserProfile {
  id: string;
  name: string;
  username: string;
  phone?: string;
  role: UserRole;
  stationName?: string;
}

export interface Shipment {
  id: string;
  waybill_number: string;
  store_name: string;
  store_phone?: string;
  recipient_name: string;
  recipient_phone: string;
  city: string;
  area: string;
  amount: number;
  delivery_fee: number;
  net_amount?: number;
  goods_type?: string;
  pieces_count?: number;
  status: string;
  driver_id?: string;
  driver_name?: string;
  branch_name?: string;
  notes?: string;
  created_at?: string;
  is_held?: boolean;
  verified?: boolean;
}

type TabType = 
  | "home" | "search" | "unconfirmed" | "pickup" | "internal" | "external" 
  | "waiting" | "archives" | "late" | "comments" | "lists" | "branches" 
  | "inactive" | "stickers" | "verification" | "schedule" | "staff";

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = ["leader", "accountant", "courier"];

const NAVIGATION_ITEMS: NavItem[] = [
  { id: "home", label: "الرئيسية", icon: TrendingUp, roles: ALL_ROLES },
  { id: "search", label: "البحث المتقدم", icon: Search, roles: ["leader", "accountant"] },
  { id: "unconfirmed", label: "طلبات غير مؤكدة", icon: AlertTriangle, roles: ["leader"] },
  { id: "pickup", label: "مندوب الاستلام", icon: Truck, roles: ["leader", "courier"] },
  { id: "internal", label: "طلبات داخلية", icon: Package, roles: ["leader", "courier"] },
  { id: "external", label: "طلبات خارجية", icon: Truck, roles: ["leader", "courier"] },
  { id: "waiting", label: "قيد الانتظار", icon: Clock, roles: ["leader", "courier"] },
  { id: "archives", label: "الأرشيف", icon: Archive, roles: ["leader", "accountant"] },
  { id: "late", label: "طلبات متأخرة", icon: RotateCcw, roles: ["leader", "accountant"] },
  { id: "comments", label: "الردود والملاحظات", icon: MessageSquare, roles: ["leader", "courier"] },
  { id: "lists", label: "كشوفات الحساب", icon: FileSpreadsheet, roles: ["leader", "accountant"] },
  { id: "branches", label: "تعديلات الفروع", icon: Building2, roles: ["leader"] },
  { id: "inactive", label: "عملاء غير فعالين", icon: UserX, roles: ["leader"] },
  { id: "stickers", label: "توليد وصولات", icon: Layers, roles: ["leader"] },
  { id: "verification", label: "قيد التحقق", icon: ShieldCheck, roles: ["leader", "courier"] },
  { id: "schedule", label: "مواعيد العمل", icon: CalendarDays, roles: ["leader"] },
  { id: "staff", label: "إدارة الموظفين", icon: Users, roles: ["leader"] },
];

const STATUS_LIST = ["غير مؤكد", "ب. مندوب الاستلام", "قيد التنفيذ", "بحوزة المندوب", "مؤجل", "تم التسليم", "راجع"];

export function Dashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // شحنات
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;

  // فلاتر
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState<string>("");

  // جلب بيانات المستخدم
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, phone, station")
          .eq("id", user.id)
          .maybeSingle();

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const userRole = (roleRow?.role as UserRole) || "courier";

        setCurrentUser({
          id: user.id,
          name: profile?.full_name || "مستخدم",
          username: profile?.username || "user",
          phone: profile?.phone || "",
          role: userRole,
          stationName: profile?.station || "المقر الرئيسي"
        });
      } catch (err) {
        console.error("فشل تحميل بيانات المستخدم:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // جلب الشحنات
  const fetchShipments = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let query = supabase.from("shipments").select("*", { count: "exact" });

      if (activeTab === "unconfirmed") query = query.eq("status", "غير مؤكد");
      else if (activeTab === "pickup") query = query.eq("status", "ب. مندوب الاستلام");
      else if (activeTab === "internal") query = query.eq("city_type", "داخلية");
      else if (activeTab === "external") query = query.eq("city_type", "خارجية");
      else if (activeTab === "waiting") query = query.eq("status", "مؤجل");
      else if (activeTab === "archives") query = query.in("status", ["تم التسليم", "راجع"]);
      else if (activeTab === "verification") query = query.eq("verified", false);

      if (searchQuery.trim()) {
        query = query.or(`waybill_number.ilike.%${searchQuery}%,recipient_name.ilike.%${searchQuery}%,recipient_phone.ilike.%${searchQuery}%`);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

      if (error) throw error;
      setShipments(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("خطأ في جلب الشحنات:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab, page, searchQuery]);

  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "staff") {
      fetchShipments();
    }
  }, [fetchShipments, activeTab]);

  // مسح باركود
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = shipments.find(s => s.waybill_number.toLowerCase() === barcodeInput.trim().toLowerCase());
    if (found) {
      if (!selectedIds.includes(found.id)) setSelectedIds(prev => [...prev, found.id]);
    } else {
      setSearchQuery(barcodeInput.trim());
      setPage(0);
    }
    setBarcodeInput("");
  };

  // تغيير الحالة للمحدد
  const handleBulkStatusChange = async (status: string) => {
    if (!selectedIds.length || !status) return;
    try {
      const { error } = await supabase.from("shipments").update({ status }).in("id", selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      fetchShipments();
    } catch (err) {
      console.error("فشل التحديث:", err);
    }
  };

  // تعليق الشحنة
  const toggleHold = async (id: string, currentHeld?: boolean) => {
    try {
      const { error } = await supabase.from("shipments").update({ is_held: !currentHeld }).eq("id", id);
      if (error) throw error;
      fetchShipments();
    } catch (err) {
      console.error("فشل تغيير حالة التعليق:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const allowedNav = useMemo(() => {
    if (!currentUser) return [];
    return NAVIGATION_ITEMS.filter(item => item.roles.includes(currentUser.role));
  }, [currentUser]);

  const selectTab = (tabId: TabType) => {
    setActiveTab(tabId);
    setPage(0);
    setSelectedIds([]);
    setMobileMenuOpen(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* الهيدر العلوي */}
      <header className="bg-amber-400 border-b border-amber-500/30 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* زر القائمة للموبايل */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-slate-900 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg shadow-inner">
              ش
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">منصة الشجاع</h1>
              <p className="text-xs font-semibold text-slate-800/80">نظام إدارة العمليات اللوجستية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleBarcodeScan} className="hidden sm:flex items-center gap-1 bg-white/90 px-2 py-1 rounded border border-amber-500/40 shadow-inner">
              <Barcode className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="مسح باركود أو بحث..."
                value={barcodeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-36 sm:w-48 text-slate-800"
              />
              <button type="submit" className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded">
                تحديد
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-amber-400 hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* القائمة المنزلقة السلسة للهواتف */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* خلفية معتمة ناعمة */}
        <div 
          onClick={() => setMobileMenuOpen(false)} 
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        />

        {/* جسم القائمة المنزلق من اليمين */}
        <aside 
          className={`absolute top-0 right-0 h-full w-[280px] max-w-[85vw] bg-white border-l border-amber-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm">
                ش
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">أنظمة المنصة</p>
                <p className="text-[11px] text-slate-500">{currentUser?.name}</p>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-100 hover:text-slate-800 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 border-b border-amber-100 sm:hidden">
            <form onSubmit={handleBarcodeScan} className="flex items-center gap-1 bg-amber-50/60 p-1.5 rounded border border-amber-200">
              <Barcode className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="مسح باركود..."
                value={barcodeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-800"
              />
              <button type="submit" className="text-xs bg-amber-400 text-slate-900 font-bold px-2 py-1 rounded">
                تحديد
              </button>
            </form>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-amber-400 text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-amber-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-slate-900" : "text-amber-600"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-amber-100 bg-amber-50/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        </aside>
      </div>

      {/* تخطيط الصفحة مع القائمة الثابتة للشاشات الكبيرة */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto flex gap-4 p-4">
        {/* قائمة سطح المكتب الجانبية */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border border-amber-200 rounded-xl shadow-sm p-3 shrink-0 h-[calc(100vh-80px)] sticky top-20">
          <div className="p-2 mb-2 bg-amber-50 border border-amber-100 rounded-lg text-center">
            <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
            <p className="text-[11px] text-amber-700 font-semibold">{currentUser?.stationName} · {currentUser?.role}</p>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:bg-amber-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-slate-950" : "text-amber-600"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* مساحة المحتوى */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* عنوان القسم للموبايل والكمبيوتر */}
          <div className="bg-white border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                {NAVIGATION_ITEMS.find(n => n.id === activeTab)?.label}
              </span>
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-xs text-amber-700 font-bold underline mr-2"
              >
                (تبديل النظام)
              </button>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {totalCount.toLocaleString("ar-IQ")} سجل
            </span>
          </div>

          {/* شريط الإجراءات والفلترة */}
          {activeTab !== "home" && activeTab !== "staff" && (
            <div className="bg-white border border-amber-200 rounded-xl p-3 mb-4 shadow-sm flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedIds(selectedIds.length === shipments.length ? [] : shipments.map(s => s.id))}
                disabled={!shipments.length}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
              >
                {selectedIds.length === shipments.length && shipments.length ? "إلغاء التحديد" : "تحديد الصفحة"}
              </button>

              <span className="text-xs font-bold text-slate-500">{selectedIds.length} محددة</span>

              <select
                disabled={!selectedIds.length}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value) handleBulkStatusChange(e.target.value);
                }}
                className="text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 outline-none"
              >
                <option value="">تغيير الحالة للمحدد...</option>
                {STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
              </select>

              <input
                type="text"
                placeholder="بحث في الجدول..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="text-xs border border-amber-200 rounded-lg px-3 py-1.5 outline-none mr-auto w-full sm:w-56"
              />

              <button
                onClick={() => fetchShipments()}
                className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-slate-700 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* جدول البيانات */}
          <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-right text-xs">
                <thead className="bg-amber-50/80 border-b border-amber-200 text-slate-700 font-extrabold">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">رقم الوصل</th>
                    <th className="p-3">المتجر</th>
                    <th className="p-3">المستلم والهاتف</th>
                    <th className="p-3">العنوان</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">المندوب</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">جارٍ التحميل...</td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">لا توجد شحنات في هذا القسم.</td>
                    </tr>
                  ) : (
                    shipments.map((s: Shipment) => {
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr key={s.id} className={`hover:bg-amber-50/30 transition-colors ${isSelected ? "bg-amber-50/70" : ""}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                              }}
                              className="rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900 font-mono">{s.waybill_number}</td>
                          <td className="p-3 font-medium text-slate-800">{s.store_name}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{s.recipient_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{s.recipient_phone}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{s.city}</span>
                            <span className="text-slate-500 block text-[11px]">{s.area}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {Number(s.amount).toLocaleString("ar-IQ")} د.ع
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{s.driver_name || "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  const clean = s.recipient_phone.replace(/\D/g, "");
                                  const num = clean.startsWith("0") ? `964${clean.slice(1)}` : clean;
                                  window.open(`https://wa.me/${num}?text=${encodeURIComponent(`مرحباً ${s.recipient_name} بخصوص شحنتك رقم ${s.waybill_number}`)}`, "_blank");
                                }}
                                className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-slate-700"
                                title="واتساب"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleHold(s.id, s.is_held)}
                                className={`p-1 rounded ${s.is_held ? "bg-red-100 text-red-700" : "bg-amber-50 hover:bg-amber-100 text-slate-700"}`}
                                title={s.is_held ? "استئناف" : "تعليق"}
                              >
                                {s.is_held ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* أزرار الصفحات */}
            <div className="p-3 border-t border-amber-100 flex items-center justify-between bg-amber-50/20">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-200 rounded text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <span className="text-xs font-bold text-slate-600">
                صفحة {page + 1} من {Math.max(1, Math.ceil(totalCount / pageSize))}
              </span>
              <button
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-200 rounded text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
