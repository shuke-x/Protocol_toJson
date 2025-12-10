import * as React from "react";
import { cn } from "../../lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border border-border bg-white/5 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className,
          )}
          {...props}
        />
        {props.title}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
