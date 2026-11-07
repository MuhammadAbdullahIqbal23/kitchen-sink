import { Button } from "./components/Button";
import { Card } from "./components/Card";

export default function App() {
  return (
    <main className="p-6">
      <Card title="Deployments"><Button>New deployment</Button></Card>
    </main>
  );
}
