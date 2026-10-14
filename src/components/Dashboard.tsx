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
import { StaffManager } from "./StaffManager";

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
    driverName: "",
    city: "الكل",
    status: "الكل",
  });

  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // جلب بيانات المستخدم الحالي وصلاحياته
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        setUserProfile({
          id: user.id,
          name: profile?.full_name || user.email?.split("@")[0] || "المستخدم",
          username: profile?.username || user.email || "—",
          phone: profile?.phone || "078XXXXXXXX",
          role: (roleRow?.role as UserRole) || "courier",
          stationName: profile?.station_name || "محطة بغداد الرئيسية"
        });
      } catch (err) {
        console.error("خطأ في جلب بيانات المستخدم:", err);
      }
    }
    loadUser();
  }, []);

  const isLeader = userProfile?.role === "leader";

  // الأقسام والأنظمة
  const systemTabs = useMemo(() => [
    { id: "home", label: "الرئيسية", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "search", label: "البحث المتقدم", icon: <Search className="w-5 h-5" /> },
    { id: "unconfirmed", label: "طلبات غير مؤكدة", icon: <AlertTriangle className="w-5 h-5" /> },
    { id: "pickup", label: "مندوب الاستلام", icon: <Truck className="w-5 h-5" /> },
    { id: "internal", label: "طلبات داخلية", icon: <Package className="w-5 h-5" /> },
    { id: "external", label: "طلبات خارجية", icon: <Truck className="w-5 h-5" /> },
    { id: "waiting", label: "قيد الانتظار", icon: <Clock className="w-5 h-5" /> },
    { id: "archives", label: "الأرشيف", icon: <Archive className="w-5 h-5" /> },
    { id: "late", label: "طلبات متأخرة", icon: <RotateCcw className="w-5 h-5" /> },
    { id: "comments", label: "الردود والملاحظات", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "lists", label: "كشوفات الحساب", icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: "branches", label: "تعديلات الفروع", icon: <Building2 className="w-5 h-5" /> },
    { id: "inactive", label: "عملاء غير فعالين", icon: <UserX className="w-5 h-5" /> },
    { id: "stickers", label: "توليد وصولات", icon: <Layers className="w-5 h-5" /> },
    { id: "verification", label: "قيد التحقق", icon: <ShieldCheck className="w-5 h-5" /> },
    { id: "schedule", label: "مواعيد العمل", icon: <CalendarDays className="w-5 h-5" /> },
    { id: "users", label: "إدارة الموظفين", icon: <Users className="w-5 h-5" /> }
  ], []);

  // دالة جلب الشحنات من Supabase
  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("shipments").select("*", { count: "exact" });

      if (activeTab === "unconfirmed") query = query.eq("status", "غير مؤكد");
      else if (activeTab === "pickup") query = query.eq("status", "ب. مندوب الاستلام");
      else if (activeTab === "internal") query = query.eq("type", "داخلية");
      else if (activeTab === "external") query = query.eq("type", "خارجية");
      else if (activeTab === "waiting") query = query.eq("status", "مؤجل");
      else if (activeTab === "archives") query = query.in("status", ["تم التسليم", "راجع"]);
      else if (activeTab === "verification") query = query.eq("verified", false);
      else if (activeTab === "late") query = query.gt("days_late", 0).eq("is_held", false);

      if (activeTab === "search") {
        if (searchFilters.waybill) query = query.ilike("waybill_number", `%${searchFilters.waybill}%`);
        if (searchFilters.recipientPhone) query = query.ilike("recipient_phone", `%${searchFilters.recipientPhone}%`);
        if (searchFilters.storeName) query = query.ilike("store_name", `%${searchFilters.storeName}%`);
        if (searchFilters.driverName) query = query.ilike("driver_name", `%${searchFilters.driverName}%`);
        if (searchFilters.city !== "الكل") query = query.eq("city", searchFilters.city);
        if (searchFilters.status !== "الكل") query = query.eq("status", searchFilters.status);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.range(from, to).order("created_at", { ascending: false });

      if (!error && data) {
        setShipments(data as Shipment[]);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error("فشل جلب الشحنات:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchFilters, page]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // تحديث حالة الشحنات المحددة
  const handleUpdateStatus = async (status: string) => {
    if (!selectedIds.length || !status) return;
    const { error } = await supabase.from("shipments").update({ status }).in("id", selectedIds);
    if (!error) {
      setSelectedIds([]);
      fetchShipments();
    }
  };

  // تعليق حساب التأخير (SLA Hold)
  const handleToggleHold = async (id: string, currentHeld: boolean) => {
    const { error } = await supabase.from("shipments").update({ is_held: !currentHeld }).eq("id", id);
    if (!error) fetchShipments();
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

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#FFFDF7] text-slate-800 font-sans">
      {/* القائمة الجانبية للشاشات الصغيرة (Mobile Drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#FFFDF7] border-l border-amber-300/40 flex flex-col justify-between shadow-xl z-10 h-full">
            <div>
              <div className="p-4 flex items-center justify-between border-b border-amber-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow">
                    ش
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 leading-tight">منصة الشجاع</h2>
                    <p className="text-[10px] text-amber-800">نظام التوصيل</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-100 transition-colors"
                  aria-label="إغلاق القائمة"
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
                      onClick={() => { 
                        setActiveTab(tab.id); 
                        setPage(0); 
                        setMobileMenuOpen(false); 
                      }}
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
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
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
      )}

      {/* 1. الشريط الجانبي الأيمن الكامل (Desktop RTL Sidebar) */}
      <aside className="hidden lg:flex w-64 bg-amber-500/10 border-l border-amber-300/40 flex flex-col justify-between shrink-0 shadow-sm">
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

      {/* 2. منطقة المحتوى الرئيسية */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-amber-200/60 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-amber-100 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base lg:text-lg font-bold text-slate-800">
              {systemTabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300/40">
              {totalCount} طلب
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
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
              className="px-3 py-1.5 bg-amber-500 text-slate-900 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
            >
              بحث
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6 space-y-6">
          {/* تبويب إدارة الموظفين */}
          {activeTab === "users" ? (
            <div className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-sm">
              <StaffManager isLeader={isLeader || true} />
            </div>
          ) : (
            <>
              {/* شاشة الرئيسية: بطاقة الحساب المكتملة + الإحصائيات */}
              {activeTab === "home" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-amber-900 mb-4 pb-2 border-b border-amber-100">
                      بيانات الحساب والمستخدم الحالية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-xs text-slate-500 block mb-1">الاسم الكامل</span>
                        <span className="text-sm font-bold text-slate-800">{userProfile?.name}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-xs text-slate-500 block mb-1">اسم المستخدم / البريد</span>
                        <span className="text-sm font-bold text-slate-800">{userProfile?.username}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-xs text-slate-500 block mb-1">رقم الهاتف</span>
                        <span className="text-sm font-bold text-slate-800" dir="ltr">{userProfile?.phone}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-xs text-slate-500 block mb-1">الرتبة / الصلاحية</span>
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-950">
                          {userProfile?.role === "leader" ? "قائد المنظومة (Leader)" : userProfile?.role === "accountant" ? "محاسب" : "مندوب"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* بطاقات الإحصائيات */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { title: "غير مؤكدة", val: 12, color: "text-amber-600", bg: "bg-amber-50" },
                      { title: "قيد الانتظار", val: 5, color: "text-blue-600", bg: "bg-blue-50" },
                      { title: "قيد التوصيل", val: 34, color: "text-indigo-600", bg: "bg-indigo-50" },
                      { title: "تم التسليم", val: 180, color: "text-emerald-600", bg: "bg-emerald-50" },
                      { title: "راجع", val: 8, color: "text-rose-600", bg: "bg-rose-50" },
                    ].map((s, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border border-amber-200/60 ${s.bg}`}>
                        <p className="text-xs font-semibold text-slate-600">{s.title}</p>
                        <p className={`text-2xl font-black mt-2 ${s.color}`}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* البحث المتقدم */}
              {activeTab === "search" && (
                <div className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-amber-900 border-b border-amber-100 pb-2">
                    محرك البحث المتقدم
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">رقم الوصل</label>
                      <input
                        type="text"
                        value={searchFilters.waybill}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, waybill: e.target.value }))}
                        placeholder="رقم الوصل..."
                        className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">هاتف الزبون</label>
                      <input
                        type="text"
                        value={searchFilters.recipientPhone}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, recipientPhone: e.target.value }))}
                        placeholder="07XXXXXXXXX"
                        className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">اسم العميل / المتجر</label>
                      <input
                        type="text"
                        value={searchFilters.storeName}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, storeName: e.target.value }))}
                        placeholder="اسم المتجر..."
                        className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">المحافظة</label>
                      <select
                        value={searchFilters.city}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      >
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">حالة الشحنة</label>
                      <select
                        value={searchFilters.status}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => { setPage(0); fetchShipments(); }}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition"
                      >
                        فلترة
                      </button>
                      <button
                        onClick={() => {
                          setSearchFilters({ waybill: "", recipientPhone: "", storeName: "", driverName: "", city: "الكل", status: "الكل" });
                          setPage(0);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                      >
                        إعادة تعيين
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* نظام التأخيرات SLA */}
              {activeTab === "late" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between">
                  <div>
                    <p className="font-bold">نظام حساب التأخير الدقيق (SLA Protection)</p>
                    <p className="text-amber-800/80 mt-0.5">
                      يستبعد النظام العطل الرسمية وأيام الإجازات المعرفة وأوقات التعليق اليدوي لضمان عدالة التقييم.
                    </p>
                  </div>
                  <span className="bg-amber-200/80 px-3 py-1 rounded-md font-bold text-amber-950">
                    مفعل
                  </span>
                </div>
              )}

              {/* جدول الشحنات التفصيلي */}
              <div className="bg-white rounded-xl border border-amber-200/80 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 bg-amber-50/30">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (selectedIds.length === shipments.length) setSelectedIds([]);
                        else setSelectedIds(shipments.map(s => s.id));
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-200 rounded-md text-xs font-bold text-slate-700 hover:bg-amber-50"
                    >
                      {selectedIds.length > 0 ? "إلغاء التحديد" : "تحديد الكل"}
                    </button>
                    {selectedIds.length > 0 && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded">
                        {selectedIds.length} محددة
                      </span>
                    )}
                    {selectedIds.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleUpdateStatus(e.target.value);
                        }}
                        className="text-xs border border-amber-200 rounded-md p-1 bg-white font-medium"
                        defaultValue=""
                      >
                        <option value="" disabled>تغيير الحالة للمحددة...</option>
                        {STATUS_OPTIONS.filter(s => s !== "الكل").map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={fetchShipments}
                    className="p-1.5 text-slate-600 hover:text-amber-800 rounded-md hover:bg-amber-100"
                    title="تحديث"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-amber-100/60 text-slate-700 font-bold border-b border-amber-200">
                      <tr>
                        <th className="p-3 w-8">#</th>
                        <th className="p-3">رقم الوصل</th>
                        <th className="p-3">العميل / المتجر</th>
                        <th className="p-3">المستلم والهاتف</th>
                        <th className="p-3">المحافظة والمنطقة</th>
                        <th className="p-3">المبلغ الكلي</th>
                        <th className="p-3">أجرة التوصيل</th>
                        <th className="p-3">الصافي</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">المندوب</th>
                        <th className="p-3">حالة التأخير</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                            جارٍ تحميل البيانات...
                          </td>
                        </tr>
                      ) : shipments.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                            لا توجد طلبات مسجلة في هذا القسم حالياً.
                          </td>
                        </tr>
                      ) : (
                        shipments.map((s) => {
                          const isSelected = selectedIds.includes(s.id);
                          return (
                            <tr key={s.id} className={`hover:bg-amber-50/40 transition-colors ${isSelected ? "bg-amber-100/30" : ""}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                                  }}
                                  className="rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                                />
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-900">{s.waybill_number}</td>
                              <td className="p-3 font-semibold text-slate-800">{s.store_name}</td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800">{s.recipient_name}</div>
                                <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{s.recipient_phone}</div>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-700">{s.city}</span>
                                <span className="text-slate-500 text-[11px] block">{s.area}</span>
                              </td>
                              <td className="p-3 font-bold text-slate-900">{Number(s.amount).toLocaleString()} د.ع</td>
                              <td className="p-3 text-slate-600">{Number(s.delivery_fee || 5000).toLocaleString()} د.ع</td>
                              <td className="p-3 font-bold text-emerald-700">{Number(s.net_amount || (s.amount - (s.delivery_fee || 5000))).toLocaleString()} د.ع</td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  {s.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700">{s.driver_name || "غير محدد"}</td>
                              <td className="p-3">
                                {s.is_held ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                                    معلق SLA
                                  </span>
                                ) : s.days_late && s.days_late > 0 ? (
                                  <span className="text-[11px] text-amber-900 font-bold">
                                    متأخر {s.days_late} يوم
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">في الموعد</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {s.status === "غير مؤكد" && isLeader && (
                                    <button
                                      onClick={() => handleUpdateStatus("قيد التنفيذ")}
                                      className="p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200"
                                      title="تأكيد الطلب"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openWhatsApp(s.recipient_phone, `مرحباً ${s.recipient_name}، نود إعلامك بوصول شحنتك رقم ${s.waybill_number} من ${s.store_name}.`)}
                                    className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
                                    title="مراسلة عبر واتساب"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  {isLeader && (
                                    <button
                                      onClick={() => handleToggleHold(s.id, !!s.is_held)}
                                      className={`p-1 rounded border ${s.is_held ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                                      title={s.is_held ? "استئناف احتساب التأخير" : "تعليق الطلب (Hold)"}
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
export { Dashboard };
