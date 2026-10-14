import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Phone,
  Building,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface SetupLeaderProps {
  onSetupComplete?: (user: any) => void;
  onBackToLogin?: () => void;
}

export const SetupLeader: React.FC<SetupLeaderProps> = ({
  onSetupComplete,
  onBackToLogin,
}) => {
  const [fullName, setFullName] = useState("مهيمن صلاح");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("07818110818");
  const [station, setStation] = useState("محطة بغداد المركزية");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [leaderExists, setLeaderExists] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // التحقق هل يوجد قائد مسجل مسبقاً في النظام
  useEffect(() => {
    async function checkExistingLeader() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "leader")
          .limit(1);

        if (!error && data && data.length > 0) {
          setLeaderExists(true);
        }
      } catch {
        // في حال عدم وجود جدول أو تعذر الاتصال
      } finally {
        setChecking(false);
      }
    }
    checkExistingLeader();
  }, []);

  const handleSetupLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب أن تتكون من 6 خانات على الأقل");
      setLoading(false);
      return;
    }

    try {
      // 1. إنشاء الحساب في Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: fullName.trim(),
            role: "leader",
            phone: phone.trim(),
          },
        },
      });

      if (authError) {
        throw new Error(authError.message || "فشل إنشاء حساب القائد");
      }

      const user = authData.user;
      if (!user) {
        throw new Error("لم يتم إرجاع بيانات المستخدم من الخادم");
      }

      // 2. تسجيل بيانات القائد في جدول profiles بصلاحية leader
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: email.split("@")[0],
          name: fullName.trim(),
          full_name: fullName.trim(),
          role: "leader",
          phone: phone.trim(),
          station: station.trim(),
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        // حتى لو فشل الـ profile، يستمر الحساب بالعمل لأن الـ metadata تحوي role: leader
        console.warn("تنبيه بروفايل:", profileError.message);
      }

      setSuccessMsg("تم إنشاء وتثبيت حساب القائد بنجاح! جاري تحويلك...");

      setTimeout(() => {
        if (onSetupComplete) {
          onSetupComplete({
            id: user.id,
            email: user.email,
            name: fullName.trim(),
            role: "leader",
            phone: phone.trim(),
            station: station.trim(),
          });
        } else if (onBackToLogin) {
          onBackToLogin();
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء إعداد القائد");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-sans" dir="rtl">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950" dir="rtl">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* الرأس بالهوية الرسمية لمنصة الشجاع */}
        <div className="bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-500 p-6 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-950 text-amber-400 rounded-xl flex items-center justify-center font-black text-xl shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg font-black">إعداد وتأكيد قائد المنظومة</h1>
              <p className="text-xs text-slate-900/80 font-bold">منصة الشجاع للتوصيل والخدمات اللوجستية</p>
            </div>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="px-3 py-1.5 bg-slate-950/10 hover:bg-slate-950/20 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              الرجوع للدخول
            </button>
          )}
        </div>

        {/* جسم الإعداد */}
        <div className="p-6">
          {leaderExists && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>يوجد قائد مسجل بالفعل لهذا النظام. يمكنك تسجيل الدخول مباشرة أو إنشاء قائد إضافي.</span>
              {onBackToLogin && (
                <button
                  onClick={onBackToLogin}
                  className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded-lg hover:bg-amber-300 text-xs shrink-0 mr-2"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSetupLeader} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> الاسم الكامل للقائد
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مهيمن صلاح"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="leader@shujaa.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> كلمة المرور السرية
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> رقم الهاتف
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07818110818"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" /> اسم المحطة / الفرع
                </label>
                <input
                  type="text"
                  required
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  placeholder="محطة بغداد المركزية"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "جاري إنشاء الحساب وحفظ الصلاحيات..." : "تأكيد وتثبيت حساب قائد المنظومة"}</span>
            </button>
          </form>
        </div>

        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-500">
          منصة الشجاع - نظام إدارة شركات التوصيل والخدمات اللوجستية 2026
        </div>
      </div>
    </div>
  );
};

export default SetupLeader;
