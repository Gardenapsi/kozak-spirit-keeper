import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReorderButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
}: {
  onUp: () => void;
  onDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label="Mover para cima"
        disabled={disableUp}
        onClick={onUp}
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label="Mover para baixo"
        disabled={disableDown}
        onClick={onDown}
      >
        <ChevronDown className="size-3.5" />
      </Button>
    </div>
  );
}
