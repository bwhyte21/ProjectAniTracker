import { Header } from "@/components/Header";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <h1 className="text-4xl font-bold">AniTracker</h1>
      </main>
    </div>
  );
}

export default App;
