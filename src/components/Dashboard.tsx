import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TrendingUp, Search, AlertTriangle, Truck, Package, 
  Clock, Archive, RotateCcw, MessageSquare, FileSpreadsheet, 
  Building2, UserX, Layers, ShieldCheck, CalendarDays, 
  Users, LogOut, Barcode, Send, Check, 
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
  created_at: string;
  is_held?: boolean;
  hold_reason?: string;
  days_late?: number;
}

const CITIES = ["الكل", "بغداد", "البصرة", "أربيل", "النجف", "كربلاء", "نينوى", "السليمانية", "بابل", "ديالى", "كركوك", "ذي قار"];
const STATUS_OPTIONS = ["الكل", "غير مؤكد", "ب. مندوب الاستلام", "قيد التنفيذ", "بحوزة المندوب", "مؤجل", "تم التسليم", "راجع"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [searchFilters, setSearchFilters] = useState({
    waybill: "",
    recipientPhone: "",
    storeName: "",
    recipientName: "",
    city: "الكل",
    status: "الكل",
  });

  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. جلب بيانات المستخدم الحقيقية
  useEffect(() => {
    async function getProfile() {
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

        setUserProfile({
          id: user.id,
          name: profile?.full_name || "مستخدم غير معرف",
          username: profile?.username || user.email || "user",
          phone: profile?.phone || "",
          role: (roleRow?.role as UserRole) || "courier",
          stationName: profile?.station || "محطة بغداد",
        });
      } catch (e) {
        console.error("فشل جلب بيانات الحساب", e);
      }
    }
    getProfile();
  }, []);

  // 2. قائمة الأنظمة الكاملة
  const systemTabs = useMemo(() => [
    { id: "home", label: "الرئيسية", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "search", label: "البحث المتقدم", icon: <Search className="w-5 h-5" /> },
    { id: "unconfirmed", label: "طلبات غير مؤكدة", icon: <AlertTriangle className="w-5 h-5" /> },
    { id: "pickup", label: "مندوب الاستلام", icon: <Truck className="w-5 h-5" /> },
    { id: "internal", label: "الطلبات الداخلية", icon: <Package className="w-5 h-5" /> },
    { id: "external", label: "الطلبات الخارجية", icon: <Truck className="w-5 h-5" /> },
    { id: "waiting", label: "قيد الانتظار", icon: <Clock className="w-5 h-5" /> },
    { id: "archives", label: "أرشيف الطلبات", icon: <Archive className="w-5 h-5" /> },
    { id: "late", label: "الطلبات المتأخرة", icon: <RotateCcw className="w-5 h-5" /> },
    { id: "comments", label: "الردود والملاحظات", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "lists", label: "الكشوفات", icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: "branches", label: "تعديلات الفروع", icon: <Building2 className="w-5 h-5" /> },
    { id: "inactive", label: "عملاء غير فعالين", icon: <UserX className="w-5 h-5" /> },
    { id: "stickers", label: "توليد الوصولات", icon: <Layers className="w-5 h-5" /> },
    { id: "verification", label: "قيد التحقق", icon: <ShieldCheck className="w-5 h-5" /> },
    { id: "schedule", label: "مواعيد وساعات العمل", icon: <CalendarDays className="w-5 h-5" /> },
    ...(userProfile?.role === "leader" ? [{ id: "staff", label: "إدارة الموظفين", icon: <Users className="w-5 h-5" /> }] : []),
  ], [userProfile]);

  // 3. جلب الشحنات من Supabase
  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("shipments").select("*", { count: "exact" });

      if (activeTab === "unconfirmed") query = query.eq("status", "غير مؤكد");
      else if (activeTab === "pickup") query = query.eq("status", "ب. مندوب الاستلام");
      else if (activeTab === "internal") query = query.eq("city_type", "داخلية");
      else if (activeTab === "external") query = query.eq("city_type", "خارجية");
      else if (activeTab === "waiting") query = query.eq("status", "مؤجل");
      else if (activeTab === "archives") query = query.in("status", ["تم التسليم", "راجع"]);
      else if (activeTab === "late") query = query.gt("days_late", 0);
      else if (activeTab === "verification") query = query.eq("verified", false);

      if (activeTab === "search") {
        if (searchFilters.waybill) query = query.ilike("waybill_number", `%${searchFilters.waybill}%`);
        if (searchFilters.recipientPhone) query = query.ilike("recipient_phone", `%${searchFilters.recipientPhone}%`);
        if (searchFilters.storeName) query = query.ilike("store_name", `%${searchFilters.storeName}%`);
        if (searchFilters.recipientName) query = query.ilike("recipient_name", `%${searchFilters.recipientName}%`);
        if (searchFilters.city !== "الكل") query = query.eq("city", searchFilters.city);
        if (searchFilters.status !== "الكل") query = query.eq("status", searchFilters.status);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setShipments(data || []);
      setTotalCount(count || 0);
    } catch (e) {
      console.error("فشل استعلام الشحنات", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchFilters]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // 4. إجراءات وتحديثات
  const handleSelectAll = () => {
    if (selectedIds.length === shipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shipments.map(s => s.id));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedIds.length || !status) return;
    const { error } = await supabase
      .from("shipments")
      .update({ status })
      .in("id", selectedIds);
    if (!error) {
      setSelectedIds([]);
      loadShipments();
    }
  };

  const handleToggleHold = async (id: string, currentHeld?: boolean) => {
    const { error } = await supabase
      .from("shipments")
      .update({ is_held: !currentHeld })
      .eq("id", id);
    if (!error) loadShipments();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const openWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formatted = cleanPhone.startsWith("07") ? "964" + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setPage(0);
    setMobileMenuOpen(false);
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#FFFDF7] text-slate-800 font-sans">
      {/* 1. القائمة المنزلقة السلسة للموبايل */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div 
          onClick={() => setMobileMenuOpen(false)} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        />
        <aside 
          className={`absolute top-0 right-0 h-full w-64 max-w-[85vw] bg-[#FFFDF7] border-l border-amber-300/40 flex flex-col justify-between shadow-2xl transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div>
            <div className="p-4 flex items-center justify-between border-b border-amber-200/50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-extrabold text-lg shadow-md border-2 border-amber-300">
                  ش
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800">منصة الشجاع</h1>
                  <p className="text-[10px] text-amber-800/80 font-medium">نظام التوصيل الموحد</p>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-amber-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
              {systemTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? "bg-amber-400 text-slate-900 shadow-sm border border-amber-500/30"
                        : "text-slate-700 hover:bg-amber-100/70 hover:text-slate-900"
                    }`}
                  >
                    <span className={active ? "text-slate-900" : "text-amber-700"}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-amber-200/50 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-sm">
                {userProfile?.name?.charAt(0) || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.name}</p>
                <p className="text-[11px] text-amber-800 truncate">
                  {userProfile?.role === "leader" ? "قائد المنظومة" : userProfile?.role === "accountant" ? "محاسب" : "مندوب"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 2. الشريط الجانبي الأيمن الكامل لسطح المكتب (Full RTL Sidebar) */}
      <aside className="hidden lg:flex w-64 bg-amber-500/10 border-l border-amber-300/40 flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* الشعار */}
          <div className="p-6 flex flex-col items-center border-b border-amber-200/50">
            <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md border-2 border-amber-300">
              ش
            </div>
            <h1 className="mt-3 text-lg font-bold text-slate-800">منصة الشجاع</h1>
            <p className="text-xs text-amber-800/80 font-medium">نظام التوصيل الموحد</p>
          </div>

          {/* قائمة الأنظمة الرأسية */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            {systemTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(0); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? "bg-amber-400 text-slate-900 shadow-sm border border-amber-500/30"
                      : "text-slate-700 hover:bg-amber-100/70 hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-slate-900" : "text-amber-700"}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* معلومات المستخدم والخروج */}
        <div className="p-4 border-t border-amber-200/50 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-sm">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.name}</p>
              <p className="text-[11px] text-amber-800 truncate">
                {userProfile?.role === "leader" ? "قائد المنظومة" : userProfile?.role === "accountant" ? "محاسب" : "مندوب"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-bold hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 3. منطقة المحتوى الرئيسية */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-amber-200/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* زر القائمة للموبايل */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-amber-100 text-slate-800 hover:bg-amber-200 transition"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {systemTabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300/40">
              {totalCount} طلب
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="مسح باركود أو وصل..."
                className="pr-9 pl-3 py-1.5 text-xs bg-amber-50/50 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-52"
              />
            </div>
            <button
              onClick={() => {
                if (barcodeInput.trim()) {
                  setActiveTab("search");
                  setSearchFilters(prev => ({ ...prev, waybill: barcodeInput.trim() }));
                }
              }}
              className="hidden sm:inline-block px-3 py-1.5 bg-amber-500 text-slate-900 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
            >
              بحث
            </button>
          </div>
        </header>

        <main className="p-6">
          {/* شاشة الرئيسية: معلومات الحساب والإحصائيات */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-900 flex items-center justify-center font-extrabold text-2xl border-2 border-amber-300">
                    {userProfile?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{userProfile?.name}</h3>
                    <p className="text-sm text-slate-500">اسم المستخدم: {userProfile?.username}</p>
                    <p className="text-sm text-slate-500">رقم الهاتف: {userProfile?.phone || "غير مسجل"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <span className="block text-xs text-slate-500">النوع والصلاحية</span>
                    <span className="font-bold text-amber-900">
                      {userProfile?.role === "leader" ? "قائد المنظومة (Leader)" : userProfile?.role === "accountant" ? "محاسب النظام" : "مندوب توصيل"}
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <span className="block text-xs text-slate-500">المحطة / الفرع</span>
                    <span className="font-bold text-amber-900">{userProfile?.stationName}</span>
                  </div>
                </div>
              </div>

              {/* بطاقات المؤشرات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "إجمالي الشحنات", count: totalCount, color: "bg-blue-50 border-blue-200 text-blue-900" },
                  { label: "شحنات مؤكدة", count: shipments.filter(s => s.status === "قيد التنفيذ").length, color: "bg-amber-50 border-amber-200 text-amber-900" },
                  { label: "تم التسليم", count: shipments.filter(s => s.status === "تم التسليم").length, color: "bg-emerald-50 border-emerald-200 text-emerald-900" },
                  { label: "شحنات راجعة", count: shipments.filter(s => s.status === "راجع").length, color: "bg-rose-50 border-rose-200 text-rose-900" },
                ].map((stat, i) => (
                  <div key={i} className={`p-5 rounded-xl border ${stat.color} shadow-sm`}>
                    <p className="text-xs font-bold opacity-80">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black">{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نموذج البحث المتقدم المتطابق مع الصور */}
          {activeTab === "search" && (
            <div className="bg-white border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-amber-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600" />
                حقول البحث المتعدد
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم الوصل</label>
                  <input
                    type="text"
                    value={searchFilters.waybill}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, waybill: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                    placeholder="رقم الوصل"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم العميل (المتجر)</label>
                  <input
                    type="text"
                    value={searchFilters.storeName}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                    placeholder="اسم المتجر"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">هاتف الزبون</label>
                  <input
                    type="text"
                    value={searchFilters.recipientPhone}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, recipientPhone: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                    placeholder="هاتف الزبون"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم الزبون</label>
                  <input
                    type="text"
                    value={searchFilters.recipientName}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, recipientName: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                    placeholder="اسم الزبون"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">المحافظة</label>
                  <select
                    value={searchFilters.city}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الحالة</label>
                  <select
                    value={searchFilters.status}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-400 outline-none"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* شريط الإجراءات فوق الجدول */}
          <div className="bg-white border border-amber-200 rounded-t-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-xs font-bold text-slate-700 transition"
              >
                {selectedIds.length === shipments.length && shipments.length > 0 ? "إلغاء التحديد" : "تحديد الصفحة"}
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {selectedIds.length} محددة
              </span>
              <select
                disabled={!selectedIds.length}
                onChange={(e) => handleStatusChange(e.target.value)}
                defaultValue=""
                className="text-xs p-1.5 bg-amber-50/60 border border-amber-200 rounded focus:ring-1 focus:ring-amber-400 text-slate-700 disabled:opacity-40"
              >
                <option value="" disabled>تغيير الحالة للمحدد...</option>
                {STATUS_OPTIONS.filter(s => s !== "الكل").map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadShipments()}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* جدول الشحنات التفصيلي */}
          <div className="bg-white border-x border-b border-amber-200 rounded-b-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-amber-100/60 text-slate-700 border-b border-amber-200 font-bold">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">رقم الوصل</th>
                    <th className="p-3">اسم العميل (المتجر)</th>
                    <th className="p-3">المندوب</th>
                    <th className="p-3">المحافظة / المنطقة</th>
                    <th className="p-3">هاتف الزبون</th>
                    <th className="p-3">المبلغ الكلي</th>
                    <th className="p-3">أجرة التوصيل</th>
                    <th className="p-3">المبلغ الصافي</th>
                    <th className="p-3">اسم الزبون</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">نوع البضاعة</th>
                    <th className="p-3">تاريخ الإضافة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="p-12 text-center text-slate-500 font-semibold">
                        جارٍ تحميل الشحنات...
                      </td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-12 text-center text-slate-500 font-semibold">
                        لا توجد طلبات مسجلة في هذا القسم.
                      </td>
                    </tr>
                  ) : (
                    shipments.map((s) => {
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr key={s.id} className={`hover:bg-amber-50/50 transition ${isSelected ? "bg-amber-100/40" : ""}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedIds(prev => 
                                  prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{s.waybill_number}</td>
                          <td className="p-3 font-medium text-slate-800">{s.store_name}</td>
                          <td className="p-3 text-slate-600">{s.driver_name || "—"}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{s.city}</span>
                            <span className="text-slate-400 block text-[11px]">{s.area}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-700" dir="ltr">{s.recipient_phone}</td>
                          <td className="p-3 font-bold text-slate-900">{Number(s.amount).toLocaleString("ar-IQ")} د.ع</td>
                          <td className="p-3 text-slate-600">{Number(s.delivery_fee || 5000).toLocaleString("ar-IQ")} د.ع</td>
                          <td className="p-3 font-bold text-emerald-700">
                            {Number(s.net_amount || (s.amount - (s.delivery_fee || 5000))).toLocaleString("ar-IQ")} د.ع
                          </td>
                          <td className="p-3 font-medium text-slate-800">{s.recipient_name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300/60">
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{s.goods_type || "عام"}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {s.created_at ? new Date(s.created_at).toLocaleDateString("ar-IQ") : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              {/* زر واتساب */}
                              <button
                                onClick={() => openWhatsApp(s.recipient_phone, `مرحباً ${s.recipient_name}، بخصوص شحنتك ذات الوصل رقم ${s.waybill_number}`)}
                                className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-slate-700 border border-amber-200 transition"
                                title="مراسلة واتساب"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                              
                              {/* زر تأكيد الطلب للطلبات غير المؤكدة */}
                              {s.status === "غير مؤكد" && (
                                <button
                                  onClick={async () => {
                                    await supabase.from("shipments").update({ status: "قيد التنفيذ" }).eq("id", s.id);
                                    loadShipments();
                                  }}
                                  className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                  title="تأكيد الشحنة"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* زر التعليق */}
                              {userProfile?.role === "leader" && (
                                <button
                                  onClick={() => handleToggleHold(s.id, s.is_held)}
                                  className={`p-1 rounded border transition ${
                                    s.is_held 
                                      ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" 
                                      : "bg-amber-50 border-amber-200 text-slate-700 hover:bg-amber-100"
                                  }`}
                                  title={s.is_held ? "استئناف الطلب" : "تعليق الطلب"}
                                >
                                  {s.is_held ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                                </button>
                              )}
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
export { Dashboard };
