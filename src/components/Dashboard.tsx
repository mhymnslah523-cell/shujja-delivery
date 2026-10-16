import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TrendingUp, Search, AlertTriangle, Truck, Package, 
  Clock, Archive, RotateCcw, MessageSquare, FileSpreadsheet, 
  Building2, UserX, Layers, ShieldCheck, CalendarDays, 
  Users, LogOut, Barcode, Send, Check, 
  PauseCircle, PlayCircle, RefreshCw, ChevronRight, ChevronLeft,
  Edit, Lock, X, Save, Plus, Menu, CheckCircle2, Shield,
  Phone, LayoutGrid, Table as TableIcon, UserCheck, DollarSign,
  Filter, Trash2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { StaffManager } from "./StaffManager";
import { CommentsSystem } from "./CommentsSystem";
import { ListsSystem } from "./ListsSystem";
import { StickersSystem } from "./StickersSystem";

export type UserRole = "leader" | "operator" | "accountant" | "courier";

export interface StaffOption {
  id: string;
  name: string;
  phone?: string;
  role?: string;
}

export const DEFAULT_STAFF_MEMBERS: StaffOption[] = [
  { id: "courier-ahmed", name: "أحمد المندوب (بغداد)", phone: "07701234567", role: "courier" },
  { id: "operator-sajjad", name: "سجاد التشغيلي", phone: "07801122334", role: "operator" },
  { id: "accountant-karrar", name: "كرار المحاسب", phone: "07505566778", role: "accountant" },
];


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
  partial_amount?: number;
  partial_return_amount?: number;
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
  return_reason?: string;
  days_late?: number;
  type?: "داخلية" | "خارجية" | string;
}

const CITIES = ["الكل", "بغداد", "البصرة", "أربيل", "النجف", "كربلاء", "نينوى", "السليمانية", "بابل", "ديالى", "كركوك", "ذي قار"];

const RETURN_REASONS = [
  "الزبون رفض الاستلام",
  "مغلق / لا يرد على الاتصال",
  "العنوان غير واضح / خارج التغطية",
  "طلب إلغاء من قبل الزبون",
  "طلب إلغاء من صاحب البيج",
  "تأجيل متكرر وتجاوز المهلة",
  "البضاعة متضررة أو غير مطابقة",
  "أخرى (مذكور بالملاحظات)"
];

const STATUS_OPTIONS = [
  "الكل",
  "غير مؤكد",
  "ب. مندوب الاستلام",
  "قيد التنفيذ",
  "بحوزة المندوب",
  "مؤجل",
  "واصل جزئي",
  "راجع جزئي",
  "تم التسليم",
  "راجع",
  "تمت محاسبة المندوب",
  "تمت محاسبة العميل"
];

// ألوان الهايلايت والتمييز للصفوف وفق المتطلبات المعتمدة
const getStatusTheme = (status: string, isSelected: boolean) => {
  const themes: Record<string, { badge: string; rowBg: string; border: string }> = {
    "غير مؤكد": {
      badge: "bg-slate-100 text-slate-700 border-slate-300",
      rowBg: isSelected ? "bg-slate-200/90" : "bg-slate-50 hover:bg-slate-100",
      border: "border-r-4 border-r-slate-400",
    },
    "ب. مندوب الاستلام": {
      badge: "bg-sky-100 text-sky-800 border-sky-300",
      rowBg: isSelected ? "bg-sky-200/90" : "bg-sky-50 hover:bg-sky-100",
      border: "border-r-4 border-r-sky-500",
    },
    "قيد التنفيذ": {
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      rowBg: isSelected ? "bg-amber-200/90" : "bg-amber-50 hover:bg-amber-100",
      border: "border-r-4 border-r-amber-500",
    },
    "بحوزة المندوب": {
      badge: "bg-violet-100 text-violet-800 border-violet-300",
      rowBg: isSelected ? "bg-violet-200/90" : "bg-violet-50 hover:bg-violet-100",
      border: "border-r-4 border-r-violet-500",
    },
    "مؤجل": {
      badge: "bg-orange-100 text-orange-900 border-orange-300",
      rowBg: isSelected ? "bg-orange-200/90" : "bg-orange-50 hover:bg-orange-100",
      border: "border-r-4 border-r-orange-500",
    },
    "واصل جزئي": {
      badge: "bg-teal-100 text-teal-900 border-teal-300",
      rowBg: isSelected ? "bg-teal-200/90" : "bg-teal-50 hover:bg-teal-100",
      border: "border-r-4 border-r-teal-500",
    },
    "راجع جزئي": {
      badge: "bg-[#800020]/15 text-[#800020] border-[#800020]/40 font-bold",
      rowBg: isSelected ? "bg-[#800020]/25" : "bg-[#800020]/10 hover:bg-[#800020]/15",
      border: "border-r-4 border-r-[#800020]",
    },
    "تم التسليم": {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      rowBg: isSelected ? "bg-emerald-200/90" : "bg-emerald-50 hover:bg-emerald-100",
      border: "border-r-4 border-r-emerald-500",
    },
    "راجع": {
      badge: "bg-rose-100 text-rose-800 border-rose-300",
      rowBg: isSelected ? "bg-rose-200/90" : "bg-rose-50 hover:bg-rose-100",
      border: "border-r-4 border-r-rose-500",
    },
    "تمت محاسبة المندوب": {
      badge: "bg-blue-100 text-blue-900 border-blue-800 font-extrabold",
      rowBg: isSelected ? "bg-blue-200/90" : "bg-blue-50 hover:bg-blue-100",
      border: "border-r-4 border-r-blue-800",
    },
    "تمت محاسبة العميل": {
      badge: "bg-indigo-100 text-indigo-950 border-indigo-800 font-extrabold",
      rowBg: isSelected ? "bg-indigo-200/90" : "bg-indigo-50 hover:bg-indigo-100",
      border: "border-r-4 border-r-indigo-800",
    },
  };

  return themes[status] ?? {
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    rowBg: isSelected ? "bg-amber-200/90" : "bg-amber-50 hover:bg-amber-100",
    border: "border-r-4 border-r-amber-400",
  };
};

export function Dashboard() {
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>("الكل");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("الكل");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>(DEFAULT_STAFF_MEMBERS);
  const [selectedBulkCourier, setSelectedBulkCourier] = useState<string>("");
  const [inspectedCourier, setInspectedCourier] = useState<string>("");

  // البحث المتقدم
  const [searchFilters, setSearchFilters] = useState({
    waybill: "",
    recipientPhone: "",
    storeName: "",
    driverName: "",
    city: "الكل",
    status: "الكل",
  });

  // الصفحات
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // حالة نافذة تعديل الوصل
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Shipment>>({});

  // حالة نافذة إضافة طلب جديد
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    waybill_number: "",
    store_name: "",
    store_phone: "",
    recipient_name: "",
    recipient_phone: "",
    city: "بغداد",
    area: "",
    type: "داخلية",
    amount: 25000,
    delivery_fee: 5000,
    status: "قيد التنفيذ",
    driver_name: "",
    notes: "",
  });

  // جلب بيانات الحساب والدور
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        const rawRole = String(roleRow?.role || profile?.role || "courier").toLowerCase();
        let resolvedRole: UserRole = "courier";
        if (["leader", "admin", "مدير", "قائد"].includes(rawRole)) {
          resolvedRole = "leader";
        } else if (["operator", "operations", "operation", "employee", "موظف", "تشغيلي", "موظف تشغيلي"].includes(rawRole)) {
          resolvedRole = "operator";
        } else if (["accountant", "محاسب"].includes(rawRole)) {
          resolvedRole = "accountant";
        } else {
          resolvedRole = "courier";
        }

        setUserProfile({
          id: user.id,
          name: profile?.full_name || profile?.name || user.email?.split("@")[0] || "مستخدم",
          username: profile?.username || user.email || "—",
          phone: profile?.phone || "—",
          role: resolvedRole,
          stationName: profile?.station_name || "محطة بغداد المركزية",
        });
      } catch (err) {
        console.error("فشل جلب الملف الشخصي:", err);
      }
    };
    fetchUser();
  }, []);

  const isLeader = userProfile?.role === "leader";
  const isAccountant = userProfile?.role === "accountant";
  const isCourier = userProfile?.role === "courier";

  // شريط الأنظمة والتنقل الأصلي المعتمد بالكامل مع تطبيق الصلاحيات الدقيقة
  const systemTabs = useMemo(() => {
    const all = [
      { id: "home", label: "الرئيسية", icon: <TrendingUp className="w-5 h-5" />, courierAllowed: true },
      { id: "search", label: "البحث المتقدم", icon: <Search className="w-5 h-5" />, courierAllowed: true },
      { id: "unconfirmed", label: "طلبات غير مؤكدة", icon: <AlertTriangle className="w-5 h-5" />, courierAllowed: true },
      { id: "pickup", label: "مندوب الاستلام", icon: <Truck className="w-5 h-5" />, courierAllowed: true },
      { id: "internal", label: "طلبات داخلية (بغداد)", icon: <Package className="w-5 h-5" />, courierAllowed: true },
      { id: "external", label: "طلبات خارجية (المحافظات)", icon: <Truck className="w-5 h-5" />, courierAllowed: true },
      { id: "warehouse_returns", label: "الراجع للمخزن", icon: <RotateCcw className="w-5 h-5" />, courierAllowed: true },
      { id: "partial_delivered", label: "واصل جزئي", icon: <CheckCircle2 className="w-5 h-5" />, courierAllowed: true },
      { id: "partial_returned", label: "راجع جزئي", icon: <RotateCcw className="w-5 h-5" />, courierAllowed: true },
      { id: "courier_settlement", label: "محاسبة المندوبين", icon: <FileSpreadsheet className="w-5 h-5" />, courierAllowed: false },
      { id: "client_settlement", label: "محاسبة العملاء", icon: <Building2 className="w-5 h-5" />, courierAllowed: false },
      { id: "waiting", label: "قيد الانتظار / مؤجل", icon: <Clock className="w-5 h-5" />, courierAllowed: true },
      { id: "archives", label: "الأرشيف", icon: <Archive className="w-5 h-5" />, courierAllowed: true },
      { id: "late", label: "طلبات متأخرة", icon: <RotateCcw className="w-5 h-5" />, courierAllowed: true },
      { id: "comments", label: "الردود والملاحظات", icon: <MessageSquare className="w-5 h-5" />, courierAllowed: true },
      { id: "lists", label: "كشوفات الحساب", icon: <FileSpreadsheet className="w-5 h-5" />, courierAllowed: false },
      ...(isLeader ? [{ id: "branches", label: "تعديلات الفروع", icon: <Building2 className="w-5 h-5" />, courierAllowed: false }] : []),
      { id: "inactive", label: "عملاء غير فعالين", icon: <UserX className="w-5 h-5" />, courierAllowed: false },
      { id: "stickers", label: "توليد وصولات", icon: <Layers className="w-5 h-5" />, courierAllowed: true },
      { id: "verification", label: "قيد التحقق", icon: <ShieldCheck className="w-5 h-5" />, courierAllowed: false },
      ...(isLeader ? [
        { id: "schedule", label: "مواعيد العمل", icon: <CalendarDays className="w-5 h-5" />, courierAllowed: false },
        { id: "users", label: "إدارة الموظفين", icon: <Users className="w-5 h-5" />, courierAllowed: false }
      ] : [])
    ];

    return all.filter((tab) => {
      // المندوب محجوب تماماً عن أقسام المحاسبة والإدارة والكشوفات
      if (isCourier && !tab.courierAllowed) return false;
      return true;
    });
  }, [isLeader, isCourier]);

  // حماية تلقائية: إذا حاول المندوب الدخول لقسم غير مصرح له به يُعاد فوراً إلى الرئيسية
  useEffect(() => {
    if (isCourier) {
      const blockedForCourier = ["courier_settlement", "client_settlement", "users", "lists", "branches", "inactive", "verification", "schedule"];
      if (blockedForCourier.includes(activeTab)) {
        setActiveTab("home");
      }
    }
  }, [isCourier, activeTab]);

  // جلب قائمة الموظفين المسجلين في النظام لاستخدامها في القوائم المنسدلة للتعيين
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, phone, role");
        if (profs && profs.length > 0) {
          const list: StaffOption[] = profs.map((p: any) => ({
            id: p.id,
            name: p.full_name || p.name || "موظف",
            phone: p.phone || "",
            role: p.role || "courier",
          }));
          const map = new Map<string, StaffOption>();
          DEFAULT_STAFF_MEMBERS.forEach((s) => map.set(s.name, s));
          list.forEach((s) => map.set(s.name, s));
          setStaffOptions(Array.from(map.values()));
        }
      } catch (err) {
        console.error("فشل جلب قائمة الموظفين:", err);
      }
    };
    fetchStaff();
  }, []);

  // دالة جلب الشحنات من Supabase مع دعم الفئات
  const fetchShipments = useCallback(async () => {
    // تبويبات الأنظمة المنفصلة لا تحتاج جلب جدول الشحنات العام
    if (["users", "comments", "lists", "stickers"].includes(activeTab)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase.from("shipments").select("*", { count: "exact" });

      if (activeTab === "unconfirmed") query = query.eq("status", "غير مؤكد");
      else if (activeTab === "pickup") query = query.eq("status", "ب. مندوب الاستلام");
      else if (activeTab === "internal") query = query.eq("city", "بغداد");
      else if (activeTab === "external") query = query.neq("city", "بغداد");
      else if (activeTab === "warehouse_returns") query = query.in("status", ["راجع", "راجع جزئي"]);
      else if (activeTab === "partial_delivered") query = query.eq("status", "واصل جزئي");
      else if (activeTab === "partial_returned") query = query.eq("status", "راجع جزئي");
      else if (activeTab === "courier_settlement") query = query.in("status", ["تم التسليم", "واصل جزئي", "تمت محاسبة المندوب"]);
      else if (activeTab === "client_settlement") query = query.in("status", ["تمت محاسبة المندوب", "تمت محاسبة العميل"]);
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
        // عند استخدام البحث المتقدم، تحديد جميع النتائج المكتشفة تلقائياً
        if (activeTab === "search" && data.length > 0) {
          setSelectedIds(data.map(s => s.id));
        }
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

  // إغلاق النوافذ والقائمة الجانبية بمفتاح Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setEditingShipment(null);
        setIsCreateOrderOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // تحديث حالة الشحنات المحددة جماعياً مع حماية الراجع للمندوب
  const handleUpdateStatus = async (status: string) => {
    if (!selectedIds.length || !status) return;

    // المندوب لا يستطيع تعديل أي شحنة محولة مسبقاً إلى راجع للمخزن
    if (isCourier) {
      const alreadyReturned = shipments.some(
        s => selectedIds.includes(s.id) && (s.status === "راجع" || s.status === "راجع جزئي")
      );
      if (alreadyReturned) {
        alert("تنبيه: لا يمكن للمندوب تعديل حالة الطلبات المحولة مسبقاً إلى الراجع للمخزن. التعديل للمدير فقط.");
        return;
      }
    }

    let returnReasonText = "";
    if (status === "راجع") {
      const promptReason = window.prompt("يرجى إدخال سبب الراجع (مطلوب لتحويل الشحنة إلى الراجع للمخزن):");
      if (!promptReason || !promptReason.trim()) {
        alert("لا يمكن تحويل الشحنة إلى راجع بدون كتابة سبب الراجع.");
        return;
      }
      returnReasonText = promptReason.trim();
    }

    try {
      const updateData: Record<string, any> = { status };
      if (returnReasonText) {
        updateData.notes = `سبب الراجع: ${returnReasonText}`;
        updateData.hold_reason = returnReasonText;
      }

      const { error } = await supabase.from("shipments").update(updateData).in("id", selectedIds);
      if (!error) {
        setSelectedIds([]);
        fetchShipments();
        if (status === "راجع" && isCourier) {
          alert("تم تحويل الشحنة إلى الراجع للمخزن وتوثيق السبب. تم قفل التعديل عليها للمندوب.");
        }
      } else {
        alert("فشل تحديث الحالة: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // تعليق أو استئناف SLA للمدير فقط
  const handleToggleHold = async (id: string, currentHeld: boolean) => {
    if (!isLeader) return;
    const { error } = await supabase.from("shipments").update({ is_held: !currentHeld }).eq("id", id);
    if (!error) fetchShipments();
  };

  // بحث الباركود: يضع الوصل أولاً ويحدده تلقائياً
  const handleBarcodeSearch = async () => {
    const term = barcodeInput.trim();
    if (!term) return;

    const existingIndex = shipments.findIndex(
      s => s.waybill_number.toLowerCase().includes(term.toLowerCase()) || s.recipient_phone.includes(term)
    );

    if (existingIndex !== -1) {
      const match = shipments[existingIndex];
      const reordered = [match, ...shipments.filter((_, idx) => idx !== existingIndex)];
      setShipments(reordered);
      setSelectedIds([match.id]);
    } else {
      try {
        const { data } = await supabase
          .from("shipments")
          .select("*")
          .ilike("waybill_number", `%${term}%`)
          .limit(1);

        if (data && data.length > 0) {
          const match = data[0] as Shipment;
          setShipments(prev => [match, ...prev.filter(s => s.id !== match.id)]);
          setSelectedIds([match.id]);
        } else {
          alert("لم يتم العثور على وصل يطابق هذا الرقم أو الباركود.");
        }
      } catch (err) {
        console.error("خطأ في بحث الباركود:", err);
      }
    }
  };

  // فتح نافذة تعديل الوصل مع فحص الصلاحيات
  const openEditModal = (shipment: Shipment) => {
    // المندوب مقفل عليه تعديل أي شحنة راجعة للمخزن
    if (isCourier && (shipment.status === "راجع" || shipment.status === "راجع جزئي")) {
      alert("هذا الطلب في قسم الراجع للمخزن، ولا يمكن للمندوب تعديله. الصلاحية محصورة بالمدير فقط.");
      return;
    }

    setEditingShipment(shipment);
    const amountVal = Number(shipment.amount || 0);
    const deliveryFeeVal = Number(shipment.delivery_fee || 5000);
    setEditFormData({
      ...shipment,
      amount: amountVal,
      delivery_fee: deliveryFeeVal,
      net_amount: amountVal - deliveryFeeVal,
      return_reason: shipment.hold_reason || shipment.notes || "",
    });
  };

  // حفظ تعديلات الوصل وفق قواعد الصلاحيات الدقيقة
  const handleSaveEdit = async () => {
    if (!editingShipment?.id) return;

    // المندوب مقفل عليه تعديل الشحنة الراجعة
    if (isCourier && (editingShipment.status === "راجع" || editingShipment.status === "راجع جزئي")) {
      alert("غير مصرح للمندوب بتعديل الشحنة الراجعة.");
      return;
    }

    // إذا اختار حالة "راجع"، يلزم إدخال سبب الراجع
    if (editFormData.status === "راجع" && !editFormData.return_reason?.trim()) {
      alert("يرجى تحديد أو كتابة سبب الراجع لتحويل الطلب إلى قسم الراجع للمخزن.");
      return;
    }

    try {
      const totalAmt = Number(editFormData.amount || 0);
      
      // المدير فقط يقدر يعدل أجرة التوصيل؛ المحاسب والمندوب تُحفظ أجرتهما السابقة كما هي
      const delivFee = isLeader 
        ? Number(editFormData.delivery_fee ?? 5000)
        : Number(editingShipment.delivery_fee || 5000);

      const computedNet = totalAmt - delivFee;

      const updatePayload: Record<string, any> = {
        store_name: editFormData.store_name,
        recipient_name: editFormData.recipient_name,
        recipient_phone: editFormData.recipient_phone,
        city: editFormData.city,
        area: editFormData.area,
        amount: totalAmt,
        status: editFormData.status,
        driver_name: editFormData.driver_name,
        // وقت الإنشاء created_at مقفل تماماً ولا يُعدل لضمان سلامة السجلات
      };

      // إذا كان مدير، يُحدّث أجرة التوصيل والصافي المحسوب
      if (isLeader) {
        updatePayload.delivery_fee = delivFee;
        updatePayload.net_amount = computedNet;
      }

      if (editFormData.return_reason) {
        updatePayload.hold_reason = editFormData.return_reason;
        updatePayload.notes = editFormData.notes 
          ? `${editFormData.notes} | سبب الراجع: ${editFormData.return_reason}`
          : `سبب الراجع: ${editFormData.return_reason}`;
      }

      const { error } = await supabase
        .from("shipments")
        .update(updatePayload)
        .eq("id", editingShipment.id);

      if (!error) {
        setShipments(prev =>
          prev.map(s => (s.id === editingShipment.id ? { 
            ...s, 
            ...editFormData, 
            delivery_fee: delivFee, 
            net_amount: computedNet 
          } : s))
        );
        setEditingShipment(null);

        if (editFormData.status === "راجع" && isCourier) {
          alert("تم تحويل الوصل إلى الراجع للمخزن وتوثيق السبب. الوصل الآن مقفل للمندوب.");
        }
      } else {
        alert("فشل تحديث الوصل: " + error.message);
      }
    } catch (err) {
      console.error("خطأ أثناء حفظ التعديل:", err);
    }
  };

  // إنشاء وإضافة طلب جديد
  const handleCreateOrder = async () => {
    if (!newOrder.store_name.trim() || !newOrder.recipient_name.trim() || !newOrder.recipient_phone.trim()) {
      alert("يرجى ملء اسم المتجر، واسم المستلم، وهاتفه.");
      return;
    }

    try {
      const waybill = newOrder.waybill_number.trim() || `WB-${Date.now().toString().slice(-6)}`;
      const total = Number(newOrder.amount || 0);
      const fee = isLeader ? Number(newOrder.delivery_fee || 5000) : 5000;
      const net = total - fee;

      const payload = {
        waybill_number: waybill,
        store_name: newOrder.store_name.trim(),
        store_phone: newOrder.store_phone?.trim() || null,
        recipient_name: newOrder.recipient_name.trim(),
        recipient_phone: newOrder.recipient_phone.trim(),
        city: newOrder.city,
        area: newOrder.area.trim(),
        amount: total,
        delivery_fee: fee,
        net_amount: net,
        status: newOrder.status,
        driver_name: newOrder.driver_name?.trim() || null,
        notes: newOrder.notes?.trim() || null,
      };

      const { data, error } = await supabase.from("shipments").insert([payload]).select();

      if (!error && data && data.length > 0) {
        setShipments(prev => [data[0] as Shipment, ...prev]);
        setIsCreateOrderOpen(false);
        setNewOrder({
          waybill_number: "",
          store_name: "",
          store_phone: "",
          recipient_name: "",
          recipient_phone: "",
          city: "بغداد",
          area: "",
          type: "داخلية",
          amount: 25000,
          delivery_fee: 5000,
          status: "قيد التنفيذ",
          driver_name: "",
          notes: "",
        });
      } else {
        alert("فشل إنشاء الطلب: " + (error?.message || "خطأ غير معروف"));
      }
    } catch (err) {
      console.error("خطأ إنشاء الطلب:", err);
    }
  };

  // تأكيد استلام الوصل بالمخزن (للمدير)
  const handleConfirmWarehouseReceipt = async (shipmentId: string) => {
    if (!isLeader) return;
    try {
      const { error } = await supabase
        .from("shipments")
        .update({ notes: "تم استلام الطرد فعلياً في المخزن وتدقيقه." })
        .eq("id", shipmentId);
      if (!error) {
        alert("تم تأكيد استلام الشحنة في المخزن بنجاح.");
        fetchShipments();
      }
    } catch (e) {
      console.error(e);
    }
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

  // حسابات مجاميع المبالغ لقسم محاسبة المندوبين ومحاسبة العملاء
  const settlementTotals = useMemo(() => {
    let totalAmt = 0;
    let totalFees = 0;
    let totalNet = 0;
    shipments.forEach(s => {
      const amt = Number(s.amount || 0);
      const fee = Number(s.delivery_fee || 5000);
      const net = Number(s.net_amount || (amt - fee));
      totalAmt += amt;
      totalFees += fee;
      totalNet += net;
    });
    return { totalAmt, totalFees, totalNet };
  }, [shipments]);

  // إحصائيات وتقارير المندوبين المفصلة (المسلم والرافض والمبالغ الصافية لكل مندوب)
  const couriersBreakdown = useMemo(() => {
    const map: Record<string, {
      driverName: string;
      totalCount: number;
      deliveredCount: number;
      rejectedCount: number;
      partialDeliveredCount: number;
      partialReturnedCount: number;
      waitingCount: number;
      inProgressCount: number;
      settledCount: number;
      totalAmount: number;
      totalFee: number;
      totalNet: number;
      shipmentIds: string[];
      settleableShipmentIds: string[];
    }> = {};

    shipments.forEach((s) => {
      const driver = s.driver_name?.trim() || "غير معيّن لمندوب";
      if (!map[driver]) {
        map[driver] = {
          driverName: driver,
          totalCount: 0,
          deliveredCount: 0,
          rejectedCount: 0,
          partialDeliveredCount: 0,
          partialReturnedCount: 0,
          waitingCount: 0,
          inProgressCount: 0,
          settledCount: 0,
          totalAmount: 0,
          totalFee: 0,
          totalNet: 0,
          shipmentIds: [],
          settleableShipmentIds: [],
        };
      }
      const c = map[driver];
      c.totalCount += 1;
      c.shipmentIds.push(s.id);

      const amt = Number(s.amount || 0);
      const fee = Number(s.delivery_fee || 5000);
      const net = Number(s.net_amount || (amt - fee));

      c.totalAmount += amt;
      c.totalFee += fee;
      c.totalNet += net;

      if (s.status === "تم التسليم") {
        c.deliveredCount += 1;
        c.settleableShipmentIds.push(s.id);
      } else if (s.status === "راجع") {
        c.rejectedCount += 1;
      } else if (s.status === "واصل جزئي") {
        c.partialDeliveredCount += 1;
        c.settleableShipmentIds.push(s.id);
      } else if (s.status === "راجع جزئي") {
        c.partialReturnedCount += 1;
      } else if (s.status === "مؤجل") {
        c.waitingCount += 1;
      } else if (s.status === "تمت محاسبة المندوب") {
        c.settledCount += 1;
      } else {
        c.inProgressCount += 1;
      }
    });

    return Object.values(map);
  }, [shipments]);

  // قائمة المندوبين المتاحين (دمج الموظفين المسجلين مع المندوبين الظاهرين في الشحنات)
  const availableCouriers = useMemo(() => {
    const map = new Map<string, StaffOption>();
    staffOptions.forEach((s) => {
      if (s.name && s.name.trim()) map.set(s.name.trim(), s);
    });
    couriersBreakdown.forEach((c) => {
      const name = c.driverName?.trim();
      if (name && name !== "غير معيّن لمندوب" && name !== "الكل" && !map.has(name)) {
        map.set(name, { id: name, name: name, phone: "", role: "courier" });
      }
    });
    return Array.from(map.values());
  }, [staffOptions, couriersBreakdown]);

  // إحصائيات المندوب المختار في لوحة التتبع السريعة
  const inspectedCourierStats = useMemo(() => {
    if (!inspectedCourier || inspectedCourier === "الكل") return null;
    return couriersBreakdown.find((c) => c.driverName === inspectedCourier) || null;
  }, [inspectedCourier, couriersBreakdown]);

  // دالة تحويل وتعيين الشحنات المحددة جماعياً للمندوب (Bulk Assign)
  const handleBulkAssignDriver = async (targetDriverName: string) => {
    if (!selectedIds.length) {
      alert("يرجى تحديد الشحنات أولاً من المربعات في الجدول");
      return;
    }
    if (!targetDriverName) {
      alert("يرجى اختيار المندوب المراد تحويل الشحنات إليه من القائمة");
      return;
    }

    const matched = availableCouriers.find((c) => c.name === targetDriverName);
    const confirmed = window.confirm(
      `هل أنت متأكد من تحويل ${selectedIds.length} شحنة إلى المندوب: (${targetDriverName}) وتغيير حالتها إلى [بحوزة المندوب]؟`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const updateData: Record<string, any> = {
        driver_name: targetDriverName,
        status: "بحوزة المندوب",
      };
      if (matched?.id && matched.id !== targetDriverName) {
        updateData.driver_id = matched.id;
      }

      const { error } = await supabase
        .from("shipments")
        .update(updateData)
        .in("id", selectedIds);

      if (error) throw error;

      setShipments((prev) =>
        prev.map((s) =>
          selectedIds.includes(s.id)
            ? { ...s, driver_name: targetDriverName, driver_id: matched?.id || s.driver_id, status: "بحوزة المندوب" }
            : s
        )
      );

      alert(`تم تحويل ${selectedIds.length} شحنة بنجاح إلى المندوب: ${targetDriverName}`);
      setSelectedIds([]);
      setSelectedBulkCourier("");
    } catch (err: any) {
      console.error("فشل تحويل الشحنات للمندوب:", err);
      alert("حدث خطأ أثناء تحويل الشحنات: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // الشحنات المعروضة بعد تطبيق فلاتر المندوب والمتجر
  const displayedShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (selectedCourierFilter && selectedCourierFilter !== "الكل") {
        const d = s.driver_name?.trim() || "غير معيّن لمندوب";
        if (d !== selectedCourierFilter) return false;
      }
      if (selectedStoreFilter && selectedStoreFilter !== "الكل") {
        const store = s.store_name?.trim() || "";
        if (store !== selectedStoreFilter) return false;
      }
      return true;
    });
  }, [shipments, selectedCourierFilter, selectedStoreFilter]);


  // إحصائيات وتقارير العملاء وأصحاب البيجات المفصلة
  const clientsBreakdown = useMemo(() => {
    const map: Record<string, {
      storeName: string;
      totalCount: number;
      deliveredCount: number;
      rejectedCount: number;
      settledCount: number;
      totalAmount: number;
      totalFee: number;
      totalNet: number;
      shipmentIds: string[];
      settleableShipmentIds: string[];
    }> = {};

    shipments.forEach((s) => {
      const store = s.store_name?.trim() || "متجر غير محدد";
      if (!map[store]) {
        map[store] = {
          storeName: store,
          totalCount: 0,
          deliveredCount: 0,
          rejectedCount: 0,
          settledCount: 0,
          totalAmount: 0,
          totalFee: 0,
          totalNet: 0,
          shipmentIds: [],
          settleableShipmentIds: [],
        };
      }
      const storeItem = map[store];
      storeItem.totalCount += 1;
      storeItem.shipmentIds.push(s.id);

      const amt = Number(s.amount || 0);
      const fee = Number(s.delivery_fee || 5000);
      const net = Number(s.net_amount || (amt - fee));

      storeItem.totalAmount += amt;
      storeItem.totalFee += fee;
      storeItem.totalNet += net;

      if (s.status === "تمت محاسبة المندوب" || s.status === "تم التسليم") {
        storeItem.deliveredCount += 1;
        storeItem.settleableShipmentIds.push(s.id);
      } else if (s.status === "راجع" || s.status === "راجع جزئي") {
        storeItem.rejectedCount += 1;
      } else if (s.status === "تمت محاسبة العميل") {
        storeItem.settledCount += 1;
      }
    });

    return Object.values(map);
  }, [shipments]);


  // تحديد وتأشير جميع شحنات مندوب معين فوراً
  const handleSelectCourierShipments = (shipmentIds: string[], driverName: string) => {
    setSelectedIds(shipmentIds);
    setSelectedCourierFilter(driverName);
  };

  // تسوية فورية لجميع شحنات مندوب معين المؤهلة
  const handleSettleSpecificCourier = async (driverName: string, settleableIds: string[]) => {
    if (!isLeader && !isAccountant) {
      alert("صلاحية المحاسبة للمدير والمحاسب فقط.");
      return;
    }
    if (!settleableIds.length) {
      alert(`لا توجد شحنات جاهزة للتسوية حالياً للمندوب (${driverName}). يجب أن تكون الحالة [تم التسليم] أو [واصل جزئي].`);
      return;
    }
    const confirmed = window.confirm(`هل أنت متأكد من تسوية ومحاسبة ${settleableIds.length} شحنة للمندوب (${driverName})؟ ستتحول حالتها إلى [تمت محاسبة المندوب].`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: "تمت محاسبة المندوب" })
        .in("id", settleableIds);

      if (!error) {
        alert(`تمت تسوية حساب المندوب (${driverName}) بنجاح.`);
        fetchShipments();
      } else {
        alert("فشل تحديث الحالة: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // تسوية فورية لجميع شحنات عميل/بيج معين
  const handleSettleSpecificClient = async (storeName: string, settleableIds: string[]) => {
    if (!isLeader && !isAccountant) {
      alert("صلاحية المحاسبة للمدير والمحاسب فقط.");
      return;
    }
    if (!settleableIds.length) {
      alert(`لا توجد شحنات جاهزة للتسوية حالياً للعميل (${storeName}).`);
      return;
    }
    const confirmed = window.confirm(`هل أنت متأكد من تسوية وصرف مستحقات ${settleableIds.length} شحنة للمتجر (${storeName})؟ ستتحول حالتها إلى [تمت محاسبة العميل].`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: "تمت محاسبة العميل" })
        .in("id", settleableIds);

      if (!error) {
        alert(`تمت تسوية حساب العميل (${storeName}) بنجاح.`);
        fetchShipments();
      } else {
        alert("فشل تحديث الحالة: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // تسوية محاسبة المندوب بنقرة زر (للمدير والمحاسب)
  const handleSettleCourier = async () => {
    if (!selectedIds.length) {
      alert("يرجى تحديد الشحنات المراد محاسبة المندوب عنها.");
      return;
    }
    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: "تمت محاسبة المندوب" })
        .in("id", selectedIds);
      if (!error) {
        alert("تمت محاسبة المندوب بنجاح للشحنات المحددة.");
        setSelectedIds([]);
        fetchShipments();
      } else {
        alert("فشل تحديث الحالة: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // تسوية محاسبة العميل / البيج بنقرة زر (للمدير والمحاسب)
  const handleSettleClient = async () => {
    if (!selectedIds.length) {
      alert("يرجى تحديد الشحنات المراد محاسبة العميل عنها.");
      return;
    }
    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: "تمت محاسبة العميل" })
        .in("id", selectedIds);
      if (!error) {
        alert("تمت محاسبة العميل وصاحب البيج بنجاح للشحنات المحددة.");
        setSelectedIds([]);
        fetchShipments();
      } else {
        alert("فشل تحديث الحالة: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // حذف شحنة بالكامل (خاص بالمدير فقط مع تأكيد)
  const handleDeleteShipment = async (id: string, waybill: string) => {
    if (!isLeader) {
      alert("صلاحية حذف الوصل محصورة بمدير المنظومة فقط.");
      return;
    }
    const confirmed = window.confirm(`هل أنت متأكد من حذف الوصل رقم ${waybill} نهائياً؟ لا يمكن التراجع عن هذه الخطوة.`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("shipments").delete().eq("id", id);
      if (!error) {
        alert("تم حذف الوصل بنجاح.");
        setShipments(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        setTotalCount(c => Math.max(0, c - 1));
      } else {
        alert("فشل الحذف: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // إحصائيات سريعة للرئيسية والراجع
  const warehouseReturnsCount = useMemo(() => {
    return shipments.filter(s => s.status === "راجع" || s.status === "راجع جزئي").length;
  }, [shipments]);

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#faf9f6] text-slate-800 font-sans">
      {/* 1. الشريط الجانبي الأيمن الكلاسيكي الثابت (Desktop Sidebar) */}
      <aside className="hidden md:flex w-64 bg-white/90 border-l border-amber-200/70 flex-col justify-between shrink-0 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div>
          {/* الشعار المعتمد */}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-200/50 border border-amber-500/30"
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

        {/* بيانات المستخدم وزر تسجيل الخروج أسفل الشريط */}
        <div className="p-4 border-t border-amber-200/50 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.name}</p>
              <p className="text-[11px] text-amber-800 truncate">
                {userProfile?.role === "leader" ? "قائد المنظومة (مدير)" : userProfile?.role === "accountant" ? "محاسب" : "مندوب توصيل"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 2. القائمة الجانبية للهاتف (Mobile Drawer السلس بانتقال الرائد) */}
      <div
        className={`fixed inset-0 z-50 flex md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        {/* غطاء معتم بضبابية زجاجية للإغلاق عند اللمس */}
        <div
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* درج القائمة المنزلق بسلاسة تامة من اليمين RTL (نفس تطبيق الرائد) */}
        <div
          className={`relative w-80 max-w-[85vw] bg-[#FFFDF7] h-full shadow-2xl border-l border-amber-300 flex flex-col justify-between z-10 transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
            <div>
              <div className="p-4 flex items-center justify-between border-b border-amber-200/80 bg-amber-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-300">
                    ش
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900">منصة الشجاع</h2>
                    <p className="text-[11px] text-amber-900 font-bold">أنظمة التوصيل وإدارة الشحنات</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-amber-100 rounded-lg transition"
                  title="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* بطاقة الحساب في رأس القائمة للهاتف */}
              <div className="p-3 mx-3 my-2 bg-white rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                    {userProfile?.name?.charAt(0) || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.name}</p>
                    <p className="text-[10px] text-amber-800">
                      {userProfile?.role === "leader" ? "قائد المنظومة (مدير)" : userProfile?.role === "accountant" ? "محاسب" : "مندوب توصيل"}
                    </p>
                  </div>
                </div>
              </div>

              {/* قائمة الأنظمة الكاملة */}
              <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
                {systemTabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setPage(0);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                        active
                          ? "bg-amber-400 text-slate-950 shadow-sm border border-amber-500/40 font-black"
                          : "text-slate-700 hover:bg-amber-100/70"
                      }`}
                    >
                      <span className={active ? "text-slate-950" : "text-amber-700"}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* زر تسجيل الخروج في أسفل قائمة الهاتف */}
            <div className="p-4 border-t border-amber-200 bg-amber-500/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>

      {/* 3. منطقة المحتوى والواجهة الرئيسية */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* الشريط العلوي الكلاسيكي */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200/60 p-4 sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {/* زر القائمة للهاتف */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-700 hover:bg-amber-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* حقل بحث الباركود ورقم الوصل المباشر */}
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-amber-700 absolute right-3 top-2.5" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeSearch()}
                placeholder="بحث سريع برقم الوصل أو الباركود..."
                className="w-full text-xs pl-3 pr-9 py-2 bg-amber-50/50 border border-amber-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>
            <button
              onClick={handleBarcodeSearch}
              className="px-3 py-2 bg-amber-500 text-slate-900 font-bold text-xs rounded-lg hover:bg-amber-400 transition shadow-sm"
            >
              بحث
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* زر إضافة طلب جديد */}
            <button
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طلب جديد</span>
            </button>

            {/* بطاقة الحساب في الهيدر */}
            <div className="hidden sm:flex items-center gap-2 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xs">
                {userProfile?.name?.charAt(0) || "U"}
              </div>
              <span className="text-xs font-bold text-slate-800">{userProfile?.name}</span>
              <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-extrabold text-amber-950">
                {userProfile?.role === "leader" ? "مدير" : userProfile?.role === "operator" ? "موظف تشغيلي" : userProfile?.role === "accountant" ? "محاسب" : "مندوب"}
              </span>
            </div>
          </div>
        </header>

        {/* جسم الصفحة الرئيسي */}
        <main className="p-6 space-y-6">
          {/* قسم إدارة الموظفين: مربوط ويعمل بالكامل عند اختيار التبويب */}
          {activeTab === "users" && isLeader && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03] space-y-4">
              <div className="border-b border-amber-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-700" />
                    <span>نظام إدارة موظفي المنظومة (Staff Management)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    إضافة وتعديل وحذف حسابات الموظفين وتعيين الصلاحيات (قائد / موظف / محاسب / مندوب)
                  </p>
                </div>
              </div>
              <StaffManager isLeader={isLeader} />
            </div>
          )}

          {/* قسم الردود والملاحظات */}
          {activeTab === "comments" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03]">
              <CommentsSystem />
            </div>
          )}

          {/* قسم كشوفات الحساب */}
          {activeTab === "lists" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03]">
              <ListsSystem />
            </div>
          )}

          {/* قسم توليد وصولات وطباعة الاستيكرات */}
          {activeTab === "stickers" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03]">
              <StickersSystem />
            </div>
          )}

          {/* شاشة الرئيسية: بطاقة الحساب الأصلية + بطاقات الإحصائيات الخمسة */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03]">
                <h3 className="text-sm font-bold text-amber-900 mb-4 pb-2 border-b border-amber-100 flex items-center justify-between">
                  <span>بيانات الحساب والمستخدم الحالية</span>
                  <span className="text-xs text-amber-700 font-normal">محطة: {userProfile?.stationName}</span>
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
                      {userProfile?.role === "leader" ? "قائد المنظومة (Leader - صلاحيات كاملة)" : userProfile?.role === "accountant" ? "محاسب المنظومة" : "مندوب توصيل"}
                    </span>
                  </div>
                </div>
              </div>

              {/* بطاقات الإحصائيات الخمسة الأصلية المعتمدة */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: "غير مؤكدة", val: 12, color: "text-amber-600", bg: "bg-amber-50" },
                  { title: "قيد الانتظار", val: 5, color: "text-blue-600", bg: "bg-blue-50" },
                  { title: "قيد التوصيل", val: 34, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { title: "تم التسليم", val: 180, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { title: "راجع للمخزن", val: warehouseReturnsCount || 8, color: "text-rose-600", bg: "bg-rose-50" },
                ].map((s, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border border-white/70 shadow-sm ${s.bg}`}>
                    <p className="text-xs font-semibold text-slate-600">{s.title}</p>
                    <p className={`text-2xl font-black mt-2 ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* محرك البحث المتقدم */}
          {activeTab === "search" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm shadow-slate-900/[0.03] space-y-4">
              <h3 className="text-sm font-bold text-amber-900 border-b border-amber-100 pb-2">
                محرك البحث المتقدم (يحدد جميع النتائج تلقائياً ويبرز أول وصل مطابق)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">رقم الوصل</label>
                  <input
                    type="text"
                    value={searchFilters.waybill}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, waybill: e.target.value }))}
                    placeholder="رقم الوصل..."
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">هاتف الزبون</label>
                  <input
                    type="text"
                    value={searchFilters.recipientPhone}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, recipientPhone: e.target.value }))}
                    placeholder="07XXXXXXXXX"
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono"
                    dir="ltr"
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
                  <label className="text-xs font-bold text-slate-600 block mb-1">الحالة</label>
                  <select
                    value={searchFilters.status}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">اسم المندوب</label>
                  <input
                    type="text"
                    value={searchFilters.driverName}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, driverName: e.target.value }))}
                    placeholder="اسم المندوب..."
                    className="w-full text-xs p-2 bg-amber-50/40 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-3">
                  <button
                    onClick={() => { setPage(0); fetchShipments(); }}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition shadow-sm"
                  >
                    فلترة وبحث
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

          {/* قسم الراجع للمخزن (Warehouse Returns) - تنبيه وإحصائيات خاصة */}
          {activeTab === "warehouse_returns" && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-700" />
                  <span className="font-bold text-sm text-rose-950">قسم الراجع للمخزن (Warehouse Returns)</span>
                </div>
                <span className="bg-rose-200 text-rose-950 px-2.5 py-0.5 rounded font-extrabold text-[11px]">
                  {warehouseReturnsCount} شحنات راجعة
                </span>
              </div>
              <p className="text-rose-800 leading-relaxed">
                هذا القسم يجمع كافة الشحنات التي تم إرجاعها من المندوب مع توثيق سبب الراجع.
                <strong className="text-rose-950 mr-1">تنبيه الأمان:</strong>
                الشحنات الراجعة مقفلة على المندوب ولا يمكنه تعديلها، وصلاحية فك القفل أو إعادة التوجيه أو تأكيد الاستلام محصورة بالمدير (قائد المنظومة).
              </p>
            </div>
          )}
          {/* قسم واصل جزئي */}
          {activeTab === "partial_delivered" && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <span className="font-bold text-sm text-teal-950">قسم الواصل الجزئي</span>
                </div>
                <span className="bg-teal-200 text-teal-950 px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                  {shipments.length} شحنة
                </span>
              </div>
              <p className="text-teal-900 leading-relaxed">
                الشحنات التي تم تسليم جزء من بضاعتها للزبون وقبض جزء من المبلغ، مع تعديل قيمة الوصل إلى المبلغ المستلم الفعلي.
              </p>
            </div>
          )}

          {/* قسم راجع جزئي (ماروني فخم) */}
          {activeTab === "partial_returned" && (
            <div className="bg-[#800020]/10 border border-[#800020]/30 rounded-2xl p-4 text-xs text-[#5c0017] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-[#800020]" />
                  <span className="font-bold text-sm text-[#800020]">قسم الراجع الجزئي (تأشير ماروني)</span>
                </div>
                <span className="bg-[#800020]/20 text-[#800020] px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                  {shipments.length} شحنة راجعة جزئياً
                </span>
              </div>
              <p className="text-[#5c0017] leading-relaxed">
                يحتوي هذا القسم على المتبقي من الوصل الواصل جزئياً (المبلغ الكلي ناقص المبلغ الواصل جزئياً)، لتوثيق البضاعة المتبقية للعودة للمخزن.
              </p>
            </div>
          )}

          {/* قسم محاسبة المندوبين (يجمع المبلغ الكلي، أجرة التوصيل، والمبلغ الصافي) */}
          {activeTab === "courier_settlement" && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-6">
              {/* الرأسية والإجراء العام */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-950">
                      نظام محاسبة وتقارير المندوبين (تصفية حسابات التوصيل)
                    </h3>
                    <p className="text-xs text-blue-800/80">
                      إحصائيات تفصيلية لكل مندوب، تتبع الشحنات المسلمة والراجعة، وتأشير وتسوية المستحقات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(isLeader || isAccountant) && (
                    <button
                      onClick={handleSettleCourier}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>تحويل الشحنات المحددة إلى [تمت محاسبة المندوب]</span>
                    </button>
                  )}
                </div>
              </div>

              {/* مجاميع الحسابات الإجمالية */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-2xl border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-xs font-bold">إجمالي المبلغ الكلي للطلبات</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-blue-950 font-mono">
                    {settlementTotals.totalAmt.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/40 rounded-2xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-xs font-bold">إجمالي أجور التوصيل المستحقة</span>
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-amber-950 font-mono">
                    {settlementTotals.totalFees.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-xs font-bold">إجمالي المبلغ الصافي المستحق</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-emerald-950 font-mono">
                    {settlementTotals.totalNet.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* جدول وبطاقات تفصيلية لكل مندوب (المسلّم والرفض وتأشير المطلوب) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-700" />
                    <span>كشف حساب المندوبين التفصيلي (حسب المندوب):</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    عدد المندوبين النشطين: {couriersBreakdown.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم المندوب</th>
                        <th className="p-3 text-center">الإجمالي</th>
                        <th className="p-3 text-center">تم التسليم (واصل)</th>
                        <th className="p-3 text-center">الرفض (راجع)</th>
                        <th className="p-3 text-center">واصل/راجع جزئي</th>
                        <th className="p-3 text-center">مؤجل / جاري</th>
                        <th className="p-3 text-center">تمت محاسبته</th>
                        <th className="p-3">المبلغ الكلي</th>
                        <th className="p-3">أجور التوصيل</th>
                        <th className="p-3">الصافي</th>
                        <th className="p-3 text-center">إجراءات المندوب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {couriersBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-4 text-center text-slate-500">
                            لا توجد بيانات مندوبين حالياً
                          </td>
                        </tr>
                      ) : (
                        couriersBreakdown.map((c, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/40 transition">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0">
                                {c.driverName.charAt(0)}
                              </div>
                              <span>{c.driverName}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              {c.totalCount}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                {c.deliveredCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                {c.rejectedCount}
                              </span>
                            </td>
                            <td className="p-3 text-center font-semibold">
                              <span className="text-teal-700">{c.partialDeliveredCount}</span> / <span className="text-[#800020]">{c.partialReturnedCount}</span>
                            </td>
                            <td className="p-3 text-center font-semibold text-amber-700">
                              {c.waitingCount + c.inProgressCount}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900">
                                {c.settledCount}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {c.totalAmount.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 font-mono text-slate-600">
                              {c.totalFee.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {c.totalNet.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSelectCourierShipments(c.shipmentIds, c.driverName)}
                                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-lg transition border border-amber-300"
                                  title="تأشير وتحديد شحنات هذا المندوب في الجدول"
                                >
                                  تأشير المطلوب
                                </button>
                                {(isLeader || isAccountant) && (
                                  <button
                                    onClick={() => handleSettleSpecificCourier(c.driverName, c.settleableShipmentIds)}
                                    disabled={c.settleableShipmentIds.length === 0}
                                    className={`px-2.5 py-1 text-white font-bold text-[11px] rounded-lg transition shadow-2xs ${
                                      c.settleableShipmentIds.length > 0
                                        ? "bg-blue-800 hover:bg-blue-900 cursor-pointer"
                                        : "bg-slate-300 cursor-not-allowed"
                                    }`}
                                    title="تسوية شحنات المندوب المسلمة"
                                  >
                                    تسوية ({c.settleableShipmentIds.length})
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "client_settlement" && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm space-y-6">
              {/* الرأسية والإجراء العام */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-900 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-indigo-950">
                      نظام محاسبة العملاء وأصحاب البيجات (تصفية المستحقات الصافية)
                    </h3>
                    <p className="text-xs text-indigo-800/80">
                      حساب الصافي المستحق لكل متجر (المبلغ الكلي ناقص أجور التوصيل) وصرف المستحقات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(isLeader || isAccountant) && (
                    <button
                      onClick={handleSettleClient}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>تحويل الشحنات المحددة إلى [تمت محاسبة العميل]</span>
                    </button>
                  )}
                </div>
              </div>

              {/* مجاميع الحسابات الإجمالية للعملاء */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/40 rounded-2xl border border-indigo-200 shadow-xs">
                  <div className="flex items-center justify-between text-indigo-800 mb-1">
                    <span className="text-xs font-bold">إجمالي مبالغ الشحنات المجمعة</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-indigo-950 font-mono">
                    {settlementTotals.totalAmt.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-xs font-bold">صافي المبالغ المستحقة للعملاء وأصحاب البيجات</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-emerald-950 font-mono">
                    {settlementTotals.totalNet.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* جدول كشف حساب المتاجر والبيجات */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-700" />
                    <span>كشف حساب المتاجر وأصحاب البيجات:</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    عدد المتاجر: {clientsBreakdown.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم المتجر / العميل</th>
                        <th className="p-3 text-center">إجمالي الطلبات</th>
                        <th className="p-3 text-center">تم التسليم</th>
                        <th className="p-3 text-center">راجع</th>
                        <th className="p-3 text-center">تمت محاسبة العميل</th>
                        <th className="p-3">المبلغ الكلي</th>
                        <th className="p-3">أجور التوصيل</th>
                        <th className="p-3">الصافي المستحق</th>
                        <th className="p-3 text-center">إجراءات المتجر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientsBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-slate-500">
                            لا توجد بيانات متاجر حالياً
                          </td>
                        </tr>
                      ) : (
                        clientsBreakdown.map((st, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/40 transition">
                            <td className="p-3 font-bold text-slate-900">
                              {st.storeName}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              {st.totalCount}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                {st.deliveredCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                {st.rejectedCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-900">
                                {st.settledCount}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {st.totalAmount.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 font-mono text-slate-600">
                              {st.totalFee.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {st.totalNet.toLocaleString()} د.ع
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedIds(st.shipmentIds);
                                    setSelectedStoreFilter(st.storeName);
                                  }}
                                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-lg transition border border-amber-300"
                                  title="تأشير وتحديد شحنات هذا المتجر في الجدول"
                                >
                                  تأشير الشحنات
                                </button>
                                {(isLeader || isAccountant) && (
                                  <button
                                    onClick={() => handleSettleSpecificClient(st.storeName, st.settleableShipmentIds)}
                                    disabled={st.settleableShipmentIds.length === 0}
                                    className={`px-2.5 py-1 text-white font-bold text-[11px] rounded-lg transition shadow-2xs ${
                                      st.settleableShipmentIds.length > 0
                                        ? "bg-indigo-900 hover:bg-indigo-950 cursor-pointer"
                                        : "bg-slate-300 cursor-not-allowed"
                                    }`}
                                    title="تسوية وصرف مستحقات المتجر"
                                  >
                                    تسوية ({st.settleableShipmentIds.length})
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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

          {/* جدول الشحنات الموحد: يظهر في جميع تبويبات الطلبات */}
                    {/* لوحة متابعة وإرسال وصولات المندوبين (اختار مندوب حتى تشوف موصل وراجع وتدزله وصولات) */}
          {!isCourier && !["users", "comments", "lists", "stickers"].includes(activeTab) && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-4 shadow-sm border border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                      <span>لوحة متابعة وإرسال وصولات المندوبين</span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                        تتبع فوري + تعيين سريع
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      اختر أي مندوب لمشاهدة ما تم تسليمه وما رجع بالتمام، وأرسل له وصولات جديدة بضغطة زر
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={inspectedCourier}
                    onChange={(e) => setInspectedCourier(e.target.value)}
                    className="bg-slate-800 text-white border border-amber-400/60 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">-- اختر مندوباً لمتابعة أدائه وإرسال الشحنات --</option>
                    {availableCouriers.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        🚚 {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  {inspectedCourier && (
                    <button
                      type="button"
                      onClick={() => setInspectedCourier("")}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition"
                      title="إلغاء اختيار المندوب"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {inspectedCourier ? (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold">إجمالي الطلبات</span>
                      <span className="text-base font-black text-white">{inspectedCourierStats?.totalCount || 0}</span>
                    </div>
                    <div className="bg-emerald-950/60 border border-emerald-600/50 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-emerald-300 font-bold">تم التسليم (واصل)</span>
                      <span className="text-base font-black text-emerald-400">{inspectedCourierStats?.deliveredCount || 0}</span>
                    </div>
                    <div className="bg-rose-950/60 border border-rose-600/50 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-rose-300 font-bold">الرفض (راجع)</span>
                      <span className="text-base font-black text-rose-400">{inspectedCourierStats?.rejectedCount || 0}</span>
                    </div>
                    <div className="bg-teal-950/60 border border-teal-600/50 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-teal-300 font-bold">واصل/راجع جزئي</span>
                      <span className="text-base font-black text-teal-400">
                        {inspectedCourierStats?.partialDeliveredCount || 0} / {inspectedCourierStats?.partialReturnedCount || 0}
                      </span>
                    </div>
                    <div className="bg-amber-950/60 border border-amber-600/50 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-amber-300 font-bold">قيد التنفيذ / بحوزته</span>
                      <span className="text-base font-black text-amber-400">
                        {(inspectedCourierStats?.waitingCount || 0) + (inspectedCourierStats?.inProgressCount || 0)}
                      </span>
                    </div>
                    <div className="bg-blue-950/60 border border-blue-600/50 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-blue-300 font-bold">الصافي المستحق</span>
                      <span className="text-xs font-mono font-black text-blue-300">
                        {(inspectedCourierStats?.totalNet || 0).toLocaleString()} د.ع
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBulkAssignDriver(inspectedCourier)}
                        disabled={selectedIds.length === 0}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-xs ${
                          selectedIds.length > 0
                            ? "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer animate-pulse"
                            : "bg-slate-700/80 text-slate-400 cursor-not-allowed"
                        }`}
                        title={selectedIds.length > 0 ? "إرسال وتحويل الشحنات المحددة لهذا المندوب" : "حدد شحنات من الجدول أولاً"}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال الشحنات المحددة ({selectedIds.length}) إلى ({inspectedCourier}) 🚀</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCourierFilter === inspectedCourier) {
                            setSelectedCourierFilter("الكل");
                          } else {
                            setSelectedCourierFilter(inspectedCourier);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          selectedCourierFilter === inspectedCourier
                            ? "bg-blue-600 text-white border-blue-400"
                            : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>
                          {selectedCourierFilter === inspectedCourier
                            ? "إلغاء تصفية الجدول (عرض الكل)"
                            : `تصفية الجدول لشحنات (${inspectedCourier}) فقط`}
                        </span>
                      </button>
                    </div>

                    {inspectedCourierStats?.shipmentIds && inspectedCourierStats.shipmentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectCourierShipments(inspectedCourierStats.shipmentIds, inspectedCourier)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition"
                      >
                        تأشير كافة وصولاته ({inspectedCourierStats.totalCount})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                  💡 اختر مندوباً من القائمة أعلاه لتظهر لك فوراً إحصائيات ما تم تسليمه وما رجع، وزر إرسال الوصولات المحددة إليه مباشرة.
                </div>
              )}
            </div>
          )}

          {!["users", "comments", "lists", "stickers"].includes(activeTab) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-900/[0.04] overflow-hidden">
              <div className="p-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 bg-amber-50/30">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedIds.length === displayedShipments.length) setSelectedIds([]);
                      else setSelectedIds(displayedShipments.map(s => s.id));
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-md text-xs font-bold text-slate-700 hover:bg-amber-50 shadow-2xs"
                  >
                    {selectedIds.length > 0 ? "إلغاء التحديد" : "تحديد الكل"}
                  </button>
                  {selectedIds.length > 0 && (
                    <span className="text-xs font-extrabold text-amber-950 bg-amber-200 px-2.5 py-1 rounded-md shadow-2xs animate-pulse">
                      {selectedIds.length} محددة
                    </span>
                  )}
                  {/* شريط التعيين الجماعي بنمط الرائد للمندوب المختار */}
                  {selectedIds.length > 0 && !isCourier && (
                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg p-0.5 shadow-2xs">
                      <select
                        value={selectedBulkCourier}
                        onChange={(e) => setSelectedBulkCourier(e.target.value)}
                        className="text-xs border-0 rounded-md p-1 bg-transparent font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="">-- اختر المندوب للتحويل --</option>
                        {availableCouriers.map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            🚚 {c.name} {c.phone ? `(${c.phone})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleBulkAssignDriver(selectedBulkCourier)}
                        disabled={!selectedBulkCourier}
                        className={`px-2.5 py-1 rounded-md text-xs font-extrabold flex items-center gap-1 transition ${
                          selectedBulkCourier
                            ? "bg-blue-800 hover:bg-blue-900 text-white cursor-pointer shadow-2xs"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        title="تحويل الشحنات المحددة للمندوب وتغيير حالتها إلى بحوزة المندوب"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>تحويل للمندوب</span>
                      </button>
                    </div>
                  )}
                  {selectedIds.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleUpdateStatus(e.target.value);
                      }}
                      className="text-xs border border-amber-200 rounded-md p-1.5 bg-white font-medium text-slate-700 shadow-2xs"
                      defaultValue=""
                    >
                      <option value="" disabled>تغيير الحالة للمحددة...</option>
                      {STATUS_OPTIONS.filter(s => s !== "الكل").map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}

                  {selectedCourierFilter !== "الكل" && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-md text-xs font-bold">
                      <span>فلتر المندوب: {selectedCourierFilter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCourierFilter("الكل")}
                        className="text-blue-700 hover:text-blue-950 font-black mr-1"
                        title="إلغاء الفلترة وعرض الكل"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* زر التبديل بين عرض البطاقات للهاتف وعرض الجدول الكلاسيكي */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-amber-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition ${
                        viewMode === "table"
                          ? "bg-amber-400 text-slate-950 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="عرض الجدول الكلاسيكي"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">جدول</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition ${
                        viewMode === "cards"
                          ? "bg-amber-400 text-slate-950 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="عرض البطاقات الذكية للهاتف"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">بطاقات</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-500 font-semibold">
                    العدد الإجمالي: {totalCount}
                  </span>
                  <button
                    onClick={fetchShipments}
                    className="p-1.5 text-slate-600 hover:text-amber-800 rounded-md hover:bg-amber-100 transition"
                    title="تحديث البيانات"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === "cards" ? (
                /* عرض البطاقات الذكية المتجاوب للهاتف والشاشات الصغيرة */
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                  {displayedShipments.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                      لا توجد شحنات مطابقة للقسم أو الفلتر الحالي
                    </div>
                  ) : (
                    displayedShipments.map((s) => {
                      const isSelected = selectedIds.includes(s.id);
                      const theme = getStatusTheme(s.status, isSelected);
                      const isBaghdad = (s.city || "").includes("بغداد");
                      const isReturned = s.status === "راجع" || s.status === "راجع جزئي";
                      const courierLocked = isCourier && isReturned;

                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border p-4 transition-all duration-200 shadow-sm relative flex flex-col justify-between ${theme.rowBg} ${theme.border} ${
                            isSelected ? "ring-2 ring-amber-500 shadow-md" : "border-slate-200 hover:shadow-md"
                          }`}
                        >
                          <div>
                            {/* شريط رأس البطاقة: التحديد ورقم الوصل والحالة */}
                            <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2.5 mb-2.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedIds((prev) =>
                                      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                                    );
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                                />
                                <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-900 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                  <Barcode className="w-3.5 h-3.5 text-amber-700" />
                                  <span>{s.waybill_number}</span>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs ${theme.badge}`}>
                                {s.status}
                              </span>
                            </div>

                            {/* اسم المتجر وتاريخ الإنشاء المقفل */}
                            <div className="flex items-center justify-between text-xs mb-2">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Building2 className="w-3.5 h-3.5 text-amber-800" />
                                <span>{s.store_name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{new Date(s.created_at).toLocaleDateString("ar-IQ")}</span>
                              </span>
                            </div>

                            {/* بيانات المستلم وأزرار الاتصال المباشر */}
                            <div className="bg-white/85 rounded-xl p-2.5 border border-slate-200 mb-3 space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-800">{s.recipient_name}</span>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${s.recipient_phone}`}
                                    className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
                                    title="اتصال هاتفي بالزبون"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() =>
                                      openWhatsApp(
                                        s.recipient_phone,
                                        `مرحباً ${s.recipient_name}، نود إعلامك بوصول شحنتك رقم ${s.waybill_number} من ${s.store_name}.`
                                      )
                                    }
                                    className="p-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md border border-green-200 transition"
                                    title="مراسلة عبر واتساب"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono" dir="ltr">
                                <span>{s.recipient_phone}</span>
                                <span className="font-sans text-slate-500" dir="rtl">
                                  {s.city} - {s.area}
                                  <span
                                    className={`mr-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                                      isBaghdad ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                                    }`}
                                  >
                                    {isBaghdad ? "داخلي" : "خارجي"}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* شبكة المبالغ المالية الثلاثة */}
                            <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-100/90 rounded-xl text-center mb-3 border border-slate-200/60">
                              <div>
                                <span className="text-[10px] text-slate-500 block">المبلغ الكلي</span>
                                <span className="text-xs font-black text-slate-900 font-mono">
                                  {Number(s.amount).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">التوصيل</span>
                                <span className="text-xs font-semibold text-slate-600 font-mono">
                                  {Number(s.delivery_fee || 5000).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-700 block font-bold">الصافي</span>
                                <span className="text-xs font-black text-emerald-700 font-mono">
                                  {Number(s.net_amount || (s.amount - (s.delivery_fee || 5000))).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* المندوب وملاحظات التأخير / الراجع */}
                            <div className="text-[11px] text-slate-600 mb-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">المندوب:</span>
                                <span className="font-bold text-slate-800">{s.driver_name || "غير محدد"}</span>
                              </div>

                              {(s.hold_reason || s.notes) && (
                                <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-semibold text-[10px]">
                                  {s.hold_reason || s.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* أزرار الإجراءات السريعة أسفل البطاقة */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-black/5 gap-2">
                            <div className="flex items-center gap-1.5">
                              {courierLocked ? (
                                <span
                                  className="p-1.5 text-slate-400 bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1"
                                  title="مقفل بعد التحويل للمخزن"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">مقفل</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => openEditModal(s)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg border border-amber-300 font-bold text-xs transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                              )}

                              {isLeader && isReturned && (
                                <button
                                  onClick={() => handleConfirmWarehouseReceipt(s.id)}
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-900 rounded-lg border border-rose-300 font-bold text-xs transition"
                                  title="تأكيد استلام الطرد بالمخزن"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>استلام</span>
                                </button>
                              )}
                            </div>

                            {isLeader && (
                              <button
                                onClick={() => handleDeleteShipment(s.id, s.waybill_number)}
                                className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                                title="حذف الوصل نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-8">#</th>
                      <th className="p-3">رقم الوصل</th>
                      <th className="p-3">العميل / المتجر</th>
                      <th className="p-3">المستلم والهاتف</th>
                      <th className="p-3">المحافظة والنوع</th>
                      <th className="p-3">المبلغ الكلي</th>
                      <th className="p-3">أجرة التوصيل</th>
                      <th className="p-3">الصافي</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">المندوب</th>
                      <th className="p-3">حالة التأخير / سبب الراجع</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                          جارٍ تحميل البيانات...
                        </td>
                      </tr>
                    ) : displayedShipments.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                          لا توجد طلبات مسجلة في هذا القسم حالياً.
                        </td>
                      </tr>
                    ) : (
                      displayedShipments.map((s) => {
                        const isSelected = selectedIds.includes(s.id);
                        const theme = getStatusTheme(s.status, isSelected);
                        const isBaghdad = (s.city || "").includes("بغداد");
                        const isReturned = s.status === "راجع" || s.status === "راجع جزئي";
                        const courierLocked = isCourier && isReturned;

                        return (
                          <tr key={s.id} className={`transition-colors duration-200 ${theme.rowBg} ${theme.border} ${isSelected ? "ring-1 ring-inset ring-slate-400/25" : ""}`}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                                }}
                                className="rounded-md border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900">{s.waybill_number}</td>
                            <td className="p-3 font-semibold text-slate-800">{s.store_name}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{s.recipient_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{s.recipient_phone}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700">{s.city}</span>
                                <span className={`text-[10px] px-1 py-0.5 rounded font-extrabold border ${
                                  isBaghdad 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                    : "bg-sky-50 text-sky-800 border-sky-200"
                                }`}>
                                  {isBaghdad ? "داخلي" : "خارجي"}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] block">{s.area}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">{Number(s.amount).toLocaleString()} د.ع</td>
                            <td className="p-3 text-slate-600 font-semibold">{Number(s.delivery_fee || 5000).toLocaleString()} د.ع</td>
                            <td className="p-3 font-bold text-emerald-700">
                              {Number(s.net_amount || (s.amount - (s.delivery_fee || 5000))).toLocaleString()} د.ع
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border shadow-xs ${theme.badge}`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700">{s.driver_name || "غير محدد"}</td>
                            <td className="p-3">
                              {s.hold_reason || s.notes ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-semibold max-w-[180px] truncate" title={s.hold_reason || s.notes}>
                                  {s.hold_reason || s.notes}
                                </span>
                              ) : s.is_held ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
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

                                {/* زر التعديل: مفعل للمدير والمحاسب، ومقفل للمندوب إذا كان الطلب راجع */}
                                {courierLocked ? (
                                  <span 
                                    className="p-1 text-slate-400 cursor-not-allowed bg-slate-100 rounded border border-slate-200" 
                                    title="لا يمكن للمندوب تعديل الطلب بعد تحويله إلى راجع للمخزن"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openEditModal(s)}
                                    className="p-1 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 border border-amber-300 transition"
                                    title="تعديل بيانات الوصل"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => openWhatsApp(s.recipient_phone, `مرحباً ${s.recipient_name}، نود إعلامك بوصول شحنتك رقم ${s.waybill_number} من ${s.store_name}.`)}
                                  className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200 transition"
                                  title="مراسلة عبر واتساب"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>

                                {isLeader && isReturned && (
                                  <button
                                    onClick={() => handleConfirmWarehouseReceipt(s.id)}
                                    className="p-1 bg-rose-100 text-rose-900 rounded-lg hover:bg-rose-200 border border-rose-300 transition"
                                    title="تأكيد استلام بالمخزن"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {isLeader && (
                                  <button
                                    onClick={() => handleDeleteShipment(s.id, s.waybill_number)}
                                    className="p-1 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 border border-rose-200 transition"
                                    title="حذف الوصل نهائياً (خاص بالمدير)"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}

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
              )}

              {/* أزرار الصفحات الكلاسيكية */}
              <div className="p-3 border-t border-amber-100 flex items-center justify-between bg-amber-50/20">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-200 rounded text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-amber-50 transition"
                >
                  <ChevronRight className="w-4 h-4" /> السابق
                </button>
                <span className="text-xs font-bold text-slate-600">
                  صفحة {page + 1} من {Math.max(1, Math.ceil(totalCount / pageSize))}
                </span>
                <button
                  disabled={(page + 1) * pageSize >= totalCount}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-200 rounded text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-amber-50 transition"
                >
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. نافذة تعديل الوصل (مع حماية وقت الإنشاء وضبط صلاحيات المدير والمحاسب والمندوب) */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-l from-amber-50 to-white border-b border-amber-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-800" />
                <h3 className="font-bold text-slate-800 text-sm">
                  تعديل الوصل رقم: <span className="font-mono text-amber-900 font-extrabold">{editingShipment.waybill_number}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingShipment(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="font-bold text-slate-600 block mb-1">اسم العميل / المتجر</label>
                <input
                  type="text"
                  value={editFormData.store_name || ""}
                  onChange={(e) => setEditFormData(p => ({ ...p, store_name: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">اسم المستلم</label>
                <input
                  type="text"
                  value={editFormData.recipient_name || ""}
                  onChange={(e) => setEditFormData(p => ({ ...p, recipient_name: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">هاتف المستلم</label>
                <input
                  type="text"
                  value={editFormData.recipient_phone || ""}
                  onChange={(e) => setEditFormData(p => ({ ...p, recipient_phone: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">المحافظة</label>
                <select
                  value={editFormData.city || ""}
                  onChange={(e) => {
                    const chosenCity = e.target.value;
                    const isBaghdad = chosenCity === "بغداد";
                    setEditFormData(p => ({
                      ...p,
                      city: chosenCity,
                      type: isBaghdad ? "داخلية" : "خارجية",
                    }));
                  }}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CITIES.filter(c => c !== "الكل").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-600 block mb-1">المنطقة / العنوان التفصيلي</label>
                <input
                  type="text"
                  value={editFormData.area || ""}
                  onChange={(e) => setEditFormData(p => ({ ...p, area: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* قسم المبالغ: المدير يقدر يعدل أجرة التوصيل، بينما المحاسب والمندوب مقفلة عليهما */}
              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ الكلي (د.ع)</label>
                  <input
                    type="number"
                    value={editFormData.amount ?? 0}
                    onChange={(e) => {
                      const newAmount = Number(e.target.value);
                      const currentFee = Number(editFormData.delivery_fee || 5000);
                      setEditFormData(p => ({
                        ...p,
                        amount: newAmount,
                        net_amount: newAmount - currentFee,
                      }));
                    }}
                    className="w-full p-2 bg-white border border-amber-300 rounded-md font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">أجرة التوصيل</label>
                    {isLeader ? (
                      <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-0.5">
                        <Shield className="w-3 h-3" /> متاح للمدير
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5">
                        <Lock className="w-3 h-3" /> مقفل
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={editFormData.delivery_fee ?? 5000}
                    disabled={!isLeader}
                    onChange={(e) => {
                      if (!isLeader) return;
                      const newFee = Number(e.target.value);
                      const currentAmount = Number(editFormData.amount || 0);
                      setEditFormData(p => ({
                        ...p,
                        delivery_fee: newFee,
                        net_amount: currentAmount - newFee,
                      }));
                    }}
                    className={`w-full p-2 border rounded-md font-bold ${
                      isLeader
                        ? "bg-white border-emerald-400 text-slate-900 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                        : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                    title={isLeader ? "متاح لتعديل المدير فقط" : "تعديل أجرة التوصيل محصور بالمدير فقط ولا يحق للمحاسب أو المندوب تعديله"}
                  />
                </div>

                <div>
                  <label className="font-bold text-emerald-800 block mb-1">المبلغ الصافي (تلقائي)</label>
                  <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-md font-extrabold text-emerald-800">
                    {Number(
                      Number(editFormData.amount || 0) - Number(editFormData.delivery_fee || 5000)
                    ).toLocaleString()} د.ع
                  </div>
                </div>
              </div>

              {/* إذا تم اختيار حالة واصل جزئي: إدخال المبلغ الواصل وحساب الراجع الجزئي تلقائياً */}
              {editFormData.status === "واصل جزئي" && (
                <div className="col-span-2 bg-teal-50 border border-teal-300 p-3 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-teal-900 block">
                      المبلغ المستلم فعلياً (واصل جزئي) *
                    </label>
                    <span className="text-[10px] bg-teal-200 text-teal-950 px-2 py-0.5 rounded-full font-extrabold">
                      حساب تلقائي للراجع
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editFormData.partial_amount ?? (Number(editFormData.amount || 0) / 2)}
                    onChange={(e) => {
                      const partialVal = Number(e.target.value);
                      const totalVal = Number(editFormData.amount || 0);
                      const returnVal = Math.max(0, totalVal - partialVal);
                      setEditFormData(p => ({
                        ...p,
                        partial_amount: partialVal,
                        partial_return_amount: returnVal,
                        notes: `واصل جزئي: ${partialVal.toLocaleString()} د.ع | راجع جزئي: ${returnVal.toLocaleString()} د.ع`
                      }));
                    }}
                    placeholder="أدخل المبلغ المقبوض جزئياً..."
                    className="w-full p-2 bg-white border border-teal-400 rounded-lg font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center justify-between text-xs bg-white/70 p-2 rounded-lg border border-teal-200">
                    <span className="font-bold text-slate-600">المبلغ المتبقي (راجع جزئي - ماروني):</span>
                    <span className="font-black text-[#800020] font-mono">
                      {Number(
                        Math.max(0, Number(editFormData.amount || 0) - Number(editFormData.partial_amount || (Number(editFormData.amount || 0) / 2)))
                      ).toLocaleString()} د.ع
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-600 block mb-1">حالة الوصل</label>
                <select
                  value={editFormData.status || ""}
                  onChange={(e) => setEditFormData(p => ({ ...p, status: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold"
                >
                  {STATUS_OPTIONS.filter(s => s !== "الكل").map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">المندوب المخصص (اختيار تلقائي من المسجلين)</label>
                <select
                  value={editFormData.driver_name || ""}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const matched = availableCouriers.find(c => c.name === chosen);
                    setEditFormData(p => ({
                      ...p,
                      driver_name: chosen,
                      driver_id: matched?.id || p.driver_id,
                    }));
                  }}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- غير مخصص لمندوب --</option>
                  {availableCouriers.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      🚚 {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* إذا تم اختيار حالة راجع: يظهر حقل سبب الراجع إجبارياً */}
              {editFormData.status === "راجع" && (
                <div className="col-span-2 bg-rose-50 border border-rose-300 p-3 rounded-lg space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-rose-900 block">
                      سبب الراجع (إلزامي للتحويل إلى قسم الراجع للمخزن) *
                    </label>
                    {isCourier && (
                      <span className="text-[10px] text-rose-700 font-bold">
                        ⚠️ سيتم قفل الوصل عليك بعد الحفظ
                      </span>
                    )}
                  </div>
                  <select
                    value={RETURN_REASONS.includes(editFormData.return_reason || "") ? editFormData.return_reason : "أخرى (مذكور بالملاحظات)"}
                    onChange={(e) => setEditFormData(p => ({ ...p, return_reason: e.target.value }))}
                    className="w-full p-2 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 font-semibold text-rose-900"
                  >
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    type="text"
                    value={editFormData.return_reason || ""}
                    onChange={(e) => setEditFormData(p => ({ ...p, return_reason: e.target.value }))}
                    placeholder="تفاصيل سبب الراجع الإضافية..."
                    className="w-full p-2 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 text-xs"
                  />
                </div>
              )}

              {/* وقت وتاريخ الإنشاء مقفل بالكامل لحماية السجلات */}
              <div className="col-span-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="font-bold">تاريخ ووقت الوصل (محمي وغير قابل للتعديل):</span>
                </div>
                <span className="font-mono text-slate-700 font-semibold" dir="ltr">
                  {editingShipment.created_at ? new Date(editingShipment.created_at).toLocaleString("ar-IQ") : "—"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/40 border-t border-amber-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingShipment(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. نافذة إضافة طلب جديد */}
      {isCreateOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-l from-amber-50 to-white border-b border-amber-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-800" />
                <h3 className="font-bold text-slate-800 text-sm">إضافة طلب وشحنة جديدة</h3>
              </div>
              <button
                onClick={() => setIsCreateOrderOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="font-bold text-slate-600 block mb-1">رقم الوصل (اختياري)</label>
                <input
                  type="text"
                  value={newOrder.waybill_number}
                  onChange={(e) => setNewOrder(p => ({ ...p, waybill_number: e.target.value }))}
                  placeholder="توليد تلقائي إذا تُرك فارغاً..."
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">اسم العميل / المتجر *</label>
                <input
                  type="text"
                  value={newOrder.store_name}
                  onChange={(e) => setNewOrder(p => ({ ...p, store_name: e.target.value }))}
                  placeholder="اسم المتجر أو البيج..."
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">اسم المستلم *</label>
                <input
                  type="text"
                  value={newOrder.recipient_name}
                  onChange={(e) => setNewOrder(p => ({ ...p, recipient_name: e.target.value }))}
                  placeholder="اسم الزبون..."
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">هاتف المستلم *</label>
                <input
                  type="text"
                  value={newOrder.recipient_phone}
                  onChange={(e) => setNewOrder(p => ({ ...p, recipient_phone: e.target.value }))}
                  placeholder="07XXXXXXXXX"
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">المحافظة</label>
                <select
                  value={newOrder.city}
                  onChange={(e) => {
                    const c = e.target.value;
                    const isBaghdad = c === "بغداد";
                    setNewOrder(p => ({
                      ...p,
                      city: c,
                      type: isBaghdad ? "داخلية" : "خارجية",
                      delivery_fee: isLeader ? p.delivery_fee : (isBaghdad ? 5000 : 6000),
                    }));
                  }}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg"
                >
                  {CITIES.filter(c => c !== "الكل").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">نوع الطلب (داخلي / خارجي)</label>
                <div className="p-2 bg-amber-50/50 border border-amber-200 rounded-lg font-bold text-amber-900">
                  {newOrder.city === "بغداد" ? "داخلية (بغداد)" : "خارجية (المحافظات)"}
                </div>
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-600 block mb-1">المنطقة / العنوان التفصيلي</label>
                <input
                  type="text"
                  value={newOrder.area}
                  onChange={(e) => setNewOrder(p => ({ ...p, area: e.target.value }))}
                  placeholder="المنطقة، أقرب نقطة دالة..."
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg"
                />
              </div>

              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ الكلي (د.ع)</label>
                  <input
                    type="number"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full p-2 bg-white border border-amber-300 rounded-md font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    أجرة التوصيل {isLeader ? "(متاح للمدير)" : "(مقفل)"}
                  </label>
                  <input
                    type="number"
                    value={newOrder.delivery_fee}
                    disabled={!isLeader}
                    onChange={(e) => setNewOrder(p => ({ ...p, delivery_fee: Number(e.target.value) }))}
                    className={`w-full p-2 border rounded-md font-bold ${
                      isLeader
                        ? "bg-white border-emerald-400 text-slate-900"
                        : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold text-emerald-800 block mb-1">الصافي المتوقع</label>
                  <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-md font-extrabold text-emerald-800">
                    {(Number(newOrder.amount || 0) - Number(newOrder.delivery_fee || 5000)).toLocaleString()} د.ع
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">الحالة المبدئية</label>
                <select
                  value={newOrder.status}
                  onChange={(e) => setNewOrder(p => ({ ...p, status: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg font-semibold"
                >
                  <option value="قيد التنفيذ">قيد التنفيذ</option>
                  <option value="غير مؤكد">غير مؤكد</option>
                  <option value="ب. مندوب الاستلام">ب. مندوب الاستلام</option>
                  <option value="بحوزة المندوب">بحوزة المندوب</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">المندوب المخصص (اختياري مع رقم الهاتف)</label>
                <select
                  value={newOrder.driver_name}
                  onChange={(e) => setNewOrder(p => ({ ...p, driver_name: e.target.value }))}
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- اختر المندوب من القائمة --</option>
                  {availableCouriers.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      🚚 {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-600 block mb-1">ملاحظات الطلب</label>
                <input
                  type="text"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder(p => ({ ...p, notes: e.target.value }))}
                  placeholder="ملاحظات التوصيل أو البضاعة..."
                  className="w-full p-2 bg-amber-50/30 border border-amber-200 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50/40 border-t border-amber-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreateOrderOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateOrder}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء وحفظ الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
