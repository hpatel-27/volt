import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

const exercises = [
  { name: "Barbell Bench Press", group: "Chest" },
  { name: "Overhead Press", group: "Shoulders" },
  { name: "Deadlift", group: "Back" },
  { name: "Back Squat", group: "Legs" },
  { name: "Pull-up", group: "Back" },
];

export default function Exercises() {
  return (
    <div className="space-y-4">
      <h1 className="text-h1">Exercises</h1>
      <Input placeholder="Search exercises…" />
      <div className="space-y-2">
        {exercises.map((ex) => (
          <Card key={ex.name} interactive className="flex items-center gap-3 p-4">
            <div className="flex-1">
              <div className="text-sm font-semibold">{ex.name}</div>
              <div className="text-xs text-bone-500">{ex.group}</div>
            </div>
            <span className="text-bone-500">›</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
