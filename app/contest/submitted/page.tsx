import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContestSubmittedPage() {
  return <main className="flex min-h-svh items-center justify-center px-4"><div className="text-center"><CheckCircle2 className="mx-auto mb-5 size-14 text-primary" /><h1 className="font-heading text-3xl font-semibold">Contest submitted</h1><p className="mt-2 text-muted-foreground">Your answers have been recorded. Good luck!</p><Button asChild className="mt-6"><Link href="/">Return home</Link></Button></div></main>;
}
