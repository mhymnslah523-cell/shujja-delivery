import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Printer, Barcode, PlusCircle, CheckCircle2, 
  AlertCircle
} from 'lucide-react';

const CITIES = [
  "بغداد", "البصرة", "أربيل", "النجف", "كربلاء", "نينوى", 
  "السليمانية", "بابل", "ديالى", "كركوك", "ذي قار", 
  "ميسان", "المثنى", "صلاح الدين", "الأنبار", "واسط", "دهوك"
];

export const StickersSystem: React.FC = () => {
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [city, setCity] = useState('بغداد');
  const [area, setArea] = useState('');
  const [amount, setAmount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('5000');
  const [goodsType, setGoodsType] = useState('ملابس / طرود');
  const [piecesCount, setPiecesCount] = useState('1');
  const [branch, setBranch] = useState('المركز الرئيسي');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // توليد رقم وصل عشوائي فريد بصيغة الشجاع
  const generateWaybillNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `SH-${randomNum}`;
  };

  // حفظ الشحنة وتوليد الملصق
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !recipientPhone.trim() || !amount) {
      notify('يرجى ملء الحقول الإلزامية: المتجر، هاتف الزبون، والمبلغ', 'error');
      return;
    }

    setLoading(true);
    const waybill = generateWaybillNumber();
    const totalAmount = parseFloat(amount) || 0;
    const fee = parseFloat(deliveryFee) || 0;
    const net = totalAmount - fee;
    const today = new Date().toISOString().split('T')[0];

    try {
      const newShipment = {
        waybill_number: waybill,
        store_name: storeName.trim(),
        store_phone: storePhone.trim() || null,
        recipient_name: recipientName.trim() || 'زبون عام',
        customer_name: recipientName.trim() || 'زبون عام',
        recipient_phone: recipientPhone.trim(),
        city: city,
        area: area.trim() || 'غير محدد',
        amount: totalAmount,
        delivery_fee: fee,
        net_amount: net,
        goods_type: goodsType.trim(),
        pieces_count: parseInt(piecesCount) || 1,
        branch: branch.trim(),
        notes: notes.trim() || null,
        status: 'غير مؤكد',
        print_date: today,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('shipments')
        .insert([newShipment])
        .select()
        .single();

      if (error) {
        notify('خطأ في حفظ الوصل: ' + error.message, 'error');
      } else {
        setLastGenerated(data || newShipment);
        notify(`تم توليد الوصل بنجاح: ${waybill}`);
        // تصفير حقول الزبون مع إبقاء المتجر لسرعة الإدخال المتكرر
        setRecipientName('');
        setRecipientPhone('');
        setArea('');
        setAmount('');
        setNotes('');
      }
    } catch (err: any) {
      notify('حدث خطأ أثناء توليد الوصل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setStoreName('');
    setStorePhone('');
    setRecipientName('');
    setRecipientPhone('');
    setCity('بغداد');
    setArea('');
    setAmount('');
    setDeliveryFee('5000');
    setGoodsType('ملابس / طرود');
    setPiecesCount('1');
    setBranch('المركز الرئيسي');
    setNotes('');
    setLastGenerated(null);
    setMsg(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* إشعار العملية */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 print:hidden ${
            msg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* نموذج إدخال الوصل الجديد */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-amber-200/80 p-5 print:hidden">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-amber-100">
            <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
              <PlusCircle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">توليد وصـل وشحنة جديدة</h3>
              <p className="text-[11px] text-slate-500">توليد تلقائي للباركود وحفظ مباشر في المنظومة</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* بيانات المتجر */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-lg border border-amber-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر / العميل *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: متجر بغداد ستايل"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">هاتف المتجر</label>
                <input
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  dir="ltr"
                />
              </div>
            </div>

            {/* بيانات المستلم والعنوان */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستلم (الزبون)</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="اسم المستلم"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">هاتف الزبون *</label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-semibold"
                >
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / العنوان</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="مثال: المنصور - شارع 14"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>
            </div>

            {/* المبالغ والتفاصيل */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ الكلي (د.ع) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: 25000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">أجرة التوصيل (د.ع)</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع البضاعة</label>
                <input
                  type="text"
                  value={goodsType}
                  onChange={(e) => setGoodsType(e.target.value)}
                  placeholder="طرود"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد القطع</label>
                <input
                  type="number"
                  value={piecesCount}
                  onChange={(e) => setPiecesCount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>
            </div>

            {/* الملاحظات والفرع */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الفرع المستلم</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="المركز الرئيسي"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التوصيل للزبون</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى الاتصال قبل الوصول بربع ساعة"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-2.5 border border-amber-300 text-amber-900 hover:bg-amber-50 font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                مسح النموذج
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'جاري توليد الوصل والباركود...' : 'توليد الوصل وحفظ الشحنة'}
              </button>
            </div>
          </form>
        </div>

        {/* بطاقة ملصق الشحنة القابل للطباعة الفورية (Sticker Preview) */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-amber-800" />
                <h3 className="font-bold text-amber-950 text-sm">معاينة الملصق (Sticker)</h3>
              </div>
              {lastGenerated && (
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow"
                >
                  <Printer size={14} />
                  طباعة الملصق
                </button>
              )}
            </div>

            {lastGenerated ? (
              <div id="printable-sticker" className="border-2 border-black p-4 rounded-xl space-y-3 bg-white text-black font-sans">
                {/* رأس الوصل */}
                <div className="flex justify-between items-center border-b-2 border-black pb-2 text-center">
                  <div>
                    <h2 className="font-black text-sm">منصة الشجاع للتوصيل</h2>
                    <span className="text-[10px] font-bold">Al-Shujaa Express</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[10px] block text-slate-600">تاريخ الطباعة</span>
                    <span className="text-xs font-bold">{lastGenerated.print_date || new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                {/* الباركود البصري ورقم الوصل */}
                <div className="text-center py-2 border-b-2 border-black bg-slate-50 rounded">
                  <div className="font-mono text-xl tracking-widest font-black py-1">
                   , | |||| ||, ||||| |||
                  </div>
                  <div className="font-mono text-base font-black tracking-wider text-black">
                    {lastGenerated.waybill_number}
                  </div>
                </div>

                {/* بيانات المستلم والمحافظة */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold border-b border-slate-300 pb-1">
                    <span>المحافظة:</span>
                    <span className="text-sm font-black bg-black text-white px-2 rounded">{lastGenerated.city}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">المنطقة:</span>
                    <span className="font-bold">{lastGenerated.area}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">المستلم:</span>
                    <span className="font-bold">{lastGenerated.recipient_name || lastGenerated.customer_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">الهاتف:</span>
                    <span className="font-mono font-bold" dir="ltr">{lastGenerated.recipient_phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">المتجر:</span>
                    <span className="font-bold">{lastGenerated.store_name}</span>
                  </div>
                  {lastGenerated.notes && (
                    <div className="text-[11px] bg-slate-100 p-1.5 rounded text-slate-700">
                      <strong>ملاحظة:</strong> {lastGenerated.notes}
                    </div>
                  )}
                </div>

                {/* المبلغ بخط عريض جداً */}
                <div className="bg-black text-white p-2.5 rounded-lg text-center mt-3">
                  <span className="text-[10px] block opacity-80">المبلغ المطلوب تحصيله</span>
                  <span className="text-lg font-black font-mono">
                    {(lastGenerated.amount || 0).toLocaleString()} د.ع
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-amber-200 rounded-xl space-y-2">
                <Barcode size={36} className="mx-auto text-amber-300" />
                <p className="font-bold text-slate-600">لم يتم توليد أي ملصق بعد</p>
                <p>قم بملء النموذج واضغط «توليد الوصل» لمعاينة وطباعة الملصق فوراً.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickersSystem;
