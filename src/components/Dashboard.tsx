import { useState, useEffect, useCallback } from "react";
import {
  Search,
  AlertTriangle,
  Truck,
  Package,
  Clock,
  Archive,
  RotateCcw,
  MessageSquare,
  FileSpreadsheet,
  Layers,
  GitBranch,
  UserX,
  Users,
  LogOut,
  User,
  CheckCircle2,
  Home,
  Menu,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { ShipmentsTable } from "./ShipmentsTable";
import { StaffManager } from "./StaffManager";
import { CommentsSystem } from "./CommentsSystem";
import { StickersSystem } from "./StickersSystem";
import { ListsSystem } from "./ListsSystem";

interface DashboardProps {
  onLogout?: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: "مهيمن صلاح",
    username: "alshujaa_admin",
    phone: "07818110818",
    role: "موظف",
    station: "المقر الرئيسي",
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meta = user.user_metadata || {};
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setUserProfile({
        name: profile?.full_name || profile?.name || meta.name || user.email?.split("@")[0] || "مهيمن صلاح",
        username: profile?.username || user.email?.split("@")[0] || "admin",
        phone: profile?.phone || meta.phone || "07818110818",
        role: profile?.role === "leader" ? "قائد المنظومة" : (profile?.role || "موظف"),
        station: profile?.station || "محطة بغداد المركزية",
      });
    } catch {
      // عند تعذر قراءة الملف الشخصي لا تُمنح صلاحية القائد تلقائياً.
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) onLogout();
  };

  const isLeader = userProfile.role === "قائد المنظومة" || userProfile.role === "leader";

  // قائمة الأنظمة بالترتيب الدقيق لصور الرائد
  const navItems = [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "search", label: "البحث", icon: Search },
    { id: "unconfirmed", label: "غير مؤكد", icon: AlertTriangle },
    { id: "pickup", label: "ب. مندوب الاستلام", icon: Truck },
    { id: "internal", label: "طلبات داخلية", icon: Package },
    { id: "external", label: "طلبات خارجية", icon: Package },
    { id: "waiting", label: "قيد الانتظار", icon: Clock },
    { id: "archives", label: "الارشيف", icon: Archive },
    { id: "late", label: "الطلبات المتأخرة", icon: RotateCcw },
    { id: "comments", label: "الردود", icon: MessageSquare },
    { id: "lists", label: "القوائم", icon: FileSpreadsheet },
    { id: "branches", label: "تعديلات الفروع", icon: GitBranch },
    { id: "inactive_clients", label: "عملاء غير فعالين", icon: UserX },
    { id: "stickers", label: "توليد وصولات", icon: Layers },
    ...(isLeader ? [{ id: "users", label: "إدارة الموظفين", icon: Users, highlight: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans" dir="rtl">
      {/* 1. الشريط العلوي - هوية منصة الشجاع */}
      <header className="h-14 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 border-b border-amber-300 px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-white/70 hover:bg-white text-amber-950 transition-colors"
            aria-label="فتح القائمة الجانبية"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white text-amber-600 font-black flex items-center justify-center text-sm shadow-sm border border-amber-200">
            ش
          </div>
          <span className="font-bold text-base text-amber-950 tracking-tight">
            منصة الشجاع للتوصيل السريع
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-amber-950">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-full border border-amber-200/80">
            <User className="w-3.5 h-3.5 text-amber-800" />
            <span className="font-bold">{userProfile.name}</span>
            <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
              {userProfile.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/80 hover:bg-white text-red-700 px-3 py-1 rounded-full border border-red-200 transition font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* خلفية تتلاشى بسلاسة عند فتح القائمة وإغلاقها */}
      <button
        type="button"
        aria-label="إغلاق القائمة الجانبية"
        tabIndex={mobileMenuOpen ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* قائمة الهاتف تبقى مركّبة كي تكون حركة الدخول والخروج متصلة وسلسة */}
      <aside
        aria-label="القائمة الجانبية"
        aria-hidden={!mobileMenuOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 px-1 pb-3 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">منصة الشجاع</div>
                <div className="text-[11px] text-slate-500">نظام إدارة الشحنات والطرود</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-amber-50 hover:text-slate-800"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-0.5" aria-label="التنقل الرئيسي">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors duration-200 text-right ${
                    isActive
                      ? "bg-amber-400 text-amber-950 shadow-sm"
                      : item.highlight
                      ? "text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200"
                      : "text-slate-600 hover:bg-amber-50 hover:text-amber-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-950" : item.highlight ? "text-amber-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100 text-[11px] text-center text-slate-400">
          منصة الشجاع للتوصيل السريع © 2026
        </div>
      </aside>

      {/* 2. جسم التطبيق */}
      <div className="flex-1 flex overflow-hidden">
        {/* الشريط الجانبي الأيمن للشاشات الكبيرة */}
        <aside className="hidden lg:flex w-64 bg-white border-l border-slate-200 flex-col justify-between overflow-y-auto shrink-0 shadow-sm">
          <div className="p-3">
            {/* الشعار الدائري */}
            <div className="flex flex-col items-center py-4 border-b border-slate-100 mb-2">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-inner mb-2">
                <Package className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-slate-800">منصة الشجاع</div>
              <div className="text-[11px] text-slate-500">نظام إدارة الشحنات والطرود</div>
            </div>

            {/* عناصر التنقل */}
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-bold transition-all text-right ${
                      isActive
                        ? "bg-amber-400 text-amber-950 shadow-sm"
                        : item.highlight
                        ? "text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200"
                        : "text-slate-600 hover:bg-amber-50 hover:text-amber-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-amber-950" : item.highlight ? "text-amber-600" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-slate-100 text-[11px] text-center text-slate-400">
            منصة الشجاع للتوصيل السريع © 2026
          </div>
        </aside>

        {/* 3. شاشة العرض والمحتوى المتغير */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f4f6f9]">
          {/* الرئيسية: بطاقة الحساب الأصلية */}
          {activeTab === "home" && (
            <div className="max-w-2xl mx-auto mt-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-amber-400 px-5 py-3 text-amber-950 font-bold text-sm flex items-center justify-between">
                  <span>معلومات الحساب</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-900" />
                </div>

                <div className="p-6 divide-y divide-slate-100 text-sm">
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">الاسم</span>
                    <span className="font-bold text-slate-800">{userProfile.name}</span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">اسم المستخدم</span>
                    <span className="font-bold text-slate-800">{userProfile.username}</span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">رقم الهاتف</span>
                    <span className="font-bold text-slate-800 font-mono" dir="ltr">
                      {userProfile.phone}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">النوع</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-bold text-xs">
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 text-center text-xs text-slate-400 border-t border-slate-100">
                  نظام إدارة شركات التوصيل © تطوير منصة الشجاع
                </div>
              </div>
            </div>
          )}

          {/* البحث المتقدم: شبكة حقول البحث المتكاملة */}
          {activeTab === "search" && (
            <ShipmentsTable mode="search" systemTitle="البحث المتقدم" />
          )}

          {/* غير مؤكد: شريط المراحل + باركود */}
          {activeTab === "unconfirmed" && (
            <ShipmentsTable mode="unconfirmed" filterStatus="غير مؤكد" systemTitle="غير مؤكد" />
          )}

          {/* ب. مندوب الاستلام */}
          {activeTab === "pickup" && (
            <ShipmentsTable mode="pickup" filterStatus="ب. مندوب الاستلام" systemTitle="ب. مندوب الاستلام" />
          )}

          {/* طلبات داخلية */}
          {activeTab === "internal" && (
            <ShipmentsTable mode="internal" filterCityType="داخلية" systemTitle="طلبات داخلية" />
          )}

          {/* طلبات خارجية */}
          {activeTab === "external" && (
            <ShipmentsTable mode="external" filterCityType="خارجية" systemTitle="طلبات خارجية" />
          )}

          {/* قيد الانتظار */}
          {activeTab === "waiting" && (
            <ShipmentsTable mode="waiting" filterStatus="مؤجل" systemTitle="قيد الانتظار" />
          )}

          {/* الارشيف */}
          {activeTab === "archives" && (
            <ShipmentsTable mode="archives" filterStatus="تم التسليم" systemTitle="الارشيف" />
          )}

          {/* الطلبات المتأخرة: فلتر الأيام واسم المتجر */}
          {activeTab === "late" && (
            <ShipmentsTable mode="late" filterLateOnly={true} systemTitle="الطلبات المتأخرة" />
          )}

          {/* الردود */}
          {activeTab === "comments" && <CommentsSystem />}

          {/* القوائم */}
          {activeTab === "lists" && <ListsSystem />}

          {/* توليد وصولات */}
          {activeTab === "stickers" && <StickersSystem />}

          {/* تعديلات الفروع */}
          {activeTab === "branches" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <h3 className="font-bold text-slate-700 mb-2">تعديلات الفروع</h3>
              <p className="text-xs text-slate-500">لا توجد طلبات تعديل معلقة من الفروع حالياً.</p>
            </div>
          )}

          {/* عملاء غير فعالين */}
          {activeTab === "inactive_clients" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <h3 className="font-bold text-slate-700 mb-2">العملاء غير الفعالين</h3>
              <p className="text-xs text-slate-500">كافة حسابات العملاء نشطة في المنظومة.</p>
            </div>
          )}

          {/* إدارة الموظفين للقائد */}
          {activeTab === "users" && isLeader && <StaffManager isLeader={isLeader} />}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
