import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { LoginScreen } from "./components/LoginScreen";

const Dashboard = lazy(() =>
  import("./components/Dashboard").then((m: any) => ({
    default: m.Dashboard || m.default,
  }))
);

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-orange-400 font-bold" dir="rtl">
        جارٍ تشغيل منظومة شجاع...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLoginSuccess={() => setLoading(false)} />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-orange-400 font-bold" dir="rtl">
          جارٍ تحميل لوحة التحكم...
        </div>
      }
    >
      <Dashboard
        {...({
          currentUser: { name: session.user.email ?? "المستخدم", role: "قائد المنظومة" },
          onLogout: () => supabase.auth.signOut(),
        } as any)}
      />
    </Suspense>
  );
}
