import Link from "next/link";
import { ArrowRight, Code2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <main className="min-h-svh overflow-hidden bg-muted/30">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-semibold tracking-tight">
            Queries War<span className="text-primary">.</span>
          </Link>
          <Button variant="ghost" size="icon" asChild><Link href="/admin/login" aria-label="Admin login"><Shield /></Link></Button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              <Zap className="size-4" /> SQL arena
            </p>
            <h1 className="max-w-3xl font-heading text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
              Think fast. Query smarter.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              A live SQL contest for people who turn messy data into clean answers. Solve 15 challenges, climb the leaderboard, and prove your query skills.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Enter the contest <ArrowRight className="ml-1.5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contest/leaderboard">Live leaderboard</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">15 questions · 60 minutes · live scoring</p>
          </div>

          <Card className="relative overflow-hidden border-primary/20 bg-background/90 shadow-xl shadow-primary/5">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-2xl" />
            <CardContent className="relative p-6 sm:p-8">
              <div className="mb-8 flex items-center justify-between border-b pb-4">
                <span className="font-mono text-xs text-muted-foreground">challenge.sql</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">LIVE</span>
              </div>
              <div className="space-y-3 font-mono text-sm leading-7">
                <p><span className="text-primary">SELECT</span> customer_name,</p>
                <p className="pl-6">COUNT(*) <span className="text-primary">AS</span> orders</p>
                <p><span className="text-primary">FROM</span> orders</p>
                <p><span className="text-primary">GROUP BY</span> customer_name</p>
                <p><span className="text-primary">ORDER BY</span> orders <span className="text-primary">DESC</span>;</p>
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-lg bg-muted/60 p-4 text-sm">
                <Code2 className="size-5 text-primary" />
                <span className="text-muted-foreground">Your next correct answer moves you up.</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
