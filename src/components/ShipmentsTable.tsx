import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Download,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export interface Shipment {
  id: string;
  waybill_number: string;
  order_number?: string;
  list_number?: string;
  store_name?: string;
  recipient_name?: string;
  recipient_phone?: string;
  city?: string;
  area?: string;
  amount?: number;
  delivery_fee?: number;
  status?: string;
  notes?: string;
  created_at?: string;
  verified?: boolean;
  driver_name?: string;
}

export interface ShipmentsTableProps {
  mode?: "search" | "internal" | "external" | "unconfirmed" | "pickup" | "waiting" | "archives" | "late" | "default";
  systemTitle?: string;
  filterStatus?: string;
  filterCityType?: string;
  filterLateOnly?: boolean;
}

export function ShipmentsTable({
  mode = "default",
  systemTitle = "إدارة الشحنات",
  filterStatus,
  filterCityType,
  filterLateOnly,
}: ShipmentsTableProps) {
  // بيانات الشحنات
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // التحديد الجماعي
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ترقيم الصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 1. مدخلات البحث الموسع (المطابق لشاشة البحث في الرائد)
  const [searchFromDate, setSearchFromDate] = useState("");
  const [searchToDate, setSearchToDate] = useState("");
  const [searchDriver, setSearchDriver] = useState("");
  const [searchListNo, setSearchListNo] = useState("");
  const [searchOrderNo, setSearchOrderNo] = useState("");
  const [searchWaybill, setSearchWaybill] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProvince, setSearchProvince] = useState("");

  // 2. مدخلات شريط الباركود والحالات (لشاشات الداخلية والخارجية)
  const [activeSubStatus, setActiveSubStatus] = useState<string>("الكل");
  const [barcodeInput, setBarcodeInput] = useState("");

  // 3. مدخلات الطلبات المتأخرة
  const [lateDays, setLateDays] = useState("1");
  const [lateClient, setLateClient] = useState("");

  // جلب الشحنات من Supabase بأمان تام
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      setShipments(data || []);
    } catch (err: any) {
      setErrorMsg("تعذر تحميل البيانات من السيرفر: " + (err.message || "خطأ غير معروف"));
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // فلترة الشحنات حسب النظام والمدخلات
  const filteredShipments = useMemo(() => {
    let result = shipments || [];

    // شاشة الطلبات الداخلية والخارجية
    if (filterCityType === "داخلية") {
      result = result.filter((s) => (s.city || "").includes("بغداد") || (s.area || "").includes("بغداد"));
    } else if (filterCityType === "خارجية") {
      result = result.filter((s) => !(s.city || "").includes("بغداد"));
    }

    // شاشة غير مؤكد أو الاستلام أو الأرشيف
    if (filterStatus) {
      result = result.filter((s) => (s.status || "") === filterStatus);
    }

    // فلترة شريط الحالات العلوي
    if (activeSubStatus !== "الكل") {
      result = result.filter((s) => (s.status || "").includes(activeSubStatus));
    }

    // فلترة شاشة البحث الموسع
    if (mode === "search") {
      if (searchWaybill.trim()) {
        result = result.filter((s) => (s.waybill_number || "").includes(searchWaybill.trim()));
      }
      if (searchOrderNo.trim()) {
        result = result.filter((s) => (s.order_number || "").includes(searchOrderNo.trim()));
      }
      if (searchCustomer.trim()) {
        result = result.filter(
          (s) =>
            (s.recipient_name || "").includes(searchCustomer.trim()) ||
            (s.recipient_phone || "").includes(searchCustomer.trim())
        );
      }
      if (searchProvince.trim()) {
        result = result.filter((s) => (s.city || "").includes(searchProvince.trim()));
      }
      if (searchDriver.trim()) {
        result = result.filter((s) => (s.driver_name || "").includes(searchDriver.trim()));
      }
      if (searchListNo.trim()) {
        result = result.filter((s) => (s.list_number || "").includes(searchListNo.trim()));
      }
    }

    // فلترة الطلبات المتأخرة
    if (filterLateOnly || mode === "late") {
      const days = parseInt(lateDays) || 1;
      const now = new Date().getTime();
      result = result.filter((s) => {
        if (!s.created_at) return false;
        const diffDays = (now - new Date(s.created_at).getTime()) / (1000 * 3600 * 24);
        return diffDays >= days && s.status !== "تم التسليم" && s.status !== "راجع";
      });
      if (lateClient.trim()) {
        result = result.filter((s) => (s.store_name || "").includes(lateClient.trim()));
      }
    }

    return result;
  }, [
    shipments,
    filterCityType,
    filterStatus,
    activeSubStatus,
    mode,
    searchWaybill,
    searchOrderNo,
    searchCustomer,
    searchProvince,
    searchDriver,
    searchListNo,
    filterLateOnly,
    lateDays,
    lateClient,
  ]);

  // إدارة التحديد
  const toggleSelectAll = () => {
    if ((selectedIds || []).length === (filteredShipments || []).length) {
      setSelectedIds([]);
    } else {
      setSelectedIds((filteredShipments || []).map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // إدخال باركود سريع
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = (shipments || []).find((s) => s.waybill_number === barcodeInput.trim());
    if (match) {
      if (!selectedIds.includes(match.id)) {
        setSelectedIds((prev) => [...prev, match.id]);
      }
      alert(`تم تحديد الشحنة برقم وصل: ${match.waybill_number}`);
    } else {
      alert("رقم الوصل غير موجود بالنظام");
    }
    setBarcodeInput("");
  };

  // تصدير CSV
  const handleExportCSV = () => {
    const dataToExport =
      selectedIds.length > 0
        ? filteredShipments.filter((s) => selectedIds.includes(s.id))
        : filteredShipments;

    if (dataToExport.length === 0) {
      alert("لا توجد بيانات لتصديرها");
      return;
    }

    const headers = ["رقم الوصل", "المتجر", "الزبون", "الهاتف", "المحافظة", "المبلغ", "أجرة التوصيل", "الحالة"];
    const rows = dataToExport.map((s) => [
      s.waybill_number,
      s.store_name || "",
      s.recipient_name || "",
      s.recipient_phone || "",
      s.city || "",
      s.amount || 0,
      s.delivery_fee || 0,
      s.status || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `شحنات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // حساب الصفحات
  const totalItems = (filteredShipments || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = (filteredShipments || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4" dir="rtl">
      {mode !== "search" && mode !== "late" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-bold text-slate-800">{systemTitle}</div>
        </div>
      )}

      {/* 1. أدوات ترويسة شاشة "البحث" (مطابقة لصورة postsearch_wasl.php) */}
      {mode === "search" && (
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-4">
          <div className="text-sm font-bold text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-2">
            <Search className="w-4 h-4 text-amber-600" />
            <span>البحث المتقدم الشامل عن الشحنات</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">من تاريخ</label>
              <input
                type="date"
                value={searchFromDate}
                onChange={(e) => setSearchFromDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={searchToDate}
                onChange={(e) => setSearchToDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">المندوب</label>
              <input
                type="text"
                placeholder="اسم المندوب"
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">المحافظة</label>
              <input
                type="text"
                placeholder="بغداد، البصرة..."
                value={searchProvince}
                onChange={(e) => setSearchProvince(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">رقم الوصل</label>
              <input
                type="text"
                placeholder="رقم الوصل"
                value={searchWaybill}
                onChange={(e) => setSearchWaybill(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">رقم الطلب</label>
              <input
                type="text"
                placeholder="رقم الطلب"
                value={searchOrderNo}
                onChange={(e) => setSearchOrderNo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">رقم القائمة / الكشف</label>
              <input
                type="text"
                placeholder="رقم الكشف"
                value={searchListNo}
                onChange={(e) => setSearchListNo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">اسم أو هاتف الزبون</label>
              <input
                type="text"
                placeholder="محمد / 078..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setSearchFromDate("");
                setSearchToDate("");
                setSearchDriver("");
                setSearchProvince("");
                setSearchWaybill("");
                setSearchOrderNo("");
                setSearchListNo("");
                setSearchCustomer("");
              }}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              تفريغ الحقول
            </button>
            <button
              onClick={fetchShipments}
              className="px-6 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition shadow-sm"
            >
              بحث
            </button>
          </div>
        </div>
      )}

      {/* 2. أدوات شاشات (الداخلية / الخارجية / غير المؤكد / الاستلام) مطابقة للرائد */}
      {mode !== "search" && mode !== "late" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          {/* شريط المراحل الأفقي */}
          <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
            {[
              "الكل",
              "غير مؤكد",
              "ب. مندوب الاستلام",
              "قيد التنفيذ",
              "بحوزة المندوب",
              "تم التسليم",
              "راجع",
            ].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setActiveSubStatus(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSubStatus === st
                    ? "bg-amber-400 text-amber-950 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* سطر الباركود السريع + العدادات */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">باركود:</span>
              <input
                type="text"
                placeholder="امسح بالباركود ثم اضغط Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="px-3 py-1.5 text-xs border border-amber-300 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </form>

            <div className="flex items-center gap-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-amber-950 font-bold">
                العدد الكلي: <span className="font-mono">{totalItems}</span> | المحدد:{" "}
                <span className="font-mono text-amber-700">{selectedIds.length}</span>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition border border-slate-300"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>تصدير Excel/CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. أدوات شاشة "الطلبات المتأخرة" (مطابقة لصورة search_late.php) */}
      {mode === "late" && (
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm space-y-3">
          <div className="text-sm font-bold text-rose-800 flex items-center gap-2 border-b border-rose-100 pb-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>البحث عن الطلبات المتأخرة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">عدد الأيام المتأخرة</label>
              <select
                value={lateDays}
                onChange={(e) => setLateDays(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400 font-bold"
              >
                <option value="1">أكثر من يوم واحد</option>
                <option value="2">أكثر من يومين (48 ساعة)</option>
                <option value="3">أكثر من 3 أيام (72 ساعة)</option>
                <option value="5">أكثر من 5 أيام</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">اسم العميل / المتجر</label>
              <input
                type="text"
                placeholder="متجر الملابس، التقنية..."
                value={lateClient}
                onChange={(e) => setLateClient(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchShipments}
                className="w-full py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-sm"
              >
                تطبيق الفلترة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الجدول الرئيسي الموحد المطابق لأعمدة الرائد */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200 select-none">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={totalItems > 0 && selectedIds.length === totalItems}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                </th>
                <th className="p-3">#</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">رقم الوصل</th>
                <th className="p-3">اسم العميل (المتجر)</th>
                <th className="p-3">اسم المندوب</th>
                <th className="p-3">المحافظة</th>
                <th className="p-3">المنطقة</th>
                <th className="p-3">هاتف الزبون</th>
                <th className="p-3">المبلغ الكلي</th>
                <th className="p-3">أجرة التوصيل</th>
                <th className="p-3">المبلغ الصافي</th>
                <th className="p-3">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-400">
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-slate-400">
                    ليست هناك بيانات متاحة في الجدول
                  </td>
                </tr>
              ) : (
                paginatedData.map((s, idx) => {
                  const isSelected = selectedIds.includes(s.id);
                  const net = (s.amount || 0) - (s.delivery_fee || 0);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-amber-50/40 transition ${
                        isSelected ? "bg-amber-50/80" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        />
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {s.status || "جديد"}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {s.waybill_number}
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {s.store_name || "—"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.driver_name || "غير محدد"}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {s.city || "بغداد"}
                      </td>
                      <td className="p-3 text-slate-500">{s.area || "—"}</td>
                      <td className="p-3 font-mono text-slate-700" dir="ltr">
                        {s.recipient_phone || "—"}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {(s.amount || 0).toLocaleString()} د.ع
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {(s.delivery_fee || 0).toLocaleString()} د.ع
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {net.toLocaleString()} د.ع
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] font-mono">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("ar-IQ") : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* شريط الترقيم المعتاد أسفل الجدول في نظام الرائد */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            يعرض {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{" "}
            {Math.min(currentPage * pageSize, totalItems)} من أصل {totalItems} سجل
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-amber-950 bg-amber-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShipmentsTable;
