import { Card } from "../components/ui/Card";

export default function Profile() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-ink-700" />
        <div>
          <div className="font-semibold">Harsh Patel</div>
          <div className="text-xs text-bone-500">harshpxv@gmail.com</div>
        </div>
      </Card>
      <Card className="space-y-1">
        <div className="text-sm text-bone-300">Units</div>
        <div className="text-xs text-bone-500">lbs · ft/in · kcal</div>
      </Card>
    </div>
  );
}
