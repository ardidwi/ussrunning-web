import { loadRegistrationHistory } from "@/features/event-registration/api/server";
import { RegistrationHistory } from "@/features/event-registration/components/RegistrationHistory";
export const metadata = { title: "Registrations — USS Running" };
export default async function Page() {
  const initial = await loadRegistrationHistory();
  return (
    <>
      <p className="uss-member-kicker">MY USS / EVENTS</p>
      <h1>YOUR RUNS.</h1>
      <div className="uss-member-panel">
        <RegistrationHistory key={JSON.stringify(initial)} initial={initial} />
      </div>
    </>
  );
}
