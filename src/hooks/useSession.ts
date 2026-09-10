import { useEffect, useState } from "react";
import { mysqlSession, type MysqlUser } from "@/lib/mysql-api";

export function useSession() {
  const [user, setUser] = useState<MysqlUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void mysqlSession().then((next) => {
      if (!active) return;
      setUser(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { session: user ? { user } : null, user, loading };
}
