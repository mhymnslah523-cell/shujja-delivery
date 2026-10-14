import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileSpreadsheet, Download, Search, 
  CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';

export interface AccountStatement {
  id: string;
  statement_number: string;
  store_name: string;
  total_orders: number;
  total_amount: number;
  delivery_fees: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export const ListsSystem: React.FC = () => {
  const [statements, setStatements] = useState<AccountStatement[]>([]);
  const [existingStores, setExistingStores] = useState<string[]>([]);
  
  // شحنات الكشف المختار للمعاينة والطباعة
  const [activeStatement, setActiveStatement] = useState<AccountStatement | null>(null);
  const [statementShipments, setStatementShipments] = useState<any[]>([]);

  // حقول توليد كشف جديد
  const [selectedStore, setSelectedStore] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [previewOrders, setPreviewOrders] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // جلب أسماء المتاجر المسجلة في جدول الشحنات
  const loadStores = async () => {
    try {
      const { data } = await supabase.from('shipments').select('store_name');
      if (data) {
        const uniqueStores = Array.from(new Set(data.map(s => s.store_name).filter(Boolean)));
        setExistingStores(uniqueStores);
        if (uniqueStores.length > 0 && !selectedStore) {
          setSelectedStore(uniqueStores[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // جلب الكشوفات السابقة المحفوظة
  const loadStatements = async () => {
    try {
      const { data, error } = await supabase
        .from('account_statements')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setStatements(data as AccountStatement[]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStores();
    loadStatements();
  }, []);

  // حساب الشحنات المؤهلة للكشف للمتجر المحدد
  const handleCalculateStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) {
      notify('يرجى اختيار اسم المتجر أولاً', 'error');
      return;
    }

    setIsCalculating(true);
    try {
      let query = supabase
        .from('shipments')
        .select('*')
        .eq('store_name', selectedStore)
        .eq('status', 'تم التسليم');

      if (fromDate) query = query.gte('created_at', fromDate);
      if (toDate) query = query.lte('created_at', toDate + 'T23:59:59');

      const { data, error } = await query;
      if (error) {
        notify('خطأ في جلب شحنات المتجر: ' + error.message, 'error');
      } else {
        setPreviewOrders(data || []);
        if (!data || data.length === 0) {
          notify('لا توجد شحنات مسلّمة لهذا المتجر في الفترة المحددة', 'error');
        }
      }
    } catch (err: any) {
      notify('حدث خطأ أثناء الاحتساب', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // مجاميع الكشف المحسوب
  const totalAmount = previewOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalFees = previewOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const netPayout = totalAmount - totalFees;

  // حفظ الكشف الرسمي في قاعدة البيانات
  const handleSaveStatement = async () => {
    if (previewOrders.length === 0) return;
    setIsSaving(true);
    const statementNo = `ST-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { data, error } = await supabase.from('account_statements').insert([
        {
          statement_number: statementNo,
          store_name: selectedStore,
          total_orders: previewOrders.length,
          total_amount: totalAmount,
          delivery_fees: totalFees,
          net_amount: netPayout,
          status: 'معلق',
          created_at: new Date().toISOString()
        }
      ]).select().single();

      if (error) {
        notify('فشل حفظ الكشف: ' + error.message, 'error');
      } else {
        notify(`تم إصدار كشف الحساب رقم (${statementNo}) بنجاح`);
        loadStatements();
        setActiveStatement(data);
        setStatementShipments(previewOrders);
        setPreviewOrders([]);
      }
    } catch (err: any) {
      notify('حدث خطأ أثناء حفظ الكشف', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // تصدير الكشف إلى CSV
  const exportStatementCSV = (st: AccountStatement) => {
    const csvContent = "\uFEFF" + [
      ["رقم الكشف", "اسم المتجر", "عدد الطلبات", "المبلغ الإجمالي", "أجور التوصيل", "الصافي المستحق", "الحالة", "التاريخ"].join(","),
      [st.statement_number, `"${st.store_name}"`, st.total_orders, st.total_amount, st.delivery_fees, st.net_amount, st.status, new Date(st.created_at).toLocaleDateString('ar-IQ')].join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Statement-${st.statement_number}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* إشعار النجاح / الخطأ */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 print:hidden ${
            msg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* قسم إنشاء واحتساب كشف حساب جديد */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200/80 p-5 print:hidden">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-amber-100">
          <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h3 className="font-bold text-amber-950 text-sm">إنشاء واحتساب كشف حساب لمتجر</h3>
            <p className="text-[11px] text-slate-500">تجميع الشحنات المسلمة وتصفية المستحقات المالية</p>
          </div>
        </div>

        <form onSubmit={handleCalculateStatement} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر *</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold text-slate-800"
            >
              {existingStores.length === 0 ? (
                <option value="">لا توجد متاجر مسجلة بعد</option>
              ) : (
                existingStores.map(store => <option key={store} value={store}>{store}</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCalculating || !selectedStore}
              className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Search size={14} />
              {isCalculating ? 'جاري الفحص والاحتساب...' : 'احتساب الكشف'}
            </button>
          </div>
        </form>

        {/* بطاقة المعاينة المالية للكشف قبل الاعتماد */}
        {previewOrders.length > 0 && (
          <div className="mt-5 pt-4 border-t border-amber-100 bg-amber-50/50 p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-950">نتائج الاحتساب لمتجر ({selectedStore}):</span>
              <span className="text-xs font-bold bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full">
                {previewOrders.length} شحنة مسلّمة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                <span className="text-[11px] text-slate-500 block mb-1">إجمالي المبالغ المستحصلة</span>
                <span className="text-base font-black text-slate-900 font-mono">{totalAmount.toLocaleString()} د.ع</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                <span className="text-[11px] text-slate-500 block mb-1">أجور التوصيل المستقطعة</span>
                <span className="text-base font-black text-rose-600 font-mono">{totalFees.toLocaleString()} د.ع</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                <span className="text-[11px] text-slate-500 block mb-1">الصافي المستحق للمتجر</span>
                <span className="text-base font-black text-emerald-700 font-mono">{netPayout.toLocaleString()} د.ع</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewOrders([])}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveStatement}
                disabled={isSaving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? 'جاري الاعتماد...' : 'اعتماد وحفظ الكشف الرسمي'}
              </button>
            </div>
          </div>
        )}
      </div>

      {activeStatement && (
        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 print:block">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-bold text-emerald-950">الكشف المختار للمعاينة</p>
              <h4 className="text-sm font-black text-emerald-900">{activeStatement.statement_number}</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveStatement(null);
                setStatementShipments([]);
              }}
              className="px-3 py-1.5 bg-white text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-bold"
            >
              إغلاق
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-slate-500 block mb-1">اسم المتجر</span>
              <span className="text-sm font-black text-slate-900">{activeStatement.store_name}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-slate-500 block mb-1">عدد الطلبات</span>
              <span className="text-sm font-black text-slate-900">{activeStatement.total_orders}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-slate-500 block mb-1">إجمالي المبلغ</span>
              <span className="text-sm font-black text-slate-900">{(activeStatement.total_amount || 0).toLocaleString()} د.ع</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-slate-500 block mb-1">الصافي</span>
              <span className="text-sm font-black text-emerald-700">{(activeStatement.net_amount || 0).toLocaleString()} د.ع</span>
            </div>
          </div>

          {statementShipments.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-emerald-200 bg-white">
              <table className="w-full text-right text-[11px]">
                <thead className="bg-emerald-100 text-emerald-900 font-bold">
                  <tr>
                    <th className="p-2">رقم الشحنة</th>
                    <th className="p-2">العميل</th>
                    <th className="p-2">المبلغ</th>
                    <th className="p-2">أجرة التوصيل</th>
                    <th className="p-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {statementShipments.map((shipment, index) => (
                    <tr key={shipment.id || index} className="border-t border-emerald-100">
                      <td className="p-2 font-mono">{shipment.id || `#${index + 1}`}</td>
                      <td className="p-2">{shipment.customer_name || '—'}</td>
                      <td className="p-2 font-mono">{(shipment.amount || 0).toLocaleString()} د.ع</td>
                      <td className="p-2 font-mono text-rose-600">{(shipment.delivery_fee || 0).toLocaleString()} د.ع</td>
                      <td className="p-2 font-mono">{shipment.created_at ? new Date(shipment.created_at).toLocaleDateString('ar-IQ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* جدول كشوفات الحساب السابقة */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200/80 overflow-hidden print:hidden">
        <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 text-xs">سجل كشوفات الحساب الصادرة</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black text-xs">
              {statements.length} كشف
            </span>
          </div>

          <button
            onClick={loadStatements}
            className="p-1.5 text-slate-600 hover:text-amber-800 rounded-md hover:bg-amber-100 transition"
            title="تحديث"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {statements.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs font-medium">
            لا توجد كشوفات حساب مصدرة حتى الآن. يمكنك احتساب كشف جديد من النموذج أعلاه.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-amber-100/60 text-slate-700 font-bold border-b border-amber-200">
                <tr>
                  <th className="p-3">رقم الكشف</th>
                  <th className="p-3">اسم المتجر</th>
                  <th className="p-3">عدد الطلبات</th>
                  <th className="p-3">المبلغ الإجمالي</th>
                  <th className="p-3">أجور التوصيل</th>
                  <th className="p-3">الصافي للمتجر</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {statements.map((st) => (
                  <tr key={st.id} className="hover:bg-amber-50/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-950">{st.statement_number}</td>
                    <td className="p-3 font-bold text-slate-900">{st.store_name}</td>
                    <td className="p-3 font-bold text-slate-700">{st.total_orders} وصل</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{(st.total_amount || 0).toLocaleString()} د.ع</td>
                    <td className="p-3 font-mono text-rose-600">{(st.delivery_fees || 0).toLocaleString()} د.ع</td>
                    <td className="p-3 font-mono font-black text-emerald-700">{(st.net_amount || 0).toLocaleString()} د.ع</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        st.status === 'تم الصرف' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(st.created_at).toLocaleDateString('ar-IQ')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => exportStatementCSV(st)}
                          className="p-1.5 text-slate-700 hover:text-amber-900 hover:bg-amber-100 rounded transition"
                          title="تصدير كملف CSV"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListsSystem;
