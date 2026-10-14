import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  MessageSquare, Send, CheckCircle2, Clock, 
  Trash2, Search, RefreshCw, AlertCircle
} from 'lucide-react';

export interface ShipmentComment {
  id: string;
  waybill_number: string;
  recipient_phone?: string;
  issue: string;
  status: string;
  created_at: string;
  created_by?: string;
}

export const CommentsSystem: React.FC = () => {
  const [comments, setComments] = useState<ShipmentComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');

  // حقول نموذج الملاحظة الجديدة
  const [waybillNumber, setWaybillNumber] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // جلب الملاحظات من جدول shipment_comments
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('shipment_comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'الكل') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('خطأ في جلب الملاحظات:', error);
      } else if (data) {
        setComments(data as ShipmentComment[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  // إضافة ملاحظة جديدة
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waybillNumber.trim() || !issue.trim()) {
      notify('يرجى كتابة رقم الوصل وتفاصيل الملاحظة', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // محاولة جلب هاتف المستلم تلقائياً من جدول الشحنات إن لم يكتب
      let phone = recipientPhone.trim();
      if (!phone) {
        const { data: shipment } = await supabase
          .from('shipments')
          .select('recipient_phone')
          .eq('waybill_number', waybillNumber.trim())
          .maybeSingle();

        if (shipment?.recipient_phone) {
          phone = shipment.recipient_phone;
        }
      }

      const { error } = await supabase.from('shipment_comments').insert([
        {
          waybill_number: waybillNumber.trim(),
          recipient_phone: phone || null,
          issue: issue.trim(),
          status: 'قيد المعالجة',
          created_at: new Date().toISOString()
        }
      ]);

      if (error) {
        notify('فشل حفظ الملاحظة: ' + error.message, 'error');
      } else {
        notify('تم تسجيل الملاحظة بنجاح');
        setWaybillNumber('');
        setRecipientPhone('');
        setIssue('');
        fetchComments();
      }
    } catch (err: any) {
      notify('حدث خطأ أثناء الإضافة', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديث حالة الملاحظة (حل المشكلة)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipment_comments')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setComments(prev =>
          prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // حذف ملاحظة
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الملاحظة نهائياً؟')) return;
    try {
      const { error } = await supabase.from('shipment_comments').delete().eq('id', id);
      if (!error) {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // فتح واتساب بمحتوى المشكلة ورقم الوصل
  const openWhatsApp = (phone?: string, waybill?: string, note?: string) => {
    if (!phone) {
      alert('لا يوجد رقم هاتف مسجل لهذه الملاحظة');
      return;
    }
    const cleanPhone = phone.replace(/^0/, '964').replace(/\D/g, '');
    const message = `مرحباً، بخصوص شحنتكم رقم (${waybill}):\n${note || ''}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // التصفية بالبحث
  const filteredComments = comments.filter(c => {
    if (!searchTerm.trim()) return true;
    return (
      c.waybill_number.includes(searchTerm.trim()) ||
      c.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.recipient_phone && c.recipient_phone.includes(searchTerm.trim()))
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* إشعار النجاح / الخطأ */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
            msg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* نموذج تسجيل ملاحظة أو مشكلة جديدة */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200/80 p-5">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-amber-100">
          <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
            <MessageSquare size={18} />
          </div>
          <h3 className="font-bold text-amber-950 text-sm">تسجيل ملاحظة / رد على شحنة</h3>
        </div>

        <form onSubmit={handleAddComment} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الوصل *</label>
            <input
              type="text"
              required
              value={waybillNumber}
              onChange={(e) => setWaybillNumber(e.target.value)}
              placeholder="مثال: SH-1002"
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">هاتف الزبون (اختياري)</label>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="078XXXXXXXX"
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
              dir="ltr"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">الملاحظة أو سبب المشكلة *</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="مثال: الزبون طلب تأجيل التسليم ليوم غد..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm whitespace-nowrap transition disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* قائمة الردود والملاحظات */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200/80 overflow-hidden">
        {/* شريط الفلترة والبحث */}
        <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم الوصل أو نص الملاحظة..."
                className="w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-amber-200 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-700"
            >
              <option value="الكل">كل الحالات</option>
              <option value="قيد المعالجة">قيد المعالجة</option>
              <option value="محلول">تم الحل (محلول)</option>
              <option value="بانتظار الرد">بانتظار الرد</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-full">
              {filteredComments.length} ملاحظة
            </span>

            <button
              onClick={fetchComments}
              className="p-1.5 text-slate-600 hover:text-amber-800 rounded-md hover:bg-amber-100"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* عرض الملاحظات */}
        {filteredComments.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs font-medium">
            لا توجد ملاحظات أو ردود مسجلة تطابق بحثك.
          </div>
        ) : (
          <div className="divide-y divide-amber-100/80">
            {filteredComments.map((c) => (
              <div key={c.id} className="p-4 hover:bg-amber-50/30 transition flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-950 bg-amber-100 px-2 py-0.5 rounded text-xs">
                      #{c.waybill_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'محلول' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {c.status}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock size={12} />
                      {new Date(c.created_at).toLocaleString('ar-IQ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-semibold pt-1">
                    {c.issue}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* زر الواتساب */}
                  {c.recipient_phone && (
                    <button
                      onClick={() => openWhatsApp(c.recipient_phone, c.waybill_number, c.issue)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition"
                      title="مراسلة عبر واتساب"
                    >
                      <Send size={13} />
                      <span>واتساب</span>
                    </button>
                  )}

                  {/* تغيير الحالة */}
                  {c.status !== 'محلول' ? (
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'محلول')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      تحديد كمحلول
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'قيد المعالجة')}
                      className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition"
                    >
                      إعادة للمعالجة
                    </button>
                  )}

                  {/* حذف */}
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="حذف"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSystem;
