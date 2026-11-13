"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runQa } from "@/lib/actions/qa";
import { Loader2, ShieldCheck } from "lucide-react";

export function QaRunner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await runQa(projectId);
          if (res && "error" in res && res.error) toast.error(res.error);
          else if (res && "success" in res) {
            toast.success(
              `QA complete: ${res.errors} error(s), ${res.warnings} warning(s), ${res.info} info`,
            );
            router.refresh();
          }
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
      {pending ? "Running checks…" : "Run quality checks"}
    </Button>
  );
}
