import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface StaffManagerProps {
  isLeader: boolean;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ isLeader }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'leader' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
      } else if (data) {
        setStaff(data as Staff[]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader) {
      notify('فقط القائد يملك صلاحية إضافة مستخدمين جدد', 'error');
      return;
    }

    try {
      setLoading(true);
      // إنشاء حساب جديد في نظام المصادقة
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: { name: name.trim() }
        }
      });

      if (authError) {
        notify('خطأ في إنشاء الحساب: ' + authError.message, 'error');
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        notify('تعذر استلام معرف الحساب الجديد', 'error');
        return;
      }

      // إضافة الموظف وصلاحيته لجدول profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: userId, name: name.trim(), email: email.trim(), role: role }]);

      if (profileError) {
        notify('تم إنشاء البريد لكن فشل حفظ الصلاحية: ' + profileError.message, 'error');
      } else {
        notify(`تمت إضافة الموظف (${name.trim()}) بنجاح`);
        setName('');
        setEmail('');
        setPassword('');
        setRole('employee');
        loadStaff();
      }
    } catch (err: any) {
      notify('حدث خطأ غير متوقع', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!isLeader) {
      notify('فقط القائد يملك صلاحية حذف الموظفين', 'error');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف الموظف: ${staffName} نهائياً؟`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        notify('فشل الحذف من قاعدة البيانات: ' + error.message, 'error');
      } else {
        notify(`تم حذف الموظف (${staffName}) بنجاح`);
        loadStaff();
      }
    } catch (err: any) {
      notify('حدث خطأ أثناء تنفيذ الحذف', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-3.5 rounded-lg text-sm font-medium border flex items-center gap-2 ${
            msg.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {msg.type === 'error' ? <ShieldAlert size={18} /> : <UserCheck size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* قسم إضافة موظف جديد */}
      {isLeader && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <UserPlus size={18} className="text-blue-800" />
            <h3 className="font-bold text-slate-800 text-sm">إضافة موظف أو قائد جديد للنظام</h3>
          </div>

          <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label htmlFor="staff-name-inp" className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكامل *</label>
              <input
                id="staff-name-inp"
                name="staff-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم الموظف"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div>
              <label htmlFor="staff-email-inp" className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني *</label>
              <input
                id="staff-email-inp"
                name="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div>
              <label htmlFor="staff-pass-inp" className="block text-xs font-semibold text-slate-600 mb-1">كلمة المرور *</label>
              <input
                id="staff-pass-inp"
                name="staff-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div>
              <label htmlFor="staff-role-sel" className="block text-xs font-semibold text-slate-600 mb-1">نوع الصلاحية *</label>
              <select
                id="staff-role-sel"
                name="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'leader' | 'employee')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800 bg-white"
              >
                <option value="employee">موظف تشغيلي</option>
                <option value="leader">قائد / مدير نظام</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'جاري الإضافة...' : 'حفظ الموظف'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* جدول عرض الموظفين */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">قائمة كادر العمل المسجلين في النظام</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
            {staff.length} موظف
          </span>
        </div>

        {staff.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">لا يوجد موظفون مسجلون في النظام حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">اسم الموظف</th>
                  <th className="py-2.5 px-4 font-semibold">البريد الإلكتروني</th>
                  <th className="py-2.5 px-4 font-semibold">الصلاحية</th>
                  <th className="py-2.5 px-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{member.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{member.email}</td>
                    <td className="py-3 px-4">
                      {member.role === 'leader' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <ShieldCheck size={12} /> قائد النظام
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                          موظف
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLeader && (
                        <button
                          onClick={() => handleDeleteStaff(member.id, member.name)}
                          title="حذف هذا الموظف"
                          className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
