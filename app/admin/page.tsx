import { loadCmsPermissions } from "@/features/permissions/server";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { permissionView } from "@/features/permissions/model";
import { CmsShell } from "@/features/cms/CmsShell";
import { CmsModuleBoundary } from "@/features/cms/CmsModuleBoundary";
import { CMS_MODULES, cmsModule } from "@/features/cms/navigation";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
type Query = Record<string, string | string[] | undefined>;
export const dynamic = "force-dynamic";
export const metadata = { title: "USS CMS — USS Running" };
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const [context, query] = await Promise.all([
    loadCmsPermissions(),
    searchParams,
  ]);
  if (!context.ok)
    return (
      <div className="uss-member-shell">
        <main className="uss-member-content">
          <ServiceFeedback code={context.code} returnTo="/admin" />
        </main>
      </div>
    );
  const module = cmsModule(typeof query.module === "string" ? query.module : ""),
    access = permissionView(context.data),
    item = CMS_MODULES.find((item) => item.id === module)!;
  let content;
  if (!access.canAny(item.permissions))
    content = (
      <ServiceFeedback code="INSUFFICIENT_PERMISSION" returnTo="/admin" />
    );
  else content = <CmsModuleBoundary module={module} />;
  return (
    <PermissionsProvider snapshot={context.data}>
      <CmsShell module={module} displayName={context.data.displayName}>
        {content}
      </CmsShell>
    </PermissionsProvider>
  );
}
