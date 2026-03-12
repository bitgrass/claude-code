"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlighted";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const styles = {
      default: "bg-white border border-border rounded-2xl shadow-sm",
      highlighted: "bg-white border-2 border-primary rounded-2xl shadow-md",
    };

    return (
      <div
        ref={ref}
        className={`${styles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
