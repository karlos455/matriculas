import React from "react";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow-lg relative w-96">
        {children}
        <button
          className="absolute top-2 right-2 text-gray-600"
          onClick={() => onOpenChange(false)}
        >
          ✖️
        </button>
      </div>
    </div>
  );
}

export function DialogContent({ children }) {
  return <div className="p-4">{children}</div>;
}

export function DialogHeader({ children }) {
  return <div className="p-4 font-bold text-lg border-b">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}
