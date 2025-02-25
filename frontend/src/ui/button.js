import React from "react";
import { cn } from "classnames";

export function Button({ children, className, ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
