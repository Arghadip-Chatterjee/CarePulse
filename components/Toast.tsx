"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";

type ToastSimpleProps = {
  buttonLabel: string;
  toastDescription: string;
};

export function ToastSimple({
  buttonLabel,
  toastDescription,
}: ToastSimpleProps) {
  const { toast } = useToast();

  return (
    <Button
      variant="outline"
      onClick={() => {
        toast({
          description: toastDescription,
        });
      }}
    >
      {buttonLabel}
    </Button>
  );
}
