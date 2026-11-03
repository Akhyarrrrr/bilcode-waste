import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppShell } from "./layouts/app-shell";
import { RequireAdmin, RequireAuth, RequireGuest } from "./guards";
import { RouteError } from "./route-error";

type PageModule = Promise<{ default: React.ComponentType }>;
/** Code-split each page; the shell and guards stay in the main bundle. */
const page = (load: () => PageModule): Pick<RouteObject, "lazy"> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: "/", ...page(() => import("@/features/landing/landing-page")) },
      {
        element: <RequireGuest />,
        children: [
          {
            path: "/login",
            ...page(() => import("@/features/auth/login-page")),
          },
          {
            path: "/register",
            ...page(() => import("@/features/auth/register-page")),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            errorElement: <RouteError />,
            children: [
              {
                path: "/dashboard",
                ...page(() => import("@/features/dashboard/dashboard-page")),
              },
              {
                path: "/reports",
                ...page(() => import("@/features/reports/reports-page")),
              },
              {
                path: "/reports/map",
                ...page(() => import("@/features/reports/reports-map-page")),
              },
              {
                path: "/reports/new",
                ...page(
                  () => import("@/features/reports/form/report-form-page"),
                ),
              },
              {
                path: "/reports/:id",
                ...page(() => import("@/features/reports/report-detail-page")),
              },
              {
                path: "/reports/:id/edit",
                ...page(
                  () => import("@/features/reports/form/report-form-page"),
                ),
              },
              {
                element: <RequireAdmin />,
                children: [
                  {
                    path: "/users",
                    ...page(() => import("@/features/users/users-page")),
                  },
                ],
              },
              {
                path: "/account",
                ...page(() => import("@/features/account/account-page")),
              },
            ],
          },
        ],
      },
      { path: "*", ...page(() => import("./not-found-page")) },
    ],
  },
]);
