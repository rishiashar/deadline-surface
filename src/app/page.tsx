import { Surface } from "@/components/Surface";
import { sampleModel } from "@/lib/sample-data";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Surface model={sampleModel} />
    </main>
  );
}
