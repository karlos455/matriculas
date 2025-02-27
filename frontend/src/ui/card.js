import React from "react";

export function Card({ children }) {
  return (
    <div className="p-4 border rounded shadow-md bg-white dark:bg-gray-800">
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="p-4">{children}</div>;
}
