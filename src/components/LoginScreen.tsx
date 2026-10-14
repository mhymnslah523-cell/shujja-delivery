import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Package, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (data.user) {
        // جلب بيانات البروفايل والصلاحية
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || data.user.user_metadata?.name || 'مستخدم النظام',
          role: profile?.role || 'employee',
          phone: profile?.phone || data.user.user_metadata?.phone || 'غير محدد',
        });
      }
    } catch (err: any) {
      setErrorMsg('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fef9e7] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-200/80 overflow-hidden">
        {/* رأس البطاقة بلون أصفر دافئ */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 p-6 text-center text-amber-950">
          <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-md mb-3 text-amber-600 border border-amber-200">
            <Package size={32} />
          </div>
          <h1 className="text-xl font-bold">منظومة الرائد للتوصيل السريع</h1>
          <p className="text-xs text-amber-900/80 mt-1">نظام إدارة الشحنات والطرود</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-amber-200 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-amber-200 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-bold text-xs shadow-md shadow-amber-400/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={16} />
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}</span>
          </button>
        </form>
   
        <div className="px-6 py-3 bg-amber-50/60 border-t border-amber-100 text-center text-[11px] text-slate-500">
          تطوير نظام إدارة شركات التوصيل © 2026
        </div>
      </div>
    </div>
  );
};

