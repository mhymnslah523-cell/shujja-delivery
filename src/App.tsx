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

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col" dir="rtl" style={{ minHeight: "100vh" }}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-orange-400 font-bold" style={{ minHeight: "100vh" }}>
          جارٍ تشغيل منظومة شجاع...
        </div>
      ) : !session ? (
        <div className="w-full flex-1" style={{ minHeight: "100vh" }}>
          <LoginScreen onLoginSuccess={() => setLoading(false)} />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-orange-400 font-bold" style={{ minHeight: "100vh" }}>
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
      )}
    </div>
  );
}
