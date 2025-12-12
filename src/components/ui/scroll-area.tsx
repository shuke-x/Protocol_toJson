import * as React from "react";
import { cn } from "../../lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("overflow-auto overscroll-contain", className)}
    style={{ scrollbarWidth: "thin", ...style }}
    {...props}
  />
));

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
