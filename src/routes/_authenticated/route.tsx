import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { mysqlSession } from "@/lib/mysql-api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await mysqlSession();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
