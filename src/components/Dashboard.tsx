import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Archive, Barcode, Download, Layers, LogOut, MessageSquare, 
  Package, Search, ShieldCheck, Truck, TrendingUp, Users, 
  AlertTriangle, Plus, Clock, RotateCcw, FileSpreadsheet, 
  Building2, UserX, Send, Check, ChevronRight, ChevronLeft, 
  CalendarDays, Menu, X 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cloudError } from "@/lib/cloud-errors";
import { fetchPage, exportPages, PAGE_SIZE, type Shipment, type ShipmentFilter, type ShipmentTab } from "@/lib/shipments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadIdentity } from "@/lib/leader-guard";
import { toShipmentTab, normalizeBarcode, canManageStaff, type Role } from "@/lib/access";

type Tab = ShipmentTab | "comments" | "stickers" | "users" | "schedule";
const ROLE_LABELS: Record<Role, string> = { leader: "قائد", accountant: "محاسب", courier: "مندوب" };
const ROLES: Role[] = ["courier", "accountant", "leader"];
const STATUSES = ["غير مؤكد", "ب. مندوب الاستلام", "قيد التنفيذ", "بحوزة المندوب", "مؤجل", "تم التسليم", "راجع"];
const COURIER_STATUSES = ["بحوزة المندوب", "مؤجل", "تم التسليم", "راجع"];
const CITIES = ["الكل", "بغداد", "البصرة", "أربيل", "النجف", "كربلاء", "نينوى", "السليمانية", "بابل", "ديالى", "كركوك", "ذي قار"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const tabs: { id: Tab; label: string; icon: ReactNode; roles: Role[] }[] = [
  { id: "home", label: "الرئيسية", icon: <TrendingUp className="size-4" />, roles: ROLES },
  { id: "mine", label: "شحناتي", icon: <Truck className="size-4" />, roles: ["courier"] },
  { id: "search", label: "البحث المتقدم", icon: <Search className="size-4" />, roles: ["leader", "accountant"] },
  { id: "unconfirmed", label: "طلبات غير مؤكدة", icon: <AlertTriangle className="size-4" />, roles: ["leader"] },
  { id: "pickup", label: "مندوب الاستلام", icon: <Truck className="size-4" />, roles: ["leader", "courier"] },
  { id: "internal", label: "طلبات داخلية", icon: <Package className="size-4" />, roles: ["leader", "courier"] },
  { id: "external", label: "طلبات خارجية", icon: <Truck className="size-4" />, roles: ["leader", "courier"] },
  { id: "waiting", label: "قيد الانتظار", icon: <Clock className="size-4" />, roles: ["leader", "courier"] },
  { id: "archives", label: "الأرشيف", icon: <Archive className="size-4" />, roles: ["leader", "accountant"] },
  { id: "late", label: "طلبات متأخرة", icon: <RotateCcw className="size-4" />, roles: ["leader", "accountant"] },
  { id: "comments", label: "الردود والملاحظات", icon: <MessageSquare className="size-4" />, roles: ["leader", "courier"] },
  { id: "lists", label: "كشوفات الحساب", icon: <FileSpreadsheet className="size-4" />, roles: ["leader", "accountant"] },
  { id: "branches", label: "تعديلات الفروع", icon: <Building2 className="size-4" />, roles: ["leader"] },
  { id: "inactive", label: "عملاء غير فعالين", icon: <UserX className="size-4" />, roles: ["leader"] },
  { id: "stickers", label: "توليد وصولات", icon: <Layers className="size-4" />, roles: ["leader"] },
  { id: "verification", label: "قيد التحقق", icon: <ShieldCheck className="size-4" />, roles: ["leader", "courier"] },
  { id: "schedule", label: "مواعيد العمل", icon: <CalendarDays className="size-4" />, roles: ["leader"] },
  { id: "users", label: "إدارة الموظفين", icon: <Users className="size-4" />, roles: ["leader"] },
];

function whatsapp(phone: string, text: string) {
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("0") ? `964${clean.slice(1)}` : clean;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
}

function explain(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : cloudError(fallback, err);
  toast.error(msg);
}

export function Dashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [city, setCity] = useState("الكل");
  const [selected, setSelected] = useState<string[]>([]);
  const [barcode, setBarcode] = useState("");
  const [exporting, setExporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const me = useQuery({ queryKey: ["me"], queryFn: loadIdentity });
  const role = me.data?.role;
  const manager = role === "leader" || role === "accountant";

  const shipmentTab = toShipmentTab(tab);
  const filter: ShipmentFilter = { tab: shipmentTab, page, query, store, city, courierId: me.data?.id };

  const list = useQuery({
    queryKey: ["shipment-page", filter],
    queryFn: () => fetchPage(filter),
    enabled: Boolean(role && !["home", "comments", "stickers", "users", "schedule", "inactive"].includes(tab)),
  });

  const stats = useQuery({
    queryKey: ["shipment-stats"],
    queryFn: async () => {
      const states = ["غير مؤكد", "قيد التنفيذ", "تم التسليم", "راجع"];
      const results = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact", head: true }),
        ...states.map((status) => supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", status))
      ]);
      return {
        total: results[0].count ?? 0,
        unconfirmed: results[1].count ?? 0,
        transit: results[2].count ?? 0,
        delivered: results[3].count ?? 0,
        returned: results[4].count ?? 0,
      };
    },
    enabled: tab === "home",
  });

  const couriers = useQuery({
    queryKey: ["couriers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "courier");
      return data ?? [];
    },
    enabled: manager,
  });

  const mutate = useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: Record<string, unknown> }) => {
      const { error } = await supabase.from("shipments").update(changes).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment-page"] });
      qc.invalidateQueries({ queryKey: ["shipment-stats"] });
      setSelected([]);
      toast.success("تم تحديث الشحنات بنجاح");
    },
    onError: (err) => explain(err, "shipment-update"),
  });

  const rows = list.data?.rows ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["shipment-page"] }); qc.invalidateQueries({ queryKey: ["shipment-stats"] }); };
  const changeTab = (t: Tab) => { setTab(t); setPage(0); setSelected([]); setMobileMenuOpen(false); };

  const scan = async (e: FormEvent) => { 
    e.preventDefault(); 
    const code = normalizeBarcode(barcode); 
    if (!code) return;
    const { data, error } = await supabase.from("shipments").select("id").eq("waybill_number", code).maybeSingle();
    if (error) explain(error, "scan"); 
    else if (data) { 
      setSelected((prev) => prev.includes(data.id) ? prev : [...prev, data.id]); 
      toast.success(`تم تحديد الوصل ${code}`); 
    } else toast.error("الوصل غير موجود أو غير متاح لك"); 
    setBarcode("");
  };

  const logout = async () => { 
    await qc.cancelQueries(); 
    qc.clear(); 
    await supabase.auth.signOut(); 
    window.location.reload(); 
  };

  const download = async () => { 
    setExporting(true); 
    try { 
      const ok = await exportPages(filter, tab === "lists" ? "settlement-shujaa.csv" : "shipments-shujaa.csv"); 
      if (!ok) toast.error("لا توجد بيانات للتصدير"); 
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : cloudError("export", e)); 
    } finally { 
      setExporting(false); 
    } 
  };

  const shown = tabs.filter((t) => role && t.roles.includes(role) && (t.id !== "users" || canManageStaff(role)));
  useEffect(() => { if (role && !shown.some((item) => item.id === tab)) changeTab("home"); }, [role]);

  if (me.isPending) return <p className="p-10 text-center text-muted-foreground">جارٍ التحميل...</p>;
  if (me.isError) return <div className="p-10 text-center"><p>تعذّر التحقق من الحساب.</p><Button onClick={() => qc.invalidateQueries({ queryKey: ["me"] })}>إعادة المحاولة</Button></div>;
  if (!role) return <div className="p-10 text-center space-y-4"><p>لا توجد صلاحية مرتبطة بحسابك. تواصل مع القائد.</p><Button onClick={logout}>خروج</Button></div>;

  const visibleTable = !["home", "comments", "stickers", "users", "schedule", "inactive"].includes(tab);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans pb-16">
      {/* هيدر الصفحة */}
      <header className="border-b-2 border-border bg-primary px-4 py-4 md:px-8">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* زر القائمة للشاشات الصغيرة */}
            <button 
              type="button" 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="size-6" />
            </button>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-primary-foreground/75">نظام التشغيل الموحد</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary-foreground">منصة الشجاع</h1>
              <p className="text-xs text-primary-foreground/80">{me.data?.name} · {ROLE_LABELS[role]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={scan} className="hidden sm:flex items-center gap-2 border border-primary-foreground/30 bg-card p-1.5 rounded">
              <Barcode className="size-5 text-muted-foreground" />
              <Input 
                aria-label="رقم الوصل" 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)} 
                placeholder="مسح باركود أو رقم وصل" 
                className="w-36 border-0 bg-transparent shadow-none sm:w-48 text-xs" 
              />
              <Button type="submit" size="sm" variant="secondary">تحديد</Button>
            </form>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="size-4" /> <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* القائمة الجانبية السلسة للهواتف (Drawer) */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* خلفية معتمة ناعمة */}
        <div 
          onClick={() => setMobileMenuOpen(false)} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        />

        {/* جسم القائمة المنزلق من اليمين */}
        <aside 
          className={`absolute top-0 right-0 h-full w-[280px] max-w-[85vw] bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* رأس القائمة */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">ش</div>
              <span className="font-extrabold text-sm">أنظمة منصة الشجاع</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* باركود البحث السريع بالموبايل */}
          <div className="p-3 border-b border-border sm:hidden">
            <form onSubmit={scan} className="flex items-center gap-1.5 bg-muted/50 p-1 rounded border border-border">
              <Barcode className="size-4 text-muted-foreground mr-1" />
              <input 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)} 
                placeholder="مسح باركود..." 
                className="w-full bg-transparent text-xs outline-none" 
              />
              <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs px-2">تحديد</Button>
            </form>
          </div>

          {/* التبويبات */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {shown.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm font-bold" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className={`${active ? "text-primary-foreground" : "text-muted-foreground"}`}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* أسفل القائمة: زر الخروج */}
          <div className="p-3 border-t border-border bg-muted/20">
            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive gap-2">
              <LogOut className="size-4" /> خروج من النظام
            </Button>
          </div>
        </aside>
      </div>

      {/* محتوى الصفحة الرئيسي */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-8">
        {/* شريط الأقسام لشاشات الكمبيوتر فقط */}
        <nav aria-label="أقسام النظام" className="mb-6 hidden lg:flex gap-1 overflow-x-auto border-b-2 border-border pb-2 flex-wrap">
          {shown.map((t) => (
            <Button 
              key={t.id} 
              type="button" 
              variant={tab === t.id ? "default" : "ghost"} 
              size="sm" 
              onClick={() => changeTab(t.id)} 
              className="shrink-0 gap-2 font-medium"
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </nav>

        {/* عنوان القسم الحالي وزر تبديل بالموبايل */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold">{tabs.find((t) => t.id === tab)?.label}</h2>
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-xs text-primary underline underline-offset-4 mr-2"
            >
              (تغيير القسم)
            </button>
          </div>
          {visibleTable && <span className="text-xs sm:text-sm text-muted-foreground">{(list.data?.count ?? 0).toLocaleString("ar-IQ")} طلب</span>}
        </div>

        {tab === "home" && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              ["إجمالي الشحنات", stats.data?.total], 
              ["غير مؤكدة", stats.data?.unconfirmed], 
              ["قيد التوصيل", stats.data?.transit], 
              ["تم التسليم", stats.data?.delivered], 
              ["راجع", stats.data?.returned]
            ].map(([label, count]) => (
              <div key={String(label)} className="border border-border bg-card p-4 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl sm:text-3xl font-extrabold">{count ?? "—"}</p>
              </div>
            ))}
            {stats.isError && <ErrorRetry onRetry={() => qc.invalidateQueries({ queryKey: ["shipment-stats"] })} />}
          </div>
        )}

        {tab === "search" && (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <Field label="كلمة البحث (رقم الوصل، الاسم، الهاتف)">
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="ابحث هنا..." />
            </Field>
            <Field label="اسم المتجر">
              <Input value={store} onChange={(e) => { setStore(e.target.value); setPage(0); }} placeholder="اسم المتجر" />
            </Field>
            <Field label="المحافظة">
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm w-full" value={city} onChange={(e) => { setCity(e.target.value); setPage(0); }}>
                {CITIES.map((c) => <option key={c} value={c}>{c === "الكل" ? "كل المحافظات" : c}</option>)}
              </select>
            </Field>
          </div>
        )}

        {tab === "late" && <p className="mb-4 text-sm text-muted-foreground">يُحتسب التأخير وفق ساعات العمل والعطل وفترات التعليق المسجلة.</p>}
        {tab === "stickers" && <StickerForm onDone={() => { refresh(); changeTab("unconfirmed"); }} />}
        {tab === "comments" && <Comments />}
        {tab === "users" && <StaffView />}
        {tab === "schedule" && <Schedule />}
        {tab === "inactive" && <p className="border border-border bg-card p-8 text-center text-muted-foreground">لا يوجد سجل مستقل للعملاء في النظام حالياً.</p>}
        {tab === "lists" && <p className="mb-4 text-sm text-muted-foreground">الوصولات المسلّمة والراجعة؛ يشمل التصدير جميع الصفحات.</p>}
        {tab === "branches" && <p className="mb-4 text-sm text-muted-foreground">الشحنات المرتبطة بالفروع. لتعديل الفرع استخدم الإجراء في صف الشحنة.</p>}

        {visibleTable && (
          <section aria-label="قائمة الطلبات" className="border border-border bg-card rounded-lg overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 bg-muted/10">
              <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((s) => s.id))}>
                {selected.length === rows.length && rows.length ? "إلغاء تحديد الصفحة" : "تحديد الصفحة"}
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground">{selected.length} محددة</span>
              <select 
                aria-label="تغيير حالة المحدد" 
                className="border border-input bg-background rounded-md px-2 py-1 text-xs" 
                value="" 
                disabled={!selected.length || mutate.isPending} 
                onChange={(e) => { if (e.target.value) mutate.mutate({ ids: selected, changes: { status: e.target.value } }); }}
              >
                <option value="">تغيير الحالة...</option>
                {(manager ? STATUSES : COURIER_STATUSES).map((s) => <option key={s}>{s}</option>)}
              </select>
              {manager && tab === "verification" && (
                <Button size="sm" variant="secondary" disabled={!selected.length || mutate.isPending} onClick={() => mutate.mutate({ ids: selected, changes: { verified: true } })}>
                  تأكيد التحقق
                </Button>
              )}
              <Button className="mr-auto" size="sm" variant="outline" disabled={exporting} onClick={download}>
                <Download className="size-4" /> {exporting ? "جارٍ التصدير..." : "تصدير CSV"}
              </Button>
            </div>

            {list.isError ? (
              <ErrorRetry onRetry={() => qc.invalidateQueries({ queryKey: ["shipment-page"] })} />
            ) : list.isPending ? (
              <p className="p-12 text-center text-muted-foreground">جارٍ تحميل الطلبات...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[990px] text-right text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>{["", "رقم الوصل", "المتجر", "المستلم والهاتف", "العنوان", "المبلغ", "الحالة", "المندوب / الفرع", "إجراءات"].map((h, i) => <th key={i} scope="col" className="p-3 font-bold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {!rows.length && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">لا توجد بيانات أو طلبات مسجلة في هذا القسم.</td></tr>}
                    {rows.map((s) => (
                      <tr key={s.id} className="border-t border-border align-top hover:bg-secondary/50">
                        <td className="p-3"><input type="checkbox" aria-label={`تحديد الوصل ${s.waybill_number}`} checked={selected.includes(s.id)} onChange={() => setSelected((prev) => prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id])} className="accent-primary size-4" /></td>
                        <td className="p-3 font-bold"><span className="font-mono">{s.waybill_number}</span><span className="block text-xs font-normal text-muted-foreground">{s.type}</span></td>
                        <td className="max-w-36 break-words p-3">{s.store_name}</td>
                        <td className="p-3"><span className="block">{s.recipient_name}</span><span dir="ltr" className="block text-right text-xs text-muted-foreground">{s.recipient_phone}</span></td>
                        <td className="p-3">{s.city}<span className="block text-xs text-muted-foreground">{s.area}</span></td>
                        <td className="p-3 tabular-nums">{Number(s.amount).toLocaleString("ar-IQ")} د.ع</td>
                        <td className="p-3"><span className="border border-border bg-accent px-2 py-1 text-xs text-accent-foreground rounded">{s.status}</span></td>
                        <td className="p-3">
                          {manager ? (
                            <>
                              <select aria-label={`مندوب الوصل ${s.waybill_number}`} className="border border-input bg-background rounded px-2 py-1 max-w-36 text-xs" value={s.driver_id ?? ""} onChange={(e) => mutate.mutate({ ids: [s.id], changes: { driver_id: e.target.value || null } })}>
                                <option value="">بدون مندوب</option>
                                {couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                              </select>
                              <span className="block text-xs text-muted-foreground">{s.branch_name || "—"}</span>
                            </>
                          ) : s.branch_name || "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {manager && s.status === "غير مؤكد" && (
                              <Button size="icon" variant="outline" title="تأكيد الطلب" aria-label="تأكيد الطلب" onClick={() => mutate.mutate({ ids: [s.id], changes: { status: "قيد التنفيذ" } })}>
                                <Check className="size-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="outline" title="مراسلة عبر واتساب" aria-label="مراسلة عبر واتساب" onClick={() => whatsapp(s.recipient_phone, `مرحباً ${s.recipient_name}، بخصوص شحنتك رقم ${s.waybill_number} من متجر ${s.store_name}`)}>
                              <Send className="size-4" />
                            </Button>
                            {manager && <HoldButton shipment={s} onDone={refresh} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border p-3 bg-muted/5">
              <Button variant="outline" size="sm" disabled={!page} onClick={() => { setPage((p) => p - 1); setSelected([]); }}>
                <ChevronRight className="size-4" /> السابق
              </Button>
              <span className="text-xs sm:text-sm">صفحة {page + 1} من {Math.max(1, Math.ceil((list.data?.count ?? 0) / PAGE_SIZE))}</span>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= (list.data?.count ?? 0)} onClick={() => { setPage((p) => p + 1); setSelected([]); }}>
                التالي <ChevronLeft className="size-4" />
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ErrorRetry({ onRetry }: { onRetry: () => void }) { 
  return <div className="p-8 text-center"><p className="mb-3 text-destructive">تعذّر تحميل البيانات. تحقق من الاتصال.</p><Button variant="outline" onClick={onRetry}>إعادة المحاولة</Button></div>; 
}

function Field({ label, children }: { label: string; children: ReactNode }) { 
  return <label className="space-y-1 text-sm font-bold block"><span>{label}</span>{children}</label>; 
}

function HoldButton({ shipment, onDone }: { shipment: Shipment; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const add = async () => { 
    const reason = prompt("سبب التعليق المبرر"); 
    if (!reason?.trim()) return; 
    setBusy(true);
    const { error } = await supabase.from("shipment_holds").insert({ shipment_id: shipment.id, reason: reason.trim().slice(0, 500), started_at: new Date().toISOString() });
    setBusy(false); 
    if (error) explain(error, "hold-start"); 
    else { toast.success("بدأ تعليق الشحنة"); onDone(); }
  };
  return <Button disabled={busy} size="sm" variant="ghost" onClick={add}>تعليق</Button>;
}

function StickerForm({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(5); 
  const [store, setStore] = useState(""); 
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { 
    e.preventDefault(); 
    const n = Math.min(Math.max(Number(count) || 1, 1), 100); 
    if (!store.trim()) return void toast.error("أدخل اسم المتجر");
    const base = crypto.randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "0"); 
    setBusy(true);
    const { error } = await supabase.from("shipments").insert(Array.from({ length: n }, (_, i) => ({ waybill_number: `${base}-${String(i + 1).padStart(3, "0")}`, store_name: store.trim().slice(0, 100) })));
    setBusy(false); 
    if (error) explain(error, "waybill-create"); 
    else { toast.success(`تم توليد ${n} وصولات`); onDone(); }
  };
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 border border-border bg-card p-5 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold">توليد وصولات جديدة</h3>
      <Field label="اسم المتجر"><Input required maxLength={100} value={store} onChange={(e) => setStore(e.target.value)} /></Field>
      <Field label="العدد"><Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
      <Button disabled={busy} className="gap-2"><Plus className="size-4" /> توليد الآن</Button>
    </form>
  );
}

function Comments() {
  const qc = useQueryClient(); 
  const [waybill, setWaybill] = useState(""); 
  const [issue, setIssue] = useState(""); 
  const [busy, setBusy] = useState(false);
  const list = useQuery({ 
    queryKey: ["comments"], 
    queryFn: async () => { 
      const { data, error } = await supabase.from("shipment_comments").select("*").order("created_at", { ascending: false }).limit(50); 
      if (error) throw error; 
      return data ?? []; 
    } 
  });
  const add = async (e: FormEvent) => { 
    e.preventDefault(); 
    if (!waybill.trim() || !issue.trim()) return; 
    setBusy(true);
    const { data: u } = await supabase.auth.getUser(); 
    if (!u.user) { setBusy(false); return toast.error("يجب تسجيل الدخول"); }
    const { error } = await supabase.from("shipment_comments").insert({ 
      waybill_number: waybill.trim(), 
      issue: issue.trim().slice(0, 1000), 
      author_id: u.user.id 
    }); 
    setBusy(false);
    if (error) explain(error, "comment-create"); 
    else { 
      setWaybill(""); 
      setIssue(""); 
      qc.invalidateQueries({ queryKey: ["comments"] }); 
      toast.success("تم تسجيل الملاحظة"); 
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap gap-2 border border-border bg-card p-4 rounded-lg shadow-sm">
        <Input required className="w-full sm:w-44" placeholder="رقم الوصل" value={waybill} onChange={(e) => setWaybill(e.target.value)} />
        <Input required className="min-w-56 flex-1" placeholder="الملاحظة" value={issue} onChange={(e) => setIssue(e.target.value)} />
        <Button disabled={busy}>إضافة ملاحظة</Button>
      </form>
      {list.data?.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 border border-border bg-card p-3 rounded-lg shadow-sm">
          <b>وصل #{c.waybill_number}</b>
          <span className="min-w-0 flex-1">{c.issue}</span>
          <span className="text-xs text-muted-foreground">{c.status}</span>
        </div>
      ))}
    </div>
  );
}

function StaffView() {
  const qc = useQueryClient();
  const staff = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    }
  });

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border border border-border bg-card rounded-lg overflow-hidden shadow-sm">
        {staff.data?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between p-3 gap-2">
            <div>
              <p className="font-bold">{s.full_name || "بدون اسم"}</p>
              <p className="text-xs text-muted-foreground">{s.phone || s.username || "—"}</p>
            </div>
            <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">{ROLE_LABELS[s.role as Role] || s.role}</span>
          </div>
        ))}
        {staff.data?.length === 0 && <p className="p-8 text-center text-muted-foreground">لا يوجد موظفون مسجلون.</p>}
      </div>
    </div>
  );
}

function Schedule() {
  return (
    <div className="border border-border bg-card p-6 rounded-lg text-center text-muted-foreground">
      نظام احتساب أوقات الدوام والعطل يعمل تلقائياً وفق إعدادات القائد المسجلة في النظام.
    </div>
  );
}
