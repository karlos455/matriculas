import React from "react";
import { cn } from "classnames";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "border p-2 rounded w-full focus:ring focus:ring-blue-300",
        className
      )}
      {...props}
    />
  );
}
