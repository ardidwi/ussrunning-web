import ScannerScreen from "@/features/check-in/components/ScannerScreen";
import { readScannerContext } from "@/features/check-in/api/actions";
export default async function ScannerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <ScannerScreen
      key={eventId}
      eventId={eventId}
      initial={await readScannerContext(eventId)}
    />
  );
}
